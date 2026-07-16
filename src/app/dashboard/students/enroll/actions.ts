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

  // 4. Insert Student Record
  const { error: studentError } = await supabaseService
    .from('students')
    .insert({
      id: userId,
      student_id: studentIdStr,
      grade_level: formData.grade_level,
      section: formData.section || null,
      dob: formData.dob || null,
      gender: formData.gender || null,
      nationality: formData.nationality || null
    })

  if (studentError) {
    await supabaseService.auth.admin.deleteUser(userId)
    return { error: `Failed to create student record: ${studentError.message}` }
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
