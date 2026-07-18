'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/utils/audit'

export async function saveWeightsAction(weights: {
  id?: string
  assessment_type: string
  weight: number
  is_active: boolean
  display_order: number
}[]) {
  const supabase = await createClient()

  // 1. Get user and verify role (System Admin, Director, Principal)
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

  const isAdmin = userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal')
  if (!isAdmin) {
    return { error: 'Forbidden: You do not have permission to manage assessment weights.' }
  }

  // 2. Validate weights list: at least one active
  const activeWeights = weights.filter(w => w.is_active)
  if (activeWeights.length === 0) {
    return { error: 'Validation Error: You must have at least one active assessment type.' }
  }

  const keepSet = weights.map(w => w.assessment_type.trim())

  try {
    // 3. Upsert each weight record in assessment_weights
    for (const w of weights) {
      const { error: upsertErr } = await supabase
        .from('assessment_weights')
        .upsert({
          assessment_type: w.assessment_type.trim(),
          weight: Number(w.weight),
          is_active: w.is_active,
          display_order: w.display_order,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'assessment_type'
        })
      if (upsertErr) throw upsertErr
    }

    // 4. Fetch all rows and delete entries not in keepSet
    const { data: allRows } = await supabase
      .from('assessment_weights')
      .select('assessment_type')

    const typesToDelete = allRows
      ?.map((r: any) => r.assessment_type)
      .filter((type: string) => !keepSet.includes(type)) || []

    if (typesToDelete.length > 0) {
      const { error: deleteErr } = await supabase
        .from('assessment_weights')
        .delete()
        .in('assessment_type', typesToDelete)
      if (deleteErr) throw deleteErr
    }

    // 5. Sync active configs to system_settings backup key `assessment_weights`
    const activeWeightsJSON = activeWeights.map(w => ({
      type: w.assessment_type.trim(),
      weight: Number(w.weight),
      is_active: w.is_active,
      display_order: w.display_order
    }))

    const { error: settingsErr } = await supabase
      .from('system_settings')
      .upsert({
        key: 'assessment_weights',
        value: activeWeightsJSON,
        updated_at: new Date().toISOString()
      })
    if (settingsErr) throw settingsErr

    // 6. Log audit action
    await logAuditAction('Update Assessment Weights', 'assessment_weights', { weights })

    // Revalidate paths
    revalidatePath('/dashboard/admin/settings/assessment-weights')
    revalidatePath('/api/report-cards/download')
    return { success: true }
  } catch (err: any) {
    console.error('Error in saveWeightsAction:', err)
    return { error: err.message || 'Failed to save weights' }
  }
}
