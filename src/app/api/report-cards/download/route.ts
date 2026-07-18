import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { parseGradingLevels, getGradeForPercentage } from '@/utils/grading'
import { generateSmartkidzReportPdf, ReportCardOptions, ReportSubjectMark, computeWeightedOverall } from '@/lib/reportCardPdf'

async function computeClassStudentRanks(
  supabase: any,
  classId: string,
  termName: string,
  assessmentConfigs: any[],
  subjects: any[]
) {
  const { data: classStudents } = await supabase
    .from('students')
    .select('id')
    .eq('class_id', classId)
  
  const studentIds = classStudents?.map((s: any) => s.id) || []
  if (studentIds.length === 0) return {}

  // Fetch all marks for the class
  const { data: allMarks } = await supabase
    .from('marks')
    .select('student_id, subject_id, score, assessment_type')
    .in('student_id', studentIds)
    .eq('term', termName)

  // Fetch all activity attempts for the class
  const { data: allAttempts } = await supabase
    .from('activity_attempts')
    .select('student_id, percentage, class_activities (subject, activity_type, max_attempts)')
    .in('student_id', studentIds)

  const studentAverages: { studentId: string; averageScore: number }[] = []

  for (const sId of studentIds) {
    const sMarks = (allMarks || []).filter((m: any) => m.student_id === sId)
    const sAttempts = (allAttempts || []).filter((a: any) => a.student_id === sId)

    let totalAvgSum = 0
    let subjectCount = 0

    subjects.forEach((subj: any) => {
      // Quizzes avg
      const quizAttempts = sAttempts.filter((att: any) => {
        const ca = att.class_activities
        const subjName = ca?.subject || ''
        const matchesSubj = subjName.toLowerCase() === subj.name.toLowerCase() ||
                            subjName.toLowerCase() === (subj.code || '').toLowerCase()
        return matchesSubj && ca?.activity_type === 'quiz' && ca?.max_attempts === 1
      })
      const quizzesAvg = quizAttempts.length > 0
        ? quizAttempts.reduce((sum: number, att: any) => sum + Number(att.percentage || 0), 0) / quizAttempts.length
        : null

      // CA avg
      const caAttempts = sAttempts.filter((att: any) => {
        const ca = att.class_activities
        const subjName = ca?.subject || ''
        const matchesSubj = subjName.toLowerCase() === subj.name.toLowerCase() ||
                            subjName.toLowerCase() === (subj.code || '').toLowerCase()
        return matchesSubj && ca?.activity_type !== 'quiz'
      })
      const activityAvg = caAttempts.length > 0
        ? caAttempts.reduce((sum: number, att: any) => sum + Number(att.percentage || 0), 0) / caAttempts.length
        : null

      // Find other marks
      const subjMarks = sMarks.filter((m: any) => m.subject_id === subj.id)
      
      const examScores: Record<string, number | null> = {}
      let hasAnyScore = false

      assessmentConfigs.forEach((et: any) => {
        if (et.type.toUpperCase() === 'QUIZZES') {
          examScores[et.type] = quizzesAvg
          if (quizzesAvg !== null) hasAnyScore = true
        } else if (et.type.toUpperCase() === 'CA') {
          examScores[et.type] = activityAvg
          if (activityAvg !== null) hasAnyScore = true
        } else {
          const markRecord = subjMarks.find((m: any) => {
            const mType = (m.assessment_type || '').toLowerCase().trim()
            const etName = (et.type || '').toLowerCase().trim()
            return mType === etName || mType.includes(etName) || etName.includes(mType)
          })
          const score = markRecord ? Number(markRecord.score) : null
          examScores[et.type] = score
          if (score !== null) hasAnyScore = true
        }
      })

      if (hasAnyScore) {
        const overallScore = computeWeightedOverall(examScores, assessmentConfigs)
        totalAvgSum += overallScore
        subjectCount++
      }
    })

    const averageScore = subjectCount > 0 ? totalAvgSum / subjectCount : 0
    studentAverages.push({ studentId: sId, averageScore })
  }

  // Sort descending
  studentAverages.sort((a, b) => b.averageScore - a.averageScore)

  const ranks: Record<string, { rank: number; total: number }> = {}
  studentAverages.forEach((item, idx) => {
    ranks[item.studentId] = {
      rank: idx + 1,
      total: studentAverages.length
    }
  })

  return ranks
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const student_id = searchParams.get('student_id')
  const term_id = searchParams.get('term_id')
  const showRank = searchParams.get('show_rank') === 'true'

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

    // Fetch active assessment weights from table
    const { data: dbWeights } = await supabase
      .from('assessment_weights')
      .select('assessment_type, weight, is_active, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    let assessmentConfigs: any[] = []
    if (dbWeights && dbWeights.length > 0) {
      assessmentConfigs = dbWeights.map(w => ({
        type: w.assessment_type,
        weight: Number(w.weight),
        is_active: w.is_active,
        display_order: w.display_order
      }))
    } else {
      const { data: sysSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'assessment_weights')
        .maybeSingle()

      if (sysSetting?.value && Array.isArray(sysSetting.value)) {
        assessmentConfigs = sysSetting.value
          .filter((w: any) => w.is_active !== false)
          .map((w: any) => ({
            type: w.type || w.assessment_type,
            weight: Number(w.weight),
            is_active: w.is_active,
            display_order: w.display_order
          }))
      } else {
        // Fallback default seed
        assessmentConfigs = [
          { type: 'QUIZZES', weight: 20, is_active: true, display_order: 0 },
          { type: 'Test 1', weight: 20, is_active: true, display_order: 1 },
          { type: 'Test 2', weight: 20, is_active: true, display_order: 2 },
          { type: 'Mid-Term', weight: 20, is_active: true, display_order: 3 },
          { type: 'Terminal', weight: 40, is_active: true, display_order: 4 }
        ]
      }
    }

    const pdfOptionsList: ReportCardOptions[] = []
    let computedRanks: Record<string, { rank: number; total: number }> | null = null

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
        .select('percentage, class_activities (subject, activity_type, max_attempts)')
        .eq('student_id', sId)

      // Assemble subject scores
      const subjectsReport: ReportSubjectMark[] = []
      let totalAverageSum = 0

      subjects.forEach(subj => {
        // Calculate quizzes average (activity_type === 'quiz' and max_attempts === 1)
        const quizAttempts = (attempts || []).filter((att: any) => {
          const ca = att.class_activities
          const subjName = ca?.subject || ''
          const matchesSubj = subjName.toLowerCase() === subj.name.toLowerCase() ||
                              subjName.toLowerCase() === (subj.code || '').toLowerCase()
          return matchesSubj && ca?.activity_type === 'quiz' && ca?.max_attempts === 1
        })
        const quizzesAvg = quizAttempts.length > 0
          ? quizAttempts.reduce((sum: number, att: any) => sum + Number(att.percentage || 0), 0) / quizAttempts.length
          : null

        // Calculate class activity average (activity_type !== 'quiz')
        const caAttempts = (attempts || []).filter((att: any) => {
          const ca = att.class_activities
          const subjName = ca?.subject || ''
          const matchesSubj = subjName.toLowerCase() === subj.name.toLowerCase() ||
                              subjName.toLowerCase() === (subj.code || '').toLowerCase()
          return matchesSubj && ca?.activity_type !== 'quiz'
        })
        const activityAvg = caAttempts.length > 0
          ? caAttempts.reduce((sum: number, att: any) => sum + Number(att.percentage || 0), 0) / caAttempts.length
          : null

        // Calculate dynamic exam scores and weighted average
        const subjMarks = (studentMarks || []).filter(m => m.subject_id === subj.id)
        const examScores: Record<string, number | null> = {}
        let lastRemark = ''

        assessmentConfigs.forEach((et: any) => {
          if (et.type.toUpperCase() === 'QUIZZES') {
            examScores[et.type] = quizzesAvg
          } else if (et.type.toUpperCase() === 'CA') {
            examScores[et.type] = activityAvg
          } else {
            const markRecord = subjMarks.find((m: any) => {
              const mType = (m.assessment_type || '').toLowerCase().trim()
              const etName = (et.type || '').toLowerCase().trim()
              return mType === etName || mType.includes(etName) || etName.includes(mType)
            })

            const score = markRecord ? Number(markRecord.score) : null
            examScores[et.type] = score

            if (markRecord?.remarks) {
              lastRemark = markRecord.remarks
            }
          }
        })

        const overallScore = computeWeightedOverall(examScores, assessmentConfigs)
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

      let rank = 0
      let totalStudents = 0

      if (showRank && classId) {
        if (!computedRanks) {
          computedRanks = await computeClassStudentRanks(supabase, classId, termName, assessmentConfigs, subjects)
        }
        const rankInfo = computedRanks[sId]
        if (rankInfo) {
          rank = rankInfo.rank
          totalStudents = rankInfo.total
        }
      }

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
        assessmentConfigs,
        subjects: subjectsReport,
        gradingLevels,
        totalScore,
        averageScore,
        overallGrade,
        rank,
        totalStudents,
        showRank,
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
