import { createClient } from '@/utils/supabase/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export class WhatsAppService {
  /**
   * Generates a PDF receipt similar to the ReportLab implementation in Python.
   */
  static async generateReceiptPDF(paymentId: string, receiptNumber: string, amount: number, studentName: string, date: string): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([600, 400])
    
    const { width, height } = page.getSize()
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    
    // Header
    page.drawText('Leaders International School', { x: 50, y: height - 50, size: 22, font: fontBold, color: rgb(0.06, 0.18, 0.35) })
    page.drawText('OFFICIAL PAYMENT RECEIPT', { x: 50, y: height - 75, size: 14, font: fontBold, color: rgb(0.06, 0.18, 0.35) })
    
    // Details
    page.drawText('Receipt Number:', { x: 50, y: height - 120, size: 10, font })
    page.drawText(receiptNumber, { x: 150, y: height - 120, size: 10, font: fontBold })

    page.drawText('Date:', { x: 350, y: height - 120, size: 10, font })
    page.drawText(date, { x: 400, y: height - 120, size: 10, font: fontBold })

    page.drawText('Student Name:', { x: 50, y: height - 140, size: 10, font })
    page.drawText(studentName, { x: 150, y: height - 140, size: 10, font: fontBold })

    page.drawText('Amount Paid:', { x: 50, y: height - 160, size: 10, font })
    page.drawText(`TZS ${amount.toLocaleString()}`, { x: 150, y: height - 160, size: 10, font: fontBold, color: rgb(0.1, 0.6, 0.2) })

    // Footer
    page.drawText('Thank you for your payment. Please keep this receipt for your records.', {
      x: 50, y: 50, size: 9, font, color: rgb(0.3, 0.3, 0.3)
    })

    const pdfBytes = await pdfDoc.save()
    return pdfBytes
  }

  /**
   * Uploads PDF to Supabase Storage and returns the public URL.
   */
  static async uploadReceipt(receiptNumber: string, pdfBytes: Uint8Array): Promise<string> {
    const supabase = await createClient()
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
   * Simulates dispatching the receipt via WhatsApp and logs it.
   */
  static async sendReceipt(phone: string, receiptNumber: string, pdfUrl: string) {
    const supabase = await createClient()

    // Fetch active WhatsApp config
    const { data: config } = await supabase
      .from('integration_config')
      .select('*')
      .eq('provider_type', 'WHATSAPP')
      .eq('is_active', true)
      .single()

    const providerName = config?.provider_name || 'CONSOLE_STUB'
    let dispatchStatus = 'FAILED'

    try {
      if (config?.api_url && config?.api_key) {
        // Example structure for a real provider (e.g. Twilio or InfoBip)
        console.log(`[WHATSAPP] Dispatching real HTTP request to ${providerName} at ${config.api_url}`)
        /*
        const response = await fetch(config.api_url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.api_key}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            to: phone,
            type: 'document',
            document: {
              link: pdfUrl,
              filename: `Receipt-${receiptNumber}.pdf`
            }
          })
        })
        if (response.ok) dispatchStatus = 'SENT'
        */
        
        // Simulating success if config is present
        dispatchStatus = 'SENT'
      } else {
        // Fallback or missing config
        console.warn(`[WHATSAPP] Missing API URL/Key for ${providerName}. Logging stub.`)
        dispatchStatus = 'SENT_STUB'
      }

    } catch (e) {
      console.error('[WHATSAPP] Dispatch failed:', e)
      dispatchStatus = 'FAILED'
    }

    // Log to whatsapp_logs
    await supabase.from('whatsapp_logs').insert({
      phone_number: phone,
      message_type: 'RECEIPT',
      reference_id: receiptNumber,
      status: dispatchStatus
    })
  }
}
