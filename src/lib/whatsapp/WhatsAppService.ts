import { createServiceClient } from '@/utils/supabase/service'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export class WhatsAppService {


  /**
   * Uploads PDF to Supabase Storage and returns the public URL.
   */
  static async uploadReceipt(receiptNumber: string, pdfBytes: Uint8Array): Promise<string> {
    const supabase = createServiceClient()
    const fileName = `${receiptNumber}.pdf`
    
    const { error } = await supabase.storage.from('receipts').upload(fileName, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true
    })

    if (error) {
      console.error('Failed to upload receipt PDF:', error)
      throw error
    }

    const { data } = supabase.storage.from('receipts').getPublicUrl(fileName)
    return data.publicUrl
  }

  /**
   * Generates a PDF invoice statement.
   */
  static async generateInvoicePDF(
    invoiceNumber: string,
    studentName: string,
    gradeLevel: string,
    termName: string,
    netAmount: number,
    paidAmount: number,
    date: string
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([600, 450])
    
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    // Header
    page.drawText('Leaders International School', { x: 50, y: height - 50, size: 22, font: fontBold, color: rgb(0.06, 0.18, 0.35) })
    page.drawText('FEE OUTSTANDING STATEMENT', { x: 50, y: height - 75, size: 14, font: fontBold, color: rgb(0.06, 0.18, 0.35) })
    
    // Details
    page.drawText('Invoice Number:', { x: 50, y: height - 120, size: 10, font })
    page.drawText(invoiceNumber, { x: 160, y: height - 120, size: 10, font: fontBold })
 
    page.drawText('Date:', { x: 350, y: height - 120, size: 10, font })
    page.drawText(date, { x: 400, y: height - 120, size: 10, font: fontBold })
 
    page.drawText('Student Name:', { x: 50, y: height - 145, size: 10, font })
    page.drawText(studentName, { x: 160, y: height - 145, size: 10, font: fontBold })

    page.drawText('Grade / Class:', { x: 50, y: height - 170, size: 10, font })
    page.drawText(gradeLevel, { x: 160, y: height - 170, size: 10, font: fontBold })

    page.drawText('Term:', { x: 350, y: height - 170, size: 10, font })
    page.drawText(termName, { x: 400, y: height - 170, size: 10, font: fontBold })

    // Financial Breakdown
    const lineY = height - 200
    page.drawLine({ start: { x: 50, y: lineY }, end: { x: 550, y: lineY }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })

    page.drawText('Net Fee Amount:', { x: 50, y: lineY - 30, size: 11, font })
    page.drawText(`TZS ${netAmount.toLocaleString()}`, { x: 200, y: lineY - 30, size: 11, font: fontBold })

    page.drawText('Total Paid to Date:', { x: 50, y: lineY - 65, size: 11, font })
    page.drawText(`TZS ${paidAmount.toLocaleString()}`, { x: 200, y: lineY - 65, size: 11, font: fontBold, color: rgb(0.1, 0.6, 0.2) })

    const outstanding = netAmount - paidAmount
    page.drawText('Outstanding Balance:', { x: 50, y: lineY - 100, size: 12, font: fontBold, color: rgb(0.7, 0.1, 0.1) })
    page.drawText(`TZS ${outstanding.toLocaleString()}`, { x: 200, y: lineY - 100, size: 12, font: fontBold, color: rgb(0.7, 0.1, 0.1) })

    // Footer
    page.drawText('Please settle the outstanding balance promptly. For queries, contact accounts.', {
      x: 50, y: 50, size: 9, font, color: rgb(0.3, 0.3, 0.3)
    })
 
    const pdfBytes = await pdfDoc.save()
    return pdfBytes
  }

  /**
   * Uploads Invoice Statement PDF to Supabase Storage and returns public URL.
   */
  static async uploadInvoice(invoiceNumber: string, pdfBytes: Uint8Array): Promise<string> {
    const supabase = createServiceClient()
    const fileName = `Statement-${invoiceNumber}.pdf`
    
    const { error } = await supabase.storage.from('receipts').upload(fileName, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true
    })

    if (error) {
      console.error('Failed to upload invoice PDF:', error)
      throw error
    }

    const { data } = supabase.storage.from('receipts').getPublicUrl(fileName)
    return data.publicUrl
  }

  /**
   * Sends a payment receipt PDF via WhatsApp.
   */
  static async sendReceipt(phone: string, receiptNumber: string, pdfUrl: string) {
    const text = `Dear Parent, please find the official payment receipt for REC-${receiptNumber.split('-').pop() || receiptNumber} here: ${pdfUrl}`
    await this.sendWhatsAppPDF(phone, `Receipt-${receiptNumber}.pdf`, pdfUrl, text)
  }

  /**
   * Generic method to dispatch a PDF document link via WhatsApp.
   */
  static async sendWhatsAppPDF(phone: string, fileName: string, pdfUrl: string, messageText: string): Promise<boolean> {
    const supabase = createServiceClient()

    // Fetch active WhatsApp config
    const { data: config } = await supabase
      .from('integration_config')
      .select('*')
      .eq('provider_type', 'WHATSAPP')
      .eq('is_active', true)
      .single()

    if (!config) {
      console.warn('[WHATSAPP] No active WhatsApp provider configured.')
      return false
    }

    const providerName = config.provider_name || 'CONSOLE_STUB'
    let dispatchStatus = 'FAILED'

    try {
      if (config.api_key) {
        let response: Response
        const pNameLower = providerName.toLowerCase()

        if (pNameLower.includes('twilio')) {
          const accountSid = config.api_key
          const authToken = config.api_secret
          const fromNumber = config.webhook_secret // Default Sender ID

          if (!fromNumber) {
            console.error('[WHATSAPP] Failed to dispatch via Twilio: No default WhatsApp sender registered.')
            return false
          }

          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
          const params = new URLSearchParams()
          
          let twilioTo = phone
          if (twilioTo.startsWith('whatsapp:')) twilioTo = twilioTo.replace('whatsapp:', '')
          if (!twilioTo.startsWith('+')) twilioTo = '+' + twilioTo

          const twilioFrom = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`

          params.append('To', `whatsapp:${twilioTo}`)
          params.append('From', twilioFrom)
          params.append('Body', messageText)
          params.append('MediaUrl', pdfUrl)

          const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')

          response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
          })
        } else {
          // Standard JSON payload
          if (!config.api_url) {
            throw new Error(`API URL is missing for active WHATSAPP provider: ${providerName}`)
          }

          let payload: any = {
            to: phone,
            type: 'document',
            document: {
              link: pdfUrl,
              filename: fileName
            }
          }

          if (pNameLower.includes('meta') || pNameLower.includes('whatsapp cloud')) {
            payload = {
              messaging_product: "whatsapp",
              recipient_type: "individual",
              to: phone,
              type: "document",
              document: {
                link: pdfUrl,
                filename: fileName
              }
            }
          }

          response = await fetch(config.api_url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.api_key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          })
        }

        if (response.ok) {
          dispatchStatus = 'SENT'
        } else {
          console.error(`[WHATSAPP] Provider returned ${response.status}: ${await response.text()}`)
        }
      } else {
        dispatchStatus = 'SENT_STUB'
      }
    } catch (e) {
      console.error('[WHATSAPP] Dispatch failed:', e)
    }

    // Log to whatsapp_logs
    await supabase.from('whatsapp_logs').insert({
      phone_number: phone,
      message_type: 'DOCUMENT',
      reference_id: fileName.substring(0, 50),
      status: dispatchStatus
    })

    return dispatchStatus === 'SENT' || dispatchStatus === 'SENT_STUB'
  }
}
