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
  await logAuditAction(`Update Setting: ${key}`, 'system_settings', { key, value })

  revalidatePath('/admin/settings')
  return { success: true }
}

export async function saveAcademicYearAction(
  name: string, 
  term_details: any[], 
  is_active: boolean, 
  active_term_name?: string
) {
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
    return { error: 'Forbidden: You do not have permission to manage academic years and terms.' }
  }

  // 2. Compute academic year start and end dates from term details
  const validStarts = term_details.map(t => t.start_date).filter(Boolean).sort()
  const validEnds = term_details.map(t => t.end_date).filter(Boolean).sort()
  const yearStartDate = validStarts[0] || null
  const yearEndDate = validEnds[validEnds.length - 1] || null

  // 3. If activating this year, deactivate all other academic years
  if (is_active) {
    await supabase
      .from('academic_years')
      .update({ is_active: false })
      .neq('name', name)
  }

  // 4. Upsert the academic year record
  const { data: ayRecord, error: upsertError } = await supabase
    .from('academic_years')
    .upsert(
      {
        name,
        term_details,
        is_active,
        start_date: yearStartDate,
        end_date: yearEndDate
      },
      { onConflict: 'name' }
    )
    .select('id')
    .single()

  if (upsertError || !ayRecord) {
    return { error: upsertError?.message || 'Failed to save academic year record' }
  }

  const ayId = ayRecord.id

  // 5. Synchronize rows in `terms` table for this Academic Year
  for (const tDetail of term_details) {
    const termName = tDetail.term_name
    const isCurrentTerm = is_active && (active_term_name ? (active_term_name === termName) : (tDetail.is_current || false))

    if (isCurrentTerm) {
      // Deactivate is_current across all terms database-wide
      await supabase.from('terms').update({ is_current: false }).neq('name', '___NON_EXISTENT___')
    }

    // Check if term row exists for this academic year and term name
    const { data: existingTerm } = await supabase
      .from('terms')
      .select('id')
      .eq('academic_year_id', ayId)
      .eq('name', termName)
      .maybeSingle()

    if (existingTerm) {
      await supabase
        .from('terms')
        .update({
          start_date: tDetail.start_date || null,
          end_date: tDetail.end_date || null,
          is_current: isCurrentTerm
        })
        .eq('id', existingTerm.id)
    } else {
      await supabase
        .from('terms')
        .insert({
          academic_year_id: ayId,
          name: termName,
          start_date: tDetail.start_date || null,
          end_date: tDetail.end_date || null,
          is_current: isCurrentTerm
        })
    }
  }

  // 6. Log audit action
  await logAuditAction(`Save Academic Year & Terms: ${name}`, 'academic_years', { name, term_details, is_active, active_term_name })

  revalidatePath('/dashboard/admin/settings')
  revalidatePath('/dashboard/teacher/marks')
  revalidatePath('/dashboard/teacher/early-years')
  revalidatePath('/dashboard/teacher/report-cards')
  revalidatePath('/dashboard/dean/report-cards')
  revalidatePath('/dashboard/principal/report-cards')
  revalidatePath('/dashboard/accountant/fee-structures')
  revalidatePath('/dashboard/accountant/payments')

  return { success: true }
}

export async function saveClassAction(classData: {
  id?: string
  name: string
  section?: string
  is_early_years?: boolean
  age_group?: string
  class_teacher_id?: string | null
}) {
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
    return { error: 'Forbidden: You do not have permission to manage classes.' }
  }

  // 2. Perform save/upsert
  const payload = {
    name: classData.name,
    section: classData.section || null,
    is_early_years: classData.is_early_years || false,
    age_group: classData.age_group || null,
    class_teacher_id: classData.class_teacher_id || null,
    updated_at: new Date().toISOString()
  }

  let error
  if (classData.id) {
    const res = await supabase
      .from('classes')
      .update(payload)
      .eq('id', classData.id)
    error = res.error
  } else {
    const res = await supabase
      .from('classes')
      .insert({
        ...payload,
        created_at: new Date().toISOString()
      })
    error = res.error
  }

  if (error) {
    return { error: error.message }
  }

  // 3. Log audit action
  await logAuditAction(
    classData.id ? `Update Class: ${classData.name}` : `Create Class: ${classData.name}`,
    'classes',
    classData
  )

  revalidatePath('/dashboard/admin/settings')
  revalidatePath('/dashboard/admin/timetable')
  revalidatePath('/dashboard/admin/teacher-assignments')
  revalidatePath('/dashboard/accountant/fee-structures')
  revalidatePath('/dashboard/students')

  return { success: true }
}

export async function deleteClassAction(id: string) {
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
    return { error: 'Forbidden: You do not have permission to delete classes.' }
  }

  // 2. Perform delete
  const { error } = await supabase
    .from('classes')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  // 3. Log audit action
  await logAuditAction(`Delete Class: ${id}`, 'classes', { id })

  revalidatePath('/dashboard/admin/settings')
  revalidatePath('/dashboard/admin/timetable')
  revalidatePath('/dashboard/admin/teacher-assignments')
  revalidatePath('/dashboard/accountant/fee-structures')
  revalidatePath('/dashboard/students')

  return { success: true }
}
