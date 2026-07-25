import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { WhatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { generateDetailedReceiptPdfBuffer } from '@/lib/pdf/ReceiptPdfGenerator'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user & check permission
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single()

    const roles = profile?.roles || []
    const allowedRoles = ['Accountant', 'System Admin', 'Director', 'Principal', 'Dean', 'Teacher']
    const isAllowed = roles.some((r: string) => allowedRoles.includes(r))

    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Parse body
    const body = await request.json()
    const { paymentId, phone } = body

    if (!paymentId || !phone) {
      return NextResponse.json({ error: 'Missing paymentId or phone number' }, { status: 400 })
    }

    // 3. Fetch payment details
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .select(`
        *,
        students (
          profiles (first_name, last_name)
        )
      `)
      .eq('id', paymentId)
      .single()

    if (dbError || !payment) {
      console.error('[SEND RECEIPT ERROR] Payment not found:', dbError)
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    const studentName = payment.students?.profiles
      ? `${payment.students.profiles.first_name} ${payment.students.profiles.last_name}`
      : 'Student'

    const receiptNumber = payment.receipt_number
    const amount = Number(payment.amount)
    const dateStr = new Date(payment.payment_date).toLocaleDateString()

    // 4. Generate PDF
    console.log(`[WHATSAPP API] Generating receipt PDF for payment ${paymentId}`)
    const pdfBuffer = await generateDetailedReceiptPdfBuffer(paymentId)
    const pdfBytes = new Uint8Array(pdfBuffer)

    // 5. Upload to Supabase Storage
    console.log(`[WHATSAPP API] Uploading receipt PDF to storage`)
    const pdfUrl = await WhatsAppService.uploadReceipt(receiptNumber, pdfBytes)

    // 6. Send via WhatsApp (Twilio)
    console.log(`[WHATSAPP API] Dispatching PDF receipt link to WhatsApp: ${phone}`)
    const cleanNo = phone.replace(/[+\s-]/g, '')
    const formattedPhone = cleanNo.startsWith('0') ? '255' + cleanNo.substring(1) : cleanNo
    
    const recNo = receiptNumber.split('-').pop() || receiptNumber
    const textMsg = `Dear Parent, please find the official payment receipt for REC-${recNo} here: ${pdfUrl}`

    const result = await WhatsAppService.sendWhatsAppPDF(
      formattedPhone,
      `Receipt-${receiptNumber}.pdf`,
      pdfUrl,
      textMsg
    )

    if (!result) {
      return NextResponse.json({ error: 'Failed to send WhatsApp message via Twilio.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, pdfUrl })

  } catch (error: any) {
    console.error('[API Send Receipt ERROR]', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
