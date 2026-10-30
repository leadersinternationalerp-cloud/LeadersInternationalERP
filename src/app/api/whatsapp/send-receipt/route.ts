import { createClient } from '@/utils/supabase/server'
import { WhatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { generateDetailedReceiptPdfBuffer } from '@/lib/pdf/ReceiptPdfGenerator'
import { route, ok, parseJson } from '@/lib/api/handler'
import { FINANCE_ROLES } from '@/lib/auth/roles'
import { badRequest, ApiError } from '@/lib/api/errors'

export const POST = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()

    const body = await parseJson<{
      paymentId?: string
      phone?: string
    }>(req)

    const { paymentId, phone: requestedPhone } = body

    if (!paymentId) {
      throw badRequest({ paymentId: 'Missing paymentId' })
    }

    // 1. Fetch payment details
    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .select(`
        *,
        students:student_id (
          id,
          profiles:id (first_name, last_name)
        )
      `)
      .eq('id', paymentId)
      .maybeSingle()

    if (dbError || !payment) {
      throw new ApiError('NOT_FOUND', 'Payment record not found')
    }

    const studentId = payment.student_id

    // 2. Derive parent phone from database records
    const { data: parentLinks } = await supabase
      .from('student_parents')
      .select('parent_id, profiles:parent_id(phone)')
      .eq('student_id', studentId)

    interface ParentPhoneRecord {
      parent_id: string
      profiles?: { phone?: string } | { phone?: string }[]
    }

    const parentPhones = (parentLinks || [])
      .map((l: ParentPhoneRecord) => {
        const p = Array.isArray(l.profiles) ? l.profiles[0] : l.profiles
        return p?.phone?.replace(/[+\s-]/g, '')
      })
      .filter((p): p is string => Boolean(p))

    let targetPhone = parentPhones[0]

    // If client requested a phone, verify it matches one of the registered parent numbers
    if (requestedPhone) {
      const cleanRequested = requestedPhone.replace(/[+\s-]/g, '')
      const matched = parentPhones.find((p) => p.endsWith(cleanRequested) || cleanRequested.endsWith(p))
      if (matched) {
        targetPhone = matched
      } else if (parentPhones.length === 0) {
        // Fallback to validated clean phone if no registered parent record
        targetPhone = cleanRequested
      }
    }

    if (!targetPhone) {
      throw badRequest({ phone: 'No registered parent phone number found for this student' })
    }

    const receiptNumber = payment.receipt_number || `REC-${payment.id.slice(0, 8)}`

    // 3. Generate PDF
    const pdfBuffer = await generateDetailedReceiptPdfBuffer(paymentId)
    const pdfBytes = new Uint8Array(pdfBuffer)

    // 4. Upload to Supabase Storage
    const pdfUrl = await WhatsAppService.uploadReceipt(receiptNumber, pdfBytes)

    // 5. Send via WhatsApp (Twilio)
    const formattedPhone = targetPhone.startsWith('0') ? '255' + targetPhone.substring(1) : targetPhone
    const recNo = receiptNumber.split('-').pop() || receiptNumber
    const textMsg = `Dear Parent, please find the official payment receipt for REC-${recNo} here: ${pdfUrl}`

    const result = await WhatsAppService.sendWhatsAppPDF(
      formattedPhone,
      `Receipt-${receiptNumber}.pdf`,
      pdfUrl,
      textMsg
    )

    if (!result) {
      throw new ApiError('PROVIDER_ERROR', 'Failed to send WhatsApp message via Twilio')
    }

    return ok({ success: true, pdfUrl }, { requestId })
  },
  {
    roles: FINANCE_ROLES,
    rateLimit: { key: 'whatsapp-receipt', max: 60, windowMs: 3600_000 },
  }
)
