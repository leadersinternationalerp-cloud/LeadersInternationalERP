'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitReportAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to submit a report.' }
  }

  const title = formData.get('title') as string
  const report_type = formData.get('report_type') as string
  const content = formData.get('content') as string
  const attachment_url = formData.get('attachment_url') as string
  const submit_to = formData.get('submit_to') as string

  if (!title || !report_type || !content || !submit_to) {
    return { error: 'Required fields: Title, Type, Content, and Submit To.' }
  }

  const { data: report, error } = await supabase
    .from('submitted_reports')
    .insert({
      title,
      report_type,
      content,
      attachment_url: attachment_url || null,
      submit_to,
      submitted_by: user.id,
      status: 'Pending'
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // Fetch submitter name
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single()
  const submitterName = profile ? `${profile.first_name} ${profile.last_name}` : 'Staff Member'

  // Send notifications to reviewers
  const rolesToNotify: string[] = []
  if (submit_to === 'Principal' || submit_to === 'Both') {
    rolesToNotify.push('Principal')
  }
  if (submit_to === 'Director' || submit_to === 'Both') {
    rolesToNotify.push('Director')
  }

  const { data: reviewers } = await supabase
    .from('profiles')
    .select('id, role, roles')
    .in('role', rolesToNotify)

  if (reviewers && reviewers.length > 0) {
    const notifications = reviewers.map((rev) => ({
      user_id: rev.id,
      message: `New ${report_type} report submitted by ${submitterName}: "${title}"`,
      link_url: rev.role === 'Director' ? '/dashboard/director/reports' : '/dashboard/principal/reports'
    }))

    await supabase.from('notifications').insert(notifications)
  }

  revalidatePath('/dashboard/staff/self-service/reports')
  revalidatePath('/dashboard/principal/reports')
  revalidatePath('/dashboard/director/reports')

  return { success: true }
}

export async function reviewReportAction(
  reportId: string,
  status: 'Reviewed' | 'Approved' | 'Returned',
  notes: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in to review a report.' }
  }

  // Fetch current user's profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'Principal' && profile.role !== 'Director' && profile.role !== 'System Admin')) {
    return { error: 'Unauthorized. Only Principal, Director, or System Admin can review reports.' }
  }

  // Fetch report to get submitter ID and check details
  const { data: report, error: fetchError } = await supabase
    .from('submitted_reports')
    .select('*')
    .eq('id', reportId)
    .single()

  if (fetchError || !report) {
    return { error: 'Report not found.' }
  }

  // Update report
  const { error: updateError } = await supabase
    .from('submitted_reports')
    .update({
      status,
      reviewer_notes: notes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', reportId)

  if (updateError) {
    return { error: updateError.message }
  }

  // Notify the submitter
  const reviewerName = `${profile.first_name} ${profile.last_name} (${profile.role})`
  await supabase.from('notifications').insert({
    user_id: report.submitted_by,
    message: `Your report "${report.title}" has been updated to "${status}" by ${reviewerName}.${notes ? ` Note: ${notes}` : ''}`,
    link_url: '/dashboard/staff/self-service/reports'
  })

  revalidatePath('/dashboard/staff/self-service/reports')
  revalidatePath('/dashboard/principal/reports')
  revalidatePath('/dashboard/director/reports')

  return { success: true }
}
