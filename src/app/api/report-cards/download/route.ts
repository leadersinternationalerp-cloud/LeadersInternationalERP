import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { parseGradingLevels, getGradeForPercentage } from '@/utils/grading'
import { generateSmartkidzReportPdf, ReportCardOptions, ReportSubjectMark } from '@/lib/reportCardPdf'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const student_id = searchParams.get('student_id')
  const term_id = searchParams.get('term_id')

  if (!student_id || !term_id) {
    return NextResponse.json({ error: 'Missing student_id or term_id' }, { status: 400 })
  }

  const supabase = await createClient()

  // 1. Verify Authentication & Role Access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: prof } = await supabase.from('profiles').select('roles, role').eq('id', user.id).single()
  const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
    ? prof.roles
    : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

  let isAuthorized = false
  if (user.id === student_id) {
    isAuthorized = true
  } else if (
    userRoles.includes('System Admin') ||
    userRoles.includes('Principal') ||
    userRoles.includes('Dean') ||
    userRoles.includes('HOS') ||
    userRoles.includes('Head of Section')
  ) {
    isAuthorized = true
  } else if (userRoles.includes('Teacher')) {
    // If Teacher, verify teacher teaches the student's class
    const { data: studentClassData } = await supabase
      .from('students')
      .select('class_id, grade_level, section')
      .eq('id', student_id)
      .single()

    if (studentClassData) {
      if (studentClassData.class_id) {
        const { data: assignment } = await supabase
          .from('class_subjects')
          .select('id')
          .eq('class_id', studentClassData.class_id)
          .eq('teacher_id', user.id)
          .limit(1)
          .maybeSingle()
        if (assignment) isAuthorized = true
      } else {
        // Fallback check by grade_level and section match in classes table
        const { data: fallbackClass } = await supabase
          .from('classes')
          .select('id')
          .eq('name', studentClassData.grade_level)
          .eq('section', studentClassData.section || null)
          .maybeSingle()
        if (fallbackClass) {
          const { data: assignment } = await supabase
            .from('class_subjects')
            .select('id')
            .eq('class_id', fallbackClass.id)
            .eq('teacher_id', user.id)
            .limit(1)
            .maybeSingle()
          if (assignment) isAuthorized = true
        }
      }
    }
  } else {
    // Check parent relationship
    const { data: rel } = await supabase
      .from('student_parents')
      .select('id')
      .eq('parent_id', user.id)
      .eq('student_id', student_id)
      .limit(1)
      .maybeSingle()
    if (rel) isAuthorized = true
  }

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized Access to Student Record' }, { status: 403 })
  }

  // 2. Fetch Basic Student, Profiles & Class info
  const { data: student } = await supabase
    .from('students')
    .select(`
      id,
      student_id,
      photo_url,
      admission_date,
      dob,
      gender,
      grade_level,
      section,
      class_id,
      profiles:id (first_name, last_name, email)
    `)
    .eq('id', student_id)
    .single()

  if (!student) {
    return NextResponse.json({ error: 'Student record not found' }, { status: 404 })
  }

  const { data: term } = await supabase
    .from('terms')
    .select('*')
    .eq('id', term_id)
    .single()

  if (!term) {
    return NextResponse.json({ error: 'Term record not found' }, { status: 404 })
  }

  const studentProfile: any = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles
  const termName = term.term_name || term.name || 'Term 1'
  const academicYear = term.academic_year || '2026-2027'

  // Fetch student class details
  let className = student.grade_level || 'Grade 1'
  let classSection = student.section || ''
  let classId = student.class_id

  if (classId) {
    const { data: classData } = await supabase
      .from('classes')
      .select('class_name, section')
      .eq('id', classId)
      .single()
    if (classData) {
      className = classData.class_name || className
      classSection = classData.section || classSection
    }
  } else {
    // Attempt fallback to find class_id
    const { data: classData } = await supabase
      .from('classes')
      .select('id, class_name, section')
      .eq('name', student.grade_level)
      .eq('section', student.section || null)
      .maybeSingle()
    if (classData) {
      classId = classData.id
      className = classData.class_name || className
      classSection = classData.section || classSection
    }
  }

  // 3. Fetch Marks and group by subject
  const { data: marksRecords } = await supabase
    .from('marks')
    .select(`
      score,
      remarks,
      assessment_type,
      subject:subject_id (id, name, code)
    `)
    .eq('student_id', student_id)
    .eq('term', termName)

  // Fetch grading scale from system_settings
  const { data: settingData } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'grading_scale')
    .maybeSingle()

  const gradingLevels = parseGradingLevels(settingData?.value)

  // Map subjects by subject_id
  const subjectsMap = new Map<string, {
    name: string
    code?: string
    scores: number[]
    remarks: string[]
  }>()

  if (marksRecords && marksRecords.length > 0) {
    marksRecords.forEach((m: any) => {
      const subject: any = Array.isArray(m.subject) ? m.subject[0] : m.subject
      if (!subject) return

      const subjId = subject.id
      if (!subjectsMap.has(subjId)) {
        subjectsMap.set(subjId, {
          name: subject.name,
          code: subject.code || subject.subject_code,
          scores: [],
          remarks: []
        })
      }

      const entry = subjectsMap.get(subjId)!
      entry.scores.push(Number(m.score))
      if (m.remarks && m.remarks.trim()) {
        entry.remarks.push(m.remarks.trim())
      }
    })
  }

  // Calculate averages per subject
  const subjectsReport: ReportSubjectMark[] = []
  let totalAverageSum = 0

  subjectsMap.forEach((entry) => {
    const scoresCount = entry.scores.length
    const avgScore = scoresCount > 0 ? entry.scores.reduce((a, b) => a + b, 0) / scoresCount : 0
    const grade = getGradeForPercentage(avgScore, gradingLevels)
    const lastRemark = entry.remarks.length > 0 ? entry.remarks[entry.remarks.length - 1] : ''

    subjectsReport.push({
      subject_name: entry.name,
      subject_code: entry.code,
      score: avgScore,
      grade,
      remarks: lastRemark
    })

    totalAverageSum += avgScore
  })

  // Aggregated results
  const totalScore = totalAverageSum
  const averageScore = subjectsReport.length > 0 ? totalAverageSum / subjectsReport.length : 0
  const overallGrade = getGradeForPercentage(averageScore, gradingLevels)

  // 4. Compute Student Rank in the class
  let classRank = 1
  let totalClassStudents = 1

  if (classId) {
    // Get all students in the same class
    const { data: classStudents } = await supabase
      .from('students')
      .select('id')
      .eq('class_id', classId)

    if (classStudents && classStudents.length > 0) {
      totalClassStudents = classStudents.length
      const classStudentIds = classStudents.map(s => s.id)

      // Fetch all marks for these students
      const { data: classMarks } = await supabase
        .from('marks')
        .select('student_id, score, subject_id')
        .in('student_id', classStudentIds)
        .eq('term', termName)

      // Calculate averages for each class student
      const studentTermAverages: { student_id: string, avg: number }[] = []
      
      classStudentIds.forEach(cStudentId => {
        const studentMarks = (classMarks || []).filter(m => m.student_id === cStudentId)
        
        // Group by subject for this student
        const studentSubjScores = new Map<string, number[]>()
        studentMarks.forEach(m => {
          const sId = m.subject_id
          if (!studentSubjScores.has(sId)) {
            studentSubjScores.set(sId, [])
          }
          studentSubjScores.get(sId)!.push(Number(m.score))
        })

        let subjAverageSum = 0
        studentSubjScores.forEach(scores => {
          subjAverageSum += scores.reduce((a, b) => a + b, 0) / scores.length
        })

        const studentAvg = studentSubjScores.size > 0 ? subjAverageSum / studentSubjScores.size : 0
        studentTermAverages.push({ student_id: cStudentId, avg: studentAvg })
      })

      // Sort and find rank
      studentTermAverages.sort((a, b) => b.avg - a.avg)
      const rankIndex = studentTermAverages.findIndex(x => x.student_id === student_id)
      classRank = rankIndex !== -1 ? rankIndex + 1 : 1
    }
  }

  // 5. Fetch Attendance from attendance table
  let attendance = undefined
  if (term.start_date && term.end_date) {
    const { data: attRecords } = await supabase
      .from('attendance')
      .select('status')
      .eq('student_id', student_id)
      .gte('date', term.start_date)
      .lte('date', term.end_date)

    if (attRecords && attRecords.length > 0) {
      const presentCount = attRecords.filter((a: any) => a.status === 'Present' || a.status === 'Late').length
      const totalCount = attRecords.length
      attendance = {
        present: presentCount,
        total: totalCount,
        percentage: totalCount > 0 ? (presentCount / totalCount) * 100 : 0
      }
    }
  }

  // 6. Fetch principal comments & comments from report_cards table
  const { data: reportCardRecord } = await supabase
    .from('report_cards')
    .select('*')
    .eq('student_id', student_id)
    .eq('term_id', term_id)
    .limit(1)
    .maybeSingle()

  // Use values from report_cards table if present, else fallback
  const conductGrade = reportCardRecord?.conduct_grade || 'B'
  const conductRemark = conductGrade === 'A' ? 'Excellent' : conductGrade === 'B' ? 'Very Good' : conductGrade === 'C' ? 'Good' : conductGrade === 'D' ? 'Satisfactory' : 'Needs Improvement'

  const classTeacherComment = reportCardRecord?.class_teacher_comment || 'Demonstrates solid progress and active participation in class activities.'
  
  // Principal comment fallback (Seeded 20 comments per grade)
  let principalComment = reportCardRecord?.principal_comments || ''
  if (!principalComment) {
    const { data: seededComments } = await supabase
      .from('principal_grade_comments')
      .select('comment')
      .eq('grade', overallGrade)

    if (seededComments && seededComments.length > 0) {
      // Deterministic choice based on student UUID hash
      const hash = student_id.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      const index = Math.abs(hash) % seededComments.length
      principalComment = seededComments[index].comment
    } else {
      principalComment = 'Commendable progress overall. Keep up the high standard in all subjects.'
    }
  }

  // Overwrite values if report card specifies attendance overrides
  if (reportCardRecord && reportCardRecord.total_sessions && reportCardRecord.total_sessions > 0) {
    attendance = {
      present: reportCardRecord.total_present || 0,
      total: reportCardRecord.total_sessions || 0,
      percentage: Number(reportCardRecord.attendance_percentage) || 0
    }
  }

  // 7. Fetch Staff/Signature Names
  // Principal name
  const { data: principalUser } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .or('role.ilike.%Principal%,roles.cs.{"Principal"}')
    .limit(1)
    .maybeSingle()

  // Dean name
  const { data: deanUser } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .or('role.ilike.%Dean%,roles.cs.{"Dean"}')
    .limit(1)
    .maybeSingle()

  // Class teacher
  let classTeacherName = 'Class Teacher'
  if (classId) {
    const { data: classSubj } = await supabase
      .from('class_subjects')
      .select('teacher:teacher_id(first_name, last_name)')
      .eq('class_id', classId)
      .limit(1)
      .maybeSingle()
    if (classSubj?.teacher) {
      const tProf: any = classSubj.teacher
      classTeacherName = `${tProf.first_name || ''} ${tProf.last_name || ''}`.trim()
    }
  }

  const pName = principalUser ? `${principalUser.first_name || ''} ${principalUser.last_name || ''}`.trim() : 'Principal'
  const dName = deanUser ? `${deanUser.first_name || ''} ${deanUser.last_name || ''}`.trim() : 'Dean of Studies'

  // Generate A4 Report Card PDF
  const pdfOptions: ReportCardOptions = {
    student: {
      id: student_id,
      student_id: student.student_id,
      first_name: studentProfile?.first_name || '',
      last_name: studentProfile?.last_name || '',
      grade_level: student.grade_level,
      section: student.section,
      dob: student.dob,
      gender: student.gender,
      photo_url: student.photo_url,
      admission_date: student.admission_date
    },
    term: {
      id: term_id,
      term_name: termName,
      academic_year: academicYear
    },
    classInfo: {
      class_name: className,
      section: classSection
    },
    subjects: subjectsReport,
    gradingLevels,
    totalScore,
    averageScore,
    overallGrade,
    rank: classRank,
    totalStudents: totalClassStudents,
    attendance,
    conduct: {
      grade: conductGrade,
      remark: conductRemark
    },
    comments: {
      classTeacher: classTeacherComment,
      principal: principalComment
    },
    names: {
      classTeacher: classTeacherName,
      dean: dName,
      principal: pName
    }
  }

  const pdfBuffer = await generateSmartkidzReportPdf(pdfOptions)

  const cleanFirstName = (studentProfile?.first_name || 'Student').replace(/[^a-zA-Z0-9]/g, '')
  const cleanTerm = termName.replace(/[^a-zA-Z0-9]/g, '')

  return new NextResponse(pdfBuffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="ReportCard_${cleanFirstName}_${cleanTerm}.pdf"`
    }
  })
}
