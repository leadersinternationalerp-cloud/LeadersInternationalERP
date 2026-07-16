import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import PDFDocument from 'pdfkit'


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

  let isAuthorized = false
  if (user.id === student_id) {
    isAuthorized = true
  } else {
    const { data: prof } = await supabase.from('profiles').select('roles, role').eq('id', user.id).single()
    const userRoles = prof?.roles || (prof?.role ? prof.role.split(',') : [])
    if (userRoles.includes('System Admin') || userRoles.includes('Principal') || userRoles.includes('Teacher')) {
      isAuthorized = true
    } else {
      const { data: rel } = await supabase.from('student_parents').select('id').eq('parent_id', user.id).eq('student_id', student_id).single()
      if (rel) isAuthorized = true
    }
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized Access to Student Record' }, { status: 403 })
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

  const termName = term?.term_name || 'Term 1'

  // Fetch Marks
  const { data: marksRecords } = await supabase
    .from('marks')
    .select(`
      score,
      remarks,
      subject:subject_id (name)
    `)
    .eq('student_id', student_id)
    .eq('term', termName)

  // Fetch Grade Boundaries (assuming standard framework)
  const { data: boundaries } = await supabase
    .from('grade_boundaries')
    .select('*')
    .eq('framework_name', 'Tanzania National (NECTA)') // or a default one
    .order('min_score', { ascending: false })

  const getGrade = (score: number) => {
    if (!boundaries || boundaries.length === 0) return 'N/A'
    for (const b of boundaries) {
      if (score >= b.min_score) return b.grade_label
    }
    return 'F'
  }

  // Generate PDF
  const doc = new PDFDocument({ margin: 50 })
  
  // Create a buffer from the PDF stream
  const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

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

  // Grades Section
  doc.fontSize(14).text('Academic Performance', { underline: true })
  doc.moveDown(1)
  
  doc.fontSize(11)
  doc.text('Subject', 50, doc.y, { continued: true })
  doc.text('Score', 250, doc.y, { continued: true })
  doc.text('Grade', 350, doc.y, { continued: true })
  doc.text('Comments', 450, doc.y)
  doc.moveDown(0.5)

  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
  doc.moveDown(0.5)

  let totalScore = 0
  let subjectsCount = 0

  if (marksRecords && marksRecords.length > 0) {
    for (const m of marksRecords) {
      const subject: any = Array.isArray(m.subject) ? m.subject[0] : m.subject
      const subjName = subject?.name || 'Unknown'
      const grade = getGrade(m.score)
      totalScore += m.score
      subjectsCount++

      const y = doc.y
      doc.text(subjName, 50, y)
      doc.text(m.score.toString(), 250, y)
      doc.text(grade, 350, y)
      doc.text(m.remarks || '', 450, y, { width: 100 })
      doc.moveDown(1)
    }
  } else {
    doc.text('No marks recorded for this term.', 50, doc.y)
    doc.moveDown(1)
  }

  doc.moveDown(1)
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke()
  doc.moveDown(1)

  if (subjectsCount > 0) {
    const avg = (totalScore / subjectsCount).toFixed(1)
    doc.fontSize(12).text(`Total Average: ${avg}%`, 50, doc.y)
    doc.text(`Overall Grade: ${getGrade(parseFloat(avg))}`, 50, doc.y)
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

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ReportCard_${student?.first_name}_${term?.term_name}.pdf"`
    }
  })
}
