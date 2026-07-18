import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { parseGradingLevels, getGradeForPercentage } from '@/utils/grading'
import { generateSmartkidzReportPdf, ReportCardOptions, ReportSubjectMark } from '@/lib/reportCardPdf'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const student_id = searchParams.get('student_id')
  const term_id = searchParams.get('term_id')

  if (!student_id || !term_id) {
    return NextResponse.json({ error: 'Missing student_id or term_id' }, { status: 400 })
  }

  const studentIds = student_id.split(',').map(s => s.trim()).filter(Boolean)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (!uuidRegex.test(term_id) || studentIds.some(id => !uuidRegex.test(id))) {
    return NextResponse.json({ error: 'Invalid UUID format for student_id or term_id' }, { status: 400 })
  }

  try {
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

    const isGlobalStaff = userRoles.includes('System Admin') ||
                          userRoles.includes('Principal') ||
                          userRoles.includes('Dean') ||
                          userRoles.includes('HOS') ||
                          userRoles.includes('Head of Section') ||
                          userRoles.includes('Director')

    // 2. Load Term details (global across all students in request)
    const { data: term } = await supabase
      .from('terms')
      .select('*')
      .eq('id', term_id)
      .single()

    if (!term) {
      return NextResponse.json({ error: 'Term record not found' }, { status: 404 })
    }

    const termName = term.term_name || term.name || 'Term 1'
    const academicYear = term.academic_year || '2026-2027'

    // Load grading scale settings
    const { data: systemSettings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'grading_scale')
      .single()
    const gradingLevels = parseGradingLevels(systemSettings?.value)

    // Load exam types from settings
    const { data: examTypesSetting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'exam_types')
      .maybeSingle()
    
    const examTypes = examTypesSetting?.value || [
      { id: 'test_1', name: 'Test 1', weight: 20 },
      { id: 'opener', name: 'Opener', weight: 20 },
      { id: 'terminal', name: 'Terminal', weight: 60 }
    ]

    const pdfOptionsList: ReportCardOptions[] = []

    // 3. Process each student record sequentially
    for (const sId of studentIds) {
      // Verify scope authorization for this specific student
      let isAuthorized = false
      if (isGlobalStaff || user.id === sId) {
        isAuthorized = true
      } else if (userRoles.includes('Teacher')) {
        const { data: studentClassData } = await supabase
          .from('students')
          .select('class_id, grade_level, section')
          .eq('id', sId)
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
        // Parent check
        const { data: rel } = await supabase
          .from('student_parents')
          .select('id')
          .eq('parent_id', user.id)
          .eq('student_id', sId)
          .limit(1)
          .maybeSingle()
        if (rel) isAuthorized = true
      }

      if (!isAuthorized) {
        return NextResponse.json({ error: `Unauthorized Access to Student Record for ID ${sId}` }, { status: 403 })
      }

      // Fetch student data
      const { data: student, error: stdErr } = await supabase
        .from('students')
        .select(`
          id,
          student_id,
          dob,
          gender,
          grade_level,
          section,
          class_id,
          created_at,
          profiles (first_name, last_name, email)
        `)
        .eq('id', sId)
        .single()

      if (stdErr || !student) {
        return NextResponse.json({ error: `Student record not found for ID: ${sId}` }, { status: 404 })
      }

      const studentProfile: any = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles

      // Fetch class info
      let className = student.grade_level || 'Grade 1'
      let classSection = student.section || ''
      let classId = student.class_id

      if (classId) {
        const { data: classData } = await supabase
          .from('classes')
          .select('*')
          .eq('id', classId)
          .single()
        if (classData) {
          className = classData.name || className
          classSection = classData.section || classSection
        }
      }

      // Fetch academic subjects in class
      let subjects: any[] = []
      if (classId) {
        const { data: classSubjs } = await supabase
          .from('class_subjects')
          .select('subjects (id, name, code)')
          .eq('class_id', classId)
        subjects = classSubjs?.map((cs: any) => cs.subjects).filter(Boolean) || []
      }

      // Fetch marks for the current student & term
      const { data: studentMarks } = await supabase
        .from('marks')
        .select('score, remarks, subject_id, assessment_type')
        .eq('student_id', sId)
        .eq('term', termName)

      // Fetch all activity attempts for this student
      const { data: attempts } = await supabase
        .from('activity_attempts')
        .select('percentage, class_activities (subject)')
        .eq('student_id', sId)

      // Assemble subject scores
      const subjectsReport: ReportSubjectMark[] = []
      let totalAverageSum = 0

      subjects.forEach(subj => {
        // Calculate class activity average
        const subjAttempts = (attempts || []).filter((att: any) => {
          const ca = att.class_activities
          const subjName = ca?.subject || ''
          return subjName.toLowerCase() === subj.name.toLowerCase() ||
                 subjName.toLowerCase() === (subj.code || '').toLowerCase()
        })
        const activityAvg = subjAttempts.length > 0
          ? subjAttempts.reduce((sum: number, att: any) => sum + Number(att.percentage || 0), 0) / subjAttempts.length
          : null

        // Calculate dynamic exam scores and weighted average
        const subjMarks = (studentMarks || []).filter(m => m.subject_id === subj.id)
        const examScores: Record<string, number | null> = {}
        let weightedExamSum = 0
        let totalExamWeightUsed = 0
        let lastRemark = ''

        examTypes.forEach((et: any) => {
          const markRecord = subjMarks.find((m: any) => {
            const mType = (m.assessment_type || '').toLowerCase().trim()
            const etName = (et.name || '').toLowerCase().trim()
            const etId = (et.id || '').toLowerCase().trim()
            return mType === etName || mType === etId || mType.includes(etName) || etName.includes(mType)
          })

          const score = markRecord ? Number(markRecord.score) : null
          examScores[et.id] = score

          if (score !== null) {
            weightedExamSum += score * Number(et.weight)
            totalExamWeightUsed += Number(et.weight)
            if (markRecord?.remarks) {
              lastRemark = markRecord.remarks
            }
          }
        })

        const examAvg = totalExamWeightUsed > 0 ? (weightedExamSum / totalExamWeightUsed) : null

        // Combine for overall score
        let overallScore = 0
        if (activityAvg !== null && examAvg !== null) {
          overallScore = (activityAvg + examAvg) / 2
        } else if (activityAvg !== null) {
          overallScore = activityAvg
        } else if (examAvg !== null) {
          overallScore = examAvg
        } else {
          return
        }

        const grade = getGradeForPercentage(overallScore, gradingLevels)

        subjectsReport.push({
          subject_name: subj.name,
          subject_code: subj.code,
          activity_avg: activityAvg !== null ? `${activityAvg.toFixed(0)}%` : '-',
          exam_scores: examScores,
          score: overallScore,
          grade,
          remarks: lastRemark
        })

        totalAverageSum += overallScore
      })

      // Aggregated results
      const totalScore = totalAverageSum
      const averageScore = subjectsReport.length > 0 ? totalAverageSum / subjectsReport.length : 0
      const overallGrade = getGradeForPercentage(averageScore, gradingLevels)

      // Fetch Attendance
      let attendance = undefined
      if (term.start_date && term.end_date) {
        const { data: attRecords } = await supabase
          .from('attendance')
          .select('status')
          .eq('student_id', sId)
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

      // Fetch existing report card record for overrides/comments
      const { data: reportCardRecord } = await supabase
        .from('report_cards')
        .select('*')
        .eq('student_id', sId)
        .eq('term_id', term_id)
        .maybeSingle()

      let conductGrade = reportCardRecord?.conduct_grade || 'A'
      let conductRemark = reportCardRecord?.conduct_remark || 'Excellent conduct shown in all learning fields.'
      let classTeacherComment = reportCardRecord?.class_teacher_comment || 'A hardworking student who shows keen focus in all classes.'
      let principalComment = reportCardRecord?.principal_comment || ''

      // Fetch principal grade comments if empty
      if (!principalComment) {
        const { data: seededComments } = await supabase
          .from('principal_grade_comments')
          .select('comment')
          .eq('grade', overallGrade)

        if (seededComments && seededComments.length > 0) {
          const hash = sId.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0)
          const index = Math.abs(hash) % seededComments.length
          principalComment = seededComments[index].comment
        } else {
          principalComment = 'Commendable progress overall. Keep up the high standard in all subjects.'
        }
      }

      if (reportCardRecord && reportCardRecord.total_sessions && reportCardRecord.total_sessions > 0) {
        attendance = {
          present: reportCardRecord.total_present || 0,
          total: reportCardRecord.total_sessions || 0,
          percentage: Number(reportCardRecord.attendance_percentage) || 0
        }
      }

      // Fetch Staff/Signature Names
      const { data: principalUser } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .or('role.ilike.%Principal%,roles.cs.{"Principal"}')
        .limit(1)
        .maybeSingle()

      const { data: deanUser } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .or('role.ilike.%Dean%,roles.cs.{"Dean"}')
        .limit(1)
        .maybeSingle()

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

      pdfOptionsList.push({
        student: {
          id: sId,
          student_id: student.student_id,
          first_name: studentProfile?.first_name || '',
          last_name: studentProfile?.last_name || '',
          grade_level: student.grade_level,
          section: student.section,
          dob: student.dob,
          gender: student.gender,
          photo_url: `/api/students/photo?student_id=${sId}`,
          admission_date: student.created_at
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
        examTypes,
        subjects: subjectsReport,
        gradingLevels,
        totalScore,
        averageScore,
        overallGrade,
        rank: 0,
        totalStudents: 0,
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
      })
    }

    if (pdfOptionsList.length === 0) {
      return NextResponse.json({ error: 'No report data compiled for the given student selection' }, { status: 400 })
    }

    // Generate Combined PDF Buffer
    const pdfBuffer = await generateSmartkidzReportPdf(pdfOptionsList)

    const isDownload = searchParams.get('download') === 'true'
    const disposition = isDownload ? 'attachment' : 'inline'
    
    const cleanFirstName = studentIds.length === 1 
      ? (pdfOptionsList[0].student.first_name || 'Student').replace(/[^a-zA-Z0-9]/g, '')
      : 'Bulk_Class'
    const cleanTerm = termName.replace(/[^a-zA-Z0-9]/g, '')

    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="ReportCard_${cleanFirstName}_${cleanTerm}.pdf"`
      }
    })
  } catch (error: any) {
    console.error('Download Route Error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
