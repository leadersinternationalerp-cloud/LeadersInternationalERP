'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function reviewSubmissionAction(formData: FormData) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const id = formData.get('id') as string
    const status = formData.get('status') as 'Approved' | 'Returned'
    const comment = formData.get('comment') as string

    if (!id || !status) {
      return { error: 'Missing required fields.' }
    }

    // Fetch existing lesson plan to get teacher ID
    const { data: existingPlan } = await supabase
      .from('lesson_plans')
      .select('teacher_id, week_number, term')
      .eq('id', id)
      .single()

    // Update lesson plan
    const { error } = await supabase
      .from('lesson_plans')
      .update({
        status,
        review_notes: comment || null,
        dean_comment: comment || null,
        reviewer_id: user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Error updating lesson plan:', error)
      return { error: error.message }
    }

    // Trigger notification for the teacher
    if (existingPlan?.teacher_id) {
      const statusText = status === 'Approved' ? 'approved' : 'returned for revision'
      await supabase.from('notifications').insert({
        user_id: existingPlan.teacher_id,
        message: `Your lesson plan for Week ${existingPlan.week_number} (${existingPlan.term}) was ${statusText} by Academic Dean. Remarks: "${comment || 'No remarks.'}"`,
        link_url: '/dashboard/teacher/lesson-plans'
      })
    }

    revalidatePath('/dashboard/dean/submissions')
    return { success: true }
  } catch (err: any) {
    console.error('Unexpected error in reviewSubmissionAction:', err)
    return { error: err.message || 'An unexpected error occurred.' }
  }
}
