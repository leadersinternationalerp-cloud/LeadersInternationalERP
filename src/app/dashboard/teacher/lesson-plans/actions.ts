'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitLessonPlanAction(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Authentication required.' }
    }

    const classSubjectPair = formData.get('class_subject') as string
    if (!classSubjectPair || !classSubjectPair.includes('|')) {
      return { error: 'Please select a valid Class & Subject.' }
    }

    const [class_id, subject_id] = classSubjectPair.split('|')
    const week_number = parseInt(formData.get('week_number') as string, 10)
    const term = (formData.get('term') as string) || 'Term 1'
    const academic_year = (formData.get('academic_year') as string) || '2025-2026'
    const teacher_comments = (formData.get('teacher_comments') as string) || ''
    const file = formData.get('file') as File

    if (!file || file.size === 0) {
      return { error: 'Please select a lesson plan document file to upload.' }
    }

    if (isNaN(week_number) || week_number < 1) {
      return { error: 'Please specify a valid week number.' }
    }

    // 1. Upload File to Storage
    const fileExt = file.name.split('.').pop() || 'pdf'
    const fileName = `${user.id}-${class_id}-${subject_id}-w${week_number}-${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('lesson_plans')
      .upload(fileName, file, { upsert: true })

    if (uploadError) {
      console.error('Storage Upload Error:', uploadError)
      return { error: `File upload failed: ${uploadError.message}` }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('lesson_plans')
      .getPublicUrl(fileName)

    // 2. Insert into lesson_plans table
    const { data: insertedPlan, error: dbError } = await supabase
      .from('lesson_plans')
      .insert({
        teacher_id: user.id,
        class_id,
        subject_id,
        week_number,
        term,
        academic_year,
        file_url: publicUrl,
        teacher_comments,
        status: 'Submitted',
        submitted_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('Database Insert Error:', dbError)
      return { error: `Failed to save lesson plan: ${dbError.message}` }
    }

    // 3. Trigger notifications for Supervisors (Head of Section, Dean, Principal, Director)
    try {
      const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()

      const teacherName = teacherProfile
        ? `${teacherProfile.first_name} ${teacherProfile.last_name}`
        : 'A teacher'

      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, role, roles')

      const supervisorRoles = ['Head of Section', 'HOS', 'Dean', 'Principal', 'Vice Principal', 'Director', 'System Admin']

      const targetSupervisors = (allProfiles || []).filter(p => {
        const userRoles = p.roles && Array.isArray(p.roles) && p.roles.length > 0
          ? p.roles
          : (p.role ? p.role.split(',').map((r: string) => r.trim()) : [])
        return userRoles.some((r: string) => supervisorRoles.includes(r))
      })

      if (targetSupervisors.length > 0) {
        const notifications = targetSupervisors.map(s => ({
          user_id: s.id,
          message: `New Lesson Plan submitted by ${teacherName} for Week ${week_number} (${term}).`,
          link_url: `/dashboard/hos/lesson-plans`
        }))
        await supabase.from('notifications').insert(notifications)
      }
    } catch (notifErr) {
      console.error('Error triggering supervisor notifications:', notifErr)
    }

    revalidatePath('/dashboard/teacher/lesson-plans')
    return { success: true, planId: insertedPlan?.id }
  } catch (err: any) {
    console.error('Unexpected error submitting lesson plan:', err)
    return { error: err.message || 'An unexpected error occurred.' }
  }
}

export async function resubmitLessonPlanAction(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { error: 'Authentication required.' }
    }

    const planId = formData.get('planId') as string
    const teacher_comments = (formData.get('teacher_comments') as string) || ''
    const file = formData.get('file') as File | null

    if (!planId) {
      return { error: 'Missing Lesson Plan ID.' }
    }

    // Verify existing plan
    const { data: existingPlan, error: fetchErr } = await supabase
      .from('lesson_plans')
      .select('*')
      .eq('id', planId)
      .single()

    if (fetchErr || !existingPlan) {
      return { error: 'Lesson plan record not found.' }
    }

    if (existingPlan.teacher_id !== user.id) {
      return { error: 'Unauthorized to update this lesson plan.' }
    }

    let fileUrl = existingPlan.file_url

    // Handle new file upload if provided
    if (file && file.size > 0) {
      const fileExt = file.name.split('.').pop() || 'pdf'
      const fileName = `${user.id}-${existingPlan.class_id}-${existingPlan.subject_id}-w${existingPlan.week_number}-revised-${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('lesson_plans')
        .upload(fileName, file, { upsert: true })

      if (uploadError) {
        return { error: `File upload failed: ${uploadError.message}` }
      }

      const { data: { publicUrl } } = supabase.storage
        .from('lesson_plans')
        .getPublicUrl(fileName)

      fileUrl = publicUrl
    }

    // Update lesson plan record back to 'Submitted'
    const { error: updateErr } = await supabase
      .from('lesson_plans')
      .update({
        file_url: fileUrl,
        teacher_comments,
        status: 'Submitted',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)

    if (updateErr) {
      return { error: `Failed to resubmit lesson plan: ${updateErr.message}` }
    }

    // Notify reviewer if assigned, else notify supervisors
    try {
      const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single()

      const teacherName = teacherProfile
        ? `${teacherProfile.first_name} ${teacherProfile.last_name}`
        : 'Teacher'

      if (existingPlan.reviewer_id) {
        await supabase.from('notifications').insert({
          user_id: existingPlan.reviewer_id,
          message: `${teacherName} has resubmitted their lesson plan for Week ${existingPlan.week_number} (${existingPlan.term}).`,
          link_url: `/dashboard/hos/lesson-plans`
        })
      }
    } catch (notifErr) {
      console.error('Error triggering resubmission notification:', notifErr)
    }

    revalidatePath('/dashboard/teacher/lesson-plans')
    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error resubmitting lesson plan:', err)
    return { error: err.message || 'An unexpected error occurred.' }
  }
}
