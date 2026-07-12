import { createClient } from '@/utils/supabase/server'
import { formatDate } from '@/utils/date'

import nodemailer from 'nodemailer'

// Centralized Email Sender - uses Nodemailer with SMTP, fallback to simulator
export async function sendEmail(to: string, subject: string, htmlContent: string) {
  const smtpHost = process.env.SMTP_HOST
  const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@leaders.ac.tz'

  if (smtpHost && smtpUser && smtpPass) {
    console.log(`[EMAIL SENDER] Dispatching real email to ${to} via SMTP...`)
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })

      const info = await transporter.sendMail({
        from: `"Leaders International ERP" <${fromEmail}>`,
        to: to,
        subject: subject,
        html: htmlContent,
      })

      console.log('[EMAIL SENDER] SMTP email sent successfully:', info.messageId)
      return { success: true }
    } catch (e: any) {
      console.error('[EMAIL SENDER] SMTP request failed:', e.message)
      return { success: false, error: e.message }
    }
  } else {
    console.log(`[EMAIL SIMULATOR] Outbox to ${to} | Subject: "${subject}" | Content Preview: "${htmlContent.replace(/<[^>]*>/g, '').trim().substring(0, 100)}..."`)
    return { success: true }
  }
}

// Modular SMS Sender - supports generic local Tanzanian providers (e.g. Beem, NextSMS, or Africa's Talking)
export async function sendSMS(phone: string, message: string) {
  const apiKey = process.env.SMS_API_KEY
  const senderId = process.env.SMS_SENDER_ID || 'LEADERS'
  const apiSecret = process.env.SMS_API_SECRET // some providers need an api secret too

  if (apiKey) {
    console.log(`[SMS SENDER] Dispatching real API SMS to ${phone}...`)
    try {
      // TODO: Replace URL and payload structure with the chosen Tanzanian local provider (e.g., Beem, NextSMS)
      // Example payload structure for generic local SMS Gateway:
      const response = await fetch('https://api.example-tanzanian-sms-gateway.com/v1/send', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(apiKey + ':' + (apiSecret || '')).toString('base64')}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          source_addr: senderId,
          schedule_time: '',
          encoding: 0,
          message: message,
          recipients: [{ recipient_id: 1, dest_addr: phone }]
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

// Trigger payment recorded notifications (in-app, SMS, WhatsApp receipt delivery, and Email)
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

      // E. Send Email Confirmation
      if (parentProfile.email) {
        const parentName = `${parentProfile.first_name} ${parentProfile.last_name}`
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <h2 style="color: #3bb3c3;">Payment Receipt Confirmed</h2>
            <p>Dear ${parentName},</p>
            <p>We are pleased to inform you that a payment of <strong>${formattedAmount}</strong> has been successfully received and recorded for <strong>${studentName}</strong> for <strong>${termInfo}</strong>.</p>
            <p><strong>Receipt Number:</strong> ${payment.receipt_number}</p>
            <p>You can download your official PDF receipt by clicking the link below:</p>
            <p><a href="${pdfReceiptUrl}" style="background-color: #3bb3c3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Download Receipt PDF</a></p>
            <br/>
            <p>Best regards,</p>
            <p><strong>Leaders International School</strong></p>
          </div>
        `
        await sendEmail(parentProfile.email, `School Payment Receipt Confirmation - Receipt: ${payment.receipt_number}`, emailHtml)
      }
    }
  }
}

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

  // Find all Principals and Directors with detailed contact info
  const { data: managers } = await supabase
    .from('profiles')
    .select('id, phone, email, role, first_name, last_name')
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

      if (manager.email) {
        const managerName = `${manager.first_name || 'Manager'}`
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <h2 style="color: #3bb3c3;">New Leave Application Received</h2>
            <p>Dear ${managerName},</p>
            <p>A new leave application has been submitted by <strong>${employeeName}</strong> and requires your review.</p>
            <p><strong>Details:</strong></p>
            <ul>
              <li><strong>Type:</strong> ${leave.leave_type}</li>
              <li><strong>Duration:</strong> ${leave.days} days</li>
              <li><strong>Start Date:</strong> ${formatDate(leave.start_date)}</li>
            </ul>
            <p>Please log in to the ERP portal to review and take action.</p>
            <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}${linkUrl}" style="background-color: #3bb3c3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Review Leave Request</a></p>
            <br/>
            <p>Best regards,</p>
            <p><strong>Leaders International School ERP</strong></p>
          </div>
        `
        await sendEmail(manager.email, 'New Leave Application Submission Alert', emailHtml)
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
        profiles (first_name, last_name, phone, email)
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

    if (employeeProfile.email) {
      const staffName = `${employeeProfile.first_name} ${employeeProfile.last_name}`
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
          <h2 style="color: #3bb3c3;">Leave Request Reviewed</h2>
          <p>Dear ${staffName},</p>
          <p>Your leave request has been reviewed.</p>
          <p><strong>Status:</strong> <strong style="color: ${leave.status === 'Approved' ? 'green' : 'red'};">${leave.status}</strong></p>
          <p><strong>Reviewer:</strong> ${reviewerName}</p>
          <p><strong>Notes:</strong> ${leave.reviewer_notes || 'None'}</p>
          <br/>
          <p>Best regards,</p>
          <p><strong>Leaders International School ERP</strong></p>
        </div>
      `
      await sendEmail(employeeProfile.email, `Leave Application Status: ${leave.status}`, emailHtml)
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

  // Notify Accountants with contact info
  const { data: accountants } = await supabase
    .from('profiles')
    .select('id, phone, email, first_name, last_name')
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

      if (accountant.email) {
        const accountantName = `${accountant.first_name || 'Accountant'}`
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <h2 style="color: #3bb3c3;">New Salary Advance Request</h2>
            <p>Dear ${accountantName},</p>
            <p>A new salary advance request has been submitted by <strong>${employeeName}</strong> and is pending review.</p>
            <p><strong>Amount Requested:</strong> ${formattedAmount}</p>
            <p>Please log in to the ERP portal to review and manage payments.</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>Leaders International School ERP</strong></p>
          </div>
        `
        await sendEmail(accountant.email, 'New Salary Advance Request Submission', emailHtml)
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
        profiles (first_name, last_name, phone, email)
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

    if (employeeProfile.email) {
      const staffName = `${employeeProfile.first_name} ${employeeProfile.last_name}`
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
          <h2 style="color: #3bb3c3;">Salary Advance Disbursed</h2>
          <p>Dear ${staffName},</p>
          <p>Your salary advance request has been approved and successfully disbursed.</p>
          <p><strong>Amount Disbursed:</strong> <strong>${formattedAmount}</strong></p>
          <p>You can check the details on your self-service dashboard.</p>
          <br/>
          <p>Best regards,</p>
          <p><strong>Leaders International School ERP</strong></p>
        </div>
      `
      await sendEmail(employeeProfile.email, 'Salary Advance Disbursed Notification', emailHtml)
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

  // Notify Principals with email
  const { data: principals } = await supabase
    .from('profiles')
    .select('id, phone, email, first_name, last_name')
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

      if (principal.email) {
        const principalName = `${principal.first_name || 'Principal'}`
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <h2 style="color: #3bb3c3;">Payroll Draft Proposed</h2>
            <p>Dear ${principalName},</p>
            <p>${message}</p>
            <p>Please log in to the portal to review the payroll details.</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>Leaders International School ERP</strong></p>
          </div>
        `
        await sendEmail(principal.email, `Payroll Proposed: ${monthName} ${payroll.year}`, emailHtml)
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
    .select('id, phone, email, first_name, last_name')
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

      if (accountant.email) {
        const accountantName = `${accountant.first_name || 'Accountant'}`
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <h2 style="color: #3bb3c3;">Payroll Review Update</h2>
            <p>Dear ${accountantName},</p>
            <p>${messageToAccountant}</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>Leaders International School ERP</strong></p>
          </div>
        `
        await sendEmail(accountant.email, `Payroll ${actionText.toUpperCase()} by Principal`, emailHtml)
      }
    }
  }

  // Notify Directors if approved
  if (approve) {
    const { data: directors } = await supabase
      .from('profiles')
      .select('id, phone, email, first_name, last_name')
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

        if (director.email) {
          const directorName = `${director.first_name || 'Director'}`
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
              <h2 style="color: #3bb3c3;">Payroll Pending Final Approval</h2>
              <p>Dear ${directorName},</p>
              <p>${messageToDirector}</p>
              <p>Please log in to review and authorize the final payroll disbursement.</p>
              <br/>
              <p>Best regards,</p>
              <p><strong>Leaders International School ERP</strong></p>
            </div>
          `
          await sendEmail(director.email, 'Payroll Approved by Principal - Pending Action', emailHtml)
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
    .select('id, phone, email, role, first_name, last_name')
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

      if (manager.email) {
        const managerName = `${manager.first_name || 'Manager'}`
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
            <h2 style="color: #3bb3c3;">Payroll Review Update</h2>
            <p>Dear ${managerName},</p>
            <p>${message}</p>
            <br/>
            <p>Best regards,</p>
            <p><strong>Leaders International School ERP</strong></p>
          </div>
        `
        await sendEmail(manager.email, `Payroll finalized by Director`, emailHtml)
      }
    }
  }
}

