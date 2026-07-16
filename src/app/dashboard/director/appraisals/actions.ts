'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveAppraisalCycleAction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Director') && !userRoles.includes('System Admin')) {
    return { error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const indicatorsStr = formData.get('indicators') as string

  if (!name || !start_date || !end_date) {
    return { error: 'Name, start date, and end date are required.' }
  }

  let indicators = []
  try {
    indicators = indicatorsStr ? JSON.parse(indicatorsStr) : []
  } catch (e) {
    return { error: 'Invalid indicators JSON format.' }
  }

  const { error } = await supabase.from('appraisal_cycles').insert({
    name,
    start_date,
    end_date,
    indicators,
    created_by: user.id
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/director/appraisals')
  revalidatePath('/dashboard/staff/self-service/appraisals')
  return { success: true }
}

export async function saveSelfAssessmentAction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const cycle_id = formData.get('cycle_id') as string
  const self_scores_str = formData.get('self_scores') as string
  const self_comments = formData.get('self_comments') as string

  if (!cycle_id) {
    return { error: 'Cycle ID is required.' }
  }

  let self_scores = {}
  try {
    self_scores = self_scores_str ? JSON.parse(self_scores_str) : {}
  } catch (e) {
    return { error: 'Invalid scores format.' }
  }

  // Check if appraisal already exists
  const { data: existing, error: fetchErr } = await supabase
    .from('appraisals')
    .select('id')
    .eq('cycle_id', cycle_id)
    .eq('employee_id', user.id)
    .maybeSingle()

  if (fetchErr) {
    return { error: fetchErr.message }
  }

  if (existing) {
    const { error } = await supabase
      .from('appraisals')
      .update({
        self_scores,
        self_comments,
        status: 'In Review'
      })
      .eq('id', existing.id)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('appraisals')
      .insert({
        cycle_id,
        employee_id: user.id,
        self_scores,
        self_comments,
        status: 'In Review'
      })

    if (error) return { error: error.message }
  }

  revalidatePath('/dashboard/director/appraisals')
  revalidatePath('/dashboard/staff/self-service/appraisals')
  return { success: true }
}

export async function saveReviewerEvaluationAction(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Director') && !userRoles.includes('System Admin') && !userRoles.includes('Principal')) {
    return { error: 'Unauthorized' }
  }

  const appraisal_id = formData.get('appraisal_id') as string
  const cycle_id = formData.get('cycle_id') as string
  const employee_id = formData.get('employee_id') as string
  const reviewer_scores_str = formData.get('reviewer_scores') as string
  const reviewer_comments = formData.get('reviewer_comments') as string
  const final_rating = formData.get('final_rating') as string

  if (!final_rating) {
    return { error: 'Final rating is required.' }
  }

  if (!appraisal_id && (!cycle_id || !employee_id)) {
    return { error: 'Appraisal ID or both Cycle ID and Employee ID are required.' }
  }

  let reviewer_scores = {}
  try {
    reviewer_scores = reviewer_scores_str ? JSON.parse(reviewer_scores_str) : {}
  } catch (e) {
    return { error: 'Invalid scores format.' }
  }

  let queryError = null

  if (appraisal_id) {
    const { error } = await supabase
      .from('appraisals')
      .update({
        reviewer_scores,
        reviewer_comments,
        final_rating,
        status: 'Completed',
        reviewer_id: user.id
      })
      .eq('id', appraisal_id)
    queryError = error
  } else {
    // Check if there is an existing appraisal record first
    const { data: existing, error: fetchErr } = await supabase
      .from('appraisals')
      .select('id')
      .eq('cycle_id', cycle_id)
      .eq('employee_id', employee_id)
      .maybeSingle()

    if (fetchErr) return { error: fetchErr.message }

    if (existing) {
      const { error } = await supabase
        .from('appraisals')
        .update({
          reviewer_scores,
          reviewer_comments,
          final_rating,
          status: 'Completed',
          reviewer_id: user.id
        })
        .eq('id', existing.id)
      queryError = error
    } else {
      const { error } = await supabase
        .from('appraisals')
        .insert({
          cycle_id,
          employee_id,
          reviewer_scores,
          reviewer_comments,
          final_rating,
          status: 'Completed',
          reviewer_id: user.id
        })
      queryError = error
    }
  }

  if (queryError) {
    return { error: queryError.message }
  }

  revalidatePath('/dashboard/director/appraisals')
  revalidatePath('/dashboard/staff/self-service/appraisals')
  return { success: true }
}
