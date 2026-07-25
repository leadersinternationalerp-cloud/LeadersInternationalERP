'use server'

import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/utils/audit'

export async function searchParentsAction(query: string) {
  const supabase = await createClient()

  // Find parents by name or email
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, phone')
    .like('roles', '%Parent%')
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10)

  if (error) {
    return { error: error.message }
  }

  return { data }
}

export async function enrollStudentAction(formData: any) {
  const supabaseService = createServiceClient()
  
  // 1. Create Auth User
  const email = formData.email || `student.${Date.now()}@leaders.ac.tz`
  const password = 'Password@123'

  const { data: authData, error: authError } = await supabaseService.auth.admin.createUser({
    email,
    password,
    email_confirm: true
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
      username: `student.${Date.now()}`
    })

  if (profileError) {
    // Attempt rollback
    await supabaseService.auth.admin.deleteUser(userId)
    return { error: `Failed to create profile: ${profileError.message}` }
  }

  // 3. Generate Student ID
  const { count } = await supabaseService
    .from('students')
    .select('*', { count: 'exact', head: true })
  
  const nextId = (count || 0) + 1
  const studentIdStr = `STUD-${nextId.toString().padStart(4, '0')}`

  // Find class ID matching name or class_name with section fallbacks
  let classId = null
  const { data: classList } = await supabaseService
    .from('classes')
    .select('id, name, section')

  if (classList && classList.length > 0) {
    const searchName = `${formData.grade_level} ${formData.section || ''}`.trim().toLowerCase()
    const exactNameMatch = classList.find(c => c.name.toLowerCase() === searchName)
    if (exactNameMatch) {
      classId = exactNameMatch.id
    } else {
      const matchByGrade = classList.find(c => 
        c.name.toLowerCase().includes(formData.grade_level.toLowerCase()) && 
        (!formData.section || c.section?.toLowerCase() === formData.section?.toLowerCase())
      )
      if (matchByGrade) {
        classId = matchByGrade.id
      } else {
        const matchByGradeOnly = classList.find(c => c.name.toLowerCase().includes(formData.grade_level.toLowerCase()))
        if (matchByGradeOnly) {
          classId = matchByGradeOnly.id
        }
      }
    }
  }

  // 4. Insert Student Record with EY specific fields
  const { error: studentError } = await supabaseService
    .from('students')
    .insert({
      id: userId,
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
      emergency_contact: formData.emergency_contact || null
    })

  if (studentError) {
    await supabaseService.auth.admin.deleteUser(userId)
    return { error: `Failed to create student record: ${studentError.message}` }
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

  await logAuditAction('Student Enrolled', 'students', { student_id: studentIdStr, user_id: userId })

  revalidatePath('/dashboard/students')
  return { success: true, student_id: studentIdStr }
}

export async function updateStudentAction(studentId: string, formData: any) {
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

  // 2. Resolve Class ID based on grade level and section
  let classId = null
  const { data: classList } = await supabaseService
    .from('classes')
    .select('id, name, section')

  if (classList && classList.length > 0) {
    const searchName = `${formData.grade_level} ${formData.section || ''}`.trim().toLowerCase()
    const exactNameMatch = classList.find(c => c.name.toLowerCase() === searchName)
    if (exactNameMatch) {
      classId = exactNameMatch.id
    } else {
      const matchByGrade = classList.find(c => 
        c.name.toLowerCase().includes(formData.grade_level.toLowerCase()) && 
        (!formData.section || c.section?.toLowerCase() === formData.section?.toLowerCase())
      )
      if (matchByGrade) {
        classId = matchByGrade.id
      } else {
        const matchByGradeOnly = classList.find(c => c.name.toLowerCase().includes(formData.grade_level.toLowerCase()))
        if (matchByGradeOnly) {
          classId = matchByGradeOnly.id
        }
      }
    }
  }

  // 3. Update Student Record (grade_level, section, class_id)
  const { error: studentError } = await supabaseService
    .from('students')
    .update({
      grade_level: formData.grade_level,
      section: formData.section || null,
      class_id: classId
    })
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
      console.warn('Failed to update auth email (normal if email is duplicate):', authError.message)
    }
  }

  await logAuditAction('Student Details Updated', 'students', { user_id: studentId })

  revalidatePath('/dashboard/students')
  return { success: true }
}

export async function toggleStudentActiveAction(studentId: string, currentActiveStatus: boolean) {
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

export async function cleanupOldInactiveStudents() {
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
    console.error('[CLEANUP ERROR] Failed to fetch inactive profiles:', fetchErr.message)
    return { error: fetchErr.message }
  }

  // Filter to keep only student profiles
  const studentProfiles = (inactiveProfiles || []).filter(p => 
    p.roles && Array.isArray(p.roles) ? p.roles.includes('Student') : p.role === 'Student'
  )

  if (studentProfiles.length === 0) {
    return { success: true, count: 0 }
  }

  console.log(`[CLEANUP] Found ${studentProfiles.length} inactive student profiles to delete.`)

  let deleteCount = 0
  for (const prof of studentProfiles) {
    try {
      // Delete auth user (cascades to profiles, students, and other dependent tables)
      const { error: deleteErr } = await supabase.auth.admin.deleteUser(prof.id)
      if (deleteErr) {
        console.error(`[CLEANUP ERROR] Failed to delete user ${prof.id}:`, deleteErr.message)
      } else {
        console.log(`[CLEANUP] Successfully deleted deactivated student: ${prof.first_name} ${prof.last_name} (${prof.id})`)
        deleteCount++
      }
    } catch (e: any) {
      console.error(`[CLEANUP ERROR] Exception for student ${prof.id}:`, e.message)
    }
  }

  return { success: true, count: deleteCount }
}
