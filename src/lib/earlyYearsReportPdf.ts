import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

export interface EYObservation {
  learning_area: string
  achievement_level: string // 'Intermediate' | 'Developed' | 'Secured'
  teacher_observation: string
  next_steps?: string
  age_band?: string
  characteristics?: string[]
  evidence_url?: string
  is_final?: boolean
  created_at?: string
}

export interface EYReportOptions {
  student: {
    id: string
    student_id: string
    first_name: string
    last_name: string
    grade_level: string
    section?: string
    dob?: string
    gender?: string
    language_at_home?: string
    medical_info?: string
    allergies?: string
    previous_school?: string
    emergency_contact?: string
  }
  term: {
    id: string
    term_name: string
    academic_year: string
  }
  classInfo: {
    name: string
    section?: string
    age_group?: string
  }
  observations: EYObservation[]
  attendance?: {
    present: number
    total: number
  }
  comments?: {
    classTeacher?: string
    principal?: string
    head?: string
  }
  names?: {
    classTeacher?: string
    head?: string
    principal?: string
  }
  generatedDate?: string
  schoolName?: string
  schoolMotto?: string
  schoolAddress?: string
  evidenceBuffers?: { area: string; buffer: Buffer }[]
}

// Load school logos
export function loadLogoBuffers() {
  const logoPath = path.join(process.cwd(), 'public', 'logo.png')
  const cambridgePath = path.join(process.cwd(), 'public', 'cambridge-logo.png')

  let logoBuffer: Buffer | null = null
  let cambridgeBuffer: Buffer | null = null

  if (fs.existsSync(logoPath)) {
    logoBuffer = fs.readFileSync(logoPath)
  }
  if (fs.existsSync(cambridgePath)) {
    cambridgeBuffer = fs.readFileSync(cambridgePath)
  }

  return { logoBuffer, cambridgeBuffer }
}

// 1. Primary School Header (Matching Primary layout and colors)
function drawHeader(doc: PDFKit.PDFDocument, opts: EYReportOptions, logos: { logoBuffer: Buffer | null; cambridgeBuffer: Buffer | null }) {
  const contentWidth = 525
  const startX = 35
  const startY = 24

  // Draw school logo (top-left)
  if (logos.logoBuffer) {
    try {
      doc.image(logos.logoBuffer, startX, startY, { width: 50, height: 50 })
    } catch (e) {
      console.error('Error drawing school logo:', e)
    }
  }

  // Draw Cambridge logo (top-right)
  if (logos.cambridgeBuffer) {
    try {
      doc.image(logos.cambridgeBuffer, startX + contentWidth - 85, startY + 2, { width: 85, height: 42 })
    } catch (e) {
      console.error('Error drawing Cambridge logo:', e)
    }
  }

  // Center Header Texts (Matching exact user wording & replaces)
  const schoolName = opts.schoolName || 'LEADERS INTERNATIONAL SCHOOL'
  const schoolAddress = 'Kisakasaka, Zanzibar | info@leaders.ac.tz | +255 777 123 456'
  const schoolMotto = '"Learning Today, Leading Tomorrow"'

  doc.fontSize(14).font('Helvetica-Bold').fillColor('#00264b')
     .text(schoolName, startX + 55, startY, { width: contentWidth - 145, align: 'center' })
  
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#00264b')
     .text('CAMBRIDGE SCHOOL – EARLY YEARS FOUNDATION STAGE', startX + 55, startY + 16, { width: contentWidth - 145, align: 'center' })

  doc.fontSize(7.5).font('Helvetica').fillColor('#475569')
     .text(schoolAddress, startX + 55, startY + 28, { width: contentWidth - 145, align: 'center' })

  doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#0f172a')
     .text(schoolMotto, startX + 55, startY + 39, { width: contentWidth - 145, align: 'center' })

  // Double Primary Blue Line Separator
  doc.lineWidth(1).strokeColor('#00264b').moveTo(startX, startY + 52).lineTo(startX + contentWidth, startY + 52).stroke()
  doc.lineWidth(0.5).strokeColor('#00264b').moveTo(startX, startY + 54).lineTo(startX + contentWidth, startY + 54).stroke()
}

// 2. Compact Child Information Section (Reduced Height, Removed Language at Home & Admission Date)
async function drawStudentInfoSection(doc: PDFKit.PDFDocument, opts: EYReportOptions, photoBuffer: Buffer | null) {
  const startX = 35
  const startY = 82
  const contentWidth = 525

  // Title Banner
  const termTitle = opts.term.term_name || 'TERM 1'
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor('#00264b')
     .text(`EARLY YEARS FOUNDATION STAGE PROGRESS REPORT – ${termTitle.toUpperCase()}`, startX, startY, { width: contentWidth, align: 'center' })

  const boxY = startY + 14
  const boxHeight = 72 // Compact height

  // Header Bar
  doc.rect(startX, boxY, contentWidth, 15).fill('#00264b')
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#ffffff')
     .text('CHILD INFORMATION – EARLY YEARS FOUNDATION STAGE', startX + 8, boxY + 3.5)

  // Outline Box
  doc.lineWidth(0.75).strokeColor('#00264b')
     .rect(startX, boxY, contentWidth, boxHeight).stroke()

  // Passport Photo
  const photoW = 52
  const photoH = 54
  const photoX = startX + contentWidth - photoW - 6
  const photoY = boxY + 16

  if (photoBuffer) {
    try {
      doc.image(photoBuffer, photoX, photoY, { width: photoW, height: photoH })
      doc.lineWidth(1).strokeColor('#00264b').rect(photoX, photoY, photoW, photoH).stroke()
    } catch (e) {
      drawPhotoPlaceholder(doc, photoX, photoY, photoW, photoH)
    }
  } else {
    drawPhotoPlaceholder(doc, photoX, photoY, photoW, photoH)
  }

  // Calculate Age
  const getAge = (dobString?: string) => {
    if (!dobString) return 'N/A'
    const today = new Date()
    const birthDate = new Date(dobString)
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
    return `${age} Years`
  }

  const student = opts.student
  const col1X = startX + 8
  const col2X = startX + 245
  const colWidth = 200
  const rowH = 13
  const textY = boxY + 18

  const col1Data = [
    { label: 'Child Name:', val: `${student.first_name} ${student.last_name}`.toUpperCase() },
    { label: 'Admission No:', val: student.student_id },
    { label: 'Class:', val: `${opts.classInfo.name} (${opts.classInfo.age_group || 'N/A'})` },
    { label: 'Academic Year:', val: opts.term.academic_year }
  ]

  const col2Data = [
    { label: 'Date of Birth / Age:', val: student.dob ? `${student.dob} (${getAge(student.dob)})` : 'N/A' },
    { label: 'Gender:', val: student.gender || 'N/A' },
    { label: 'Term:', val: opts.term.term_name },
    { label: 'Medical Info:', val: student.medical_info || 'None' }
  ]

  // Render Col 1
  col1Data.forEach((row, i) => {
    const y = textY + i * rowH
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#00264b').text(row.label, col1X, y, { width: 75 })
    doc.fontSize(7.5).font('Helvetica').fillColor('#0f172a').text(row.val, col1X + 78, y, { width: colWidth - 78, lineBreak: false })
  })

  // Render Col 2
  col2Data.forEach((row, i) => {
    const y = textY + i * rowH
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#00264b').text(row.label, col2X, y, { width: 85 })
    doc.fontSize(7.5).font('Helvetica').fillColor('#0f172a').text(row.val, col2X + 88, y, { width: colWidth - 88, lineBreak: false })
  })

  return boxY + boxHeight
}

function drawPhotoPlaceholder(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).fill('#f1f5f9')
  doc.lineWidth(0.5).strokeColor('#cbd5e1').rect(x, y, w, h).stroke()
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#94a3b8')
     .text('PASSPORT\nPHOTO', x, y + h / 2 - 7, { width: w, align: 'center' })
}

// 7 Standard EYFS areas
const STANDARD_AREAS = [
  'Communication and Language',
  'Physical Development',
  'Personal, Social & Emotional Development',
  'Literacy',
  'Mathematics',
  'Understanding the World',
  'Expressive Arts & Design'
]

// 3. Learning Areas Progress Table (Removed AGE BAND and NEXT STEPS columns)
function drawLearningAreasTable(doc: PDFKit.PDFDocument, opts: EYReportOptions, startY: number) {
  const startX = 35
  const contentWidth = 525

  // 4 Columns Only: Area (120), Level (65), Teacher Observation (235), Characteristics (105)
  const colWidths = {
    area: 120,
    level: 65,
    observation: 235,
    char: 105
  }

  // Table Header
  doc.rect(startX, startY, contentWidth, 16).fill('#00264b')
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff')
  doc.text('LEARNING AREA', startX + 5, startY + 4, { width: colWidths.area - 5 })
  doc.text('LEVEL', startX + colWidths.area, startY + 4, { width: colWidths.level, align: 'center' })
  doc.text('TEACHER OBSERVATION', startX + colWidths.area + colWidths.level + 5, startY + 4, { width: colWidths.observation - 5 })
  doc.text('CHARACTERISTICS', startX + colWidths.area + colWidths.level + colWidths.observation + 5, startY + 4, { width: colWidths.char - 5 })

  // Fill observations for all 7 areas
  const rows: EYObservation[] = STANDARD_AREAS.map(areaName => {
    const existing = (opts.observations || []).find(obs => 
      obs.learning_area.toLowerCase() === areaName.toLowerCase() ||
      areaName.toLowerCase().includes(obs.learning_area.toLowerCase()) ||
      obs.learning_area.toLowerCase().includes(areaName.toLowerCase())
    )
    return existing || {
      learning_area: areaName,
      achievement_level: 'Developed',
      teacher_observation: 'Consistently demonstrates active participation and positive engagement in daily learning activities.',
      characteristics: []
    }
  })

  let currentY = startY + 16

  rows.forEach((row, idx) => {
    const areaText = row.learning_area
    const levelText = row.achievement_level
    const obsText = row.teacher_observation
    const charText = (row.characteristics || []).join(', ')

    // Measure cell height
    const hArea = doc.heightOfString(areaText, { width: colWidths.area - 10 })
    const hObs = doc.heightOfString(obsText, { width: colWidths.observation - 10 })
    const hChar = doc.heightOfString(charText, { width: colWidths.char - 10 })

    const cellHeight = Math.max(25, hArea + 8, hObs + 8, hChar + 8)

    // Alt Row Shading
    if (idx % 2 === 1) {
      doc.rect(startX, currentY, contentWidth, cellHeight).fill('#f8fafc')
    }

    // Grid Row Line
    doc.lineWidth(0.5).strokeColor('#cbd5e1')
       .moveTo(startX, currentY + cellHeight)
       .lineTo(startX + contentWidth, currentY + cellHeight).stroke()

    // Render Learning Area
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#00264b')
       .text(areaText, startX + 5, currentY + (cellHeight - hArea) / 2, { width: colWidths.area - 10 })

    // Level Badge
    const normLevel = (levelText === 'Secured' || levelText === 'Exceeding') ? 'Secured'
                    : (levelText === 'Developed' || levelText === 'Expected') ? 'Developed'
                    : 'Intermediate'

    const lvlColor = normLevel === 'Secured' ? '#ede9fe' : normLevel === 'Developed' ? '#d1fae5' : '#dbeafe'
    const lvlText = normLevel === 'Secured' ? '#6d28d9' : normLevel === 'Developed' ? '#047857' : '#1d4ed8'
    const badgeW = 52
    const badgeH = 12
    const badgeX = startX + colWidths.area + (colWidths.level - badgeW) / 2
    const badgeY = currentY + (cellHeight - badgeH) / 2
    
    doc.rect(badgeX, badgeY, badgeW, badgeH).fill(lvlColor)
    doc.fontSize(6).font('Helvetica-Bold').fillColor(lvlText)
       .text(normLevel, badgeX, badgeY + 3, { width: badgeW, align: 'center' })

    // Teacher Observation
    doc.fontSize(6.8).font('Helvetica').fillColor('#0f172a')
       .text(obsText, startX + colWidths.area + colWidths.level + 5, currentY + 4, { width: colWidths.observation - 10, lineGap: 1.5 })

    // Characteristics
    doc.fontSize(6.5).font('Helvetica').fillColor('#334155')
       .text(charText || 'Active Learning', startX + colWidths.area + colWidths.level + colWidths.observation + 5, currentY + 4, { width: colWidths.char - 10 })

    // Vertical Border Columns
    let xOffset = startX
    const columns = [colWidths.area, colWidths.level, colWidths.observation, colWidths.char]
    columns.forEach(w => {
      xOffset += w
      doc.lineWidth(0.5).strokeColor('#cbd5e1').moveTo(xOffset, currentY).lineTo(xOffset, currentY + cellHeight).stroke()
    })

    currentY += cellHeight
  })

  // Table Outer Border
  doc.lineWidth(0.75).strokeColor('#00264b').rect(startX, startY, contentWidth, currentY - startY).stroke()
  return currentY
}

// 4. Characteristics, Attendance & Remarks Section
function drawCharacteristicsAndComments(doc: PDFKit.PDFDocument, opts: EYReportOptions, startY: number) {
  const startX = 35
  const contentWidth = 525
  const colWidth = (contentWidth - 10) / 2

  // Box 1: Characteristics of Effective Learning
  const col1X = startX
  const col1Y = startY
  doc.rect(col1X, col1Y, colWidth, 13).fill('#00264b')
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
     .text('CHARACTERISTICS OF EFFECTIVE LEARNING', col1X + 6, col1Y + 3)

  doc.lineWidth(0.5).strokeColor('#cbd5e1').rect(col1X, col1Y + 13, colWidth, 48).stroke()
  
  const charComments = opts.comments?.classTeacher || 
    '• Playing & Exploring: Engages in tasks with curiosity.\n• Active Learning: Displays high focus and motivation.\n• Creating & Thinking Critically: Proposes own ideas.'
  doc.fontSize(6.5).font('Helvetica').fillColor('#0f172a')
     .text(charComments, col1X + 6, col1Y + 17, { width: colWidth - 12, lineGap: 2 })

  // Box 2: Attendance & Wellbeing
  const col2X = startX + colWidth + 10
  const col2Y = startY
  doc.rect(col2X, col2Y, colWidth, 13).fill('#00264b')
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
     .text('ATTENDANCE & WELLBEING SUMMARY', col2X + 6, col2Y + 3)

  doc.lineWidth(0.5).strokeColor('#cbd5e1').rect(col2X, col2Y + 13, colWidth, 48).stroke()
  
  const attendancePresent = opts.attendance?.present || 0
  const attendanceTotal = opts.attendance?.total || 0
  const attendancePercent = attendanceTotal > 0 ? ((attendancePresent / attendanceTotal) * 100).toFixed(0) : 'N/A'

  doc.fontSize(6.8).font('Helvetica-Bold').fillColor('#00264b').text('Attendance Record:', col2X + 6, col2Y + 17)
  doc.font('Helvetica').fillColor('#0f172a').text(`${attendancePresent} days present out of ${attendanceTotal} (${attendancePercent}%)`, col2X + 85, col2Y + 17)

  doc.font('Helvetica-Bold').fillColor('#00264b').text('Teacher Remarks:', col2X + 6, col2Y + 30)
  doc.font('Helvetica-Oblique').fillColor('#475569')
     .text(opts.comments?.head || 'Displays positive social growth, respects peers, and demonstrates commendable progress.', col2X + 6, col2Y + 39, { width: colWidth - 12, lineGap: 1.5 })

  // Box 3: Administrative Remarks & Observation Notes
  const remY = startY + 66
  doc.rect(startX, remY, contentWidth, 13).fill('#00264b')
  doc.fontSize(7).font('Helvetica-Bold').fillColor('#ffffff')
     .text('ADMINISTRATIVE REMARKS AND OBSERVATION NOTES', startX + 6, remY + 3)

  doc.lineWidth(0.5).strokeColor('#cbd5e1').rect(startX, remY + 13, contentWidth, 28).stroke()
  doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#1e293b')
     .text(opts.comments?.principal || 'We are proud of the child\'s growth and development this term. The milestones achieved are a testament to diligent learning and parent-teacher collaboration.', startX + 6, remY + 17, { width: contentWidth - 12, lineGap: 1.5 })

  // 5. Signatures Block (Bottom of Page 1)
  const sigY = remY + 68
  const sigColWidth = contentWidth / 4

  const classTeacherName = opts.names?.classTeacher || 'Class Teacher'
  const headName = opts.names?.head || 'Head of Early Years'
  const principalName = opts.names?.principal || 'Principal'

  const signatures = [
    { title: 'Class Teacher', name: classTeacherName, x: startX },
    { title: 'Head of Early Years', name: headName, x: startX + sigColWidth },
    { title: 'Principal', name: principalName, x: startX + sigColWidth * 2 },
    { title: 'Parent/Guardian', name: 'Signature', x: startX + sigColWidth * 3 },
  ]

  signatures.forEach(sig => {
    // Signature Line
    doc.lineWidth(0.5).strokeColor('#00264b')
       .moveTo(sig.x + 8, sigY)
       .lineTo(sig.x + sigColWidth - 8, sigY).stroke()

    // Titles & Names
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#00264b')
       .text(sig.title, sig.x + 6, sigY + 4, { width: sigColWidth - 12, align: 'center' })
    doc.fontSize(6).font('Helvetica-Oblique').fillColor('#64748b')
       .text(sig.name, sig.x + 6, sigY + 12, { width: sigColWidth - 12, align: 'center' })
  })
}

// Main EYFS Single Page PDF Generator
export async function generateEarlyYearsReportPdf(optsOrArray: EYReportOptions | EYReportOptions[]): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 20, bottom: 15, left: 35, right: 35 },
    bufferPages: true
  })
  ;(doc as any).options.autoPageBreak = false

  const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', chunk => chunks.push(Buffer.from(chunk)))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  const logos = loadLogoBuffers()
  const optsList = Array.isArray(optsOrArray) ? optsOrArray : [optsOrArray]

  for (let idx = 0; idx < optsList.length; idx++) {
    const opts = optsList[idx]
    if (idx > 0) {
      doc.addPage()
    }

    // Fetch student photo from Supabase storage by student UUID
    let photoBuffer: Buffer | null = null
    try {
      const { createServiceClient } = require('@/utils/supabase/service')
      const supabaseService = createServiceClient()
      const { data: files } = await supabaseService.storage
          .from('student-photos')
          .list(opts.student.id)

      if (files && files.length > 0) {
        const latestFile = files[0]
        const { data: blob, error: downloadError } = await supabaseService.storage
          .from('student-photos')
          .download(`${opts.student.id}/${latestFile.name}`)

        if (!downloadError && blob) {
          photoBuffer = Buffer.from(await blob.arrayBuffer())
        }
      }
    } catch (e) {
      console.error('Error fetching student photo from storage:', e)
    }

    // Render EXACT 1-PAGE EYFS Report Card
    drawHeader(doc, opts, logos)
    const infoEndY = await drawStudentInfoSection(doc, opts, photoBuffer)
    const tableEndY = drawLearningAreasTable(doc, opts, infoEndY + 6)
    drawCharacteristicsAndComments(doc, opts, tableEndY + 6)
  }

  // Draw Footer on Every Page
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    
    const oldMarginBottom = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    
    const opts = optsList[i] || optsList[0]
    const genDate = opts.generatedDate || new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
    
    doc.lineWidth(0.5).strokeColor('#cbd5e1').moveTo(35, 810).lineTo(560, 810).stroke()
    
    doc.fontSize(7).font('Helvetica').fillColor('#94a3b8')
    doc.text(`Generated: ${genDate} | ${opts.schoolName || 'Leaders International School'}`, 35, 815)
    doc.text('End of EYFS Progress Report', 200, 815, { width: 200, align: 'center' })
    doc.text(`Page ${i + 1} of ${range.count}`, 490, 815, { width: 70, align: 'right' })

    doc.page.margins.bottom = oldMarginBottom
  }

  doc.end()
  return pdfBufferPromise
}
