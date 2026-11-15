'use server'

import { normalizeRoles } from '@/lib/auth/roles'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveGradingConfigAction(config: any) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()

  const userRoles = normalizeRoles(profile)
  const isAuthorized =
    userRoles.includes('System Admin') ||
    userRoles.includes('Director') ||
    userRoles.includes('Principal') ||
    userRoles.includes('Dean')

  if (!isAuthorized) {
    return { error: 'Forbidden: You do not have permission to update the grading scale.' }
  }

  const { error } = await supabase.from('system_settings').upsert({
    key: 'grading_scale',
    value: config,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    return { error: `Failed to save grading scale: ${error.message}` }
  }

  revalidatePath('/dashboard/admin/settings/grading')
  revalidatePath('/dashboard/teacher/marks')
  revalidatePath('/dashboard/dean/marks-overview')
  revalidatePath('/dashboard/hos/marks')
  revalidatePath('/api/report-cards/download')
  return { success: true }
}
