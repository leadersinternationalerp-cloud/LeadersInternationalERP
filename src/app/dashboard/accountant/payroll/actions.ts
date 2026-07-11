'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  triggerPayrollProposed,
  triggerPayrollReviewedPrincipal,
  triggerPayrollReviewedDirector
} from '@/utils/notifications'

// Generate a new monthly payroll draft
export async function generatePayrollAction(month: number, year: number, notes?: string) {
  const supabase = await createClient()

  // 1. Check if payroll for this period already exists
  const { data: existing } = await supabase
    .from('payrolls')
    .select('id')
    .eq('month', month)
    .eq('year', year)
    .maybeSingle()

  if (existing) {
    return { error: 'Payroll for this month/year has already been generated.' }
  }

  // 2. Fetch all active staff profiles to generate their payslips
  const { data: staffProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, role, roles')
    .neq('role', 'Student')
    .neq('role', 'Parent')

  if (profilesError || !staffProfiles) {
    return { error: `Failed to fetch staff profiles: ${profilesError?.message || 'Unknown error'}` }
  }

  // 3. Get currently logged in user (Accountant)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized.' }
  }

  // 4. Create the payroll summary record
  const { data: newPayroll, error: payrollError } = await supabase
    .from('payrolls')
    .insert({
      month,
      year,
      status: 'Draft',
      accountant_notes: notes || '',
      submitted_by: user.id
    })
    .select()
    .single()

  if (payrollError || !newPayroll) {
    return { error: `Failed to create payroll summary: ${payrollError?.message}` }
  }

  // 5. Fetch custom salary settings
  const { data: salarySettings } = await supabase
    .from('salary_settings')
    .select('*')

  const settingsMap = new Map((salarySettings || []).map(s => [s.employee_id, s]))

  // 6. Generate matching payslips for all active employees using custom settings
  const payslipsToInsert = staffProfiles.map(staff => {
    const setting = settingsMap.get(staff.id)
    let basicPay = setting ? Number(setting.basic_salary) : 1500000
    let allowances = setting ? Number(setting.allowances) : 0
    let deductions = setting ? Number(setting.deductions) : 0

    // fallback base pay if no setting exists
    if (!setting) {
      if (staff.role === 'Principal') basicPay = 3500000
      if (staff.role === 'Director') basicPay = 4500000
      if (staff.role === 'Accountant') basicPay = 2000000
      if (staff.role === 'Teacher') basicPay = 1200000
    }

    const netSalary = basicPay + allowances - deductions

    return {
      employee_id: staff.id,
      month,
      year,
      basic_pay: basicPay,
      total_allowances: allowances,
      total_deductions: deductions,
      net_salary: netSalary,
      status: 'Pending',
      details: JSON.stringify({ role: staff.role })
    }
  })

  const { error: payslipsError } = await supabase
    .from('payslips')
    .insert(payslipsToInsert)

  if (payslipsError) {
    console.error('Failed to create individual payslips:', payslipsError.message)
    // Rollback payroll summary
    await supabase.from('payrolls').delete().eq('id', newPayroll.id)
    return { error: `Failed to generate employee payslips: ${payslipsError.message}` }
  }

  revalidatePath('/dashboard/accountant/payroll')
  return { success: true }
}

// Accountant submits the payroll to the Principal
export async function submitPayrollAction(payrollId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('payrolls')
    .update({
      status: 'Submitted',
      updated_at: new Date().toISOString()
    })
    .eq('id', payrollId)

  if (error) {
    return { error: `Failed to submit payroll: ${error.message}` }
  }

  await triggerPayrollProposed(payrollId)

  revalidatePath('/dashboard/accountant/payroll')
  return { success: true }
}

// Principal approves or declines the payroll with notes
export async function principalReviewPayrollAction(payrollId: string, approve: boolean, notes?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized.' }
  }

  const status = approve ? 'Approved_Principal' : 'Declined_Principal'

  const { error } = await supabase
    .from('payrolls')
    .update({
      status,
      principal_notes: notes || '',
      reviewed_by_principal: user.id,
      reviewed_at_principal: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', payrollId)

  if (error) {
    return { error: `Failed to review payroll: ${error.message}` }
  }

  await triggerPayrollReviewedPrincipal(payrollId, approve, notes || '')

  revalidatePath('/dashboard/principal/payrolls')
  return { success: true }
}

// Director finalizes approval or declines payroll
export async function directorReviewPayrollAction(payrollId: string, approve: boolean, notes?: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized.' }
  }

  const status = approve ? 'Approved_Director' : 'Declined_Director'

  // Fetch the payroll details first to get month and year
  const { data: payroll } = await supabase
    .from('payrolls')
    .select('month, year')
    .eq('id', payrollId)
    .single()

  if (!payroll) {
    return { error: 'Payroll sheet not found.' }
  }

  // Start update
  const { error } = await supabase
    .from('payrolls')
    .update({
      status,
      director_notes: notes || '',
      reviewed_by_director: user.id,
      reviewed_at_director: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', payrollId)

  if (error) {
    return { error: `Failed to update payroll status: ${error.message}` }
  }

  // If approved, update all matching payslips to "Paid"
  if (approve) {
    const { error: payslipsError } = await supabase
      .from('payslips')
      .update({ status: 'Paid' })
      .eq('month', payroll.month)
      .eq('year', payroll.year)

    if (payslipsError) {
      console.error('Failed to update individual payslips to Paid:', payslipsError.message)
    }
  }

  await triggerPayrollReviewedDirector(payrollId, approve, notes || '')

  revalidatePath('/dashboard/director/payrolls')
  return { success: true }
}
