'use server'

import crypto from 'crypto'
import { getSessionUser } from '@/lib/auth/session'
import { hasAnyRole } from '@/lib/auth/roles'
import { createServiceClient } from '@/utils/supabase/service'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/utils/audit'

const ALLOWED_STAFF_ROLES = [
  'System Admin',
  'Director',
  'Principal',
  'Dean',
  'Head of Section',
  'Accountant',
  'Sales',
] as const

const VALID_STATUSES = [
  'submitted',
  'under_review',
  'interview_scheduled',
  'accepted',
  'rejected',
  'enrolled',
  'cancelled',
] as const

export async function updateApplicationStatusAction(
  id: string,
  newStatus: string,
  notes?: string
) {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, ALLOWED_STAFF_ROLES)) {
    return { error: 'Unauthorized to update admission applications' }
  }

  if (!VALID_STATUSES.includes(newStatus as (typeof VALID_STATUSES)[number])) {
    return { error: `Invalid status: ${newStatus}` }
  }

  // If status is being set to 'enrolled', trigger full student enrollment
  if (newStatus === 'enrolled') {
    return await enrollLearnerAction(id, undefined, notes)
  }

  const supabase = createServiceClient()
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
    reviewed_by: session.user.id,
  }

  if (notes !== undefined) {
    updateData.notes = notes
  }

  const { error } = await supabase
    .from('admission_applications')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('[admissions/actions] update failed:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/principal/admissions')
  revalidatePath('/dashboard/director/applications')
  return { ok: true, status: newStatus }
}

export async function enrollLearnerAction(
  applicationId: string,
  targetClassId?: string,
  notes?: string
) {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, ALLOWED_STAFF_ROLES)) {
    return { error: 'Unauthorized to enroll learners' }
  }

  const supabase = createServiceClient()

  // 1. Fetch application details
  const { data: app, error: appError } = await supabase
    .from('admission_applications')
    .select('*')
    .eq('id', applicationId)
    .single()

  if (appError || !app) {
    return { error: `Application not found: ${appError?.message || ''}` }
  }

  // If already enrolled and has student record, check if student exists
  if (app.enrolled_student_id) {
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id, student_id')
      .eq('id', app.enrolled_student_id)
      .maybeSingle()

    if (existingStudent) {
      // If a targetClassId was passed, update their class
      if (targetClassId) {
        await supabase
          .from('students')
          .update({ class_id: targetClassId })
          .eq('id', existingStudent.id)

        await supabase
          .from('student_classes')
          .upsert({ student_id: existingStudent.id, class_id: targetClassId })
      }

      await supabase
        .from('admission_applications')
        .update({ status: 'enrolled', updated_at: new Date().toISOString() })
        .eq('id', applicationId)

      revalidatePath('/dashboard/principal/admissions')
      revalidatePath('/dashboard/students')
      return {
        ok: true,
        status: 'enrolled',
        student_id: existingStudent.student_id,
        student_user_id: existingStudent.id,
        alreadyEnrolled: true,
      }
    }
  }

  // 2. Create Auth User for Student
  const cleanFirst = (app.first_name || 'student').toLowerCase().replace(/[^a-z0-9]/g, '')
  const email = `student.${cleanFirst}.${Date.now().toString().slice(-5)}@leaders.ac.tz`
  const temporaryPassword = crypto.randomUUID()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      first_login: true,
      name: `${app.first_name} ${app.last_name}`,
    },
  })

  if (authError || !authData.user) {
    return { error: `Failed to create student auth user: ${authError?.message}` }
  }

  const studentUserId = authData.user.id

  // 3. Create Student Profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: studentUserId,
    first_name: app.first_name,
    last_name: app.last_name,
    email: email,
    phone: app.parent_phone || null,
    role: 'Student',
    roles: ['Student'],
    username: `student.${cleanFirst}.${Date.now().toString().slice(-4)}`,
    force_pin_change: true,
    is_active: true,
  })

  if (profileError) {
    await supabase.auth.admin.deleteUser(studentUserId)
    return { error: `Failed to create student profile: ${profileError.message}` }
  }

  // 4. Generate Student ID
  let studentIdStr = ''
  try {
    const { data: seqVal } = await supabase.rpc('nextval_student_code')
    if (seqVal) {
      studentIdStr = `STUD-${String(seqVal).padStart(4, '0')}`
    }
  } catch {
    // fallback
  }

  if (!studentIdStr) {
    const { count } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
    const nextId = (count || 0) + 1001 + Math.floor(Math.random() * 20)
    studentIdStr = `STUD-${nextId.toString().padStart(4, '0')}`
  }

  // 5. Match Class for Placement
  let classId: string | null = targetClassId || null
  let matchedClass: any = null

  const { data: classList } = await supabase
    .from('classes')
    .select('id, name, class_name, section, grade_level')

  if (classList && classList.length > 0) {
    if (classId) {
      matchedClass = classList.find((c) => c.id === classId)
    } else {
      const searchName = (app.class_applied_for || '').trim().toLowerCase()
      // Try exact name match
      matchedClass = classList.find(
        (c) =>
          (c.name || '').toLowerCase() === searchName ||
          (c.class_name || '').toLowerCase() === searchName
      )

      if (!matchedClass) {
        // Try partial match
        matchedClass = classList.find(
          (c) =>
            searchName.includes((c.name || '').toLowerCase()) ||
            searchName.includes((c.grade_level || '').toLowerCase()) ||
            (c.name || '').toLowerCase().includes(searchName) ||
            (c.grade_level || '').toLowerCase().includes(searchName)
        )
      }

      if (matchedClass) {
        classId = matchedClass.id
      }
    }
  }

  // 6. Insert Student Record
  const resolvedGrade = matchedClass?.grade_level || matchedClass?.name || app.class_applied_for
  const resolvedSection = matchedClass?.section || null

  const { error: studentError } = await supabase.from('students').insert({
    id: studentUserId,
    profile_id: studentUserId,
    student_id: studentIdStr,
    grade_level: resolvedGrade,
    section: resolvedSection,
    class_id: classId,
    dob: app.date_of_birth || null,
    gender: app.gender || null,
    nationality: app.nationality || 'Tanzanian',
    medical_info: app.medical_conditions || null,
    previous_school: app.previous_school || null,
    source: app.source || 'website',
    registered_by: app.registered_by || null,
    sales_agent_name: app.sales_agent_name || null,
    admission_id: app.id,
    is_active: true,
  })

  if (studentError) {
    console.error('[admissions/enroll] student insert error:', studentError)
    await supabase.auth.admin.deleteUser(studentUserId)
    return { error: `Failed to create student record: ${studentError.message}` }
  }

  // 7. Insert into student_classes junction
  if (classId) {
    await supabase.from('student_classes').insert({
      student_id: studentUserId,
      class_id: classId,
    })
  }

  // 8. Link Parent profile if parent email or phone is available
  if (app.parent_email && app.parent_email.includes('@')) {
    try {
      let parentProfileId: string | null = null

      // Check if parent profile exists
      const { data: existingParent } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', app.parent_email.trim())
        .maybeSingle()

      if (existingParent) {
        parentProfileId = existingParent.id
      } else {
        // Create Parent Auth & Profile
        const parentAuthRes = await supabase.auth.admin.createUser({
          email: app.parent_email.trim(),
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: { first_login: true },
        })

        if (parentAuthRes.data.user) {
          parentProfileId = parentAuthRes.data.user.id
          const nameParts = (app.parent_name || 'Parent').trim().split(/\s+/)
          const pFirst = nameParts[0] || 'Parent'
          const pLast = nameParts.slice(1).join(' ') || 'Guardian'

          await supabase.from('profiles').insert({
            id: parentProfileId,
            first_name: pFirst,
            last_name: pLast,
            email: app.parent_email.trim(),
            phone: app.parent_phone || null,
            role: 'Parent',
            roles: ['Parent'],
            username: `parent.${pFirst.toLowerCase()}.${Date.now().toString().slice(-4)}`,
            force_pin_change: true,
            is_active: true,
          })
        }
      }

      if (parentProfileId) {
        await supabase.from('student_parents').insert({
          student_id: studentUserId,
          parent_id: parentProfileId,
          relationship: app.parent_relationship || 'Parent',
        })
      }
    } catch (parentErr) {
      console.warn('[admissions/enroll] parent link non-critical error:', parentErr)
    }
  }

  // 9. Update Admission Application status and link student
  const updatePayload: Record<string, unknown> = {
    status: 'enrolled',
    enrolled_student_id: studentUserId,
    reviewed_by: session.user.id,
    updated_at: new Date().toISOString(),
  }
  if (notes !== undefined) {
    updatePayload.notes = notes
  }

  await supabase
    .from('admission_applications')
    .update(updatePayload)
    .eq('id', applicationId)

  // 10. Automatically generate initial fee invoice if fee structure exists
  let invoiceGenerated = false
  try {
    const academicYear = app.academic_year || '2026/2027'
    const term = app.start_term || 'Term 1'

    const { data: feeStructures } = await supabase
      .from('fee_structures')
      .select('*')
      .or(`grade_level.ilike.%${resolvedGrade}%,grade_level.ilike.%${app.class_applied_for}%`)

    if (feeStructures && feeStructures.length > 0) {
      const totalAmount = feeStructures.reduce((sum, f) => sum + Number(f.amount), 0)
      const { data: newInvoice } = await supabase
        .from('invoices')
        .insert({
          student_id: studentUserId,
          academic_year: academicYear,
          term: term,
          total_amount: totalAmount,
          discount_amount: 0.0,
          status: 'Pending',
          generated_by: session.user.id,
        })
        .select('id')
        .single()

      if (newInvoice) {
        const items = feeStructures.map((f) => ({
          invoice_id: newInvoice.id,
          fee_structure_id: f.id,
          amount: f.amount,
          description: f.fee_type || 'Tuition Fee',
        }))
        await supabase.from('invoice_items').insert(items)
        invoiceGenerated = true
      }
    }
  } catch (invErr) {
    console.warn('[admissions/enroll] auto-invoice generation notice:', invErr)
  }

  await logAuditAction('Student Enrolled from Admissions Desk', 'students', {
    student_id: studentIdStr,
    user_id: studentUserId,
    application_id: applicationId,
    class_id: classId,
  })

  // Revalidate relevant pages
  revalidatePath('/dashboard/principal/admissions')
  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard/director/applications')
  revalidatePath('/dashboard/accountant/invoices')
  revalidatePath('/dashboard/accountant/fee-balances')

  return {
    ok: true,
    status: 'enrolled',
    student_id: studentIdStr,
    student_user_id: studentUserId,
    class_id: classId,
    invoice_generated: invoiceGenerated,
  }
}

export async function deleteApplicationAction(id: string) {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, ALLOWED_STAFF_ROLES)) {
    return { error: 'Unauthorized to delete admission applications' }
  }

  const supabase = createServiceClient()

  // Sales can delete only their own registrations; management can delete any
  const isManagement = hasAnyRole(session.roles, [
    'System Admin',
    'Director',
    'Principal',
    'Dean',
  ])

  let query = supabase.from('admission_applications').delete().eq('id', id)
  if (!isManagement) {
    query = query.eq('registered_by', session.user.id)
  }

  const { error } = await query

  if (error) {
    console.error('[admissions/actions] delete failed:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/principal/admissions')
  revalidatePath('/dashboard/director/applications')
  return { ok: true }
}

export interface RegisterLearnerInput {
  firstName: string
  lastName: string
  middleName?: string
  gender?: string
  dob?: string
  placeOfBirth?: string
  nationality?: string
  classAppliedFor: string
  curriculum?: string
  academicYear?: string
  startTerm?: string
  previousSchool?: string

  parentName: string
  parentRelationship?: string
  parentPhone: string
  parentEmail: string
  parentWhatsapp?: string
  parentAddress?: string

  transportRequired?: boolean
  feePlan?: string
  medicalConditions?: string
  additionalNotes?: string
}

export async function registerLearnerAction(payload: RegisterLearnerInput) {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, ALLOWED_STAFF_ROLES)) {
    return { error: 'Unauthorized to register learners' }
  }

  const supabase = createServiceClient()

  // Generate unique application number
  const year = new Date().getFullYear()
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
  const applicationNo = `LIS-${year}-${randomSuffix}`

  // Attribution resolution
  const isSales = session.roles.includes('Sales')
  const agentName = `${session.profile?.first_name || ''} ${session.profile?.last_name || ''}`.trim() || session.user.email || 'Sales Agent'

  const { data, error } = await supabase
    .from('admission_applications')
    .insert({
      application_no: applicationNo,
      first_name: payload.firstName.trim(),
      last_name: payload.lastName.trim(),
      middle_name: payload.middleName?.trim() || null,
      date_of_birth: payload.dob || null,
      gender: payload.gender || null,
      place_of_birth: payload.placeOfBirth || null,
      nationality: payload.nationality || 'Tanzanian',
      curriculum: payload.curriculum || 'Cambridge',
      class_applied_for: payload.classAppliedFor,
      academic_year: payload.academicYear || `${year}/${year + 1}`,
      start_term: payload.startTerm || 'Term 1',
      previous_school: payload.previousSchool || null,

      parent_name: payload.parentName.trim(),
      parent_relationship: payload.parentRelationship || 'Parent',
      parent_email: payload.parentEmail.trim(),
      parent_phone: payload.parentPhone.trim(),
      parent_whatsapp: payload.parentWhatsapp || null,
      parent_address: payload.parentAddress || null,

      transport_required: Boolean(payload.transportRequired),
      fee_plan: payload.feePlan || 'Standard Termly',
      medical_conditions: payload.medicalConditions || null,
      additional_notes: payload.additionalNotes || null,

      source: isSales ? 'sales' : 'in_person',
      registered_by: session.user.id,
      sales_agent_name: `${agentName} (${isSales ? 'Sales' : session.roles[0] || 'Staff'})`,
      status: 'submitted',
    })
    .select('*')
    .single()

  if (error) {
    console.error('[admissions/register] DB insert failed:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/principal/admissions')
  return { ok: true, application: data }
}
