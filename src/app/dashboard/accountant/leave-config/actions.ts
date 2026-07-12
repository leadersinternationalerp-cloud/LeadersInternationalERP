'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveLeaveConfigAction(config: any) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('system_settings')
    .upsert({
      key: 'leave_config',
      value: config,
      updated_at: new Date().toISOString()
    })

  if (error) {
    return { error: `Failed to save leave configuration: ${error.message}` }
  }

  revalidatePath('/dashboard/accountant/leave-config')
  return { success: true }
}
