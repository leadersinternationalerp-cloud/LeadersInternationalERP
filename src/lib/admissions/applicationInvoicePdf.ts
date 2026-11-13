/**
 * Zero-dependency client-side A5 PDF 1.4 generator (with embedded school logo)
 * for the TZS 20,000 Leaders International School Admission Application Form Invoice.
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

async function loadLogoJpeg(logoUrl = '/crest.svg'): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null

  const tryLoad = (src: string) =>
    new Promise<{ bytes: Uint8Array; width: number; height: number } | null>((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const size = 160
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          if (!ctx) return resolve(null)

          // Match header navy background so transparent areas blend seamlessly
          ctx.fillStyle = '#00264b'
          ctx.fillRect(0, 0, size, size)

          // White circular badge behind the crest for crisp contrast
          ctx.beginPath()
          ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2)
          ctx.fillStyle = '#ffffff'
          ctx.fill()

          const pad = 18
          ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2)

          canvas.toBlob(
            async (blob) => {
              if (!blob) return resolve(null)
              const buf = await blob.arrayBuffer()
              resolve({ bytes: new Uint8Array(buf), width: size, height: size })
            },
            'image/jpeg',
            0.92
          )
        } catch {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = src
    })

  return (await tryLoad(logoUrl)) || (await tryLoad('/logo.png'))
}

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

export async function buildApplicationInvoicePdf(data: ApplicationInvoicePdfData): Promise<Blob> {
  // A5 Portrait: 420 x 595 pt (148 x 210 mm)
  const W = 420
  const H = 595
  const logo = await loadLogoJpeg('/crest.svg')

  const cmds: string[] = []
  const rect = (x: number, y: number, w: number, h: number, fillRgb: string) => {
    cmds.push(`${fillRgb} rg ${x} ${y} ${w} ${h} re f`)
  }
  const line = (x1: number, y1: number, x2: number, y2: number, strokeRgb = '0.85 0.88 0.92', width = 0.8) => {
    cmds.push(`${width} w ${strokeRgb} RG ${x1} ${y1} m ${x2} ${y2} l S`)
  }
  const text = (str: string, x: number, y: number, size = 9, bold = false, rgb = '0.06 0.14 0.27') => {
    const font = bold ? '/F2' : '/F1'
    cmds.push(`BT ${font} ${size} Tf ${rgb} rg ${x} ${y} Td (${pdfEscape(str)}) Tj ET`)
  }

  const amount = data.amount ?? 20000
  const amountLabel = `TZS ${amount.toLocaleString('en-US')}`

  // Header band (Navy #00264b) + Gold accent bar
  rect(0, H - 76, W, 76, '0 0.149 0.294')
  rect(0, H - 79, W, 3, '0.969 0.698 0.224')

  if (logo) {
    cmds.push(`q 44 0 0 44 22 ${H - 60} cm /Im1 Do Q`)
  }

  const titleX = logo ? 74 : 24
  text('LEADERS INTERNATIONAL', titleX, H - 32, 11.5, true, '1 1 1')
  text('SCHOOL · ZANZIBAR', titleX, H - 46, 8.5, true, '0.969 0.698 0.224')
  text('Admissions Office', titleX, H - 59, 7.5, false, '0.85 0.90 0.96')

  text('APPLICATION INVOICE', 268, H - 32, 10.5, true, '0.969 0.698 0.224')
  text(`Invoice #: ${data.invoiceNo}`, 268, H - 46, 8, false, '1 1 1')
  text(`Date: ${data.issueDate}`, 268, H - 59, 8, false, '0.85 0.90 0.96')

  // Reference, Status & Amount Box
  rect(24, H - 140, W - 48, 46, '0.96 0.97 0.99')
  line(24, H - 94, W - 24, H - 94)
  line(24, H - 140, W - 24, H - 140)

  text('APPLICATION REF', 34, H - 110, 7, true, '0.39 0.45 0.55')
  text(data.reference, 34, H - 127, 10.5, true, '0 0.149 0.294')

  const statusText = data.status === 'paid' ? 'PAID' : data.status === 'waived' ? 'WAIVED' : 'UNPAID / PAYABLE'
  const statusRgb = data.status === 'paid' ? '0.06 0.50 0.30' : data.status === 'waived' ? '0.25 0.32 0.42' : '0.75 0.35 0.05'
  text('STATUS', 200, H - 110, 7, true, '0.39 0.45 0.55')
  text(statusText, 200, H - 127, 9.5, true, statusRgb)

  text('AMOUNT', 318, H - 110, 7, true, '0.39 0.45 0.55')
  text(amountLabel, 318, H - 127, 10.5, true, '0 0.149 0.294')

  // Billed To & Applicant Details
  text('BILLED TO (PARENT / GUARDIAN)', 24, H - 165, 7.5, true, '0.39 0.45 0.55')
  text(data.parentName, 24, H - 180, 9.5, true)
  text(`Phone: ${data.parentPhone}`, 24, H - 193, 8, false, '0.25 0.32 0.42')
  text(`Email: ${data.parentEmail}`, 24, H - 205, 8, false, '0.25 0.32 0.42')

  text('APPLICANT DETAILS', 224, H - 165, 7.5, true, '0.39 0.45 0.55')
  text(data.studentName, 224, H - 180, 9.5, true)
  text(`Wing: ${data.curriculum} Curriculum`, 224, H - 193, 8, false, '0.25 0.32 0.42')
  text(`Class: ${data.applyingFor} (${data.startTerm})`, 224, H - 205, 8, false, '0.25 0.32 0.42')

  // Line Item Table
  rect(24, H - 246, W - 48, 22, '0 0.149 0.294')
  text('DESCRIPTION', 32, H - 238, 8, true, '1 1 1')
  text('QTY', 274, H - 238, 8, true, '1 1 1')
  text('AMOUNT (TZS)', 326, H - 238, 8, true, '1 1 1')

  rect(24, H - 282, W - 48, 36, '1 1 1')
  line(24, H - 282, W - 24, H - 282)
  text('Admission Application Form & Assessment Processing Fee', 32, H - 262, 8.5, true)
  text(`Ref: ${data.reference} - ${data.applyingFor}`, 32, H - 274, 7.5, false, '0.39 0.45 0.55')
  text('1', 278, H - 267, 8.5, false)
  text(amount.toLocaleString('en-US'), 345, H - 267, 8.5, true)

  // Total Box
  rect(225, H - 322, W - 249, 28, '0.96 0.97 0.99')
  line(225, H - 322, W - 24, H - 322, '0 0.149 0.294', 1.2)
  text(data.status === 'paid' ? 'TOTAL PAID' : 'TOTAL PAYABLE', 235, H - 311, 8.5, true)
  text(amountLabel, 326, H - 311, 10, true, '0 0.149 0.294')

  // Payment Status / Instructions
  if (data.status === 'paid') {
    text('PAYMENT RECEIPT DETAILS', 24, H - 360, 8.5, true, '0.06 0.50 0.30')
    line(24, H - 366, W - 24, H - 366, '0.90 0.92 0.95')
    text(`Payment Method: ${data.paymentMethod || 'Recorded'}`, 24, H - 382, 8, false, '0.25 0.32 0.42')
    text(`Receipt / Reference: ${data.paymentReference || data.invoiceNo}`, 24, H - 395, 8, false, '0.25 0.32 0.42')
    if (data.paidAt) {
      text(`Paid On: ${new Date(data.paidAt).toLocaleString()}`, 24, H - 408, 8, false, '0.25 0.32 0.42')
    }
  } else {
    text('PAYMENT & NEXT STEPS', 24, H - 360, 8.5, true)
    line(24, H - 366, W - 24, H - 366, '0.90 0.92 0.95')
    text(`1. Quote your Application Reference (${data.reference}) when paying.`, 24, H - 382, 8, false, '0.25 0.32 0.42')
    text('2. Pay at the school accounts office or via mobile money / bank details', 24, H - 395, 8, false, '0.25 0.32 0.42')
    text('   provided by the admissions desk.', 24, H - 407, 8, false, '0.25 0.32 0.42')
    text('3. Admissions & Accounts will mark this invoice PAID once confirmed.', 24, H - 420, 8, false, '0.25 0.32 0.42')
  }

  // Footer
  line(24, 48, W - 24, 48)
  text('Leaders International School - Official A5 Admission Invoice', 24, 34, 7.5, false, '0.45 0.50 0.58')

  const encoder = new TextEncoder()
  const streamBytes = encoder.encode(cmds.join('\n'))

  const pageResources = logo
    ? '<< /Font << /F1 4 0 R /F2 5 0 R >> /XObject << /Im1 7 0 R >> >>'
    : '<< /Font << /F1 4 0 R /F2 5 0 R >> >>'

  const objChunks: Uint8Array[] = [
    encoder.encode('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'),
    encoder.encode('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n'),
    encoder.encode(
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources ${pageResources} /Contents 6 0 R >>\nendobj\n`
    ),
    encoder.encode('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'),
    encoder.encode('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n'),
    concatUint8Arrays([
      encoder.encode(`6 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`),
      streamBytes,
      encoder.encode('\nendstream\nendobj\n'),
    ]),
  ]

  if (logo) {
    objChunks.push(
      concatUint8Arrays([
        encoder.encode(
          `7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`
        ),
        logo.bytes,
        encoder.encode('\nendstream\nendobj\n'),
      ])
    )
  }

  const parts: Uint8Array[] = [encoder.encode('%PDF-1.4\n')]
  let currentOffset = parts[0].length
  const offsets: number[] = [0]

  for (const chunk of objChunks) {
    offsets.push(currentOffset)
    parts.push(chunk)
    currentOffset += chunk.length
  }

  const xrefOffset = currentOffset
  let xref = `xref\n0 ${objChunks.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  xref += `trailer\n<< /Size ${objChunks.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  parts.push(encoder.encode(xref))

  const pdfBytes = concatUint8Arrays(parts)
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
}

export async function downloadApplicationInvoicePdf(data: ApplicationInvoicePdfData) {
  const blob = await buildApplicationInvoicePdf(data)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `LIS-Invoice-${data.reference}.pdf`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
