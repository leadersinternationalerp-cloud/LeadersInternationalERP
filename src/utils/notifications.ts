import { createClient } from '@/utils/supabase/server'

// Modular SMS Sender - supports Africa's Talking API and easily swappable for Tanzanian systems (e.g. Beem/NextSMS)
export async function sendSMS(phone: string, message: string) {
  const apiKey = process.env.AT_API_KEY
  const username = process.env.AT_USERNAME || 'sandbox'

  if (apiKey) {
    console.log(`[SMS SENDER] Dispatching real API SMS to ${phone} via Africa's Talking...`)
    try {
      const response = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          'ApiKey': apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          username: username,
          to: phone,
          message: message
        })
      })
      const data = await response.json()
      console.log('[SMS SENDER] API Response:', data)
      return { success: true, data }
    } catch (e: any) {
      console.error('[SMS SENDER] API Request failed:', e.message)
      return { success: false, error: e.message }
    }
  } else {
    // Fallback log for local dev / sandbox simulation
    console.log(`[SMS SIMULATOR] Outbox to ${phone}: "${message}"`)
    return { success: true }
  }
}

// Simulates sending a WhatsApp message
export async function sendWhatsApp(phone: string, message: string, mediaUrl?: string) {
  console.log(`[WHATSAPP SENDER] Outbox to ${phone}: "${message}"${mediaUrl ? ` | Attachment: ${mediaUrl}` : ''}`)
  return { success: true }
}

// Trigger payment recorded notifications (in-app, SMS, WhatsApp receipt delivery)
export async function triggerPaymentRecorded(paymentId: string) {
  const supabase = await createClient()

  const { data: payment, error } = await supabase
    .from('payments')
    .select(`
      *,
      invoices (term, academic_year),
      students (
        profiles (first_name, last_name)
      )
    `)
    .eq('id', paymentId)
    .single()

  if (error || !payment) {
    console.error(`Failed to fetch payment details for notification trigger: ${error?.message}`)
    return
  }

  const studentName = `${payment.students?.profiles?.first_name} ${payment.students?.profiles?.last_name}`
  const termInfo = `${payment.invoices?.term} (${payment.invoices?.academic_year})`
  const formattedAmount = new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(payment.amount)

  const message = `Payment of ${formattedAmount} received for ${studentName} (${termInfo}). Receipt: ${payment.receipt_number}.`

  // Fetch parents linked to this student
  const { data: parentLinks } = await supabase
    .from('student_parents')
    .select(`
      parent_id,
      profiles (
        id,
        first_name,
        last_name,
        email,
        phone
      )
    `)
    .eq('student_id', payment.student_id)

  if (parentLinks) {
    for (const link of parentLinks) {
      const parentProfile: any = link.profiles
      if (!parentProfile) continue

      // A. Create In-App Notification
      await supabase.from('notifications').insert({
        user_id: parentProfile.id,
        message: message,
        link_url: `/dashboard/parent/billing`
      })

      // B. Simulate generating PDF Receipt URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zqcjnfcwxkeapwzhifsy.supabase.co'
      const pdfReceiptUrl = `${supabaseUrl}/storage/v1/object/public/receipts/${payment.receipt_number}.pdf`

      // C. Send SMS Notification
      const parentPhone = parentProfile.phone || '+255770000000'
      const smsMessage = `Dear Parent, a payment of ${formattedAmount} has been recorded for ${studentName}. Receipt No: ${payment.receipt_number}. Thank you.`
      await sendSMS(parentPhone, smsMessage)

      // D. Send WhatsApp Receipt PDF
      const whatsappMessage = `Dear Parent, a payment of ${formattedAmount} has been recorded for ${studentName}. Your invoice receipt PDF is attached.`
      await sendWhatsApp(parentPhone, whatsappMessage, pdfReceiptUrl)
    }
  }
}

import { formatDate } from '@/utils/date'

// Global helper to create in-app and SMS notifications
export async function createSystemNotification(userId: string, message: string, linkUrl?: string, phone?: string) {
  const supabase = await createClient()

  // 1. In-App
  await supabase.from('notifications').insert({
    user_id: userId,
    message,
    link_url: linkUrl || null
  })

  // 2. SMS if phone is provided
  if (phone) {
    await sendSMS(phone, message)
  }
}

// Trigger when leave proposal is submitted
export async function triggerLeaveSubmitted(leaveId: string) {
  const supabase = await createClient()
  const { data: leave, error } = await supabase
    .from('leave_applications')
    .select(`
      *,
      employee:employee_id (
        profiles (first_name, last_name)
      )
    `)
    .eq('id', leaveId)
    .single()

  if (error || !leave) {
    console.error(`Failed to fetch leave details for notification: ${error?.message}`)
    return
  }

  const employeeName = `${(leave.employee as any)?.profiles?.first_name} ${(leave.employee as any)?.profiles?.last_name}`
  const message = `Leave request submitted by ${employeeName} (${leave.leave_type}, ${leave.days} days, starting ${formatDate(leave.start_date)}).`

  // Find all Principals and Directors
  const { data: managers } = await supabase
    .from('profiles')
    .select('id, phone, role')
    .in('role', ['Principal', 'Director'])

  if (managers) {
    for (const manager of managers) {
      const linkUrl = manager.role === 'Principal' ? '/dashboard/principal/leave-requests' : '/dashboard/director/leave-requests'
      await supabase.from('notifications').insert({
        user_id: manager.id,
        message,
        link_url: linkUrl
      })
      if (manager.phone) {
        await sendSMS(manager.phone, message)
      }
    }
  }
}

// Trigger when leave proposal is reviewed (approved/declined)
export async function triggerLeaveReviewed(leaveId: string) {
  const supabase = await createClient()
  const { data: leave, error } = await supabase
    .from('leave_applications')
    .select(`
      *,
      employee:employee_id (
        id,
        profiles (first_name, last_name, phone)
      ),
      reviewer:reviewer_id (
        profiles (first_name, last_name)
      )
    `)
    .eq('id', leaveId)
    .single()

  if (error || !leave) {
    console.error(`Failed to fetch leave details for review notification: ${error?.message}`)
    return
  }

  const employeeProfile = (leave.employee as any)?.profiles
  const reviewerName = leave.reviewer ? `${(leave.reviewer as any)?.profiles?.first_name} ${(leave.reviewer as any)?.profiles?.last_name}` : 'Reviewer'
  const message = `Your leave application for ${leave.leave_type} has been ${leave.status} by ${reviewerName}. Notes: ${leave.reviewer_notes || 'None'}`

  if (employeeProfile) {
    await supabase.from('notifications').insert({
      user_id: leave.employee_id,
      message,
      link_url: `/dashboard/staff/self-service/leave`
    })

    if (employeeProfile.phone) {
      await sendSMS(employeeProfile.phone, message)
    }
  }
}

// Trigger when salary advance is submitted
export async function triggerSalaryAdvanceSubmitted(advanceId: string) {
  const supabase = await createClient()
  const { data: advance, error } = await supabase
    .from('salary_advances')
    .select(`
      *,
      employee:employee_id (
        profiles (first_name, last_name)
      )
    `)
    .eq('id', advanceId)
    .single()

  if (error || !advance) {
    console.error(`Failed to fetch salary advance details: ${error?.message}`)
    return
  }

  const employeeName = `${(advance.employee as any)?.profiles?.first_name} ${(advance.employee as any)?.profiles?.last_name}`
  const formattedAmount = new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(advance.amount_requested))

  const message = `Salary advance request submitted by ${employeeName} (Requested: ${formattedAmount}).`

  // Notify Accountants
  const { data: accountants } = await supabase
    .from('profiles')
    .select('id, phone')
    .eq('role', 'Accountant')

  if (accountants) {
    for (const accountant of accountants) {
      await supabase.from('notifications').insert({
        user_id: accountant.id,
        message,
        link_url: `/dashboard/accountant/payments`
      })

      if (accountant.phone) {
        await sendSMS(accountant.phone, message)
      }
    }
  }
}

// Trigger when salary advance is disbursed
export async function triggerSalaryAdvanceDisbursed(advanceId: string) {
  const supabase = await createClient()
  const { data: advance, error } = await supabase
    .from('salary_advances')
    .select(`
      *,
      employee:employee_id (
        id,
        profiles (first_name, last_name, phone)
      )
    `)
    .eq('id', advanceId)
    .single()

  if (error || !advance) {
    console.error(`Failed to fetch salary advance for disbursement notification: ${error?.message}`)
    return
  }

  const employeeProfile = (advance.employee as any)?.profiles
  const formattedAmount = new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(advance.amount_approved || advance.amount_requested))

  const message = `Your salary advance request of ${formattedAmount} has been disbursed by the Accountant.`

  if (employeeProfile) {
    await supabase.from('notifications').insert({
      user_id: advance.employee_id,
      message,
      link_url: `/dashboard/staff/self-service/advances`
    })

    if (employeeProfile.phone) {
      await sendSMS(employeeProfile.phone, message)
    }
  }
}

// Trigger when payroll is proposed
export async function triggerPayrollProposed(payrollId: string) {
  const supabase = await createClient()
  const { data: payroll, error } = await supabase
    .from('payrolls')
    .select('*')
    .eq('id', payrollId)
    .single()

  if (error || !payroll) {
    console.error(`Failed to fetch payroll details: ${error?.message}`)
    return
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const monthName = months[payroll.month - 1]
  const message = `Accountant has proposed a new payroll draft for ${monthName} ${payroll.year} for review.`

  // Notify Principals
  const { data: principals } = await supabase
    .from('profiles')
    .select('id, phone')
    .eq('role', 'Principal')

  if (principals) {
    for (const principal of principals) {
      await supabase.from('notifications').insert({
        user_id: principal.id,
        message,
        link_url: `/dashboard/principal/payrolls`
      })

      if (principal.phone) {
        await sendSMS(principal.phone, message)
      }
    }
  }
}

// Trigger when payroll is reviewed by Principal
export async function triggerPayrollReviewedPrincipal(payrollId: string, approve: boolean, notes: string) {
  const supabase = await createClient()
  const { data: payroll, error } = await supabase
    .from('payrolls')
    .select('*')
    .eq('id', payrollId)
    .single()

  if (error || !payroll) {
    console.error(`Failed to fetch payroll details for principal review notification: ${error?.message}`)
    return
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const monthName = months[payroll.month - 1]
  const actionText = approve ? 'approved' : 'declined'
  const messageToAccountant = `Payroll for ${monthName} ${payroll.year} has been ${actionText} by the Principal. Notes: ${notes || 'None'}`
  const messageToDirector = `Payroll for ${monthName} ${payroll.year} has been approved by the Principal and is pending final authorization.`

  // Notify Accountants
  const { data: accountants } = await supabase
    .from('profiles')
    .select('id, phone')
    .eq('role', 'Accountant')

  if (accountants) {
    for (const accountant of accountants) {
      await supabase.from('notifications').insert({
        user_id: accountant.id,
        message: messageToAccountant,
        link_url: `/dashboard/accountant/payroll`
      })

      if (accountant.phone) {
        await sendSMS(accountant.phone, messageToAccountant)
      }
    }
  }

  // Notify Directors if approved
  if (approve) {
    const { data: directors } = await supabase
      .from('profiles')
      .select('id, phone')
      .eq('role', 'Director')

    if (directors) {
      for (const director of directors) {
        await supabase.from('notifications').insert({
          user_id: director.id,
          message: messageToDirector,
          link_url: `/dashboard/director/payrolls`
        })

        if (director.phone) {
          await sendSMS(director.phone, messageToDirector)
        }
      }
    }
  }
}

// Trigger when payroll is reviewed by Director
export async function triggerPayrollReviewedDirector(payrollId: string, approve: boolean, notes: string) {
  const supabase = await createClient()
  const { data: payroll, error } = await supabase
    .from('payrolls')
    .select('*')
    .eq('id', payrollId)
    .single()

  if (error || !payroll) {
    console.error(`Failed to fetch payroll details for director review notification: ${error?.message}`)
    return
  }

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const monthName = months[payroll.month - 1]
  const actionText = approve ? 'finalized and approved' : 'declined'
  const message = `Payroll for ${monthName} ${payroll.year} has been ${actionText} by the Director. Notes: ${notes || 'None'}`

  // Notify Accountants and Principals
  const { data: managers } = await supabase
    .from('profiles')
    .select('id, phone, role')
    .in('role', ['Accountant', 'Principal'])

  if (managers) {
    for (const manager of managers) {
      const linkUrl = manager.role === 'Accountant' ? `/dashboard/accountant/payroll` : `/dashboard/principal/payrolls`
      await supabase.from('notifications').insert({
        user_id: manager.id,
        message,
        link_url: linkUrl
      })

      if (manager.phone) {
        await sendSMS(manager.phone, message)
      }
    }
  }
}

