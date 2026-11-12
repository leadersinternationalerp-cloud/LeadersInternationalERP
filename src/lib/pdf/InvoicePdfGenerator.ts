import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import { createServiceClient } from '@/utils/supabase/service'
import { ApiError } from '@/lib/api/errors'

function formatTZS(amount: number) {
  return `TZS ${Math.round(Number(amount || 0)).toLocaleString('en-US')}`
}

export async function generateInvoicePdfBuffer(options: {
  invoiceId?: string | null
  studentId?: string | null
}): Promise<{ buffer: Buffer; filename: string; studentUserId: string }> {
  const supabase = createServiceClient()

  let invoice: any = null

  if (options.invoiceId) {
    const { data, error } = await supabase
      .from('invoices')
      .select(
        `
        *,
        students (
          id, student_id, grade_level, section, parent_name, parent_contact, parent_email,
          profiles!students_id_fkey ( first_name, last_name, email, phone )
        ),
        invoice_items ( id, description, amount, fee_structure_id ),
        payments ( id, amount, payment_date, payment_method, receipt_number )
      `
      )
      .eq('id', options.invoiceId)
      .maybeSingle()

    if (error || !data) {
      throw new ApiError('NOT_FOUND', 'Invoice not found')
    }
    invoice = data
  } else if (options.studentId) {
    const { data, error } = await supabase
      .from('invoices')
      .select(
        `
        *,
        students (
          id, student_id, grade_level, section, parent_name, parent_contact, parent_email,
          profiles!students_id_fkey ( first_name, last_name, email, phone )
        ),
        invoice_items ( id, description, amount, fee_structure_id ),
        payments ( id, amount, payment_date, payment_method, receipt_number )
      `
      )
      .eq('student_id', options.studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      throw new ApiError('NOT_FOUND', 'No invoice found for this student')
    }
    invoice = data
  } else {
    throw new ApiError('BAD_REQUEST', 'invoice_id or student_id is required')
  }

  const student = invoice.students
  const profile = Array.isArray(student?.profiles) ? student.profiles[0] : student?.profiles
  const studentName = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Student'
  const studentCode = student?.student_id || 'N/A'
  const gradeLevel = student?.grade_level || 'Unassigned'
  const section = student?.section ? `Stream ${student.section}` : ''
  const isCambridge = gradeLevel.toLowerCase().includes('cambridge') || gradeLevel.toLowerCase().includes('year')

  const items: { description: string; amount: number }[] =
    invoice.invoice_items && invoice.invoice_items.length > 0
      ? invoice.invoice_items.map((it: any) => ({
          description: it.description || 'School Fee',
          amount: Number(it.amount || 0),
        }))
      : [{ description: `${gradeLevel} — ${invoice.term} Fees`, amount: Number(invoice.total_amount || 0) }]

  const totalAmount = Number(invoice.total_amount || 0)
  const discountAmount = Number(invoice.discount_amount || 0)
  const netAmount = Number(invoice.net_amount ?? totalAmount - discountAmount)
  const totalPaid = (invoice.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0)
  const balanceDue = Math.max(0, netAmount - totalPaid)

  const invoiceNumber = `INV-${String(invoice.id).slice(0, 8).toUpperCase()}`
  const issueDate = invoice.created_at
    ? new Date(invoice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const dueDate = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'Upon Admission'

  const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true })
  const chunks: Buffer[] = []
  doc.on('data', (c) => chunks.push(c))

  const pageWidth = 595.28
  const leftX = 45
  const rightX = 550
  const contentWidth = rightX - leftX

  // Left navy & gold ribbon accent (matching school fee structure branding)
  doc.save()
  doc.rect(0, 0, 10, 841.89).fill('#00264b')
  doc.rect(10, 0, 3, 841.89).fill('#d99b1e')
  doc.restore()

  // Top-left school logo
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, leftX, 28, { width: 58, height: 58 })
    } catch {
      // ignore image load errors
    }
  }

  // Top-right Cambridge logo if Cambridge Wing
  if (isCambridge) {
    const cambridgePath = path.join(process.cwd(), 'public', 'cambridge-logo.png')
    if (fs.existsSync(cambridgePath)) {
      try {
        doc.image(cambridgePath, rightX - 105, 34, { width: 105, height: 42 })
      } catch {
        // ignore
      }
    }
  }

  // School Name & Wing Header
  doc.fillColor('#00264b').fontSize(18).font('Helvetica-Bold').text('LEADERS', leftX + 68, 30)
  doc.fillColor('#0d9488').fontSize(9.5).font('Helvetica-Bold').text('INTERNATIONAL SCHOOL', leftX + 68, 51)
  doc
    .fillColor('#d99b1e')
    .fontSize(8.5)
    .font('Helvetica-Bold')
    .text(isCambridge ? 'CAMBRIDGE WING' : 'NECTA WING', leftX + 68, 64)

  // Horizontal Tricolor Accent Bar
  const barY = 96
  doc.rect(leftX, barY, contentWidth * 0.4, 3).fill('#00264b')
  doc.rect(leftX + contentWidth * 0.4, barY, contentWidth * 0.4, 3).fill('#0d9488')
  doc.rect(leftX + contentWidth * 0.8, barY, contentWidth * 0.2, 3).fill('#d99b1e')

  // Invoice Title Banner
  let y = 114
  doc.fillColor('#00264b').fontSize(16).font('Helvetica-Bold').text('OFFICIAL STUDENT FEE INVOICE', leftX, y)

  // Status badge on right
  const statusColor =
    balanceDue === 0 ? '#059669' : totalPaid > 0 ? '#d97706' : '#dc2626'
  const statusLabel = balanceDue === 0 ? 'PAID' : totalPaid > 0 ? 'PARTIALLY PAID' : (invoice.status || 'PENDING').toUpperCase()
  doc.roundedRect(rightX - 115, y - 2, 115, 22, 4).fill(statusColor)
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold').text(statusLabel, rightX - 115, y + 4, {
    width: 115,
    align: 'center',
  })

  y += 28

  // Two-column Info Box: Student Details & Invoice Metadata
  doc.roundedRect(leftX, y, contentWidth, 92, 6).fillAndStroke('#f8fafc', '#cbd5e1')

  // Left: Billed To / Student Info
  doc.fillColor('#0d9488').fontSize(8).font('Helvetica-Bold').text('BILLED TO (STUDENT DETAILS)', leftX + 12, y + 10)
  doc.fillColor('#0f172a').fontSize(10.5).font('Helvetica-Bold').text(studentName, leftX + 12, y + 23)
  doc.fillColor('#334155').fontSize(8.5).font('Helvetica')
  doc.text(`Student ID: ${studentCode}`, leftX + 12, y + 38)
  doc.text(`Placed Class: ${gradeLevel}${section ? ` (${section})` : ''}`, leftX + 12, y + 51)
  doc.text(
    `Parent / Guardian: ${student?.parent_name || 'Parent/Guardian'}${student?.parent_contact ? ` • ${student.parent_contact}` : ''}`,
    leftX + 12,
    y + 64,
    { width: 270 }
  )

  // Right: Invoice Metadata
  const metaX = leftX + 305
  doc.fillColor('#0d9488').fontSize(8).font('Helvetica-Bold').text('INVOICE DETAILS', metaX, y + 10)
  doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica-Bold').text('Invoice No:', metaX, y + 25)
  doc.font('Helvetica').text(invoiceNumber, metaX + 80, y + 25)

  doc.font('Helvetica-Bold').text('Academic Year:', metaX, y + 39)
  doc.font('Helvetica').text(String(invoice.academic_year || '2027'), metaX + 80, y + 39)

  doc.font('Helvetica-Bold').text('Term / Period:', metaX, y + 53)
  doc.font('Helvetica').text(String(invoice.term || 'Term 1'), metaX + 80, y + 53)

  doc.font('Helvetica-Bold').text('Issued / Due:', metaX, y + 67)
  doc.font('Helvetica').text(`${issueDate}  |  Due: ${dueDate}`, metaX + 80, y + 67)

  y += 110

  // Fee Breakdown Table Header
  doc.fillColor('#0d9488').fontSize(10.5).font('Helvetica-Bold').text('Fee Breakdown (All amounts in TZS)', leftX, y)
  y += 16

  doc.rect(leftX, y, contentWidth, 24).fill('#00264b')
  doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
  doc.text('#', leftX + 10, y + 7, { width: 25 })
  doc.text('Vote Head / Fee Description', leftX + 40, y + 7, { width: 320 })
  doc.text('Amount (TZS)', rightX - 135, y + 7, { width: 125, align: 'right' })
  y += 24

  items.forEach((item, idx) => {
    const bg = idx % 2 === 1 ? '#f8fafc' : '#ffffff'
    doc.rect(leftX, y, contentWidth, 24).fillAndStroke(bg, '#e2e8f0')
    doc.fillColor('#0f172a').fontSize(9).font('Helvetica')
    doc.text(String(idx + 1), leftX + 10, y + 7, { width: 25 })
    doc.font('Helvetica-Bold').text(item.description, leftX + 40, y + 7, { width: 320 })
    doc.font('Helvetica').text(Math.round(item.amount).toLocaleString('en-US'), rightX - 135, y + 7, {
      width: 125,
      align: 'right',
    })
    y += 24
  })

  // Totals Box
  y += 12
  const sumBoxX = rightX - 230
  doc.roundedRect(sumBoxX, y, 230, discountAmount > 0 ? 102 : 84, 6).fillAndStroke('#f8fafc', '#cbd5e1')

  let sy = y + 10
  doc.fillColor('#334155').fontSize(9).font('Helvetica')
  doc.text('Total Billed:', sumBoxX + 12, sy)
  doc.font('Helvetica-Bold').text(formatTZS(totalAmount), sumBoxX + 100, sy, { width: 118, align: 'right' })
  sy += 18

  if (discountAmount > 0) {
    doc.font('Helvetica').text('Discount:', sumBoxX + 12, sy)
    doc.fillColor('#059669').font('Helvetica-Bold').text(`- ${formatTZS(discountAmount)}`, sumBoxX + 100, sy, {
      width: 118,
      align: 'right',
    })
    sy += 18
  }

  doc.fillColor('#334155').font('Helvetica').text('Payments Received:', sumBoxX + 12, sy)
  doc.fillColor('#059669').font('Helvetica-Bold').text(formatTZS(totalPaid), sumBoxX + 100, sy, {
    width: 118,
    align: 'right',
  })
  sy += 20

  doc.rect(sumBoxX + 8, sy - 2, 214, 24).fill('#00264b')
  doc.fillColor('#ffffff').fontSize(9.5).font('Helvetica-Bold').text('BALANCE DUE:', sumBoxX + 14, sy + 5)
  doc.text(formatTZS(balanceDue), sumBoxX + 100, sy + 5, { width: 118, align: 'right' })

  // Payment Instructions / Notes
  y += discountAmount > 0 ? 120 : 102
  doc.fillColor('#0d9488').fontSize(10).font('Helvetica-Bold').text('Payment Instructions & Notes', leftX, y)
  y += 15
  doc.fillColor('#334155').fontSize(8.5).font('Helvetica')
  const notes = [
    '• Fees are payable by bank transfer or directly at the School Administration / Accounts Office.',
    '• Please quote the Student ID (' + studentCode + ') and Invoice No (' + invoiceNumber + ') as payment reference.',
    '• One-time Admission Fee (TZS 150,000) applies to newly admitted students.',
    '• Transport, uniform, and club fees are billed separately if selected.',
  ]
  notes.forEach((n) => {
    doc.text(n, leftX, y, { width: contentWidth })
    y += 14
  })

  // Footer
  const footerY = 775
  doc.rect(leftX, footerY, contentWidth * 0.4, 2).fill('#00264b')
  doc.rect(leftX + contentWidth * 0.4, footerY, contentWidth * 0.4, 2).fill('#0d9488')
  doc.rect(leftX + contentWidth * 0.8, footerY, contentWidth * 0.2, 2).fill('#d99b1e')

  doc.fillColor('#00264b').fontSize(11).font('Helvetica-Bold').text('+255 777 427 140', leftX, footerY + 8)
  doc
    .fillColor('#475569')
    .fontSize(8)
    .font('Helvetica')
    .text(
      'Kisakasaka, Zanzibar   |   Email: info@leaderinternationalschool.ac.tz   |   Website: www.leaderinternationalschool.ac.tz',
      leftX,
      footerY + 24
    )

  const buffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.end()
  })

  const safeCode = studentCode.replace(/[^A-Za-z0-9_-]/g, '')
  return {
    buffer,
    filename: `Invoice-${safeCode}-${invoiceNumber}.pdf`,
    studentUserId: student?.id || invoice.student_id,
  }
}
