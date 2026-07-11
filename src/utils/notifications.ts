import { createClient } from '@/utils/supabase/server'

// Simulates sending an SMS via Africa's Talking API
export async function sendSMS(phone: string, message: string) {
  console.log(`[SMS SENDER] Sending to ${phone}: "${message}"`)
  // In production, integrate with Africa's Talking SDK:
  // const credentials = { apiKey: process.env.AT_API_KEY, username: process.env.AT_USERNAME };
  // const AT = require('africastalking')(credentials);
  // await AT.SMS.send({ to: [phone], message });
  return { success: true }
}

// Simulates sending a WhatsApp message
export async function sendWhatsApp(phone: string, message: string, mediaUrl?: string) {
  console.log(`[WHATSAPP SENDER] Sending to ${phone}: "${message}"${mediaUrl ? ` | Attachment: ${mediaUrl}` : ''}`)
  // In production, integrate with WhatsApp Business Cloud API / Twilio WhatsApp API
  return { success: true }
}

// Trigger payment recorded notifications (in-app, SMS, WhatsApp receipt delivery)
export async function triggerPaymentRecorded(paymentId: string) {
  const supabase = await createClient()

  // 1. Fetch payment details, student, and linked parents
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

  // 2. Fetch parents linked to this student to get their phone numbers / emails
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
      const parentPhone = parentProfile.phone || '+255770000000' // fallback Zanzibar country code
      const smsMessage = `Dear Parent, a payment of ${formattedAmount} has been recorded for ${studentName}. Receipt No: ${payment.receipt_number}. Thank you.`
      await sendSMS(parentPhone, smsMessage)

      // D. Send WhatsApp Receipt PDF
      const whatsappMessage = `Dear Parent, a payment of ${formattedAmount} has been recorded for ${studentName}. Your invoice receipt PDF is attached.`
      await sendWhatsApp(parentPhone, whatsappMessage, pdfReceiptUrl)
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
