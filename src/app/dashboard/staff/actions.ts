import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  triggerLeaveSubmitted,
  triggerLeaveReviewed,
  triggerSalaryAdvanceSubmitted,
  triggerSalaryAdvanceDisbursed
} from '@/utils/notifications'

// Apply for Leave
export async function applyLeaveAction(formData: FormData) {
  const supabase = await createClient()
  const leave_type = formData.get('leave_type') as string
  const start_date = formData.get('start_date') as string
  const end_date = formData.get('end_date') as string
  const reason = formData.get('reason') as string
  const acting_staff_id = formData.get('acting_staff_id') as string
  const supporting_document_url = formData.get('supporting_document_url') as string

  if (!leave_type || !start_date || !end_date || !reason) {
    return { error: 'Required fields: Leave Type, Start Date, End Date, and Reason.' }
  }

  // Calculate duration in days
  const start = new Date(start_date)
  const end = new Date(end_date)
  const timeDiff = end.getTime() - start.getTime()
  if (timeDiff < 0) {
    return { error: 'End Date cannot be before Start Date.' }
  }
  const days = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1

  const { data: { user } } = await supabase.auth.getUser()

  const { data: newLeave, error } = await supabase.from('leave_applications').insert({
    employee_id: user?.id,
    leave_type,
    start_date,
    end_date,
    days,
    reason,
    acting_staff_id: acting_staff_id || null,
    supporting_document_url: supporting_document_url || null,
    status: 'Pending'
  }).select('id').single()

  if (error) {
    return { error: error.message }
  }

  if (newLeave) {
    await triggerLeaveSubmitted(newLeave.id)
  }

  revalidatePath('/dashboard/staff/self-service/leave')
  return { success: true }
}

// Review Leave Application (Principal or Director)
export async function reviewLeaveAction(id: string, status: 'Approved' | 'Declined', notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('leave_applications')
    .update({
      status,
      reviewer_notes: notes || null,
      reviewer_id: user?.id,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  await triggerLeaveReviewed(id)

  revalidatePath('/dashboard/principal/leave-requests')
  revalidatePath('/dashboard/director/leave-requests')
  return { success: true }
}

// Apply for Salary Advance
export async function applySalaryAdvanceAction(formData: FormData) {
  const supabase = await createClient()
  const amount_requested = parseFloat(formData.get('amount_requested') as string)
  const repayment_period_months = parseInt(formData.get('repayment_period_months') as string)
  const reason = formData.get('reason') as string
  const supporting_document_url = formData.get('supporting_document_url') as string

  if (isNaN(amount_requested) || amount_requested <= 0 || isNaN(repayment_period_months) || !reason) {
    return { error: 'Required fields: Amount, Repayment Period, and Reason.' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Verify that there is no active unpaid advance
  const { data: activeAdvance, error: activeErr } = await supabase
    .from('salary_advances')
    .select('id')
    .eq('employee_id', user?.id)
    .in('status', ['Pending', 'Approved', 'Disbursed'])
    .maybeSingle()

  if (activeErr) return { error: activeErr.message }
  if (activeAdvance) {
    return { error: 'You currently have an outstanding or pending salary advance. You cannot apply for a new one until it is fully repaid.' }
  }

  const { data: newAdvance, error } = await supabase.from('salary_advances').insert({
    employee_id: user?.id,
    amount_requested,
    repayment_period_months,
    reason,
    supporting_document_url: supporting_document_url || null,
    status: 'Pending'
  }).select('id').single()

  if (error) {
    return { error: error.message }
  }

  if (newAdvance) {
    await triggerSalaryAdvanceSubmitted(newAdvance.id)
  }

  revalidatePath('/dashboard/staff/self-service/advances')
  return { success: true }
}

// Review Salary Advance (Principal or Director)
export async function reviewSalaryAdvanceAction(id: string, status: 'Approved' | 'Declined', amount_approved?: number, notes?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const updateFields: any = {
    status,
    reviewer_notes: notes || null,
    reviewer_id: user?.id,
    reviewed_at: new Date().toISOString()
  }

  if (status === 'Approved' && amount_approved !== undefined) {
    updateFields.amount_approved = amount_approved
  }

  const { error } = await supabase
    .from('salary_advances')
    .update(updateFields)
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/principal/advance-requests')
  revalidatePath('/dashboard/director/advance-requests')
  return { success: true }
}

// Disburse Salary Advance (Accountant)
export async function disburseSalaryAdvanceAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('salary_advances')
    .update({
      status: 'Disbursed',
      disbursed_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  await triggerSalaryAdvanceDisbursed(id)

  revalidatePath('/dashboard/accountant/payments') // updates Accountant view
  return { success: true }
}

// Mark notifications as read
export async function markNotificationsReadAction(id?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (id) {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user?.id)
  } else {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user?.id)
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/notifications')
  return { success: true }
}
