'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function reviewSubmissionAction(formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const status = formData.get('status') as 'Approved' | 'Returned'
  const comment = formData.get('comment') as string

  if (!id || !status) {
    return { error: 'Missing required fields' }
  }

  // Update lesson plan
  const { error } = await supabase
    .from('lesson_plans')
    .update({ 
      status, 
      dean_comment: comment || null 
    })
    .eq('id', id)

  if (error) {
    console.error('Error updating lesson plan:', error)
    return { error: error.message }
  }

  // In a full implementation, we'd also trigger a notification for the teacher here using our notifications service.
  
  revalidatePath('/dashboard/dean/submissions')
  return { success: true }
}
