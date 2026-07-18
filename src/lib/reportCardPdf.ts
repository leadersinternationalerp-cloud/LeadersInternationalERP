import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'
import { GradeLevel } from '@/utils/grading'

export interface ReportSubjectMark {
  subject_name: string
  subject_code?: string
  activity_avg: string
  exam_scores: Record<string, number | null>
  score: number
  grade: string
  remarks: string
}

export interface AssessmentConfig {
  type: string
  weight: number
  is_active?: boolean
  display_order?: number
}

export function computeWeightedOverall(assessments: Record<string, number | null>, configs: AssessmentConfig[]): number {
  if (!assessments || Object.keys(assessments).length === 0) return 0
  const activeConfigs = (configs || []).filter(c => c.is_active !== false)
  const totalWeight = activeConfigs.reduce((sum, c) => sum + Number(c.weight || 0), 0)
  if (totalWeight <= 0) {
    const keys = Object.keys(assessments)
    const sum = keys.reduce((s, k) => s + (Number(assessments[k]) || 0), 0)
    return sum / keys.length
  }
  let weightedSum = 0
  activeConfigs.forEach(c => {
    const key = Object.keys(assessments).find(k => k.toLowerCase() === c.type.toLowerCase())
    const score = key !== undefined ? assessments[key] : null
    if (score !== null && score !== undefined) {
      weightedSum += score * Number(c.weight || 0)
    }
  });
  return weightedSum / totalWeight
}

export interface ReportStudentInfo {
  id: string // Profile ID
  student_id: string // Admission No
  first_name: string
  last_name: string
  grade_level: string
  section?: string
  dob?: string
  gender?: string
  photo_url?: string
  admission_date?: string
}

export interface ReportTermInfo {
  id: string
  term_name: string
  academic_year: string
}

export interface ReportCardOptions {
  student: ReportStudentInfo
  term: ReportTermInfo
  classInfo: {
    class_name: string
    section?: string
  }
  assessmentConfigs?: AssessmentConfig[]
  subjects: ReportSubjectMark[]
  gradingLevels: GradeLevel[]
  totalScore: number
  averageScore: number
  overallGrade: string
  rank: number
  totalStudents: number
  showRank?: boolean
  attendance?: {
    present: number
    total: number
    percentage: number
  }
  conduct?: {
    grade: string
    remark: string
  }
  comments?: {
    classTeacher?: string
    principal?: string
  }
  names?: {
    classTeacher?: string
    dean?: string
    principal?: string
  }
  generatedDate?: string
  schoolName?: string
  schoolMotto?: string
  schoolAddress?: string
}

// Function to fetch image buffer
export async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    if (!url) return null

    if (url.startsWith('data:')) {
      const matches = url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
      if (matches && matches.length === 3) {
        return Buffer.from(matches[2], 'base64')
      }
      return null
    }

    if (url.startsWith('http://') || url.startsWith('https://')) {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5s timeout

      const res = await fetch(url, { signal: controller.signal })
      clearTimeout(timeoutId)

      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer()
        return Buffer.from(arrayBuffer)
      }
    }

    // Try reading as a local file if it's a relative path in public
    const cleanPath = url.split('?')[0] // remove query params
    const localPath = path.join(process.cwd(), 'public', cleanPath.replace(/^\//, ''))
    if (fs.existsSync(localPath)) {
      return fs.readFileSync(localPath)
    }

    return null
  } catch (error) {
    console.error('Error fetching image buffer:', error)
    return null
  }
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

// Color lookup helper based on grade ranges
export function getGradeColorHex(grade: string): string {
  const g = grade.trim().toUpperCase()
  if (g === 'A*' || g === 'A') return '#047857' // Emerald green
  if (g === 'B' || g === 'C') return '#0284c7' // Blue
  if (g === 'D' || g === 'E') return '#d97706' // Amber
  if (g === 'F' || g === 'G') return '#b91c1c' // Red
  return '#1e293b'
}

// Helper to get default remark based on grade
export function getDefaultRemark(grade: string): string {
  const g = grade.trim().toUpperCase()
  if (g === 'A*') return 'Demonstrates outstanding academic performance, exceptional command of the subject, and consistent diligence across all learning areas.'
  if (g === 'A') return 'Shows excellent progress and mastery of concepts. Consistent effort and participation have yielded highly commendable results.'
  if (g === 'B') return 'Very good progress. Displays a strong understanding of most concepts and participates actively in class discussions.'
  if (g === 'C') return 'Satisfactory performance and steady progress. With continued focus and regular practice of core skills, higher achievements are possible.'
  if (g === 'D') return 'Displays a fair understanding of topics but needs to pay closer attention to detail and devote more time to review key concepts.'
  if (g === 'E') return 'Basic understanding is shown. Needs significant improvement in concentration, study habits, and homework completion to progress.'
  if (g === 'F') return 'Weak performance overall. Requires intensive support, regular tutoring, and close parent-teacher coordination to build foundational skills.'
  if (g === 'G') return 'Needs urgent academic improvement. Consistent remedial support, daily practice, and focused study are required to catch up with the class.'
  return 'Shows a satisfactory level of effort and academic performance throughout the term.'
}

// Draw Header
function drawHeader(doc: PDFKit.PDFDocument, opts: ReportCardOptions, logos: { logoBuffer: Buffer | null; cambridgeBuffer: Buffer | null }) {
  const schoolName = opts.schoolName || 'LEADERS INTERNATIONAL SCHOOL'
  const schoolMotto = opts.schoolMotto || 'Nurturing Leaders of Tomorrow'
  const schoolAddress = opts.schoolAddress || 'Zanzibar, Tanzania | Tel +255 777 123 456 | www.leaders.ac.tz'

  const contentWidth = 525.28
  const startX = 35

  // Draw school logo (top-left)
  if (logos.logoBuffer) {
    try {
      doc.image(logos.logoBuffer, startX, 25, { width: 55, height: 55 })
    } catch (e) {
      console.error('Error drawing school logo:', e)
    }
  }

  // Draw Cambridge logo (top-right)
  if (logos.cambridgeBuffer) {
    try {
      doc.image(logos.cambridgeBuffer, startX + contentWidth - 95, 30, { width: 95, height: 45 })
    } catch (e) {
      console.error('Error drawing Cambridge logo:', e)
    }
  }

  // Center header details
  doc.fontSize(16).font('Helvetica-Bold').fillColor('#00264b')
  doc.text(schoolName, startX + 60, 30, { width: contentWidth - 165, align: 'center' })

  doc.fontSize(8.5).font('Helvetica').fillColor('#475569')
  doc.text(schoolAddress, startX + 60, 52, { width: contentWidth - 165, align: 'center' })

  doc.fontSize(8).font('Helvetica-Oblique').fillColor('#0f172a')
  doc.text(schoolMotto, startX + 60, 65, { width: contentWidth - 165, align: 'center' })

  // Double separator line
  doc.lineWidth(1).strokeColor('#00264b').moveTo(startX, 82).lineTo(startX + contentWidth, 82).stroke()
  doc.lineWidth(0.5).strokeColor('#00264b').moveTo(startX, 85).lineTo(startX + contentWidth, 85).stroke()
}

// Draw Student Info
async function drawStudentInfoSection(
  doc: PDFKit.PDFDocument,
  opts: ReportCardOptions,
  photoBuffer: Buffer | null
) {
  const startX = 35
  const startY = 120
  const contentWidth = 525.28
  const infoHeight = 110

  const photoWidth = 85
  const photoHeight = 105
  const photoX = startX + contentWidth - photoWidth - 10
  const photoY = startY + 2.5

  // 1. Draw Section Title
  doc.fontSize(12).font('Helvetica-Bold').fillColor('#00264b')
  doc.text('ACADEMIC PROGRESS REPORT', startX, 93, { align: 'center' })
  doc.fontSize(9).font('Helvetica-Bold').fillColor('#475569')
  doc.text(`${opts.term.term_name.toUpperCase()} - ACADEMIC YEAR ${opts.term.academic_year}`, startX, 107, { align: 'center' })

  // 2. Draw Outlined Student Info Box
  doc.roundedRect(startX, startY, contentWidth, infoHeight, 4).lineWidth(1).strokeColor('#cbd5e1').stroke()

  // 3. Draw "STUDENT INFORMATION" Box Header
  const headerWidth = contentWidth - photoWidth - 15
  doc.rect(startX + 0.5, startY + 0.5, headerWidth, 18).fillColor('#f1f5f9').fill()
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0f172a')
  doc.text('STUDENT INFORMATION', startX + 10, startY + 5)

  // 4. Fill Student Info Fields
  const admDateVal = opts.student.admission_date ? new Date(opts.student.admission_date).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'

  const col1Left = startX + 12
  const col2Left = startX + 225
  const rowStartY = startY + 24
  const rowHeight = 16

  const fields = [
    { label: 'Student Name:', value: `${opts.student.first_name} ${opts.student.last_name}`.toUpperCase(), col: 1, row: 0 },
    { label: 'Admission No:', value: opts.student.student_id, col: 1, row: 1 },
    { label: 'Class / Grade:', value: `${opts.classInfo.class_name} ${opts.classInfo.section || ''}`.toUpperCase(), col: 1, row: 2 },
    { label: 'Academic Year:', value: opts.term.academic_year, col: 1, row: 3 },

    { label: 'Gender:', value: opts.student.gender || 'N/A', col: 2, row: 0 },
    { label: 'Term:', value: opts.term.term_name, col: 2, row: 1 },
    { label: 'Admission Date:', value: admDateVal, col: 2, row: 2 },
  ]

  doc.fillColor('#0f172a')
  fields.forEach(f => {
    const x = f.col === 1 ? col1Left : col2Left
    const y = rowStartY + f.row * rowHeight
    doc.fontSize(8.5).font('Helvetica-Bold').text(f.label, x, y)
    doc.font('Helvetica').text(f.value || 'N/A', x + (f.col === 1 ? 82 : 90), y)
  });

  // 5. Draw Student Passport Box on the far right
  doc.rect(photoX, photoY, photoWidth, photoHeight).lineWidth(0.75).strokeColor('#cbd5e1').stroke()

  if (photoBuffer) {
    try {
      doc.image(photoBuffer, photoX + 1, photoY + 1, { width: photoWidth - 2, height: photoHeight - 2 })
    } catch (e) {
      console.error('Error rendering student photo:', e)
      drawPhotoPlaceholder(doc, photoX, photoY, photoWidth, photoHeight)
    }
  } else {
    drawPhotoPlaceholder(doc, photoX, photoY, photoWidth, photoHeight)
  }

  // Centered student name caption below photo (if height permits, else skip to fit box)
  doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#475569')
  const captionText = `${opts.student.first_name} ${opts.student.last_name}`.toUpperCase()
  doc.text(captionText, photoX - 10, photoY + photoHeight + 1.5, { width: photoWidth + 20, align: 'center' })
}

function drawPhotoPlaceholder(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number) {
  doc.rect(x + 1, y + 1, w - 2, h - 2).fillColor('#f8fafc').fill()
  doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
  doc.text('No Photo', x, y + h / 2 - 4, { width: w, align: 'center' })
}

function computeTableLayout(
  doc: PDFKit.PDFDocument,
  subjects: ReportSubjectMark[],
  subjectW: number,
  remarksW: number,
  availableHeight: number
) {
  let remarksFontSize = 7.5
  let subjectFontSize = 8.0
  let baseHeight = 22
  let padding = 10

  let rowHeights: number[] = []
  let totalHeight = 0

  for (let attempt = 0; attempt < 8; attempt++) {
    rowHeights = []
    totalHeight = 0

    subjects.forEach(subj => {
      const subjName = (subj.subject_name || '').toUpperCase()
      const remarkText = subj.remarks || getDefaultRemark(subj.grade)

      doc.font('Helvetica-Bold').fontSize(subjectFontSize)
      const subjH = doc.heightOfString(subjName, { width: subjectW - 6 })

      doc.font('Helvetica').fontSize(remarksFontSize)
      const remarkH = doc.heightOfString(remarkText, { width: remarksW - 6 })

      const rowH = Math.max(baseHeight, Math.max(subjH, remarkH) + padding)
      rowHeights.push(rowH)
      totalHeight += rowH
    })

    if (totalHeight <= availableHeight) {
      break
    }

    remarksFontSize -= 0.5
    if (remarksFontSize < 5.0) {
      subjectFontSize = Math.max(7.0, subjectFontSize - 0.5)
      padding = Math.max(6, padding - 1)
      baseHeight = Math.max(18, baseHeight - 1)
    }
  }

  return { rowHeights, remarksFontSize, subjectFontSize, baseHeight, padding }
}

// Draw Academic Performance Table
function drawAcademicTable(doc: PDFKit.PDFDocument, opts: ReportCardOptions): number {
  const startX = 35
  const startY = 245
  const contentWidth = 525.28

  // 1. Determine columns to draw
  const activeConfigs = (opts.assessmentConfigs || [])
    .filter(c => c.is_active !== false && c.weight > 0)
    .sort((a, b) => {
      const aIsQuiz = a.type.toUpperCase() === 'QUIZZES'
      const bIsQuiz = b.type.toUpperCase() === 'QUIZZES'
      if (aIsQuiz && !bIsQuiz) return -1
      if (!aIsQuiz && bIsQuiz) return 1
      if ((a.display_order || 0) !== (b.display_order || 0)) {
        return (a.display_order || 0) - (b.display_order || 0)
      }
      return a.type.localeCompare(b.type)
    })

  let columnsToDraw = activeConfigs
  if (columnsToDraw.length === 0) {
    const distinctKeys = new Set<string>()
    opts.subjects.forEach(s => {
      if (s.exam_scores) {
        Object.keys(s.exam_scores).forEach(k => distinctKeys.add(k))
      }
    })
    columnsToDraw = Array.from(distinctKeys).map(k => ({ type: k, weight: 0 }))
  }

  const numExam = columnsToDraw.length

  const colOverallWidth = 48
  const colGradeWidth = 36
  let colSubjectWidth = 110
  let colRemarksWidth = 120

  if (numExam === 0) {
    colSubjectWidth = 140
    colRemarksWidth = contentWidth - colSubjectWidth - colOverallWidth - colGradeWidth
  } else if (numExam <= 2) {
    colSubjectWidth = 110
    colRemarksWidth = 120
  } else if (numExam <= 3) {
    colSubjectWidth = 95
    colRemarksWidth = 110
  } else if (numExam <= 4) {
    colSubjectWidth = 85
    colRemarksWidth = 95
  } else if (numExam <= 5) {
    colSubjectWidth = 75
    colRemarksWidth = 80
  } else {
    colSubjectWidth = 65
    colRemarksWidth = 70
  }

  let fixed = colSubjectWidth + colOverallWidth + colGradeWidth + colRemarksWidth
  let remaining = contentWidth - fixed
  let examColWidth = numExam > 0 ? remaining / numExam : 0

  const minExamW = 38
  const minRemarks = 68

  if (numExam > 0 && examColWidth < minExamW) {
    const deficit = (minExamW - examColWidth) * numExam
    const subjectReduction = Math.min(15, colSubjectWidth - 50)
    colSubjectWidth -= subjectReduction
    let currentDeficit = deficit - subjectReduction

    if (currentDeficit > 0) {
      const remarksReduction = Math.min(20, colRemarksWidth - minRemarks)
      colRemarksWidth -= remarksReduction
      currentDeficit -= remarksReduction
    }

    fixed = colSubjectWidth + colOverallWidth + colGradeWidth + colRemarksWidth
    remaining = contentWidth - fixed
    examColWidth = remaining / numExam

    if (examColWidth < minExamW) {
      examColWidth = Math.max(32, examColWidth)
    }
  }

  const headerHeight = 24
  const summaryHeight = 17
  
  // Calculate maximum allowed height for rows to prevent page overflow
  // Page height is 841.89, margins are 35. Printable area height is 771.89.
  // Table starts at 245. Space occupied below table is ~270pt.
  // 771.89 - (245 - 35) - 270 = ~356. Available table height is ~320.
  // 320 - headerHeight (24) - summaryHeight (17) = ~279pt max height for rows.
  // We reduce this to 260 to provide extra vertical breathing room at the bottom.
  const maxRowsHeight = 260

  const { rowHeights, remarksFontSize, subjectFontSize, padding } = computeTableLayout(
    doc,
    opts.subjects,
    colSubjectWidth,
    colRemarksWidth,
    maxRowsHeight
  )

  // 1. Draw Table Header
  doc.rect(startX, startY, contentWidth, headerHeight).fillColor('#0f172a').fill()
  
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#ffffff')
  doc.text('SUBJECT', startX + 8, startY + 8)

  let currentX = startX + colSubjectWidth
  columnsToDraw.forEach(col => {
    // Dynamic header label (weights NOT displayed)
    const headerLabel = col.type.toUpperCase()
    doc.text(headerLabel, currentX + 2, startY + 8, { width: examColWidth - 4, align: 'center', lineBreak: false })
    currentX += examColWidth
  })

  doc.text('OVERALL', currentX + 4, startY + 8)
  doc.text('GRADE', currentX + colOverallWidth + 2, startY + 8)
  doc.text('REMARKS', currentX + colOverallWidth + colGradeWidth + 8, startY + 8)

  let currentY = startY + headerHeight

  // 2. Draw Table Rows
  opts.subjects.forEach((subj, idx) => {
    const rowH = rowHeights[idx]
    const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
    doc.rect(startX, currentY, contentWidth, rowH).fillColor(bgColor).fill()
    
    // Draw Subject name (bold uppercase, vertically centered)
    doc.fontSize(subjectFontSize).font('Helvetica-Bold').fillColor('#0f172a')
    const subjName = subj.subject_name.toUpperCase()
    const subjH = doc.heightOfString(subjName, { width: colSubjectWidth - 12 })
    doc.text(subjName, startX + 8, currentY + (rowH - subjH) / 2, { width: colSubjectWidth - 12 })
    
    // Draw dynamic exam scores
    let cellX = startX + colSubjectWidth
    columnsToDraw.forEach(col => {
      const key = Object.keys(subj.exam_scores || {}).find(k => k.toLowerCase() === col.type.toLowerCase())
      const scoreVal = key !== undefined ? subj.exam_scores[key] : null
      const scoreText = scoreVal !== null && scoreVal !== undefined ? `${Math.round(scoreVal)}%` : '-'
      const scoreColor = scoreText === '-' ? '#94a3b8' : '#0f172a'
      
      doc.font('Helvetica').fontSize(7.5).fillColor(scoreColor)
      doc.text(scoreText, cellX + 2, currentY + (rowH - 9) / 2, { width: examColWidth - 4, align: 'center' })
      cellX += examColWidth
    })
    
    // Overall cell
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
    doc.text(`${subj.score.toFixed(1)}%`, cellX + 4, currentY + (rowH - 9) / 2, { width: colOverallWidth - 8, align: 'center' })
    
    // Grade cell
    const gradeColor = getGradeColorHex(subj.grade)
    doc.font('Helvetica-Bold').fillColor(gradeColor)
    doc.text(subj.grade, cellX + colOverallWidth + 12, currentY + (rowH - 9) / 2)
    
    // Remarks cell (vertically centered, wrapped, no truncation)
    doc.font('Helvetica').fontSize(remarksFontSize).fillColor('#475569')
    const remark = subj.remarks || getDefaultRemark(subj.grade)
    const remarkH = doc.heightOfString(remark, { width: colRemarksWidth - 16 })
    doc.text(remark, cellX + colOverallWidth + colGradeWidth + 8, currentY + (rowH - remarkH) / 2, { width: colRemarksWidth - 16, lineBreak: true })

    // Border line
    doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(startX, currentY + rowH).lineTo(startX + contentWidth, currentY + rowH).stroke()
    
    currentY += rowH
  })

  // 3. Draw Summary Row
  doc.rect(startX, currentY, contentWidth, summaryHeight).fillColor('#f0f9ff').fill()

  // Display aggregated summaries
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#0369a1')
  doc.text('SUMMARY', startX + 8, currentY + 4)

  let summaryText = `TOTAL SCORE: ${opts.totalScore.toFixed(0)}  |  AVERAGE: ${opts.averageScore.toFixed(1)}%  |  OVERALL GRADE: ${opts.overallGrade}`
  if (opts.showRank && opts.rank > 0) {
    summaryText += `  |  RANK: ${opts.rank} of ${opts.totalStudents}`
  }
  
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0369a1')
  doc.text(summaryText, startX + colSubjectWidth + 15, currentY + 4, { width: contentWidth - colSubjectWidth - 20 })

  // Outer boundary line
  doc.lineWidth(1).strokeColor('#cbd5e1')
     .moveTo(startX, startY).lineTo(startX + contentWidth, startY)
     .lineTo(startX + contentWidth, currentY + summaryHeight)
     .lineTo(startX, currentY + summaryHeight)
     .lineTo(startX, startY).stroke()

  return currentY + summaryHeight
}

// Draw Grading & Attendance Blocks
function drawGradingAndAttendance(doc: PDFKit.PDFDocument, opts: ReportCardOptions, startY: number) {
  const startX = 35
  const contentWidth = 525.28
  const boxWidth = (contentWidth - 12) / 2 // 256.64
  const boxHeight = 80

  // 1. Draw GRADING SCALE (CAMBRIDGE) Box (Left)
  doc.roundedRect(startX, startY, boxWidth, boxHeight, 4).lineWidth(1).strokeColor('#cbd5e1').stroke()
  doc.rect(startX + 0.5, startY + 0.5, boxWidth - 1, 15).fillColor('#f8fafc').fill()
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
  doc.text('GRADING SCALE (CAMBRIDGE)', startX + 8, startY + 4)

  // Grading Details
  const colW = (boxWidth - 16) / 2
  const leftColX = startX + 8
  const rightColX = startX + 8 + colW
  const scaleStartY = startY + 20
  const scaleLineH = 15

  const gradingScaleCol1 = [
    { text: 'A* (90 - 100%)', desc: 'Outstanding' },
    { text: 'A  (80 - 89%)', desc: 'Excellent' },
    { text: 'B  (70 - 79%)', desc: 'Very Good' },
    { text: 'C  (60 - 69%)', desc: 'Good' },
  ]
  const gradingScaleCol2 = [
    { text: 'D  (50 - 59%)', desc: 'Satisfactory' },
    { text: 'E  (40 - 49%)', desc: 'Fair' },
    { text: 'F  (30 - 39%)', desc: 'Weak' },
    { text: 'G  (0 - 29%)', desc: 'Needs Improvement' },
  ]

  doc.fontSize(7.5).fillColor('#334155')
  gradingScaleCol1.forEach((item, idx) => {
    const y = scaleStartY + idx * scaleLineH
    doc.font('Helvetica-Bold').text(item.text, leftColX, y)
    doc.font('Helvetica').text(` - ${item.desc}`, leftColX + 68, y)
  })

  gradingScaleCol2.forEach((item, idx) => {
    const y = scaleStartY + idx * scaleLineH
    doc.font('Helvetica-Bold').text(item.text, rightColX, y)
    doc.font('Helvetica').text(` - ${item.desc}`, rightColX + 68, y)
  })

  // 2. Draw ATTENDANCE & CONDUCT Box (Right)
  const rightBoxX = startX + boxWidth + 12
  doc.roundedRect(rightBoxX, startY, boxWidth, boxHeight, 4).lineWidth(1).strokeColor('#cbd5e1').stroke()
  doc.rect(rightBoxX + 0.5, startY + 0.5, boxWidth - 1, 15).fillColor('#f8fafc').fill()
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
  doc.text('ATTENDANCE & CONDUCT', rightBoxX + 8, startY + 4)

  const attStartY = startY + 22
  const attLineH = 15

  const attendancePresent = opts.attendance?.present ?? 0
  const attendanceTotal = opts.attendance?.total ?? 0
  const attendancePct = opts.attendance?.percentage ?? 0
  const attendanceStr = attendanceTotal > 0 
    ? `${attendancePresent} of ${attendanceTotal} Sessions (${attendancePct.toFixed(1)}%)`
    : 'N/A'

  const conductGrade = opts.conduct?.grade || 'B'
  const conductRemark = opts.conduct?.remark || 'Very Good'
  const classTeacherComment = opts.comments?.classTeacher || 'Demonstrates solid progress and active participation in class activities.'

  doc.fontSize(8).fillColor('#0f172a')
  
  doc.font('Helvetica-Bold').text('School Attendance:', rightBoxX + 8, attStartY)
  doc.font('Helvetica').text(attendanceStr, rightBoxX + 100, attStartY)

  doc.font('Helvetica-Bold').text('Conduct Grade:', rightBoxX + 8, attStartY + attLineH)
  doc.font('Helvetica').text(`${conductGrade} - ${conductRemark}`, rightBoxX + 100, attStartY + attLineH)

  doc.font('Helvetica-Bold').text('Teacher Comment:', rightBoxX + 8, attStartY + attLineH * 2)
  doc.font('Helvetica').fontSize(7.5).text(classTeacherComment, rightBoxX + 8, attStartY + attLineH * 3, { width: boxWidth - 16, height: 26, lineBreak: true })
}

// Draw Comments & Signatures Section
function drawCommentsAndSignatures(doc: PDFKit.PDFDocument, opts: ReportCardOptions, startY: number) {
  const startX = 35
  const contentWidth = 525.28

  // 1. Draw Principal Remarks Box
  const principalBoxHeight = 42
  doc.roundedRect(startX, startY, contentWidth, principalBoxHeight, 4).lineWidth(1).strokeColor('#cbd5e1').stroke()
  doc.rect(startX + 0.5, startY + 0.5, contentWidth - 1, 15).fillColor('#f8fafc').fill()
  
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
  doc.text('PRINCIPAL REMARKS', startX + 8, startY + 4)

  const principalComment = opts.comments?.principal || 'Commendable progress overall. Keep up the high standard in all subjects.'
  doc.fontSize(8).font('Helvetica').fillColor('#334155')
  doc.text(principalComment, startX + 8, startY + 18, { width: contentWidth - 16 })

  // 2. Draw Signatures Layout
  const sigStartY = startY + principalBoxHeight + 25
  const sigColWidth = contentWidth / 4

  const classTeacherName = opts.names?.classTeacher || 'Class Teacher'
  const deanName = opts.names?.dean || 'Dean of Studies'
  const principalName = opts.names?.principal || 'Principal'

  const signatures = [
    { title: 'Class Teacher', name: classTeacherName, x: startX },
    { title: 'Dean of Studies', name: deanName, x: startX + sigColWidth },
    { title: 'Principal', name: principalName, x: startX + sigColWidth * 2 },
    { title: 'Parent/Guardian', name: 'Signature', x: startX + sigColWidth * 3 },
  ]

  signatures.forEach(sig => {
    // Signature Line
    doc.lineWidth(0.75).strokeColor('#64748b')
       .moveTo(sig.x + 8, sigStartY)
       .lineTo(sig.x + sigColWidth - 8, sigStartY).stroke()

    // Title & Name
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#0f172a')
       .text(sig.title, sig.x + 8, sigStartY + 6, { width: sigColWidth - 16, align: 'center' })
    doc.fontSize(7.5).font('Helvetica-Oblique').fillColor('#475569')
       .text(sig.name, sig.x + 8, sigStartY + 16, { width: sigColWidth - 16, align: 'center' })
  })
}

// Main PDF Generator
export async function generateSmartkidzReportPdf(optsOrArray: ReportCardOptions | ReportCardOptions[]): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 35, bottom: 35, left: 35, right: 35 },
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

    // Draw Page Content (must fit strictly in 1 A4 page)
    drawHeader(doc, opts, logos)
    await drawStudentInfoSection(doc, opts, photoBuffer)
    const finalTableY = drawAcademicTable(doc, opts)
    
    // Calculate dynamic starting Y for lower blocks to prevent overlaps
    const startYGrading = finalTableY + 12
    drawGradingAndAttendance(doc, opts, startYGrading)

    const startYComments = startYGrading + 90 + 10 // boxHeight (90) + gap (10)
    drawCommentsAndSignatures(doc, opts, startYComments)
  }

  // 3. Draw Footer on all pages
  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    
    const opts = optsList[i] || optsList[0]
    const genDate = opts.generatedDate || new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' })
    
    // Draw footer background/divider line
    doc.lineWidth(0.5).strokeColor('#cbd5e1').moveTo(35, 802).lineTo(560, 802).stroke()
    
    doc.fontSize(7.5).font('Helvetica').fillColor('#94a3b8')
    doc.text(`Generated: ${genDate} | ${opts.schoolName || 'Leaders International School'}`, 35, 808)
    doc.text('End of Report', 260, 808, { width: 80, align: 'center' })
    doc.text('Page 1 of 1', 490, 808, { width: 70, align: 'right' })
  }

  // Finalize PDF
  doc.end()

  return pdfBufferPromise
}
