'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendSMS } from '@/utils/notifications'

export type DisciplineRecordInput = {
  student_id: string
  incident_date: string
  category: 'Misconduct' | 'Absenteeism' | 'Academic Dishonesty' | 'Bullying' | 'Other'
  description: string
  action_taken: string
  follow_up_required: boolean
  follow_up_date?: string | null
}

export async function saveDisciplineRecordAction(data: DisciplineRecordInput) {
  const supabase = await createClient()

  // 1. Verify user is logged in
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Not authenticated.' }
  }

  // 2. Verify user is Dean or System Admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Dean') && !userRoles.includes('System Admin')) {
    return { error: 'Access Denied. Only Deans or Admins can log discipline records.' }
  }

  // 3. Validate parameters
  if (!data.student_id || !data.incident_date || !data.category || !data.description || !data.action_taken) {
    return { error: 'Please fill in all required fields (Student, Incident Date, Category, Description, and Action Taken).' }
  }

  const validCategories = ['Misconduct', 'Absenteeism', 'Academic Dishonesty', 'Bullying', 'Other']
  if (!validCategories.includes(data.category)) {
    return { error: 'Invalid incident category specified.' }
  }

  if (data.follow_up_required && !data.follow_up_date) {
    return { error: 'Follow-up date is required when follow-up is enabled.' }
  }

  // Fetch student details for the notification message
  const { data: student, error: studentFetchError } = await supabase
    .from('students')
    .select(`
      id,
      student_id,
      profiles (
        first_name,
        last_name
      )
    `)
    .eq('id', data.student_id)
    .single()

  if (studentFetchError || !student) {
    return { error: 'Selected student not found.' }
  }

  const studentProfile: any = student.profiles
  const studentName = studentProfile
    ? `${studentProfile.first_name} ${studentProfile.last_name}`
    : 'your child'

  // Fetch linked parents for this student
  const { data: parentLinks, error: parentsFetchError } = await supabase
    .from('student_parents')
    .select(`
      parent_id,
      profiles (
        id,
        first_name,
        last_name,
        phone_number,
        email
      )
    `)
    .eq('student_id', data.student_id)

  const parentNotified = parentLinks && parentLinks.length > 0 ? true : false

  // 4. Insert the discipline record
  const { data: record, error: insertError } = await supabase
    .from('discipline_records')
    .insert({
      student_id: data.student_id,
      incident_date: data.incident_date,
      category: data.category,
      description: data.description,
      action_taken: data.action_taken,
      follow_up_required: data.follow_up_required,
      follow_up_date: data.follow_up_required ? data.follow_up_date : null,
      parent_notified: parentNotified,
      created_by: user.id
    })
    .select()
    .single()

  if (insertError) {
    return { error: `Failed to save discipline record: ${insertError.message}` }
  }

  // 5. Trigger notifications if parents are linked
  if (parentLinks && parentLinks.length > 0) {
    const messageText = `Discipline Update: A case (${data.category}) was recorded for ${studentName} on ${data.incident_date}. Action Taken: ${data.action_taken}.`

    for (const link of parentLinks) {
      const parentProfile: any = link.profiles
      if (!parentProfile) continue

      // In-app notification
      try {
        await supabase.from('notifications').insert({
          user_id: parentProfile.id,
          message: messageText,
          link_url: '/dashboard/parent/discipline'
        })
      } catch (notifErr) {
        console.error(`Failed to insert notification for parent ${parentProfile.id}:`, notifErr)
      }

      // SMS notification
      const phone = parentProfile.phone_number || '+255770000000'
      try {
        await sendSMS(phone, messageText)
      } catch (smsErr) {
        console.error(`Failed to send SMS notification to ${phone}:`, smsErr)
      }
    }
  }

  // Revalidate both paths to update Dean's and Parent's views
  revalidatePath('/dashboard/dean/discipline')
  revalidatePath('/dashboard/parent/discipline')

  return { success: true, record }
}
