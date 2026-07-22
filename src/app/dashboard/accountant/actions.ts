'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAuditAction } from '@/utils/audit'
import { AccountingService } from '@/lib/accounting/AccountingService'

// Save Fee Structure
export async function saveFeeStructureAction(formData: FormData) {
  const supabase = await createClient()
  const academic_year = formData.get('academic_year') as string
  const term = formData.get('term') as string
  const grade_level = formData.get('grade_level') as string
  const fee_type = formData.get('fee_type') as string
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string

  const payable_once = formData.get('payable_once') === 'on'
  const payable_annually = formData.get('payable_annually') === 'on'

  if (!academic_year || !term || !grade_level || !fee_type || isNaN(amount)) {
    return { error: 'All fields are required.' }
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check roles
  const { data: prof } = await supabase.from('profiles').select('role, roles').eq('id', user.id).single()
  const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
    ? prof.roles
    : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

  const isAllowed = userRoles.some(r => ['System Admin', 'Director', 'Principal'].includes(r))
  if (!isAllowed) {
    return { error: 'Forbidden: You do not have permission to modify fee structures.' }
  }

  const { error } = await supabase.from('fee_structures').insert({
    academic_year,
    term,
    grade_level,
    fee_type,
    amount,
    description,
    payable_once,
    payable_annually,
    created_by: user?.id
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/accountant/fee-structures')
  return { success: true }
}

export async function deleteFeeStructureAction(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Check roles
  const { data: prof } = await supabase.from('profiles').select('role, roles').eq('id', user.id).single()
  const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
    ? prof.roles
    : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

  const isAllowed = userRoles.some(r => ['System Admin', 'Director', 'Principal'].includes(r))
  if (!isAllowed) {
    return { error: 'Forbidden: You do not have permission to delete fee structures.' }
  }

  const { error } = await supabase.from('fee_structures').delete().eq('id', id)
  if (error) {
    return { error: error.message }
  }
  revalidatePath('/dashboard/accountant/fee-structures')
  return { success: true }
}

// Generate Invoices in bulk
export async function generateInvoicesAction(academic_year: string, term: string, grade_level: string, due_date: string) {
  const supabase = await createClient()

  if (!academic_year || !term || !grade_level || !due_date) {
    return { error: 'All fields are required.' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  // 1. Fetch fee structures for this academic year, term, and grade level
  const { data: fees, error: feesError } = await supabase
    .from('fee_structures')
    .select('*')
    .eq('academic_year', academic_year)
    .eq('term', term)
    .eq('grade_level', grade_level)

  if (feesError) return { error: feesError.message }
  if (!fees || fees.length === 0) {
    return { error: `No fee structures defined for ${grade_level} (${academic_year} - ${term}). Setup fees first.` }
  }

  // 2. Fetch all students in this grade level
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id')
    .eq('grade_level', grade_level)

  if (studentsError) return { error: studentsError.message }
  if (!students || students.length === 0) {
    return { error: `No enrolled students found in ${grade_level}.` }
  }

  const newFeesTotal = fees.reduce((sum, f) => sum + Number(f.amount), 0)

  // 3. For each student, calculate previous balance and generate invoice
  for (const student of students) {
    try {
      // Get all previous invoices
      const { data: prevInvoices } = await supabase
        .from('invoices')
        .select(`
          id,
          net_amount,
          payments (amount)
        `)
        .eq('student_id', student.id)
        .neq('term', term) // ignore current term
        .neq('academic_year', academic_year) // ignore current year

      let carriedOverBalance = 0
      if (prevInvoices) {
        for (const inv of prevInvoices) {
          const paid = (inv.payments as any[] || []).reduce((sum, p) => sum + Number(p.amount), 0)
          const outstanding = Number(inv.net_amount) - paid
          if (outstanding > 0) {
            carriedOverBalance += outstanding
          }
        }
      }

      const totalAmount = newFeesTotal + carriedOverBalance

      // Check if invoice already exists for this term to avoid duplication
      const { data: existingInvoice } = await supabase
        .from('invoices')
        .select('id')
        .eq('student_id', student.id)
        .eq('academic_year', academic_year)
        .eq('term', term)
        .maybeSingle()

      if (existingInvoice) continue; // Skip if already invoiced

      // Insert invoice
      const { data: newInvoice, error: invError } = await supabase
        .from('invoices')
        .insert({
          student_id: student.id,
          academic_year,
          term,
          total_amount: totalAmount,
          discount_amount: 0.00,
          status: 'Pending',
          due_date,
          generated_by: user?.id
        })
        .select('id')
        .single()

      if (invError) throw invError

      // Insert line items
      const itemsToInsert = fees.map(f => ({
        invoice_id: newInvoice.id,
        fee_structure_id: f.id,
        amount: f.amount,
        description: f.fee_type
      }))

      if (carriedOverBalance > 0) {
        itemsToInsert.push({
          invoice_id: newInvoice.id,
          fee_structure_id: null as any,
          amount: carriedOverBalance,
          description: 'Previous Balance Carryover'
        })
      }

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

    } catch (e: any) {
      console.error(`Failed to generate invoice for student ${student.id}: ${e.message}`)
    }
  }

  revalidatePath('/dashboard/accountant/invoices')
  return { success: true }
}

// Record a Payment
export async function recordPaymentAction(formData: FormData) {
  const supabase = await createClient()
  const invoice_id = formData.get('invoice_id') as string
  let student_id = formData.get('student_id') as string
  const amount = parseFloat(formData.get('amount') as string)
  const payment_method = formData.get('payment_method') as string
  const reference_number = formData.get('reference_number') as string
  const notes = formData.get('notes') as string

  if (!invoice_id || isNaN(amount) || !payment_method) {
    return { error: 'All fields are required.' }
  }

  if (student_id === 'RESOLVE_ON_SERVER') {
    const { data: invData, error: invFetchErr } = await supabase
      .from('invoices')
      .select('student_id')
      .eq('id', invoice_id)
      .single()
    if (invFetchErr || !invData) {
      return { error: 'Could not resolve student associated with this invoice.' }
    }
    student_id = invData.student_id
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Generate unique receipt number
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const randSuffix = Math.floor(1000 + Math.random() * 9000)
  const receipt_number = `REC-${dateStr}-${randSuffix}`

  const { data: newPayment, error } = await supabase.from('payments').insert({
    invoice_id,
    student_id,
    amount,
    payment_method,
    reference_number,
    receipt_number,
    notes,
    received_by: user?.id
  }).select('id').single()

  if (error) {
    return { error: error.message }
  }

  // Record Accounting Journal
  try {
    await AccountingService.recordFeePayment(
      newPayment.id,
      amount,
      receipt_number,
      new Date().toISOString()
    )
  } catch (accErr) {
    console.error('Failed to post payment journal entry:', accErr)
  }

  // Trigger SMS/WhatsApp notifications & WhatsApp receipt PDF delivery
  try {
    const { triggerPaymentRecorded } = await import('@/utils/notifications')
    await triggerPaymentRecorded(newPayment.id)
    await logAuditAction('Payment Recorded', 'payments', { receipt_number, amount, invoice_id })

    // Generate WhatsApp PDF Receipt
    const { WhatsAppService } = await import('@/lib/whatsapp/WhatsAppService')
    const { data: student } = await supabase.from('profiles').select('first_name, last_name, phone').eq('id', student_id).single()
    const studentName = student ? `${student.first_name} ${student.last_name}` : 'Student'
    const parentPhone = student?.phone || '+255000000000'

    const pdfBytes = await WhatsAppService.generateReceiptPDF(newPayment.id, receipt_number, amount, studentName, new Date().toLocaleString())
    const pdfUrl = await WhatsAppService.uploadReceipt(receipt_number, pdfBytes)
    await WhatsAppService.sendReceipt(parentPhone, receipt_number, pdfUrl)

  } catch (err) {
    console.error('Failed to trigger payment notifications:', err)
  }

  revalidatePath('/dashboard/accountant/payments')
  revalidatePath('/dashboard/principal/quick-payment')
  return { success: true, receipt_number }
}

// Record an Expense
export async function saveExpenseAction(formData: FormData) {
  const supabase = await createClient()
  const category = formData.get('category') as string
  const amount = parseFloat(formData.get('amount') as string)
  const description = formData.get('description') as string
  const date = formData.get('date') as string
  const receipt_url = formData.get('receipt_url') as string

  if (!category || isNaN(amount) || !description || !date) {
    return { error: 'All fields are required.' }
  }

  const { data: { user } } = await supabase.auth.getUser()

  const { data: newExpense, error } = await supabase.from('expenses').insert({
    category,
    amount,
    description,
    date,
    receipt_url: receipt_url || null,
    recorded_by: user?.id
  }).select('id').single()

  if (error || !newExpense) {
    return { error: error?.message || 'Failed to record expense' }
  }

  // Record Accounting Journal
  try {
    await AccountingService.recordExpense(
      newExpense.id,
      amount,
      description,
      date,
      category
    )
  } catch (accErr) {
    console.error('Failed to post expense journal entry:', accErr)
  }

  await logAuditAction('Expense Recorded', 'expenses', { category, amount, date })

  revalidatePath('/dashboard/accountant/expenses')
  return { success: true }
}
