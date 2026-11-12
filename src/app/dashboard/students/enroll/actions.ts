'use server'

import crypto from 'crypto'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/utils/audit'
import { getSessionUser } from '@/lib/auth/session'
import { hasAnyRole } from '@/lib/auth/roles'
import { sanitizePostgrestValue, escapeLike } from '@/lib/sanitize'
import { resolveClassFeeStructures } from '@/lib/finance/feeStructureHelper'

const ALLOWED_STAFF_ROLES = [
  'System Admin',
  'Director',
  'Principal',
  'Dean',
  'Head of Section',
  'Receptionist',
] as const

export async function searchParentsAction(query: string) {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, ALLOWED_STAFF_ROLES)) {
    return { error: 'Unauthorized' }
  }

  const supabase = await createClient()
  const term = sanitizePostgrestValue(query)
  if (!term) return { data: [] }
  const escaped = escapeLike(term)

  // Find parents by name or email with array containment and sanitized ILIKE
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone')
    .contains('roles', ['Parent'])
    .or(`first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%`)
    .limit(10)

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function enrollStudentAction(formData: any) {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, ALLOWED_STAFF_ROLES)) {
    return { error: 'Unauthorized' }
  }

  const supabaseService = createServiceClient()
  
  // 1. Create Auth User with random temporary secret
  const email = formData.email || `student.${Date.now()}@leaders.ac.tz`
  const temporaryPassword = crypto.randomUUID()

  const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: {
      first_login: true,
    }
  })

  if (authError || !authData.user) {
    return { error: `Failed to create auth user: ${authError?.message}` }
  }

  const userId = authData.user.id

  // 2. Insert Profile
  const { error: profileError } = await supabaseService
    .from('profiles')
    .insert({
      id: userId,
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: email,
      phone: formData.phone || null,
      role: 'Student', // Legacy
      roles: ['Student'], // New array
      username: `student.${Date.now()}`,
      force_pin_change: true,
    })

  if (profileError) {
    // Rollback auth user
    await supabaseService.auth.admin.deleteUser(userId)
    return { error: `Failed to create profile: ${profileError.message}` }
  }

  // 3. Generate Student ID via sequence RPC or fallback
  let studentIdStr = ''
  try {
    const { data: seqVal } = await supabaseService.rpc('nextval_student_code')
    if (seqVal) {
      studentIdStr = `STUD-${String(seqVal).padStart(4, '0')}`
    }
  } catch {
    // fallback
  }

  if (!studentIdStr) {
    const { count } = await supabaseService
      .from('students')
      .select('*', { count: 'exact', head: true })
    const nextId = (count || 0) + 1000 + Math.floor(Math.random() * 50)
    studentIdStr = `STUD-${nextId.toString().padStart(4, '0')}`
  }

  // Find class ID matching name or class_name with section fallbacks
  let classId = null
  const { data: classList } = await supabaseService
    .from('classes')
    .select('id, name, section')

  if (classList && classList.length > 0) {
    const searchName = `${formData.grade_level} ${formData.section || ''}`.trim().toLowerCase()
    const exactNameMatch = classList.find(c => (c.name || '').toLowerCase() === searchName)
    if (exactNameMatch) {
      classId = exactNameMatch.id
    } else {
      const matchByGrade = classList.find(c => 
        (c.name || '').toLowerCase().includes((formData.grade_level || '').toLowerCase()) && 
        (!formData.section || c.section?.toLowerCase() === formData.section?.toLowerCase())
      )
      if (matchByGrade) {
        classId = matchByGrade.id
      } else {
        const matchByGradeOnly = classList.find(c => (c.name || '').toLowerCase().includes((formData.grade_level || '').toLowerCase()))
        if (matchByGradeOnly) {
          classId = matchByGradeOnly.id
        }
      }
    }
  }

  // 4. Insert Student Record with EY specific fields & Walk-In Attribution for Receptionist
  const isReceptionist = session.roles.includes('Receptionist')
  const studentSource = isReceptionist ? 'walk_in' : 'in_person'
  const studentAttribution = isReceptionist ? 'WALK IN' : null

  const { error: studentError } = await supabaseService
    .from('students')
    .insert({
      id: userId,
      profile_id: userId,
      student_id: studentIdStr,
      grade_level: formData.grade_level,
      section: formData.section || null,
      class_id: classId,
      dob: formData.dob || null,
      gender: formData.gender || null,
      nationality: formData.nationality || null,
      medical_info: formData.medical_info || null,
      allergies: formData.allergies || null,
      language_at_home: formData.language_at_home || null,
      previous_school: formData.previous_school || null,
      emergency_contact: formData.emergency_contact || null,
      source: studentSource,
      registered_by: session.user.id,
      sales_agent_name: studentAttribution,
      is_active: true,
    })

  if (studentError) {
    await supabaseService.auth.admin.deleteUser(userId)
    return { error: `Failed to create student record: ${studentError.message}` }
  }

  // Also record in admission_applications so Admissions Desk reflects Walk-In / Direct enrollments
  try {
    const year = new Date().getFullYear()
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase()
    const applicationNo = `LIS-${year}-${randomSuffix}`

    const { data: appData } = await supabaseService
      .from('admission_applications')
      .insert({
        application_no: applicationNo,
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.dob || null,
        gender: formData.gender || null,
        nationality: formData.nationality || 'Tanzanian',
        curriculum: (formData.grade_level || '').toLowerCase().includes('cambridge') ? 'Cambridge' : 'NECTA',
        class_applied_for: formData.grade_level,
        academic_year: `${year}/${year + 1}`,
        start_term: 'Term 1',
        previous_school: formData.previous_school || null,
        parent_name: formData.emergency_contact || `${formData.first_name} ${formData.last_name} Guardian`,
        parent_relationship: formData.relationship || 'Parent',
        parent_email: email,
        parent_phone: formData.phone || formData.emergency_contact || 'N/A',
        medical_conditions: formData.medical_info || null,
        additional_notes: formData.allergies ? `Allergies: ${formData.allergies}` : null,
        source: studentSource,
        registered_by: session.user.id,
        sales_agent_name: studentAttribution,
        enrolled_student_id: userId,
        reviewed_by: session.user.id,
        status: 'enrolled',
      })
      .select('id')
      .maybeSingle()

    if (appData?.id) {
      await supabaseService
        .from('students')
        .update({ admission_id: appData.id })
        .eq('id', userId)
    }
  } catch (appErr) {
    console.warn('[enrollStudentAction] non-critical admission sync warning:', appErr)
  }

  // Insert into student_classes junction table if classId is found
  if (classId) {
    const { error: junctionError } = await supabaseService
      .from('student_classes')
      .insert({
        student_id: userId,
        class_id: classId
      })
    if (junctionError) {
      console.error('Failed to insert student_classes record:', junctionError.message)
    }
  }

  // 5. Link Parent
  if (formData.parent_id) {
    const { error: linkError } = await supabaseService
      .from('student_parents')
      .insert({
        student_id: userId,
        parent_id: formData.parent_id,
        relationship: formData.relationship || 'Parent'
      })
      
    if (linkError) {
      console.error('Failed to link parent:', linkError.message)
    }
  }

  // 6. Auto-generate initial Term 1 fee invoice based on placed class
  let invoiceId: string | null = null
  let invoiceTotal = 0
  try {
    const resolved = await resolveClassFeeStructures(
      supabaseService,
      formData.grade_level || 'Grade 1',
      'Term 1',
      '2027',
      true
    )
    if (resolved.items.length > 0) {
      const totalAmount = resolved.items.reduce((sum, f) => sum + Number(f.amount), 0)
      const { data: newInvoice, error: invErr } = await supabaseService
        .from('invoices')
        .insert({
          student_id: userId,
          academic_year: resolved.academicYearUsed,
          term: 'Term 1',
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
        await supabaseService.from('invoice_items').insert(items)
        invoiceId = newInvoice.id
        invoiceTotal = totalAmount
      }
    }
  } catch (invErr) {
    console.warn('[enrollStudentAction] auto-invoice notice:', invErr)
  }

  await logAuditAction('Student Enrolled', 'students', { student_id: studentIdStr, user_id: userId, source: studentSource, attribution: studentAttribution, invoice_id: invoiceId })

  revalidatePath('/dashboard/students')
  revalidatePath('/dashboard/principal/admissions')
  revalidatePath('/dashboard/accountant/invoices')
  revalidatePath('/dashboard/accountant/fee-balances')
  return {
    success: true,
    student_id: studentIdStr,
    student_user_id: userId,
    attribution: studentAttribution,
    invoice_id: invoiceId,
    invoice_total: invoiceTotal,
  }
}

export async function updateStudentAction(studentId: string, formData: any) {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, ALLOWED_STAFF_ROLES)) {
    return { error: 'Unauthorized' }
  }

  const supabaseService = createServiceClient()

  // 1. Update Profile (first_name, last_name, email, phone)
  const { error: profileError } = await supabaseService
    .from('profiles')
    .update({
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email || null,
      phone: formData.phone || null
    })
    .eq('id', studentId)

  if (profileError) {
    return { error: `Failed to update profile: ${profileError.message}` }
  }

  // 2. Resolve Class ID based on direct selection or grade level and section
  let classId = formData.class_id || null
  const { data: classList } = await supabaseService
    .from('classes')
    .select('id, name, section, grade_level')

  if (classId && classList) {
    const matched = classList.find(c => c.id === classId)
    if (matched) {
      if (!formData.grade_level) formData.grade_level = matched.grade_level || matched.name
      if (!formData.section && matched.section) formData.section = matched.section
    }
  } else if (classList && classList.length > 0) {
    const searchName = `${formData.grade_level} ${formData.section || ''}`.trim().toLowerCase()
    const exactNameMatch = classList.find(c => (c.name || '').toLowerCase() === searchName)
    if (exactNameMatch) {
      classId = exactNameMatch.id
    } else {
      const matchByGrade = classList.find(c => 
        (c.name || '').toLowerCase().includes((formData.grade_level || '').toLowerCase()) && 
        (!formData.section || c.section?.toLowerCase() === formData.section?.toLowerCase())
      )
      if (matchByGrade) {
        classId = matchByGrade.id
      } else {
        const matchByGradeOnly = classList.find(c => (c.name || '').toLowerCase().includes((formData.grade_level || '').toLowerCase()))
        if (matchByGradeOnly) {
          classId = matchByGradeOnly.id
        }
      }
    }
  }

  // 3. Update Student Record (grade_level, section, class_id, and bio-data fields)
  const studentUpdatePayload: Record<string, any> = {
    grade_level: formData.grade_level,
    section: formData.section || null,
    class_id: classId,
  }
  if (formData.dob !== undefined) studentUpdatePayload.dob = formData.dob || null
  if (formData.gender !== undefined) studentUpdatePayload.gender = formData.gender || null
  if (formData.nationality !== undefined) studentUpdatePayload.nationality = formData.nationality || null
  if (formData.medical_info !== undefined) studentUpdatePayload.medical_info = formData.medical_info || null
  if (formData.allergies !== undefined) studentUpdatePayload.allergies = formData.allergies || null
  if (formData.language_at_home !== undefined) studentUpdatePayload.language_at_home = formData.language_at_home || null
  if (formData.previous_school !== undefined) studentUpdatePayload.previous_school = formData.previous_school || null
  if (formData.emergency_contact !== undefined) studentUpdatePayload.emergency_contact = formData.emergency_contact || null

  const { error: studentError } = await supabaseService
    .from('students')
    .update(studentUpdatePayload)
    .eq('id', studentId)

  if (studentError) {
    return { error: `Failed to update student record: ${studentError.message}` }
  }

  // 4. Update student_classes junction
  if (classId) {
    // Delete existing junction record
    await supabaseService
      .from('student_classes')
      .delete()
      .eq('student_id', studentId)

    // Insert new one
    const { error: junctionError } = await supabaseService
      .from('student_classes')
      .insert({
        student_id: studentId,
        class_id: classId
      })
    if (junctionError) {
      console.error('Failed to update student_classes record:', junctionError.message)
    }
  }

  // 5. Update Auth user email if changed
  if (formData.email) {
    const { error: authError } = await supabaseService.auth.admin.updateUserById(studentId, {
      email: formData.email
    })
    if (authError) {
      console.warn('Failed to update auth email:', authError.message)
    }
  }

  await logAuditAction('Student Details Updated', 'students', { user_id: studentId })

  revalidatePath('/dashboard/students')
  return { success: true }
}

export async function toggleStudentActiveAction(studentId: string, currentActiveStatus: boolean) {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, ALLOWED_STAFF_ROLES)) {
    return { error: 'Unauthorized' }
  }

  const supabaseService = createServiceClient()
  const newStatus = !currentActiveStatus

  // 1. Update Profile (is_active)
  const { error } = await supabaseService
    .from('profiles')
    .update({
      is_active: newStatus
    })
    .eq('id', studentId)

  if (error) {
    return { error: `Failed to update student active status: ${error.message}` }
  }

  // 2. Lock or unlock auth user to prevent login
  try {
    await supabaseService.auth.admin.updateUserById(studentId, {
      ban_duration: newStatus ? 'none' : '876000h' // Ban for 100 years if deactivating
    })
  } catch (authErr: any) {
    console.warn('Auth user status update warning:', authErr.message)
  }

  await logAuditAction(
    newStatus ? 'Student Activated' : 'Student Deactivated', 
    'students', 
    { user_id: studentId }
  )

  revalidatePath('/dashboard/students')
  return { success: true, is_active: newStatus }
}

export async function cleanupOldInactiveStudents(dryRun: boolean = true) {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, ['System Admin', 'Director'])) {
    return { error: 'Unauthorized' }
  }

  const supabase = createServiceClient()

  // 1. Fetch all profiles that are inactive (is_active = false) and updated more than 1 year ago
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  const oneYearAgoISO = oneYearAgo.toISOString()

  const { data: inactiveProfiles, error: fetchErr } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, roles')
    .eq('is_active', false)
    .lt('updated_at', oneYearAgoISO)

  if (fetchErr) {
    return { error: fetchErr.message }
  }

  // Filter to keep only student profiles
  const studentProfiles = (inactiveProfiles || []).filter(p => 
    p.roles && Array.isArray(p.roles) ? p.roles.includes('Student') : p.role === 'Student'
  )

  if (studentProfiles.length === 0) {
    return { success: true, count: 0, dryRun }
  }

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      count: studentProfiles.length,
      candidates: studentProfiles.map(p => ({ id: p.id, name: `${p.first_name} ${p.last_name}` }))
    }
  }

  let deleteCount = 0
  for (const prof of studentProfiles) {
    try {
      const { error: deleteErr } = await supabase.auth.admin.deleteUser(prof.id)
      if (!deleteErr) {
        deleteCount++
      }
    } catch {
      // ignore
    }
  }

  return { success: true, count: deleteCount, dryRun: false }
}

export async function generateSingleStudentInvoiceAction(
  studentId: string,
  term: string = 'Term 1',
  academicYear: string = '2026/2027',
  dueDate?: string
) {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, [...ALLOWED_STAFF_ROLES, 'Accountant'])) {
    return { error: 'Unauthorized to generate student invoices' }
  }

  const supabase = createServiceClient()

  // 1. Fetch student details
  const { data: student, error: stError } = await supabase
    .from('students')
    .select('id, student_id, grade_level, section')
    .eq('id', studentId)
    .single()

  if (stError || !student) {
    return { error: `Student not found: ${stError?.message || ''}` }
  }

  // 2. Fetch fee structures for this grade level
  const resolved = await resolveClassFeeStructures(
    supabase,
    student.grade_level,
    term,
    academicYear,
    term === 'Term 1'
  )

  if (!resolved.items || resolved.items.length === 0) {
    return {
      error: `No fee structures configured for grade level "${student.grade_level}". Please add or sync fee structures under Finance -> Fee Structures first.`,
    }
  }

  // 3. Check for existing invoice in this term to avoid duplicate billing
  const { data: existingInv } = await supabase
    .from('invoices')
    .select('id')
    .eq('student_id', studentId)
    .eq('term', term)
    .eq('academic_year', resolved.academicYearUsed)
    .maybeSingle()

  if (existingInv) {
    return {
      error: `An invoice for ${term} (${resolved.academicYearUsed}) already exists for this student.`,
      invoice_id: existingInv.id,
    }
  }

  const totalAmount = resolved.items.reduce((sum, f) => sum + Number(f.amount), 0)

  // 4. Create new invoice
  const { data: newInvoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      student_id: studentId,
      academic_year: resolved.academicYearUsed,
      term: term,
      total_amount: totalAmount,
      discount_amount: 0.0,
      status: 'Pending',
      due_date: dueDate || resolved.dueDate,
      generated_by: session.user.id,
    })
    .select('id')
    .single()

  if (invError || !newInvoice) {
    return { error: `Failed to create invoice: ${invError?.message || ''}` }
  }

  // 5. Insert invoice items
  const items = resolved.items.map((f) => ({
    invoice_id: newInvoice.id,
    fee_structure_id: f.id,
    amount: f.amount,
    description: f.fee_type || 'Tuition Fee',
  }))

  const { error: itemsError } = await supabase.from('invoice_items').insert(items)
  if (itemsError) {
    console.warn('Failed to insert invoice items:', itemsError.message)
  }

  revalidatePath('/dashboard/accountant/invoices')
  revalidatePath('/dashboard/accountant/fee-balances')
  revalidatePath('/dashboard/students')

  return {
    success: true,
    invoice_id: newInvoice.id,
    total_amount: totalAmount,
  }
}

