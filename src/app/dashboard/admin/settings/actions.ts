'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/utils/audit'

export async function saveSystemSettingsAction(key: string, value: any) {
  const supabase = await createClient()

  // 1. Get user and verify role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  const isAdmin = userRoles.includes('System Admin') || userRoles.includes('Director')
  if (!isAdmin) {
    return { error: 'Forbidden: You do not have permission to manage system settings.' }
  }

  // 2. Upsert key/value
  const { error } = await supabase
    .from('system_settings')
    .upsert({
      key,
      value,
      updated_at: new Date().toISOString()
    })

  if (error) {
    return { error: error.message }
  }

  // 3. Log audit action
  await logAuditAction(user.id, `Update Setting: ${key}`, 'system_settings', { key, value })

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function saveAcademicYearAction(name: string, term_details: any[], is_active: boolean) {
  const supabase = await createClient()

  // 1. Get user and verify role
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  const isAdmin = userRoles.includes('System Admin') || userRoles.includes('Director')
  if (!isAdmin) {
    return { error: 'Forbidden: You do not have permission to manage academic years.' }
  }

  // 2. If activating this year, deactivate all others
  if (is_active) {
    const { error: deactivateError } = await supabase
      .from('academic_years')
      .update({ is_active: false })
      .neq('name', name)

    if (deactivateError) {
      return { error: deactivateError.message }
    }
  }

  // 3. Upsert the academic year by name (which is UNIQUE)
  const { error: upsertError } = await supabase
    .from('academic_years')
    .upsert(
      {
        name,
        term_details,
        is_active,
      },
      { onConflict: 'name' }
    )

  if (upsertError) {
    return { error: upsertError.message }
  }

  // 4. Log audit action
  await logAuditAction(user.id, `Save Academic Year: ${name}`, 'academic_years', { name, term_details, is_active })

  revalidatePath('/admin/settings')
  return { success: true }
}
