/**
 * Zero-dependency client-side PDF 1.4 generator for the TZS 20,000
 * Leaders International School Admission Application Form Invoice.
 */

export interface ApplicationInvoicePdfData {
  reference: string
  invoiceNo: string
  issueDate: string
  status: 'unpaid' | 'paid' | 'waived'
  amount?: number
  studentName: string
  parentName: string
  parentPhone: string
  parentEmail: string
  curriculum: string
  applyingFor: string
  startTerm: string
  paymentMethod?: string | null
  paymentReference?: string | null
  paidAt?: string | null
}

function pdfEscape(text: string): string {
  return text
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

export function buildApplicationInvoicePdf(data: ApplicationInvoicePdfData): Blob {
  const cmds: string[] = []
  const amount = data.amount ?? 20000
  const amountLabel = `TZS ${amount.toLocaleString('en-US')}`

  const rect = (x: number, y: number, w: number, h: number, fillRgb: string) => {
    cmds.push(`${fillRgb} rg ${x} ${y} ${w} ${h} re f`)
  }

  const line = (x1: number, y1: number, x2: number, y2: number, strokeRgb = '0.85 0.88 0.92', width = 1) => {
    cmds.push(`${width} w ${strokeRgb} RG ${x1} ${y1} m ${x2} ${y2} l S`)
  }

  const text = (str: string, x: number, y: number, size = 11, bold = false, rgb = '0.06 0.14 0.27') => {
    const font = bold ? '/F2' : '/F1'
    cmds.push(`BT ${font} ${size} Tf ${rgb} rg ${x} ${y} Td (${pdfEscape(str)}) Tj ET`)
  }

  // Header band (Navy #00264b)
  rect(0, 742, 595, 100, '0 0.149 0.294')
  rect(0, 738, 595, 4, '0.969 0.698 0.224') // Gold accent bar

  text('LEADERS INTERNATIONAL SCHOOL', 45, 796, 17, true, '1 1 1')
  text('Admissions Office - Zanzibar, Tanzania', 45, 777, 10, false, '0.85 0.90 0.96')
  text('APPLICATION FORM INVOICE', 370, 796, 13, true, '0.969 0.698 0.224')
  text(`Invoice #: ${data.invoiceNo}`, 370, 777, 10, false, '1 1 1')
  text(`Date: ${data.issueDate}`, 370, 762, 10, false, '0.85 0.90 0.96')

  // Reference & Status Box
  rect(45, 655, 505, 60, '0.96 0.97 0.99')
  line(45, 715, 550, 715, '0.85 0.88 0.92', 1)
  line(45, 655, 550, 655, '0.85 0.88 0.92', 1)
  text('APPLICATION REFERENCE', 60, 695, 8.5, true, '0.39 0.45 0.55')
  text(data.reference, 60, 673, 14, true, '0 0.149 0.294')

  const statusText = data.status === 'paid' ? 'PAID' : data.status === 'waived' ? 'WAIVED' : 'UNPAID / PAYABLE'
  const statusRgb = data.status === 'paid' ? '0.06 0.50 0.30' : data.status === 'waived' ? '0.25 0.32 0.42' : '0.75 0.35 0.05'
  text('STATUS', 325, 695, 8.5, true, '0.39 0.45 0.55')
  text(statusText, 325, 673, 12, true, statusRgb)

  text('AMOUNT', 460, 695, 8.5, true, '0.39 0.45 0.55')
  text(amountLabel, 460, 673, 13, true, '0 0.149 0.294')

  // Applicant & Parent Details
  text('BILLED TO (PARENT / GUARDIAN)', 45, 622, 9, true, '0.39 0.45 0.55')
  text(data.parentName, 45, 604, 11.5, true)
  text(`Phone: ${data.parentPhone}`, 45, 588, 10, false, '0.25 0.32 0.42')
  text(`Email: ${data.parentEmail}`, 45, 573, 10, false, '0.25 0.32 0.42')

  text('APPLICANT DETAILS', 320, 622, 9, true, '0.39 0.45 0.55')
  text(data.studentName, 320, 604, 11.5, true)
  text(`Wing: ${data.curriculum} Curriculum`, 320, 588, 10, false, '0.25 0.32 0.42')
  text(`Class: ${data.applyingFor} (${data.startTerm})`, 320, 573, 10, false, '0.25 0.32 0.42')

  // Line Item Table
  rect(45, 510, 505, 26, '0 0.149 0.294')
  text('DESCRIPTION', 58, 519, 9.5, true, '1 1 1')
  text('QTY', 370, 519, 9.5, true, '1 1 1')
  text('AMOUNT (TZS)', 465, 519, 9.5, true, '1 1 1')

  rect(45, 470, 505, 40, '1 1 1')
  line(45, 470, 550, 470, '0.85 0.88 0.92', 1)
  text('Admission Application Form & Assessment Processing Fee', 58, 491, 10.5, true)
  text(`Ref: ${data.reference} - ${data.applyingFor}`, 58, 477, 9, false, '0.39 0.45 0.55')
  text('1', 375, 486, 10.5, false)
  text(amount.toLocaleString('en-US'), 488, 486, 10.5, true)

  // Total Box
  rect(340, 420, 210, 36, '0.96 0.97 0.99')
  line(340, 420, 550, 420, '0 0.149 0.294', 1.5)
  text(data.status === 'paid' ? 'TOTAL PAID' : 'TOTAL PAYABLE', 355, 434, 10, true)
  text(amountLabel, 470, 434, 12, true, '0 0.149 0.294')

  // Payment Status / Instructions
  if (data.status === 'paid') {
    text('PAYMENT RECEIPT DETAILS', 45, 375, 10, true, '0.06 0.50 0.30')
    line(45, 368, 550, 368, '0.90 0.92 0.95', 1)
    text(`Payment Method: ${data.paymentMethod || 'Recorded'}`, 45, 350, 9.5, false, '0.25 0.32 0.42')
    text(`Receipt / Reference: ${data.paymentReference || data.invoiceNo}`, 45, 334, 9.5, false, '0.25 0.32 0.42')
    if (data.paidAt) {
      text(`Paid On: ${new Date(data.paidAt).toLocaleString()}`, 45, 318, 9.5, false, '0.25 0.32 0.42')
    }
  } else {
    text('PAYMENT & NEXT STEPS', 45, 375, 10, true)
    line(45, 368, 550, 368, '0.90 0.92 0.95', 1)
    text(`1. Quote your Application Reference (${data.reference}) when making payment.`, 45, 350, 9.5, false, '0.25 0.32 0.42')
    text('2. Pay at the school accounts office or via mobile money / bank details', 45, 334, 9.5, false, '0.25 0.32 0.42')
    text('   provided by the admissions desk.', 45, 320, 9.5, false, '0.25 0.32 0.42')
    text('3. Admissions & Accounts will mark this invoice as PAID once confirmed.', 45, 304, 9.5, false, '0.25 0.32 0.42')
  }

  // Footer
  line(45, 95, 550, 95, '0.85 0.88 0.92', 1)
  text('Leaders International School - Official System-Generated Admission Invoice', 45, 78, 8.5, false, '0.45 0.50 0.58')

  const streamContent = cmds.join('\n')
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  for (const obj of objects) {
    offsets.push(pdf.length)
    pdf += obj
  }

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n`
  pdf += '0000000000 65535 f \n'
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], { type: 'application/pdf' })
}

export function downloadApplicationInvoicePdf(data: ApplicationInvoicePdfData) {
  const blob = buildApplicationInvoicePdf(data)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `LIS-Invoice-${data.reference}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
