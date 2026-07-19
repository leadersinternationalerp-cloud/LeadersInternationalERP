import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

export interface EYObservation {
  learning_area: string
  achievement_level: 'Emerging' | 'Expected' | 'Exceeding' | string
  teacher_observation: string
  next_steps?: string
  age_band?: string
  characteristics?: string[]
  evidence_url?: string
  is_final?: boolean
  created_at?: string
}

export interface EYStudentInfo {
  id: string
  student_id: string
  first_name: string
  last_name: string
  grade_level: string
  section?: string
  dob?: string
  gender?: string
  photo_url?: string
  admission_date?: string
  language_at_home?: string
  medical_info?: string
  allergies?: string
  previous_school?: string
  emergency_contact?: string
}

export interface EYTermInfo {
  id: string
  term_name: string
  academic_year: string
}

export interface EYReportOptions {
  student: EYStudentInfo
  term: EYTermInfo
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

// Function to load school logo buffers
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

// Helper to draw standard header
function drawHeader(doc: PDFKit.PDFDocument, opts: EYReportOptions, logos: { logoBuffer: Buffer | null; cambridgeBuffer: Buffer | null }) {
  const contentWidth = 525
  const startX = 35
  const startY = 30

  // 1. Draw Logo Images
  if (logos.logoBuffer) {
    try {
      doc.image(logos.logoBuffer, startX, startY, { width: 50, height: 50 })
    } catch (e) {
      console.error('Error drawing main logo:', e)
    }
  }

  if (logos.cambridgeBuffer) {
    try {
      doc.image(logos.cambridgeBuffer, startX + contentWidth - 75, startY, { width: 75, height: 45 })
    } catch (e) {
      console.error('Error drawing Cambridge logo:', e)
    }
  }

  // 2. Draw Header Text
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#831843') // Pinkish-burgundy primary
     .text(opts.schoolName || 'LEADERS INTERNATIONAL SCHOOL', startX + 55, startY, { width: contentWidth - 140, align: 'center' })
  
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#be185d') // Dark Pink
     .text('SMARTKIDZ CAMBRIDGE SCHOOL – EARLY YEARS FOUNDATION STAGE', startX + 55, startY + 16, { width: contentWidth - 140, align: 'center' })

  doc.fontSize(7).font('Helvetica').fillColor('#64748b')
     .text(opts.schoolAddress || 'Chukwani, Zanzibar | info@leaders.ac.tz | +255 777 123 456', startX + 55, startY + 28, { width: contentWidth - 140, align: 'center' })
     .text(opts.schoolMotto || '"Unlocking Potential, Shaping Futures"', startX + 55, startY + 38, { width: contentWidth - 140, align: 'center' })

  // 3. Draw Header Borders
  doc.lineWidth(1).strokeColor('#f472b6')
     .moveTo(startX, startY + 54)
     .lineTo(startX + contentWidth, startY + 54).stroke()
     
  doc.lineWidth(0.5).strokeColor('#f472b6')
     .moveTo(startX, startY + 57)
     .lineTo(startX + contentWidth, startY + 57).stroke()

  // 4. Report Title
  const termName = opts.term.term_name.toUpperCase()
  const yearName = opts.term.academic_year
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#831843')
     .text(`EARLY YEARS FOUNDATION STAGE PROGRESS REPORT – ${termName} ${yearName}`, startX, startY + 66, { width: contentWidth, align: 'center' })
}

// Draw Child Info Section
async function drawStudentInfoSection(doc: PDFKit.PDFDocument, opts: EYReportOptions, photoBuffer: Buffer | null) {
  const startX = 35
  const startY = 115
  const contentWidth = 525
  const infoWidth = 430
  const photoWidth = 85
  const photoHeight = 105

  // Header Box
  doc.rect(startX, startY, contentWidth, 18).fill('#db2777')
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff')
     .text('CHILD INFORMATION – EARLY YEARS FOUNDATION STAGE', startX + 8, startY + 5)

  // Outline Box
  doc.lineWidth(0.75).strokeColor('#f472b6')
     .rect(startX, startY + 18, contentWidth, 115).stroke()

  // Draw Photo
  const photoX = startX + contentWidth - photoWidth - 8
  const photoY = startY + 23
  
  if (photoBuffer) {
    try {
      doc.image(photoBuffer, photoX, photoY, { width: photoWidth, height: photoHeight })
      // Photo Border
      doc.lineWidth(1.5).strokeColor('#db2777').rect(photoX, photoY, photoWidth, photoHeight).stroke()
    } catch (e) {
      console.error('Error drawing student photo:', e)
      drawPhotoPlaceholder(doc, photoX, photoY, photoWidth, photoHeight)
    }
  } else {
    drawPhotoPlaceholder(doc, photoX, photoY, photoWidth, photoHeight)
  }

  // Calculate fields
  const getAge = (dobString?: string) => {
    if (!dobString) return 'N/A'
    const today = new Date()
    const birthDate = new Date(dobString)
    let age = today.getFullYear() - birthDate.getFullYear()
    const m = today.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return `${age} Years`
  }

  const student = opts.student
  const col1X = startX + 10
  const col2X = startX + 225
  const colWidth = 205
  const rowHeight = 16
  const textStartY = startY + 26

  const col1Data = [
    { label: 'Child Name:', val: `${student.first_name} ${student.last_name}`.toUpperCase() },
    { label: 'Admission No:', val: student.student_id },
    { label: 'Class:', val: `${opts.classInfo.name} (${opts.classInfo.age_group || 'N/A'})` },
    { label: 'Academic Year:', val: opts.term.academic_year },
    { label: 'Date of Birth / Age:', val: student.dob ? `${student.dob} (${getAge(student.dob)})` : 'N/A' }
  ]

  const col2Data = [
    { label: 'Gender:', val: student.gender || 'N/A' },
    { label: 'Term:', val: opts.term.term_name },
    { label: 'Language at Home:', val: student.language_at_home || 'English' },
    { label: 'Admission Date:', val: student.admission_date || 'N/A' },
    { label: 'Medical Info:', val: student.medical_info || 'None reported' }
  ]

  // Draw col 1
  col1Data.forEach((row, i) => {
    const y = textStartY + i * rowHeight
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#831843').text(row.label, col1X, y, { width: 75 })
    doc.fontSize(7.5).font('Helvetica').fillColor('#0f172a').text(row.val, col1X + 80, y, { width: colWidth - 80, lineBreak: false })
  })

  // Draw col 2
  col2Data.forEach((row, i) => {
    const y = textStartY + i * rowHeight
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#831843').text(row.label, col2X, y, { width: 85 })
    doc.fontSize(7.5).font('Helvetica').fillColor('#0f172a').text(row.val, col2X + 90, y, { width: colWidth - 90, lineBreak: false })
  })
}

function drawPhotoPlaceholder(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x, y, w, h).fill('#f3f4f6')
  doc.lineWidth(1).strokeColor('#cbd5e1').rect(x, y, w, h).stroke()
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#94a3b8')
     .text('PASSPORT\nPHOTO', x, y + h / 2 - 8, { width: w, align: 'center' })
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

// Draw Learning Areas Table
function drawLearningAreasTable(doc: PDFKit.PDFDocument, opts: EYReportOptions) {
  const startX = 35
  const startY = 260
  const contentWidth = 525

  // Column Widths
  const colWidths = {
    area: 92,
    level: 52,
    ageBand: 42,
    observation: 195,
    next: 78,
    char: 66
  }

  // Header Box
  doc.rect(startX, startY, contentWidth, 18).fill('#831843')
  
  // Headers text
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff')
  doc.text('LEARNING AREA', startX + 5, startY + 5, { width: colWidths.area - 5 })
  doc.text('LEVEL', startX + colWidths.area + 5, startY + 5, { width: colWidths.level - 5, align: 'center' })
  doc.text('AGE BAND', startX + colWidths.area + colWidths.level + 5, startY + 5, { width: colWidths.ageBand - 5, align: 'center' })
  doc.text('TEACHER OBSERVATION', startX + colWidths.area + colWidths.level + colWidths.ageBand + 5, startY + 5, { width: colWidths.observation - 5 })
  doc.text('NEXT STEPS', startX + colWidths.area + colWidths.level + colWidths.ageBand + colWidths.observation + 5, startY + 5, { width: colWidths.next - 5 })
  doc.text('CHARACTERISTICS', startX + colWidths.area + colWidths.level + colWidths.ageBand + colWidths.observation + colWidths.next + 5, startY + 5, { width: colWidths.char - 5 })

  // Fill observations list to ensure all 7 are present
  const rows: EYObservation[] = STANDARD_AREAS.map(areaName => {
    const existing = (opts.observations || []).find(obs => 
      obs.learning_area.toLowerCase() === areaName.toLowerCase() ||
      areaName.toLowerCase().includes(obs.learning_area.toLowerCase()) ||
      obs.learning_area.toLowerCase().includes(areaName.toLowerCase())
    )
    return existing || {
      learning_area: areaName,
      achievement_level: 'Expected',
      teacher_observation: 'No observation recorded for this learning area.',
      next_steps: 'Continue working on age-appropriate learning tasks.',
      age_band: opts.classInfo.age_group || '3-4y',
      characteristics: []
    }
  })

  let currentY = startY + 18

  rows.forEach((row, idx) => {
    // Determine heights
    const areaText = row.learning_area
    const levelText = row.achievement_level
    const ageText = row.age_band || ''
    const obsText = row.teacher_observation
    const nextText = row.next_steps || ''
    const charText = (row.characteristics || []).join(', ')

    // Measure heights
    const hArea = doc.heightOfString(areaText, { width: colWidths.area - 10 })
    const hObs = doc.heightOfString(obsText, { width: colWidths.observation - 10 })
    const hNext = doc.heightOfString(nextText, { width: colWidths.next - 10 })
    const hChar = doc.heightOfString(charText, { width: colWidths.char - 10 })

    const cellHeight = Math.max(28, hArea + 10, hObs + 10, hNext + 10, hChar + 10)

    // Alt shading
    if (idx % 2 === 1) {
      doc.rect(startX, currentY, contentWidth, cellHeight).fill('#fdf2f8')
    }

    // Grid Borders
    doc.lineWidth(0.5).strokeColor('#f472b6')
       .moveTo(startX, currentY + cellHeight)
       .lineTo(startX + contentWidth, currentY + cellHeight).stroke()

    // Draw fields
    // Area
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#be185d')
       .text(areaText, startX + 5, currentY + (cellHeight - hArea) / 2, { width: colWidths.area - 10 })

    // Level Badge
    const lvlColor = levelText === 'Exceeding' ? '#dcfce7' : levelText === 'Expected' ? '#e0f2fe' : '#fef3c7'
    const lvlText = levelText === 'Exceeding' ? '#166534' : levelText === 'Expected' ? '#075985' : '#854d0e'
    const badgeW = 44
    const badgeH = 12
    const badgeX = startX + colWidths.area + (colWidths.level - badgeW) / 2
    const badgeY = currentY + (cellHeight - badgeH) / 2
    
    doc.rect(badgeX, badgeY, badgeW, badgeH).fill(lvlColor)
    doc.fontSize(6).font('Helvetica-Bold').fillColor(lvlText)
       .text(levelText, badgeX, badgeY + 3, { width: badgeW, align: 'center' })

    // Age Band
    doc.fontSize(7).font('Helvetica').fillColor('#334155')
       .text(ageText, startX + colWidths.area + colWidths.level, currentY + (cellHeight - 8) / 2, { width: colWidths.ageBand, align: 'center' })

    // Observation
    doc.fontSize(7).font('Helvetica').fillColor('#0f172a')
       .text(obsText, startX + colWidths.area + colWidths.level + colWidths.ageBand + 5, currentY + 5, { width: colWidths.observation - 10 })

    // Next steps
    doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#475569')
       .text(nextText, startX + colWidths.area + colWidths.level + colWidths.ageBand + colWidths.observation + 5, currentY + 5, { width: colWidths.next - 10 })

    // Characteristics
    doc.fontSize(6).font('Helvetica').fillColor('#334155')
       .text(charText || 'None selected', startX + colWidths.area + colWidths.level + colWidths.ageBand + colWidths.observation + colWidths.next + 5, currentY + 5, { width: colWidths.char - 10 })

    // Draw vertical cell border separators
    let xOffset = startX
    const columns = [colWidths.area, colWidths.level, colWidths.ageBand, colWidths.observation, colWidths.next, colWidths.char]
    columns.forEach(w => {
      xOffset += w
      doc.lineWidth(0.5).strokeColor('#f472b6').moveTo(xOffset, currentY).lineTo(xOffset, currentY + cellHeight).stroke()
    })

    currentY += cellHeight
  })

  // Outer border
  doc.lineWidth(0.75).strokeColor('#db2777').rect(startX, startY, contentWidth, currentY - startY).stroke()
  return currentY
}

// Draw Characteristics and Comments
function drawCharacteristicsAndComments(doc: PDFKit.PDFDocument, opts: EYReportOptions, startY: number) {
  const startX = 35
  const contentWidth = 525
  const colWidth = (contentWidth - 10) / 2

  // Box 1: Characteristics of Effective Learning
  const col1X = startX
  const col1Y = startY
  doc.rect(col1X, col1Y, colWidth, 14).fill('#db2777')
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff')
     .text('CHARACTERISTICS OF EFFECTIVE LEARNING', col1X + 6, col1Y + 3.5)

  doc.lineWidth(0.75).strokeColor('#f472b6').rect(col1X, col1Y + 14, colWidth, 62).stroke()
  
  const charComments = opts.comments?.classTeacher || 
    'Playing & Exploring: Actively engages in tasks and explores materials with curiosity.\nActive Learning: Demonstrates high focus and motivation.\nCreating & Thinking Critically: Proposes own ideas and strategies.'
  doc.fontSize(6.5).font('Helvetica').fillColor('#0f172a')
     .text(charComments, col1X + 8, col1Y + 19, { width: colWidth - 16, lineGap: 2.5 })

  // Box 2: Attendance & Wellbeing
  const col2X = startX + colWidth + 10
  const col2Y = startY
  doc.rect(col2X, col2Y, colWidth, 14).fill('#db2777')
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff')
     .text('ATTENDANCE & WELLBEING SUMMARY', col2X + 6, col2Y + 3.5)

  doc.lineWidth(0.75).strokeColor('#f472b6').rect(col2X, col2Y + 14, colWidth, 62).stroke()
  
  const attendancePresent = opts.attendance?.present || 0
  const attendanceTotal = opts.attendance?.total || 0
  const attendancePercent = attendanceTotal > 0 ? ((attendancePresent / attendanceTotal) * 100).toFixed(0) : 'N/A'

  doc.fontSize(7).font('Helvetica-Bold').fillColor('#831843').text('Attendance Record:', col2X + 8, col2Y + 19)
  doc.font('Helvetica').fillColor('#0f172a').text(`${attendancePresent} days present out of ${attendanceTotal} (${attendancePercent}%)`, col2X + 90, col2Y + 19)

  doc.font('Helvetica-Bold').fillColor('#831843').text('Primary Language:', col2X + 8, col2Y + 34)
  doc.font('Helvetica').fillColor('#0f172a').text(opts.student.language_at_home || 'English', col2X + 90, col2Y + 34)

  doc.font('Helvetica-Bold').fillColor('#831843').text('Teacher Remarks:', col2X + 8, col2Y + 49)
  doc.font('Helvetica-Oblique').fillColor('#475569')
     .text(opts.comments?.head || 'Displays very positive social development, respects peers, and demonstrates fantastic progress overall.', col2X + 8, col2Y + 59, { width: colWidth - 16 })

  // Box 3: Principal & Head Remarks
  const remY = startY + 84
  doc.rect(startX, remY, contentWidth, 14).fill('#831843')
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff')
     .text('ADMINISTRATIVE REMARKS AND OBSERVATION NOTES', startX + 6, remY + 3.5)

  doc.lineWidth(0.75).strokeColor('#db2777').rect(startX, remY + 14, contentWidth, 38).stroke()
  doc.fontSize(7).font('Helvetica-Oblique').fillColor('#1e293b')
     .text(opts.comments?.principal || 'We are incredibly proud of the growth and development shown this term. The milestones achieved are a testament to the parent-teacher collaboration and the child\'s diligent learning. Keep up the excellent work!', startX + 8, remY + 19, { width: contentWidth - 16, lineGap: 2 })

  // Signatures
  const sigY = remY + 70
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
    doc.lineWidth(0.5).strokeColor('#f472b6')
       .moveTo(sig.x + 8, sigY)
       .lineTo(sig.x + sigColWidth - 8, sigY).stroke()

    // Titles
    doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#831843')
       .text(sig.title, sig.x + 8, sigY + 5, { width: sigColWidth - 16, align: 'center' })
    doc.fontSize(6.5).font('Helvetica-Oblique').fillColor('#64748b')
       .text(sig.name, sig.x + 8, sigY + 14, { width: sigColWidth - 16, align: 'center' })
  })
}

// Main EYFS PDF Generator
export async function generateEarlyYearsReportPdf(optsOrArray: EYReportOptions | EYReportOptions[]): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 30, bottom: 20, left: 35, right: 35 },
    bufferPages: true
  })
  ;(doc as any).options.autoPageBreak = false

  // Create stream collector
  const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', chunk => chunks.push(Buffer.from(chunk)))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  // Load logo files
  const logos = loadLogoBuffers()

  const isArray = Array.isArray(optsOrArray)
  const optsList = isArray ? optsOrArray : [optsOrArray]

  // Loop through options and generate pages
  for (let idx = 0; idx < optsList.length; idx++) {
    const opts = optsList[idx]
    if (idx > 0) {
      doc.addPage()
    }

    // Fetch student photo directly from Supabase storage by student UUID
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
      console.error('Error fetching student photo directly from storage:', e)
    }

    // Draw main report card content on Page 1
    drawHeader(doc, opts, logos)
    await drawStudentInfoSection(doc, opts, photoBuffer)
    const tableEndY = drawLearningAreasTable(doc, opts)
    
    // Calculate dynamic starting Y for lower blocks
    const startYLower = tableEndY + 12
    drawCharacteristicsAndComments(doc, opts, startYLower)

    // Optional page 2: Evidence Photos
    if (opts.evidenceBuffers && opts.evidenceBuffers.length > 0) {
      doc.addPage()
      
      // Draw Header for Evidence page
      drawHeader(doc, opts, logos)

      const startX = 35
      const contentWidth = 525
      const gridStartY = 115

      // Title banner
      doc.rect(startX, gridStartY, contentWidth, 18).fill('#db2777')
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#ffffff')
         .text('OBSERVATION EVIDENCE PHOTO GALLERY', startX + 8, gridStartY + 5)

      // Grid outline
      doc.lineWidth(0.75).strokeColor('#f472b6')
         .rect(startX, gridStartY + 18, contentWidth, 310).stroke()

      const photoW = 140
      const photoH = 115
      const gapX = 20
      const gapY = 25
      const photoStartX = startX + 15
      const photoStartY = gridStartY + 30

      // Render up to 6 evidence photos
      const displayPhotos = opts.evidenceBuffers.slice(0, 6)
      displayPhotos.forEach((item, pIdx) => {
        const row = Math.floor(pIdx / 3)
        const col = pIdx % 3
        const x = photoStartX + col * (photoW + gapX)
        const y = photoStartY + row * (photoH + gapY)

        try {
          doc.image(item.buffer, x, y, { width: photoW, height: photoH })
          doc.lineWidth(1.5).strokeColor('#db2777').rect(x, y, photoW, photoH).stroke()

          // Label
          doc.fontSize(6).font('Helvetica-Bold').fillColor('#831843')
             .text(item.area, x, y + photoH + 4, { width: photoW, align: 'center' })
        } catch (e) {
          console.error(`Error drawing evidence photo ${pIdx}:`, e)
          doc.rect(x, y, photoW, photoH).fill('#f1f5f9')
          doc.lineWidth(0.5).strokeColor('#cbd5e1').rect(x, y, photoW, photoH).stroke()
          doc.fontSize(7).font('Helvetica-Bold').fillColor('#94a3b8')
             .text('[Image Error]', x, y + photoH / 2 - 4, { width: photoW, align: 'center' })
          doc.fontSize(6).font('Helvetica-Bold').fillColor('#831843')
             .text(item.area, x, y + photoH + 4, { width: photoW, align: 'center' })
        }
      })
    }
  }

  // Draw Page Numbers and Footers dynamically
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    
    const oldMarginBottom = doc.page.margins.bottom
    doc.page.margins.bottom = 0
    
    // Footers
    const opts = optsList[i] || optsList[0]
    const genDate = opts.generatedDate || new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
    
    doc.lineWidth(0.5).strokeColor('#cbd5e1').moveTo(35, 802).lineTo(560, 802).stroke()
    
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8')
    doc.text(`Generated: ${genDate} | ${opts.schoolName || 'Leaders International School'}`, 35, 808)
    doc.text('End of EYFS Progress Report', 200, 808, { width: 200, align: 'center' })
    doc.text(`Page ${i + 1} of ${range.count}`, 490, 808, { width: 70, align: 'right' })

    doc.page.margins.bottom = oldMarginBottom
  }

  doc.end()
  return pdfBufferPromise
}
