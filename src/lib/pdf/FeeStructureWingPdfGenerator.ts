import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'
import { getOfficial2027FeeRows } from '@/lib/finance/feeStructureHelper'

interface FeeRow {
  academic_year: string
  term: string
  grade_level: string
  fee_type: string
  amount: number
  monthly_amount?: number | null
  annual_amount?: number | null
  wing?: string | null
  due_date?: string | null
  payable_once?: boolean | null
}

function fmt(n: number) {
  return Math.round(Number(n || 0)).toLocaleString('en-US')
}

export async function generateWingFeeStructurePdf(
  wing: 'Cambridge' | 'NECTA',
  academicYear: string,
  dbFees: FeeRow[]
): Promise<Buffer> {
  // Filter DB fees for this wing; fallback to official 2027 rows if DB is empty for this wing
  let rows = dbFees.filter((f) => {
    const w = f.wing || (f.grade_level.toLowerCase().includes('cambridge') ? 'Cambridge' : 'NECTA')
    return w.toLowerCase() === wing.toLowerCase()
  })

  if (rows.length === 0) {
    rows = getOfficial2027FeeRows().filter((r) => r.wing === wing)
  }

  const isCambridge = wing === 'Cambridge'
  const yearLabel = academicYear && academicYear !== 'all' ? academicYear : '2027'

  // Column groups matching the official PDFs
  const groups = isCambridge
    ? [
        { label: 'Year 1 – 3', grades: ['Cambridge Year 1', 'Cambridge Year 2', 'Cambridge Year 3'] },
        { label: 'Year 4 – 6', grades: ['Cambridge Year 4', 'Cambridge Year 5', 'Cambridge Year 6'] },
      ]
    : [
        { label: 'Baby Class', grades: ['Baby Class'] },
        { label: 'Nursery', grades: ['Nursery'] },
        { label: 'Primary 1 – 6', grades: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'] },
      ]

  // Helper to get representative grade row(s) for a group
  const getGroupRepresentativeGrade = (grades: string[]) => {
    for (const g of grades) {
      if (rows.some((r) => r.grade_level.toLowerCase() === g.toLowerCase())) {
        return g
      }
    }
    return grades[0]
  }

  // Distinct recurring vote heads (exclude one-time Admission Fee from Sections 1-3)
  const recurringRows = rows.filter((r) => !r.payable_once && r.fee_type.toLowerCase() !== 'admission fee')
  const voteHeads = Array.from(new Set(recurringRows.map((r) => r.fee_type)))

  // Admission fee (one-time)
  const admissionFeeRow = rows.find((r) => r.payable_once || r.fee_type.toLowerCase() === 'admission fee')
  const admissionFeeAmt = Number(admissionFeeRow?.amount || 150000)

  // Compute Monthly, Annual, and Instalment values per group
  const groupStats = groups.map((grp) => {
    const repGrade = getGroupRepresentativeGrade(grp.grades)
    const gradeRows = recurringRows.filter((r) => r.grade_level.toLowerCase() === repGrade.toLowerCase())

    const byVoteMonthly: Record<string, number> = {}
    const byVoteAnnual: Record<string, number> = {}

    voteHeads.forEach((vh) => {
      const vhRows = gradeRows.filter((r) => r.fee_type === vh)
      const annualSum = vhRows.reduce((sum, r) => sum + Number(r.amount || 0), 0)
      const explicitAnnual = vhRows.find((r) => Number(r.annual_amount || 0) > 0)?.annual_amount
      const explicitMonthly = vhRows.find((r) => Number(r.monthly_amount || 0) > 0)?.monthly_amount

      const annual = explicitAnnual ? Number(explicitAnnual) : annualSum
      const monthly = explicitMonthly ? Number(explicitMonthly) : Math.round(annual / 12)

      byVoteAnnual[vh] = annual
      byVoteMonthly[vh] = monthly
    })

    const totalMonthly = Object.values(byVoteMonthly).reduce((a, b) => a + b, 0)
    const totalAnnual = Object.values(byVoteAnnual).reduce((a, b) => a + b, 0)

    const termTotals: Record<string, number> = {}
    for (const term of ['Term 1', 'Term 2', 'Term 3']) {
      termTotals[term] = gradeRows
        .filter((r) => r.term.toLowerCase() === term.toLowerCase())
        .reduce((sum, r) => sum + Number(r.amount || 0), 0)
    }

    return {
      label: grp.label,
      byVoteMonthly,
      byVoteAnnual,
      totalMonthly,
      totalAnnual,
      termTotals,
    }
  })

  // Create A4 PDF
  const doc = new PDFDocument({ margin: 36, size: 'A4', bufferPages: true })
  const chunks: Buffer[] = []
  doc.on('data', (c) => chunks.push(c))

  const pageW = 595.28
  const pageH = 841.89
  const leftX = 56
  const rightX = 540
  const contentW = rightX - leftX

  // 1. Left Navy & Gold Geometric Ribbon (matching the uploaded PDFs)
  doc.save()
  doc.rect(0, 0, 32, pageH).fill('#00264b')
  // Diagonal gold accent stripe on left edge
  doc.polygon([0, 385], [32, 355], [32, 365], [0, 395]).fill('#d99b1e')
  // Top-right gold corner triangle
  doc.polygon([pageW - 42, 0], [pageW, 0], [pageW, 42]).fill('#d99b1e')
  doc.restore()

  // 2. Faint centered watermark logo
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  if (fs.existsSync(logoPath)) {
    try {
      doc.save()
      doc.opacity(0.08)
      doc.image(logoPath, pageW / 2 - 140, 290, { width: 280, height: 280 })
      doc.restore()
    } catch {
      // ignore
    }
  }

  // 3. Header: Logo + School Name + Wing + Cambridge/NECTA badge
  if (fs.existsSync(logoPath)) {
    try {
      doc.image(logoPath, leftX, 24, { width: 68, height: 68 })
    } catch {
      // ignore
    }
  }

  doc.fillColor('#00264b').fontSize(24).font('Helvetica-Bold').text('LEADERS', leftX + 82, 30)
  doc.fillColor('#0d9488').fontSize(10).font('Helvetica-Bold').text('INTERNATIONAL SCHOOL', leftX + 82, 57, {
    characterSpacing: 1.5,
  })
  doc
    .fillColor('#d99b1e')
    .fontSize(9.5)
    .font('Helvetica-Bold')
    .text(isCambridge ? 'CAMBRIDGE WING' : 'NECTA WING', leftX + 82, 72)

  if (isCambridge) {
    const cambridgePath = path.join(process.cwd(), 'public', 'cambridge-logo.png')
    if (fs.existsSync(cambridgePath)) {
      try {
        doc.image(cambridgePath, rightX - 155, 36, { width: 150, height: 50 })
      } catch {
        // ignore
      }
    }
  } else {
    doc
      .fillColor('#00264b')
      .fontSize(9.5)
      .font('Helvetica-Bold')
      .text('NATIONAL EXAMINATIONS', rightX - 155, 42, { width: 155, align: 'right' })
    doc.text('COUNCIL OF TANZANIA', rightX - 155, 55, { width: 155, align: 'right' })
  }

  // Horizontal tricolor divider
  doc.rect(leftX, 102, contentW * 0.42, 2.5).fill('#00264b')
  doc.rect(leftX + contentW * 0.42, 102, contentW * 0.36, 2.5).fill('#0d9488')
  doc.rect(leftX + contentW * 0.78, 102, contentW * 0.22, 2.5).fill('#d99b1e')

  // 4. Document Title & Subtitle
  let y = 122
  doc
    .fillColor('#00264b')
    .fontSize(15)
    .font('Helvetica-Bold')
    .text(`School Fee Structure ${yearLabel} – ${wing} Wing`, leftX, y, { width: contentW, align: 'center' })

  y += 22
  const subtitle = isCambridge
    ? `Academic Year ${yearLabel}  |  Cambridge Primary Year 1 – 6  |  All amounts in TZS`
    : `Academic Year ${yearLabel}  |  Baby Class • Nursery • Primary 1 – 6  |  All amounts in TZS`

  doc.fillColor('#334155').fontSize(9.5).font('Helvetica-Bold').text(subtitle, leftX, y, {
    width: contentW,
    align: 'center',
  })

  y += 16
  doc.strokeColor('#d99b1e').lineWidth(1).moveTo(leftX, y).lineTo(rightX, y).stroke()

  // Helper to draw a structured colored table
  const drawColoredTable = (
    startY: number,
    sectionTitle: string,
    headers: { label: string; width: number; align?: 'left' | 'right' }[],
    tableRows: { cells: string[]; isTotal?: boolean }[]
  ) => {
    let ty = startY
    doc.fillColor('#0d9488').fontSize(11).font('Helvetica-Bold').text(sectionTitle, leftX, ty)
    ty += 16

    // Header row (#00264b navy with white bold text)
    const rowH = 22
    doc.rect(leftX, ty, contentW, rowH).fill('#00264b')
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold')
    let cx = leftX
    headers.forEach((h) => {
      doc.text(h.label, cx + 8, ty + 6, { width: h.width - 16, align: h.align || 'left' })
      cx += h.width
    })
    ty += rowH

    // Data rows
    tableRows.forEach((r, idx) => {
      const bg = r.isTotal ? '#eef6f9' : idx % 2 === 1 ? '#f8fafc' : '#ffffff'
      doc.rect(leftX, ty, contentW, rowH).fillAndStroke(bg, '#cbd5e1')

      doc
        .fillColor('#0f172a')
        .fontSize(9)
        .font(r.isTotal ? 'Helvetica-Bold' : 'Helvetica')

      let rx = leftX
      r.cells.forEach((cellVal, cIdx) => {
        const align = headers[cIdx]?.align || 'left'
        if (cIdx === 0 && !r.isTotal) {
          doc.font('Helvetica')
        } else if (r.isTotal) {
          doc.font('Helvetica-Bold')
        }
        doc.text(cellVal, rx + 8, ty + 6, { width: headers[cIdx].width - 16, align })
        rx += headers[cIdx].width
      })
      ty += rowH
    })

    return ty
  }

  // 5. Section 1: Monthly Fee Breakdown (TZS)
  y += 14
  const colCount = groupStats.length
  const voteHeadW = isCambridge ? contentW * 0.52 : contentW * 0.43
  const numColW = (contentW - voteHeadW) / colCount

  const s1Headers = [
    { label: 'Vote Head', width: voteHeadW, align: 'left' as const },
    ...groupStats.map((g) => ({ label: g.label, width: numColW, align: 'right' as const })),
  ]

  const s1Rows = [
    ...voteHeads.map((vh) => ({
      cells: [vh, ...groupStats.map((g) => fmt(g.byVoteMonthly[vh] || 0))],
    })),
    {
      cells: ['Total per Month', ...groupStats.map((g) => fmt(g.totalMonthly))],
      isTotal: true,
    },
  ]

  y = drawColoredTable(y, '1. Monthly Fee Breakdown (TZS)', s1Headers, s1Rows)

  // 6. Section 2: Annual Fee Breakdown (TZS)
  y += 16
  const s2Rows = [
    ...voteHeads.map((vh) => ({
      cells: [vh, ...groupStats.map((g) => fmt(g.byVoteAnnual[vh] || 0))],
    })),
    {
      cells: ['Total per Year', ...groupStats.map((g) => fmt(g.totalAnnual))],
      isTotal: true,
    },
  ]

  y = drawColoredTable(y, '2. Annual Fee Breakdown (TZS)', s1Headers, s2Rows)

  // 7. Section 3: Instalment Schedule (TZS)
  y += 16
  const instColW = isCambridge ? contentW * 0.28 : contentW * 0.24
  const dueColW = isCambridge ? contentW * 0.24 : contentW * 0.19
  const instNumColW = (contentW - instColW - dueColW) / colCount

  const s3Headers = [
    { label: 'Instalment', width: instColW, align: 'left' as const },
    { label: 'Due date', width: dueColW, align: 'left' as const },
    ...groupStats.map((g) => ({ label: g.label, width: instNumColW, align: 'right' as const })),
  ]

  const s3Rows = [
    {
      cells: ['1st Instalment', `by 8 January ${yearLabel}`, ...groupStats.map((g) => fmt(g.termTotals['Term 1'] || 0))],
    },
    {
      cells: ['2nd Instalment', `by 20 April ${yearLabel}`, ...groupStats.map((g) => fmt(g.termTotals['Term 2'] || 0))],
    },
    {
      cells: ['3rd Instalment', `by 5 August ${yearLabel}`, ...groupStats.map((g) => fmt(g.termTotals['Term 3'] || 0))],
    },
    {
      cells: ['Total Annual Fee', '', ...groupStats.map((g) => fmt(g.totalAnnual))],
      isTotal: true,
    },
  ]

  y = drawColoredTable(y, '3. Instalment Schedule (TZS)', s3Headers, s3Rows)

  // 8. Section 4: Notes
  y += 18
  doc.fillColor('#0d9488').fontSize(11).font('Helvetica-Bold').text('4. Notes', leftX, y)
  y += 16

  const notes = [
    `•  Admission fee (new students only): a one-time TZS ${fmt(admissionFeeAmt)}, payable on admission.`,
    '•  Not included: transport, uniform and club fees are charged separately.',
    '•  Fees apply per student; the annual fee is binding and monthly amounts are one twelfth of it (rounded to the nearest shilling).',
    isCambridge
      ? '•  The annual fee is payable in three equal instalments by the dates shown.'
      : '•  The 2nd and 3rd instalments are rounded to the nearest thousand; the 1st carries the balance.',
    '•  Pay by bank transfer or at the school office. For fee enquiries contact the school administration.',
  ]

  doc.fillColor('#0f172a').fontSize(9).font('Helvetica')
  notes.forEach((n) => {
    doc.text(n, leftX, y, { width: contentW })
    y += doc.heightOfString(n, { width: contentW }) + 4
  })

  // 9. Footer
  const footerY = 768
  doc.rect(leftX, footerY, contentW * 0.42, 2).fill('#00264b')
  doc.rect(leftX + contentW * 0.42, footerY, contentW * 0.36, 2).fill('#0d9488')
  doc.rect(leftX + contentW * 0.78, footerY, contentW * 0.22, 2).fill('#d99b1e')

  doc.fillColor('#00264b').fontSize(13).font('Helvetica-Bold').text('+255 777 427 140', leftX, footerY + 10)
  doc
    .fillColor('#334155')
    .fontSize(8.5)
    .font('Helvetica')
    .text(
      'Kisakasaka, Zanzibar     Email: info@leaderinternationalschool.ac.tz     Website: www.leaderinternationalschool.ac.tz',
      leftX,
      footerY + 28
    )

  doc.end()
  await new Promise((resolve) => doc.on('end', resolve))
  return Buffer.concat(chunks)
}
