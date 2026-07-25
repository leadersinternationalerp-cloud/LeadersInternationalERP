import PDFDocument from 'pdfkit'
import { drawLetterhead } from '@/lib/pdfLetterhead'
import { createClient } from '@/utils/supabase/server'

export async function generateDetailedReceiptPdfBuffer(paymentId: string): Promise<Buffer> {
  const supabase = await createClient()

  // Query payment details
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select(`
      *,
      invoices (id, term, academic_year, net_amount),
      students (
        student_id,
        grade_level,
        profiles (first_name, last_name)
      ),
      receiver:received_by (email)
    `)
    .eq('id', paymentId)
    .single()

  if (paymentError || !payment) {
    throw new Error('Payment not found')
  }

  // Fetch system settings for header branding & stamp
  const { data: settingsData } = await supabase.from('system_settings').select('*')
  const settings: Record<string, string> = {}
  settingsData?.forEach(item => {
    settings[item.key] = typeof item.value === 'string' ? item.value : JSON.stringify(item.value)
  })

  const schoolStampUrl = settings['school_stamp']

  // Fetch invoice items to render the breakdown table (pro-rated to payment.amount)
  const { data: invoiceItems } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', payment.invoice_id)

  const totalInvoiceAmount = invoiceItems?.reduce((sum, item) => sum + Number(item.amount), 0) || 1
  const ratio = Number(payment.amount) / totalInvoiceAmount

  const tableItems = (invoiceItems || []).map(item => ({
    year: payment.invoices?.academic_year || '',
    term: payment.invoices?.term || '',
    vote_head: item.description || 'Fee Item',
    amount: Number(item.amount) * ratio
  }))

  // Calculate Balances
  const { data: allInvoicePayments } = await supabase
    .from('payments')
    .select('id, amount')
    .eq('invoice_id', payment.invoice_id)
    .order('created_at', { ascending: true })

  let paidBeforeThis = 0
  const paymentsSorted = allInvoicePayments || []
  for (const p of paymentsSorted) {
    if (p.id === payment.id) {
      break
    }
    paidBeforeThis += Number(p.amount)
  }

  const balanceBefore = Number(payment.invoices?.net_amount || 0) - paidBeforeThis
  const balanceAfter = balanceBefore - Number(payment.amount)

  // Load stamp buffer if configured
  let stampBuffer: Buffer | null = null
  if (schoolStampUrl) {
    try {
      const stampRes = await fetch(schoolStampUrl)
      if (stampRes.ok) {
        const arr = await stampRes.arrayBuffer()
        stampBuffer = Buffer.from(arr)
      }
    } catch (err) {
      console.error('Failed to load stamp buffer:', err)
    }
  }

  // Generate PDF via pdfkit with bufferPages: true (A5 Landscape provides same width as A4 but half height)
  const doc = new PDFDocument({ margin: 40, size: 'A5', layout: 'landscape', bufferPages: true })
  const chunks: Buffer[] = []
  doc.on('data', chunk => chunks.push(chunk))

  // Start drawing receipt body contents below the letterhead (Y=105)
  let boxY = 105
  doc.strokeColor('#e2e8f0').lineWidth(0.5)
  
  // Box 1 (Left): Student Details
  doc.rect(40, boxY, 250, 75).stroke()
  doc.fillColor('#64748b').fontSize(8.5).font('Helvetica')
  doc.text('Student', 50, boxY + 10)
  doc.text('Admission No', 50, boxY + 30)
  doc.text('Class', 50, boxY + 50)

  const stName = `${payment.students?.profiles?.first_name} ${payment.students?.profiles?.last_name}`
  doc.fillColor('#0f172a').font('Helvetica-Bold')
  doc.text(stName.toUpperCase(), 130, boxY + 10)
  doc.text(payment.students?.student_id || '-', 130, boxY + 30)
  doc.text(payment.students?.grade_level || '-', 130, boxY + 50)

  // Box 2 (Right): Payment Details
  doc.strokeColor('#e2e8f0').rect(305, boxY, 250, 75).stroke()
  doc.fillColor('#64748b').font('Helvetica')
  doc.text('Term', 315, boxY + 10)
  doc.text('Year', 315, boxY + 28)
  doc.text('Method', 315, boxY + 46)
  doc.text('Total Paid', 315, boxY + 62)

  doc.fillColor('#0f172a').font('Helvetica-Bold')
  doc.text(payment.invoices?.term || '-', 385, boxY + 10)
  doc.text(payment.invoices?.academic_year || '-', 385, boxY + 28)
  doc.text(payment.payment_method || '-', 385, boxY + 46)

  const paidStr = new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 2 }).format(payment.amount)
  doc.text(paidStr, 385, boxY + 62)

  // 3. Vote Head Breakdown Table
  let tableY = 195
  doc.rect(40, tableY, 515, 20).fill('#f8fafc')
  doc.strokeColor('#e2e8f0').rect(40, tableY, 515, 20).stroke()
  
  doc.fillColor('#475569').fontSize(8.5).font('Helvetica-Bold')
  doc.text('Year', 45, tableY + 6, { width: 50 })
  doc.text('Term', 105, tableY + 6, { width: 80 })
  doc.text('Vote Head', 195, tableY + 6, { width: 230 })
  doc.text('Amount', 475, tableY + 6, { width: 75, align: 'right' })

  let currentY = tableY + 20

  tableItems.forEach(item => {
    doc.strokeColor('#e2e8f0').rect(40, currentY, 515, 18).stroke()
    
    doc.fillColor('#334155').fontSize(8.5).font('Helvetica')
    doc.text(item.year, 45, currentY + 5, { width: 50 })
    doc.text(item.term, 105, currentY + 5, { width: 80 })
    doc.text(item.vote_head, 195, currentY + 5, { width: 230 })

    const itemAmt = new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 2 }).format(item.amount)
    doc.text(itemAmt, 475, currentY + 5, { width: 75, align: 'right' })

    currentY += 18
  })

  // Total breakdown row
  doc.strokeColor('#cbd5e1').rect(40, currentY, 515, 18).stroke()
  doc.fillColor('#0f172a').font('Helvetica-Bold')
  doc.text('Total', 195, currentY + 5)
  doc.text(paidStr, 475, currentY + 5, { width: 75, align: 'right' })

  currentY += 28

  // 4. Balances vs Prepared Office details
  doc.strokeColor('#e2e8f0')
  
  // Box 3 (Left): Balance summaries
  doc.rect(40, currentY, 250, 75).stroke()
  doc.fillColor('#64748b').fontSize(8.5).font('Helvetica')
  doc.text('Balance Before Payment', 50, currentY + 20)
  doc.text('Balance After Payment', 50, currentY + 45)

  const balBeforeStr = new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 2 }).format(balanceBefore)
  const balAfterStr = new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 2 }).format(balanceAfter)
  doc.fillColor('#0f172a').font('Helvetica-Bold')
  doc.text(balBeforeStr, 175, currentY + 20, { align: 'right', width: 100 })
  doc.text(balAfterStr, 175, currentY + 45, { align: 'right', width: 100 })

  // Box 4 (Right): Stamp / Prepared by info
  doc.strokeColor('#e2e8f0').rect(305, currentY, 250, 75).stroke()
  
  const cashierEmail = payment.receiver?.email || 'Accounts Office'
  doc.fillColor('#64748b').fontSize(8.5).font('Helvetica')
  doc.text(`Prepared by: ${cashierEmail}`, 315, currentY + 15)
  doc.text('Accounts Office', 315, currentY + 30)
  doc.text('Thank you.', 315, currentY + 45)

  // Draw school stamp if buffer loaded
  if (stampBuffer) {
    doc.image(stampBuffer, 465, currentY + 10, { width: 55, height: 55 })
  }

  // Final pass for Header and Footer
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    
    // Draw constant header
    await drawLetterhead(doc, 40, 515, false)

    // Receipt details on top right below header Y range
    doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
    doc.text(`Receipt No: REC-${payment.receipt_number.split('-').pop() || payment.receipt_number}`, 300, 25, { align: 'right', width: 250 })
    
    doc.fontSize(8.5).font('Helvetica')
    const payDate = new Date(payment.payment_date).toLocaleDateString('en-US', { dateStyle: 'medium' })
    doc.text(`Date: ${payDate}`, 300, 38, { align: 'right', width: 250 })
    
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#00264b')
    doc.text('PAYMENT RECEIPT VOUCHER', 300, 51, { align: 'right', width: 250 })

    // Footer
    const dateStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, 802).lineTo(555, 802).stroke()
    
    doc.fillColor('#64748b').fontSize(8).font('Helvetica')
    doc.text(`Generated: ${dateStr}`, 40, 808)
    doc.text(`Page ${i + 1} of ${range.count}`, 40, 808, { align: 'right' })
  }

  doc.end()

  // Wait for pdf build
  await new Promise((resolve) => doc.on('end', resolve))
  return Buffer.concat(chunks)
}
