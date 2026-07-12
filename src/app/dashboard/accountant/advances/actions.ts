'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function markAdvanceDisbursedAction(advanceId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized.' }
  }

  const { error } = await supabase
    .from('salary_advances')
    .update({
      status: 'Disbursed',
      disbursed_at: new Date().toISOString()
    })
    .eq('id', advanceId)

  if (error) {
    return { error: `Failed to mark as disbursed: ${error.message}` }
  }

  revalidatePath('/dashboard/accountant/advances')
  return { success: true }
}
