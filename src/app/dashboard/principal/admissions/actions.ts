'use server'

import crypto from 'crypto'
import { getSessionUser } from '@/lib/auth/session'
import { hasAnyRole } from '@/lib/auth/roles'
import { createServiceClient } from '@/utils/supabase/service'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/utils/audit'
import { resolveClassFeeStructures } from '@/lib/finance/feeStructureHelper'

const ALLOWED_STAFF_ROLES = [
  'System Admin',
  'Director',
  'Principal',
  'Dean',
  'Head of Section',
  'Accountant',
  'Sales',
  'Receptionist',
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

  // Sales users can only update applications attributed to them; Management and Receptionist can manage all
  const isManagement = hasAnyRole(session.roles, [
    'System Admin',
    'Director',
    'Principal',
    'Dean',
    'Head of Section',
    'Receptionist',
  ])

  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
    reviewed_by: session.user.id,
  }

  if (notes !== undefined) {
    updateData.notes = notes
  }

  let query = supabase
    .from('admission_applications')
    .update(updateData)
    .eq('id', id)

  if (!isManagement) {
    query = query.eq('registered_by', session.user.id)
  }

  const { error } = await query

  if (error) {
    console.error('[admissions/actions] update failed:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/principal/admissions')
  revalidatePath('/dashboard/director/applications')
  return { ok: true, status: newStatus }
}

export interface EnrollLearnerDetailsInput {
  targetClassId?: string
  gradeLevel?: string
  section?: string
  admissionDate?: string
  dob?: string
  gender?: string
  nationality?: string
  languageAtHome?: string
  previousSchool?: string
  emergencyContact?: string
  medicalInfo?: string
  allergies?: string
  notes?: string
}

export async function enrollLearnerAction(
  applicationId: string,
  detailsOrClassId?: string | EnrollLearnerDetailsInput,
  notesArg?: string
) {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, ALLOWED_STAFF_ROLES)) {
    return { error: 'Unauthorized to enroll learners' }
  }

  const details: EnrollLearnerDetailsInput =
    typeof detailsOrClassId === 'string'
      ? { targetClassId: detailsOrClassId, notes: notesArg }
      : { ...(detailsOrClassId || {}), notes: detailsOrClassId?.notes ?? notesArg }

  const targetClassId = details.targetClassId
  const notes = details.notes

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

  const isManagement = hasAnyRole(session.roles, [
    'System Admin',
    'Director',
    'Principal',
    'Dean',
    'Head of Section',
    'Receptionist',
  ])

  if (!isManagement && app.registered_by !== session.user.id) {
    return { error: 'Unauthorized: You can only manage learners attributed to you' }
  }

  // If already enrolled and has student record, check if student exists
  if (app.enrolled_student_id) {
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id, student_id')
      .eq('id', app.enrolled_student_id)
      .maybeSingle()

    if (existingStudent) {
      // Update their class, stream, and bio details if provided
      const existingUpdate: Record<string, any> = {}
      if (targetClassId) existingUpdate.class_id = targetClassId
      if (details.gradeLevel) existingUpdate.grade_level = details.gradeLevel
      if (details.section !== undefined) existingUpdate.section = details.section || null
      if (details.dob !== undefined) existingUpdate.dob = details.dob || null
      if (details.gender !== undefined) existingUpdate.gender = details.gender || null
      if (details.nationality !== undefined) existingUpdate.nationality = details.nationality || null
      if (details.languageAtHome !== undefined) existingUpdate.language_at_home = details.languageAtHome || null
      if (details.previousSchool !== undefined) existingUpdate.previous_school = details.previousSchool || null
      if (details.emergencyContact !== undefined) existingUpdate.emergency_contact = details.emergencyContact || null
      if (details.medicalInfo !== undefined) existingUpdate.medical_info = details.medicalInfo || null
      if (details.allergies !== undefined) existingUpdate.allergies = details.allergies || null
      if (details.admissionDate !== undefined) existingUpdate.admission_date = details.admissionDate || null

      if (Object.keys(existingUpdate).length > 0) {
        await supabase
          .from('students')
          .update(existingUpdate)
          .eq('id', existingStudent.id)
      }

      if (targetClassId) {
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
      const searchName = (details.gradeLevel || app.class_applied_for || '').trim().toLowerCase()
      const searchSection = (details.section || '').trim().toLowerCase()
      // Try exact name + section match
      matchedClass = classList.find(
        (c) =>
          ((c.name || '').toLowerCase() === searchName ||
            (c.class_name || '').toLowerCase() === searchName ||
            (c.grade_level || '').toLowerCase() === searchName) &&
          (!searchSection || (c.section || '').toLowerCase() === searchSection)
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

  // 6. Insert Student Record with full additional details (class, stream/section, bio-data)
  const resolvedGrade =
    details.gradeLevel || matchedClass?.grade_level || matchedClass?.name || app.class_applied_for
  const resolvedSection =
    details.section !== undefined && details.section !== ''
      ? details.section
      : matchedClass?.section || null

  const { error: studentError } = await supabase.from('students').insert({
    id: studentUserId,
    profile_id: studentUserId,
    student_id: studentIdStr,
    grade_level: resolvedGrade,
    section: resolvedSection,
    class_id: classId,
    dob: details.dob || app.date_of_birth || null,
    gender: details.gender || app.gender || null,
    nationality: details.nationality || app.nationality || 'Tanzanian',
    language_at_home: details.languageAtHome || 'English',
    medical_info: details.medicalInfo ?? app.medical_conditions ?? null,
    allergies: details.allergies || null,
    previous_school: details.previousSchool ?? app.previous_school ?? null,
    emergency_contact:
      details.emergencyContact ||
      (app.parent_name ? `${app.parent_name} - ${app.parent_phone || ''}` : null),
    admission_date: details.admissionDate || new Date().toISOString().slice(0, 10),
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

  // 10. Automatically generate initial fee invoice if fee structure exists for placed class
  let invoiceGenerated = false
  let invoiceId: string | null = null
  let invoiceTotal = 0
  try {
    const academicYear = app.academic_year || '2027'
    const term = app.start_term || 'Term 1'

    const resolved = await resolveClassFeeStructures(
      supabase,
      resolvedGrade || app.class_applied_for,
      term,
      academicYear,
      true
    )

    if (resolved.items.length > 0) {
      const totalAmount = resolved.items.reduce((sum, f) => sum + Number(f.amount), 0)
      const { data: newInvoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          student_id: studentUserId,
          academic_year: resolved.academicYearUsed,
          term: term,
          total_amount: totalAmount,
          discount_amount: 0.0,
          status: 'Pending',
          due_date: resolved.dueDate,
          generated_by: session.user.id,
        })
        .select('id')
        .single()

      if (newInvoice && !invErr) {
        const items = resolved.items.map((f) => ({
          invoice_id: newInvoice.id,
          fee_structure_id: f.id,
          amount: f.amount,
          description: f.fee_type || 'Tuition Fee',
        }))
        await supabase.from('invoice_items').insert(items)
        invoiceGenerated = true
        invoiceId = newInvoice.id
        invoiceTotal = totalAmount
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
    invoice_id: invoiceId,
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
    invoice_id: invoiceId,
    invoice_total: invoiceTotal,
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
  enrollImmediately?: boolean
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

  // Attribution resolution: Students registered by Receptionist are attributed to "WALK IN"
  const isReceptionist = session.roles.includes('Receptionist')
  const isSales = session.roles.includes('Sales') && !isReceptionist
  const agentName = `${session.profile?.first_name || ''} ${session.profile?.last_name || ''}`.trim() || session.user.email || 'Sales Agent'
  const resolvedSource = isReceptionist ? 'walk_in' : isSales ? 'sales' : 'in_person'
  const resolvedAttribution = isReceptionist
    ? 'WALK IN'
    : `${agentName} (${isSales ? 'Sales' : session.roles[0] || 'Staff'})`

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

      source: resolvedSource,
      registered_by: session.user.id,
      sales_agent_name: resolvedAttribution,
      status: 'submitted',
    })
    .select('*')
    .single()

  if (error) {
    console.error('[admissions/register] DB insert failed:', error)
    return { error: error.message }
  }

  // Persist TZS 20,000 application form invoice
  let createdInvoice: any = null
  const { data: invRow, error: invError } = await supabase
    .from('admission_invoices')
    .insert({
      application_id: data.id,
      invoice_no: `INV-${applicationNo}`,
      amount: 20000,
      currency: 'TZS',
      status: 'unpaid',
    })
    .select('*')
    .single()

  if (invError) {
    console.warn('[admissions/register] admission_invoices insert warning:', invError.message)
  } else {
    createdInvoice = invRow
  }

  // If caller requested immediate admission/enrollment (and is authorized to enroll)
  if (payload.enrollImmediately && !isSales) {
    const enrollRes = await enrollLearnerAction(data.id)
    if (enrollRes.ok) {
      revalidatePath('/dashboard/accountant/invoices')
      return {
        ok: true,
        application: {
          ...data,
          status: 'enrolled',
          enrolled_student_id: enrollRes.student_user_id,
          admission_invoices: createdInvoice ? [createdInvoice] : [],
        },
        invoice: createdInvoice,
        enrolled: true,
        student_id: enrollRes.student_id,
      }
    }
  }

  revalidatePath('/dashboard/principal/admissions')
  revalidatePath('/dashboard/accountant/invoices')
  return {
    ok: true,
    application: {
      ...data,
      admission_invoices: createdInvoice ? [createdInvoice] : [],
    },
    invoice: createdInvoice,
  }
}

const INVOICE_SETTLEMENT_ROLES = [
  'System Admin',
  'Director',
  'Principal',
  'Accountant',
  'Receptionist',
] as const

export async function markAdmissionInvoicePaidAction(input: {
  invoiceId?: string
  applicationId: string
  paymentMethod: string
  paymentReference?: string
  notes?: string
}) {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, INVOICE_SETTLEMENT_ROLES)) {
    return { error: 'Unauthorized to mark admission invoices as paid' }
  }

  const supabase = createServiceClient()
  const now = new Date().toISOString()

  let updatedInvoice: any = null

  if (input.invoiceId) {
    const { data, error } = await supabase
      .from('admission_invoices')
      .update({
        status: 'paid',
        payment_method: input.paymentMethod || 'Cash',
        payment_reference: input.paymentReference?.trim() || null,
        notes: input.notes?.trim() || null,
        paid_at: now,
        paid_by: session.user.id,
        updated_at: now,
      })
      .eq('id', input.invoiceId)
      .select('*')
      .single()

    if (error) return { error: error.message }
    updatedInvoice = data
  } else {
    // Upsert by application_id in case application predated the invoice table
    const { data: appRow } = await supabase
      .from('admission_applications')
      .select('application_no')
      .eq('id', input.applicationId)
      .single()

    const invoiceNo = `INV-${appRow?.application_no || input.applicationId.slice(0, 8).toUpperCase()}`
    const { data, error } = await supabase
      .from('admission_invoices')
      .upsert(
        {
          application_id: input.applicationId,
          invoice_no: invoiceNo,
          amount: 20000,
          currency: 'TZS',
          status: 'paid',
          payment_method: input.paymentMethod || 'Cash',
          payment_reference: input.paymentReference?.trim() || null,
          notes: input.notes?.trim() || null,
          paid_at: now,
          paid_by: session.user.id,
          updated_at: now,
        },
        { onConflict: 'application_id' }
      )
      .select('*')
      .single()

    if (error) return { error: error.message }
    updatedInvoice = data
  }

  revalidatePath('/dashboard/principal/admissions')
  revalidatePath('/dashboard/accountant/invoices')
  return { ok: true, invoice: updatedInvoice }
}
