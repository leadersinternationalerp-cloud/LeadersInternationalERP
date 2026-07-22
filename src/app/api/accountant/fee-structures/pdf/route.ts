import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

// Logo loader helper
function loadLogoBuffer() {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  if (fs.existsSync(logoPath)) {
    return fs.readFileSync(logoPath)
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const academic_year = searchParams.get('academic_year')
    const term = searchParams.get('term')
    const grade_level = searchParams.get('grade_level')

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: prof } = await supabase.from('profiles').select('email, first_name, last_name, role, roles').eq('id', user.id).single()
    const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
      ? prof.roles
      : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

    const canRead = userRoles.some(r => ['System Admin', 'Director', 'Principal', 'Accountant'].includes(r))
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Query system settings for header branding
    const { data: settingsData } = await supabase.from('system_settings').select('*')
    const settings: Record<string, string> = {}
    settingsData?.forEach(item => {
      settings[item.key] = typeof item.value === 'string' ? item.value : JSON.stringify(item.value)
    })

    const schoolName = settings['school_name'] || 'LEADERS INTERNATIONAL SCHOOL'
    const schoolMotto = settings['school_motto'] || 'LEARNING TODAY, LEADING TOMORROW'
    const schoolEmail = settings['contact_email'] || 'info@leaders.ac.tz'
    const schoolPhone = settings['contact_phone'] || '+255 123 456 789'
    const schoolAddress = settings['school_address'] || 'P.O. Box 123, Dar es Salaam'

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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const activeFees = fees || []

    // 1. Grouping for Table 1 (Summary by Term)
    const summaryGroups: {
      term: string
      fee_type: string
      amount: number
      classes: string[]
    }[] = []

    activeFees.forEach(fee => {
      const existing = summaryGroups.find(g => 
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
          classes: [fee.grade_level]
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
    activeFees.forEach(fee => {
      if (!classGroups[fee.grade_level]) {
        classGroups[fee.grade_level] = {}
      }
      if (!classGroups[fee.grade_level][fee.term]) {
        classGroups[fee.grade_level][fee.term] = []
      }
      classGroups[fee.grade_level][fee.term].push({
        fee_type: fee.fee_type,
        amount: Number(fee.amount)
      })
    })

    const sortedClasses = Object.keys(classGroups).sort()

    // Create PDF Document
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks: Buffer[] = []
    doc.on('data', chunk => chunks.push(chunk))

    const logoBuffer = loadLogoBuffer()

    // Header Drawer Helper
    const drawHeader = (pageNum: number) => {
      if (logoBuffer) {
        doc.image(logoBuffer, 40, 25, { width: 55, height: 55 })
      }

      // Title header texts
      doc.fillColor('#00264b').fontSize(16).font('Helvetica-Bold')
      doc.text(schoolName.toUpperCase(), 40, 28, { align: 'center' })
      
      doc.fillColor('#3bb3c3').fontSize(9).font('Helvetica')
      doc.text(schoolMotto.toUpperCase(), 40, 46, { align: 'center' })

      doc.fillColor('#475569').fontSize(8)
      doc.text(`${schoolPhone} | ${schoolEmail.toUpperCase()}`, 40, 58, { align: 'center' })
      doc.text(schoolAddress.toUpperCase(), 40, 68, { align: 'center' })

      doc.fillColor('#0f172a').fontSize(10).font('Helvetica-Bold')
      const termTitle = term && term !== 'all' ? term : 'All Terms'
      doc.text(`Fee Structure - ${termTitle}`, 40, 82, { align: 'center' })
      
      const classTitle = grade_level && grade_level !== 'all' ? grade_level : 'All Classes'
      doc.fontSize(9).font('Helvetica')
      doc.text(`Class: ${classTitle}`, 40, 95, { align: 'center' })

      // Double line separator
      doc.strokeColor('#e2e8f0').lineWidth(1.5).moveTo(40, 112).lineTo(555, 112).stroke()
    }

    drawHeader(1)

    // Footer Drawer Helper
    const drawFooter = (preparedBy: string) => {
      const dateStr = new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, 805).lineTo(555, 805).stroke()
      
      doc.fillColor('#64748b').fontSize(8).font('Helvetica')
      doc.text(`Generated: ${dateStr}`, 40, 812)
      doc.text(`Prepared by: ${preparedBy}`, 40, 812, { align: 'right' })
    }

    drawFooter(prof?.email || user.email)

    let currentY = 125

    // SECTION 1: Summary Table by Term
    doc.fillColor('#00264b').fontSize(11).font('Helvetica-Bold').text('Termly Summary View', 40, currentY)
    currentY += 16

    // Table 1 headers
    const t1Headers = [
      { label: 'Term', w: 80 },
      { label: 'Vote Head', w: 155 },
      { label: 'Applicable Classes', w: 200 },
      { label: 'Amount', w: 80, align: 'right' }
    ]

    const drawTable1Headers = (y: number) => {
      doc.rect(40, y, 515, 20).fill('#00264b')
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')
      
      let xOffset = 45
      t1Headers.forEach(h => {
        doc.text(h.label.toUpperCase(), xOffset, y + 6, { width: h.w - 10, align: h.align as any || 'left' })
        xOffset += h.w
      })
    }

    drawTable1Headers(currentY)
    currentY += 20

    // Render Table 1 Rows
    summaryGroups.forEach((row) => {
      if (currentY > 740) {
        doc.addPage()
        drawHeader(2)
        drawFooter(prof?.email || user.email)
        currentY = 125
        drawTable1Headers(currentY)
        currentY += 20
      }

      const rowHeight = 22
      
      // cell borders
      doc.strokeColor('#e2e8f0').lineWidth(0.5)
      
      // Outer rect border for row
      doc.rect(40, currentY, 515, rowHeight).stroke()
      // Column dividers
      doc.moveTo(120, currentY).lineTo(120, currentY + rowHeight).stroke()
      doc.moveTo(275, currentY).lineTo(275, currentY + rowHeight).stroke()
      doc.moveTo(475, currentY).lineTo(475, currentY + rowHeight).stroke()

      doc.fillColor('#334155').fontSize(8.5).font('Helvetica')
      doc.text(row.term, 45, currentY + 7, { width: 70 })
      doc.text(row.fee_type, 125, currentY + 7, { width: 145 })
      
      const classesStr = row.classes.sort().join(', ')
      doc.text(classesStr, 280, currentY + 7, { width: 190 })

      const amountStr = new Intl.NumberFormat('en-TZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(row.amount)
      doc.fillColor('#0f172a').font('Helvetica-Bold')
      doc.text(amountStr, 480, currentY + 7, { width: 70, align: 'right' })

      currentY += rowHeight
    })

    currentY += 25

    // Page break before Section 2 if low room
    if (currentY > 600) {
      doc.addPage()
      drawHeader(2)
      drawFooter(prof?.email || user.email)
      currentY = 125
    }

    // SECTION 2: Detailed Breakdown Table by Class, then Term
    doc.fillColor('#00264b').fontSize(11).font('Helvetica-Bold').text('Detailed Class Breakdown', 40, currentY)
    currentY += 16

    const t2Headers = [
      { label: 'Class', w: 90 },
      { label: 'Term', w: 80 },
      { label: 'Vote Head', w: 245 },
      { label: 'Amount', w: 100, align: 'right' }
    ]

    const drawTable2Headers = (y: number) => {
      doc.rect(40, y, 515, 20).fill('#00264b')
      doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold')
      
      let xOffset = 45
      t2Headers.forEach(h => {
        doc.text(h.label.toUpperCase(), xOffset, y + 6, { width: h.w - 10, align: h.align as any || 'left' })
        xOffset += h.w
      })
    }

    drawTable2Headers(currentY)
    currentY += 20

    // Render Table 2 Rows
    sortedClasses.forEach((cls) => {
      const termsObj = classGroups[cls]
      const sortedTerms = Object.keys(termsObj).sort((a, b) => {
        return (termOrder[a.toLowerCase()] || 99) - (termOrder[b.toLowerCase()] || 99)
      })

      let classTotal = 0

      // Calculate total rows needed for Class to draw vertical span borders cleanly
      let classRowsCount = 0
      sortedTerms.forEach(t => {
        classRowsCount += termsObj[t].length + 1 // items + subtotal row
      })

      // Store class top Y position
      const classStartY = currentY

      sortedTerms.forEach((t) => {
        const items = termsObj[t]
        let termTotal = 0

        // Calculate term rows count for vertical Term borders
        const termRowsCount = items.length + 1 // items + subtotal row
        const termStartY = currentY

        items.forEach((item, itemIdx) => {
          if (currentY > 740) {
            // Draw borders before breaking page
            doc.strokeColor('#e2e8f0').lineWidth(0.5)
            // Left boundary of Class col
            doc.moveTo(40, classStartY).lineTo(40, currentY).stroke()
            // Right boundary of Class col / Left of Term
            doc.moveTo(130, classStartY).lineTo(130, currentY).stroke()
            // Right boundary of Term / Left of Vote Head
            doc.moveTo(210, classStartY).lineTo(210, currentY).stroke()

            doc.addPage()
            drawHeader(2)
            drawFooter(prof?.email || user.email)
            currentY = 125
            drawTable2Headers(currentY)
            currentY += 20
          }

          const rowHeight = 20

          // Row borders
          doc.strokeColor('#e2e8f0').lineWidth(0.5)
          doc.rect(40, currentY, 515, rowHeight).stroke()
          
          // Dividers inside columns (excluding Class & Term spans)
          doc.moveTo(210, currentY).lineTo(210, currentY + rowHeight).stroke()
          doc.moveTo(455, currentY).lineTo(455, currentY + rowHeight).stroke()

          doc.fillColor('#334155').fontSize(8.5).font('Helvetica')
          
          // Draw Class and Term label ONLY on the first item row of this term
          if (itemIdx === 0) {
            // Write class (only at start)
            doc.fillColor('#0f172a').font('Helvetica-Bold')
            doc.text(cls, 45, currentY + 5, { width: 80 })
            // Write term
            doc.fillColor('#334155').font('Helvetica')
            doc.text(t, 135, currentY + 5, { width: 70 })
          }

          doc.font('Helvetica')
          doc.text(item.fee_type, 215, currentY + 5, { width: 235 })

          const amtStr = new Intl.NumberFormat('en-TZ', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(item.amount)
          doc.text(amtStr, 460, currentY + 5, { width: 90, align: 'right' })

          termTotal += item.amount
          classTotal += item.amount
          currentY += rowHeight
        })

        // Draw Term Subtotal Row
        if (currentY > 740) {
          doc.addPage()
          drawHeader(2)
          drawFooter(prof?.email || user.email)
          currentY = 125
          drawTable2Headers(currentY)
          currentY += 20
        }

        const subtotalHeight = 20
        doc.strokeColor('#e2e8f0').lineWidth(0.5)
        doc.rect(40, currentY, 515, subtotalHeight).stroke()
        
        // Background for total row (only for vote head and amount columns)
        doc.rect(210, currentY, 345, subtotalHeight).fill('#f8fafc')
        doc.strokeColor('#e2e8f0').rect(210, currentY, 345, subtotalHeight).stroke()
        doc.moveTo(455, currentY).lineTo(455, currentY + subtotalHeight).stroke()

        doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica-Bold')
        doc.text(`Total ${t}`, 215, currentY + 5, { width: 235 })
        
        const termTotalStr = new Intl.NumberFormat('en-TZ', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(termTotal)
        doc.text(termTotalStr, 460, currentY + 5, { width: 90, align: 'right' })

        // Draw vertical column grid border lines for Class and Term spans
        doc.strokeColor('#cbd5e1').lineWidth(0.5)
        doc.moveTo(130, termStartY).lineTo(130, currentY + subtotalHeight).stroke()
        doc.moveTo(210, termStartY).lineTo(210, currentY + subtotalHeight).stroke()

        currentY += subtotalHeight
      })

      // Draw Class Total Row
      if (currentY > 740) {
        doc.addPage()
        drawHeader(2)
        drawFooter(prof?.email || user.email)
        currentY = 125
        drawTable2Headers(currentY)
        currentY += 20
      }

      const classTotalHeight = 22
      doc.strokeColor('#cbd5e1').lineWidth(0.5)
      doc.rect(40, currentY, 515, classTotalHeight).stroke()
      
      // Total background fill
      doc.rect(40, currentY, 515, classTotalHeight).fill('#f1f5f9')
      doc.strokeColor('#cbd5e1').rect(40, currentY, 515, classTotalHeight).stroke()
      doc.moveTo(455, currentY).lineTo(455, currentY + classTotalHeight).stroke()

      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold')
      doc.text(`Total ${cls}`, 45, currentY + 6, { width: 400 })

      const classTotalStr = new Intl.NumberFormat('en-TZ', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(classTotal)
      doc.text(classTotalStr, 460, currentY + 6, { width: 90, align: 'right' })

      // Draw vertical outer boundaries for Class column span
      doc.strokeColor('#cbd5e1').lineWidth(0.5)
      doc.moveTo(40, classStartY).lineTo(40, currentY).stroke()
      doc.moveTo(130, classStartY).lineTo(130, currentY).stroke()

      currentY += classTotalHeight
    })

    // End stream
    doc.end()

    // Wait for pdf construction
    await new Promise((resolve) => doc.on('end', resolve))
    const pdfBuffer = Buffer.concat(chunks)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="fee_structure.pdf"',
        'Content-Length': pdfBuffer.length.toString()
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
