'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveGradingConfigAction(config: any) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('system_settings')
    .upsert({
      key: 'grading_scale',
      value: config,
      updated_at: new Date().toISOString()
    })

  if (error) {
    return { error: `Failed to save grading scale: ${error.message}` }
  }

  revalidatePath('/dashboard/admin/settings/grading')
  return { success: true }
}
