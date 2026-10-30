import { createClient } from '@/utils/supabase/server'
import PDFDocument from 'pdfkit'
import { drawLetterhead } from '@/lib/pdfLetterhead'
import { route } from '@/lib/api/handler'
import { FINANCE_ROLES } from '@/lib/auth/roles'
import { ApiError } from '@/lib/api/errors'

export const GET = route(
  async ({ user, req, requestId }) => {
    const supabase = await createClient()

    const { searchParams } = new URL(req.url)
    const academic_year = searchParams.get('academic_year')
    const term = searchParams.get('term')
    const grade_level = searchParams.get('grade_level')

    // Query fee structures
    let query = supabase
      .from('fee_structures')
      .select('*')
      .order('grade_level', { ascending: true })
      .order('fee_type', { ascending: true })

    if (academic_year && academic_year !== 'all') {
      query = query.eq('academic_year', academic_year)
    }
    if (term && term !== 'all') {
      query = query.eq('term', term)
    }
    if (grade_level && grade_level !== 'all') {
      query = query.eq('grade_level', grade_level)
    }

    const { data: fees, error } = await query
    if (error) {
      throw new ApiError('INTERNAL', 'Failed to fetch fee structures')
    }

    const activeFees = fees || []

    // 1. Grouping for Table 1 (Summary by Term)
    const summaryGroups: {
      term: string
      fee_type: string
      amount: number
      classes: string[]
    }[] = []

    activeFees.forEach((fee) => {
      const existing = summaryGroups.find(
        (g) =>
          g.term.toLowerCase() === fee.term.toLowerCase() &&
          g.fee_type.toLowerCase() === fee.fee_type.toLowerCase() &&
          g.amount === Number(fee.amount)
      )

      if (existing) {
        if (!existing.classes.includes(fee.grade_level)) {
          existing.classes.push(fee.grade_level)
        }
      } else {
        summaryGroups.push({
          term: fee.term,
          fee_type: fee.fee_type,
          amount: Number(fee.amount),
          classes: [fee.grade_level],
        })
      }
    })

    // Sort summaryGroups: Term 1 -> Term 2 -> Term 3, then fee_type
    const termOrder: Record<string, number> = { 'term 1': 1, 'term 2': 2, 'term 3': 3 }
    summaryGroups.sort((a, b) => {
      const orderA = termOrder[a.term.toLowerCase()] || 99
      const orderB = termOrder[b.term.toLowerCase()] || 99
      if (orderA !== orderB) return orderA - orderB
      return a.fee_type.localeCompare(b.fee_type)
    })

    // 2. Grouping for Table 2 (Breakdown by Class, then Term)
    const classGroups: Record<string, Record<string, { fee_type: string; amount: number }[]>> = {}
    activeFees.forEach((fee) => {
      if (!classGroups[fee.grade_level]) {
        classGroups[fee.grade_level] = {}
      }
      if (!classGroups[fee.grade_level][fee.term]) {
        classGroups[fee.grade_level][fee.term] = []
      }
      classGroups[fee.grade_level][fee.term].push({
        fee_type: fee.fee_type,
        amount: Number(fee.amount),
      })
    })

    const sortedClasses = Object.keys(classGroups).sort()

    // Create PDF Document with bufferPages: true
    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true })
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))

    let currentY = 135

    // SECTION 1: Summary Table by Term
    doc.fillColor('#00264b').fontSize(11).font('Helvetica-Bold').text('Termly Summary View', 40, currentY)
    currentY += 16

    const t1Headers = [
      { label: 'Term', w: 80 },
      { label: 'Vote Head', w: 155 },
      { label: 'Applicable Classes', w: 200 },
      { label: 'Amount', w: 80, align: 'right' as const },
    ]

    const drawTable1Headers = (y: number) => {
      doc.rect(40, y, 515, 20).fill('#00264b')
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')

      let xOffset = 45
      t1Headers.forEach((h) => {
        doc.text(h.label.toUpperCase(), xOffset, y + 6, {
          width: h.w - 10,
          align: h.align || 'left',
        })
        xOffset += h.w
      })
    }

    drawTable1Headers(currentY)
    currentY += 20

    summaryGroups.forEach((row) => {
      if (currentY > 740) {
        doc.addPage()
        currentY = 135
        drawTable1Headers(currentY)
        currentY += 20
      }

      const classesStr = row.classes.sort().join(', ')
      doc.fontSize(8.5).font('Helvetica')
      const classesHeight = doc.heightOfString(classesStr, { width: 190 })
      const rowHeight = Math.max(18, classesHeight + 8)

      doc.fillColor('#0f172a')
      doc.text(row.term, 45, currentY + 4, { width: 70 })
      doc.text(row.fee_type, 125, currentY + 4, { width: 145 })
      doc.text(classesStr, 280, currentY + 4, { width: 190 })
      doc.text(row.amount.toLocaleString(), 480, currentY + 4, { width: 70, align: 'right' })

      doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(40, currentY + rowHeight).lineTo(555, currentY + rowHeight).stroke()
      currentY += rowHeight
    })

    currentY += 25

    // SECTION 2: Detailed Breakdown by Class
    if (currentY > 700) {
      doc.addPage()
      currentY = 135
    }

    doc.fillColor('#00264b').fontSize(11).font('Helvetica-Bold').text('Detailed Breakdown by Class', 40, currentY)
    currentY += 16

    const t2Headers = [
      { label: 'Class', w: 100 },
      { label: 'Term', w: 80 },
      { label: 'Vote Head', w: 220 },
      { label: 'Amount', w: 115, align: 'right' as const },
    ]

    const drawTable2Headers = (y: number) => {
      doc.rect(40, y, 515, 20).fill('#00264b')
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')

      let xOffset = 45
      t2Headers.forEach((h) => {
        doc.text(h.label.toUpperCase(), xOffset, y + 6, {
          width: h.w - 10,
          align: h.align || 'left',
        })
        xOffset += h.w
      })
    }

    drawTable2Headers(currentY)
    currentY += 20

    sortedClasses.forEach((cls) => {
      const termsObj = classGroups[cls]
      const termsInClass = Object.keys(termsObj).sort((a, b) => {
        const orderA = termOrder[a.toLowerCase()] || 99
        const orderB = termOrder[b.toLowerCase()] || 99
        return orderA - orderB
      })

      let classTotal = 0

      termsInClass.forEach((t) => {
        const items = termsObj[t]
        items.forEach((item) => {
          if (currentY > 740) {
            doc.addPage()
            currentY = 135
            drawTable2Headers(currentY)
            currentY += 20
          }

          classTotal += item.amount

          doc.fillColor('#0f172a').fontSize(8.5).font('Helvetica')
          doc.text(cls, 45, currentY + 4, { width: 90 })
          doc.text(t, 145, currentY + 4, { width: 70 })
          doc.text(item.fee_type, 225, currentY + 4, { width: 210 })
          doc.text(item.amount.toLocaleString(), 445, currentY + 4, { width: 105, align: 'right' })

          doc.strokeColor('#f1f5f9').lineWidth(0.5).moveTo(40, currentY + 18).lineTo(555, currentY + 18).stroke()
          currentY += 18
        })
      })

      // Class Subtotal row
      if (currentY > 740) {
        doc.addPage()
        currentY = 135
        drawTable2Headers(currentY)
        currentY += 20
      }

      doc.rect(40, currentY, 515, 18).fill('#f8fafc')
      doc.fillColor('#00264b').fontSize(8.5).font('Helvetica-Bold')
      doc.text(`Total for ${cls}:`, 45, currentY + 4, { width: 390, align: 'right' })
      doc.text(`TZS ${classTotal.toLocaleString()}`, 445, currentY + 4, { width: 105, align: 'right' })
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, currentY + 18).lineTo(555, currentY + 18).stroke()
      currentY += 22
    })

    // Header and footers pass
    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      await drawLetterhead(doc, 40, 515, false)

      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
      const termTitle = term && term !== 'all' ? term : 'All Terms'
      doc.text(`Fee Structure - ${termTitle}`, 40, 95, { align: 'center' })

      const classTitle = grade_level && grade_level !== 'all' ? grade_level : 'All Classes'
      doc.fontSize(9).font('Helvetica')
      doc.text(`Class: ${classTitle}`, 40, 107, { align: 'center' })

      const dateStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, 802).lineTo(555, 802).stroke()

      doc.fillColor('#64748b').fontSize(8).font('Helvetica')
      doc.text(`Generated: ${dateStr}`, 40, 808)
      doc.text(`Prepared by: ${user.email} | Page ${i + 1} of ${range.count}`, 40, 808, { align: 'right' })
    }

    doc.end()
    await new Promise((resolve) => doc.on('end', resolve))
    const pdfBuffer = Buffer.concat(chunks)

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="fee_structure.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'private, no-store',
        'X-Request-Id': requestId,
      },
    })
  },
  { roles: FINANCE_ROLES }
)
