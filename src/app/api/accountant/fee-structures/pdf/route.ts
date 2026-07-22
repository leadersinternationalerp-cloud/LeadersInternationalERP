import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import PDFDocument from 'pdfkit'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const academic_year = searchParams.get('academic_year')
    const term = searchParams.get('term')
    const grade_level = searchParams.get('grade_level')

    // Auth & Permission Check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: prof } = await supabase.from('profiles').select('role, roles').eq('id', user.id).single()
    const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
      ? prof.roles
      : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

    const canRead = userRoles.some(r => ['System Admin', 'Director', 'Principal', 'Accountant'].includes(r))
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

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

    // Generate PDF via pdfkit
    const doc = new PDFDocument({ margin: 40, size: 'A4' })
    const chunks: Buffer[] = []
    
    doc.on('data', (chunk) => chunks.push(chunk))

    // Layout Design
    // Title & Header
    doc.fillColor('#00264b').fontSize(22).text('LEADERS INTERNATIONAL SCHOOL', { align: 'center', underline: false })
    doc.moveDown(0.2)
    doc.fillColor('#3bb3c3').fontSize(14).text('OFFICIAL FEE STRUCTURE REPORT', { align: 'center' })
    doc.moveDown(0.8)

    // Divider Line
    doc.strokeColor('#e2e8f0').lineWidth(1).moveTo(40, 95).lineTo(555, 95).stroke()
    doc.moveDown(1)

    // Print metadata
    doc.fillColor('#1e293b').fontSize(10)
    let metaY = 105
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, 40, metaY)
    doc.text(`Academic Year: ${academic_year && academic_year !== 'all' ? academic_year : 'All Years'}`, 220, metaY)
    doc.text(`Term: ${term && term !== 'all' ? term : 'All Terms'}`, 400, metaY)
    doc.moveDown(1.5)

    // Draw Table Headers
    let tableY = 135
    doc.rect(40, tableY, 515, 24).fill('#00264b')
    doc.fillColor('#ffffff').fontSize(9).text('ACADEMIC YEAR', 45, tableY + 8, { width: 90 })
    doc.text('TERM', 140, tableY + 8, { width: 70 })
    doc.text('CLASS / GRADE', 215, tableY + 8, { width: 95 })
    doc.text('FEE TYPE', 315, tableY + 8, { width: 85 })
    doc.text('FREQUENCY', 405, tableY + 8, { width: 75 })
    doc.text('AMOUNT', 485, tableY + 8, { width: 65, align: 'right' })

    // Table Content
    let currentY = tableY + 24
    let totalAmount = 0

    if (!fees || fees.length === 0) {
      doc.fillColor('#64748b').fontSize(10).text('No fee structure records found matching filters.', 45, currentY + 15, { align: 'center' })
    } else {
      fees.forEach((fee, idx) => {
        // Alternating background colors
        if (idx % 2 === 1) {
          doc.rect(40, currentY, 515, 22).fill('#f8fafc')
        }

        doc.fillColor('#334155').fontSize(9)
        doc.text(fee.academic_year || '-', 45, currentY + 6, { width: 90 })
        doc.text(fee.term || '-', 140, currentY + 6, { width: 70 })
        doc.text(fee.grade_level || '-', 215, currentY + 6, { width: 95 })
        doc.text(fee.fee_type || '-', 315, currentY + 6, { width: 85 })

        // Frequency Label
        let freqStr = 'Termly'
        if (fee.payable_once) freqStr = 'Once'
        else if (fee.payable_annually) freqStr = 'Annually'
        doc.text(freqStr, 405, currentY + 6, { width: 75 })

        // Format Amount
        const amountStr = new Intl.NumberFormat('en-TZ', {
          style: 'currency',
          currency: 'TZS',
          minimumFractionDigits: 0
        }).format(fee.amount || 0).replace('TZS', 'TZS ')
        
        doc.fillColor('#0f172a').text(amountStr, 480, currentY + 6, { width: 70, align: 'right' })

        totalAmount += Number(fee.amount || 0)
        currentY += 22

        // Page break if overflowing
        if (currentY > 750) {
          doc.addPage()
          currentY = 40
        }
      })

      // Total row
      doc.rect(40, currentY, 515, 24).fill('#f1f5f9')
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('TOTAL COMBINED FEES', 45, currentY + 8)
      
      const totalStr = new Intl.NumberFormat('en-TZ', {
        style: 'currency',
        currency: 'TZS',
        minimumFractionDigits: 0
      }).format(totalAmount).replace('TZS', 'TZS ')
      
      doc.text(totalStr, 480, currentY + 8, { width: 70, align: 'right' })
      doc.font('Helvetica') // Reset to standard font
    }

    doc.end()

    // Wait for PDF buffer completion
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
