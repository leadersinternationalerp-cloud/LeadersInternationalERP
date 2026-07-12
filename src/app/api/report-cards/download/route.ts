import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import PDFDocument from 'pdfkit'
import getStream from 'get-stream'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const student_id = searchParams.get('student_id')
  const term_id = searchParams.get('term_id')

  if (!student_id || !term_id) {
    return NextResponse.json({ error: 'Missing student_id or term_id' }, { status: 400 })
  }

  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch basic student info
  const { data: student } = await supabase
    .from('profiles')
    .select('first_name, last_name, id')
    .eq('id', student_id)
    .single()

  const { data: term } = await supabase
    .from('terms')
    .select('term_name')
    .eq('id', term_id)
    .single()

  // Generate PDF
  const doc = new PDFDocument({ margin: 50 })
  
  // Create a buffer from the PDF stream
  const pdfBufferPromise = getStream.buffer(doc)

  // -- Draw PDF Content --
  
  // Header
  doc.fontSize(24).fillColor('#00264b').text('LEADERS INTERNATIONAL SCHOOL', { align: 'center' })
  doc.fontSize(12).fillColor('#666666').text('Nurturing Leaders of Tomorrow', { align: 'center' })
  doc.moveDown(2)
  
  // Title
  doc.fontSize(18).fillColor('#000000').text('OFFICIAL REPORT CARD', { align: 'center' })
  doc.moveDown(2)

  // Student Info
  doc.fontSize(12)
  doc.text(`Student Name: ${student?.first_name || 'Unknown'} ${student?.last_name || ''}`)
  doc.text(`Student ID: ${student?.id || 'N/A'}`)
  doc.text(`Academic Term: ${term?.term_name || 'Unknown Term'}`)
  doc.text(`Date Generated: ${new Date().toLocaleDateString()}`)
  doc.moveDown(2)

  // Placeholder for Grades
  doc.fontSize(14).text('Academic Performance', { underline: true })
  doc.moveDown(1)
  
  doc.fontSize(11)
  doc.text('Subject', 50, doc.y, { continued: true })
  doc.text('Grade', 250, doc.y, { continued: true })
  doc.text('Comments', 350, doc.y)
  doc.moveDown(0.5)

  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
  doc.moveDown(0.5)

  // Mocked grades for MVP
  const subjects = ['Mathematics', 'English Language', 'Science', 'History', 'Geography']
  const grades = ['A', 'B+', 'A-', 'A', 'B']
  const comments = ['Excellent work', 'Good effort', 'Very consistent', 'Outstanding', 'Satisfactory']

  for (let i = 0; i < subjects.length; i++) {
    const y = doc.y
    doc.text(subjects[i], 50, y)
    doc.text(grades[i], 250, y)
    doc.text(comments[i], 350, y)
    doc.moveDown(0.5)
  }

  doc.moveDown(2)
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
  doc.moveDown(1)

  // Footer / Signatures
  doc.fontSize(10).fillColor('#333333')
  const sigY = doc.y + 50
  
  doc.text('_______________________', 50, sigY)
  doc.text('Class Teacher', 50, sigY + 15)

  doc.text('_______________________', 350, sigY)
  doc.text('Principal', 350, sigY + 15)

  // Finalize PDF
  doc.end()

  const pdfBuffer = await pdfBufferPromise

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ReportCard_${student?.first_name}_${term?.term_name}.pdf"`
    }
  })
}
