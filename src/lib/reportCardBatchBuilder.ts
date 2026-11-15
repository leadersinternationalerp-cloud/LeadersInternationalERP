import {
  getCachedAssessmentWeights,
  getCachedGradingScale,
} from '@/lib/cache/referenceData'
import {
  computeWeightedOverall,
  generateSmartkidzReportPdf,
  type ReportCardOptions,
  type ReportSubjectMark,
} from '@/lib/reportCardPdf'
import {
  getGradeForPercentage,
  parseGradingLevels,
  parseMarkScore,
} from '@/utils/grading'

export interface BatchReportBuildInput {
  supabase: any
  studentIds: string[]
  termId: string
  showRank?: boolean
  assessmentsParam?: string | null
  onProgress?: (processed: number, total: number) => Promise<void> | void
}

export async function buildReportCardOptionsBatch({
  supabase,
  studentIds,
  termId,
  showRank = false,
  assessmentsParam = null,
  onProgress,
}: BatchReportBuildInput): Promise<{
  pdfOptionsList: ReportCardOptions[]
  termName: string
  academicYear: string
}> {
  // 1. Load term and cached reference configurations in parallel
  const [{ data: term }, gradingScaleRaw, dbWeights] = await Promise.all([
    supabase.from('terms').select('*').eq('id', termId).single(),
    getCachedGradingScale(),
    getCachedAssessmentWeights(),
  ])

  if (!term) {
    throw new Error('Term record not found')
  }

  const termName = term.term_name || term.name || 'Term 1'
  const academicYear = term.academic_year || '2026-2027'
  const gradingLevels = parseGradingLevels(gradingScaleRaw)

  let allAssessmentConfigs: any[] = (dbWeights || []).map((w: any) => ({
    type: w.assessment_type,
    weight: Number(w.weight),
    is_active: w.is_active !== false,
    display_order: w.display_order,
  }))

  if (allAssessmentConfigs.length === 0) {
    allAssessmentConfigs = [
      { type: 'QUIZZES', weight: 20, is_active: true, display_order: 0 },
      { type: 'Test 1', weight: 20, is_active: true, display_order: 1 },
      { type: 'Test 2', weight: 20, is_active: true, display_order: 2 },
      { type: 'Mid-Term', weight: 20, is_active: true, display_order: 3 },
      { type: 'Terminal', weight: 40, is_active: true, display_order: 4 },
    ]
  }

  let assessmentConfigs: any[] = []
  if (assessmentsParam && assessmentsParam.trim().length > 0) {
    const selectedTypes = assessmentsParam
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    selectedTypes.forEach((selType, idx) => {
      const match = allAssessmentConfigs.find(
        (c) => c.type.toLowerCase().trim() === selType.toLowerCase().trim()
      )
      if (match) {
        assessmentConfigs.push({
          ...match,
          weight: Number(match.weight) > 0 ? Number(match.weight) : 20,
          is_active: true,
        })
      } else {
        assessmentConfigs.push({
          type: selType,
          weight: 20,
          is_active: true,
          display_order: 100 + idx,
        })
      }
    })
  } else {
    assessmentConfigs = allAssessmentConfigs.filter(
      (w) => w.is_active !== false && Number(w.weight) > 0
    )
    if (assessmentConfigs.length === 0) {
      assessmentConfigs = allAssessmentConfigs
    }
  }

  // 2. Batch-fetch all student records, marks, activity attempts, report_cards, attendance, and staff names in parallel
  const [
    { data: studentsData },
    { data: marksData },
    { data: attemptsData },
    { data: reportCardsData },
    { data: seededCommentsData },
    { data: principalUser },
    { data: deanUser },
    { data: attendanceData },
  ] = await Promise.all([
    supabase
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
      .in('id', studentIds),
    supabase
      .from('marks')
      .select('student_id, score, grading_scale, remarks, subject_id, assessment_type')
      .in('student_id', studentIds)
      .eq('term', termName),
    supabase
      .from('activity_attempts')
      .select('student_id, percentage, class_activities (subject, activity_type, max_attempts)')
      .in('student_id', studentIds),
    supabase
      .from('report_cards')
      .select('*')
      .in('student_id', studentIds)
      .eq('term_id', termId),
    supabase.from('principal_grade_comments').select('grade, comment'),
    supabase
      .from('profiles')
      .select('first_name, last_name')
      .or('role.ilike.%Principal%,roles.cs.{"Principal"}')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('first_name, last_name')
      .or('role.ilike.%Dean%,roles.cs.{"Dean"}')
      .limit(1)
      .maybeSingle(),
    term.start_date && term.end_date
      ? supabase
          .from('attendance')
          .select('student_id, status')
          .in('student_id', studentIds)
          .gte('date', term.start_date)
          .lte('date', term.end_date)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const studentsById = new Map<string, any>()
  const classIdsSet = new Set<string>()
  for (const s of studentsData || []) {
    studentsById.set(s.id, s)
    if (s.class_id) classIdsSet.add(s.class_id)
  }

  const classIds = Array.from(classIdsSet)
  const [{ data: classesData }, { data: classSubjectsData }] =
    classIds.length > 0
      ? await Promise.all([
          supabase
            .from('classes')
            .select('id, name, section, class_teacher_id')
            .in('id', classIds),
          supabase
            .from('class_subjects')
            .select('class_id, subjects (id, name, code), teacher:teacher_id(first_name, last_name)')
            .in('class_id', classIds),
        ])
      : [{ data: [] as any[] }, { data: [] as any[] }]

  const classMap = new Map<string, any>()
  const teacherIdsSet = new Set<string>()
  for (const c of classesData || []) {
    classMap.set(c.id, c)
    if (c.class_teacher_id) teacherIdsSet.add(c.class_teacher_id)
  }

  const teacherProfilesMap = new Map<string, { first_name: string; last_name: string }>()
  if (teacherIdsSet.size > 0) {
    const { data: teacherProfs } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', Array.from(teacherIdsSet))
    for (const tp of teacherProfs || []) {
      teacherProfilesMap.set(tp.id, tp)
    }
  }

  const subjectsByClass = new Map<string, any[]>()
  const fallbackTeacherByClass = new Map<string, string>()
  for (const cs of classSubjectsData || []) {
    if (!subjectsByClass.has(cs.class_id)) {
      subjectsByClass.set(cs.class_id, [])
    }
    const subj = Array.isArray(cs.subjects) ? cs.subjects[0] : cs.subjects
    if (subj) {
      subjectsByClass.get(cs.class_id)!.push(subj)
    }
    if (!fallbackTeacherByClass.has(cs.class_id) && cs.teacher) {
      const tProf: any = Array.isArray(cs.teacher) ? cs.teacher[0] : cs.teacher
      if (tProf) {
        const name = `${tProf.first_name || ''} ${tProf.last_name || ''}`.trim()
        if (name) fallbackTeacherByClass.set(cs.class_id, name)
      }
    }
  }

  const marksByStudent = new Map<string, any[]>()
  for (const m of marksData || []) {
    if (!marksByStudent.has(m.student_id)) marksByStudent.set(m.student_id, [])
    marksByStudent.get(m.student_id)!.push(m)
  }

  const attemptsByStudent = new Map<string, any[]>()
  for (const a of attemptsData || []) {
    if (!attemptsByStudent.has(a.student_id)) attemptsByStudent.set(a.student_id, [])
    attemptsByStudent.get(a.student_id)!.push(a)
  }

  const reportCardByStudent = new Map<string, any>()
  for (const rc of reportCardsData || []) {
    reportCardByStudent.set(rc.student_id, rc)
  }

  const attendanceByStudent = new Map<string, any[]>()
  for (const att of attendanceData || []) {
    if (!attendanceByStudent.has(att.student_id)) attendanceByStudent.set(att.student_id, [])
    attendanceByStudent.get(att.student_id)!.push(att)
  }

  const commentsByGrade = new Map<string, string[]>()
  for (const sc of seededCommentsData || []) {
    if (!commentsByGrade.has(sc.grade)) commentsByGrade.set(sc.grade, [])
    commentsByGrade.get(sc.grade)!.push(sc.comment)
  }

  const pName = principalUser
    ? `${principalUser.first_name || ''} ${principalUser.last_name || ''}`.trim()
    : 'Principal'
  const dName = deanUser
    ? `${deanUser.first_name || ''} ${deanUser.last_name || ''}`.trim()
    : 'Dean of Studies'

  // Optional class rank cache per classId
  const classRanksCache = new Map<string, Record<string, { rank: number; total: number }>>()

  const pdfOptionsList: ReportCardOptions[] = []

  for (let idx = 0; idx < studentIds.length; idx++) {
    const sId = studentIds[idx]
    const student = studentsById.get(sId)
    if (!student) continue

    const studentProfile: any = Array.isArray(student.profiles)
      ? student.profiles[0]
      : student.profiles

    const classId = student.class_id
    const classData = classId ? classMap.get(classId) : null
    const className = classData?.name || student.grade_level || 'Grade 1'
    const classSection = classData?.section || student.section || ''
    const subjects = (classId ? subjectsByClass.get(classId) : []) || []

    const studentMarks = marksByStudent.get(sId) || []
    const attempts = attemptsByStudent.get(sId) || []

    const subjectsReport: ReportSubjectMark[] = []
    let totalAverageSum = 0

    subjects.forEach((subj: any) => {
      const quizAttempts = attempts.filter((att: any) => {
        const ca = att.class_activities
        const subjName = ca?.subject || ''
        const matchesSubj =
          subjName.toLowerCase() === subj.name.toLowerCase() ||
          subjName.toLowerCase() === (subj.code || '').toLowerCase()
        return matchesSubj && ca?.activity_type === 'quiz' && ca?.max_attempts === 1
      })
      const quizzesAvg =
        quizAttempts.length > 0
          ? quizAttempts.reduce(
              (sum: number, att: any) => sum + Number(att.percentage || 0),
              0
            ) / quizAttempts.length
          : null

      const caAttempts = attempts.filter((att: any) => {
        const ca = att.class_activities
        const subjName = ca?.subject || ''
        const matchesSubj =
          subjName.toLowerCase() === subj.name.toLowerCase() ||
          subjName.toLowerCase() === (subj.code || '').toLowerCase()
        return matchesSubj && ca?.activity_type !== 'quiz'
      })
      const activityAvg =
        caAttempts.length > 0
          ? caAttempts.reduce(
              (sum: number, att: any) => sum + Number(att.percentage || 0),
              0
            ) / caAttempts.length
          : null

      const subjMarks = studentMarks.filter((m: any) => m.subject_id === subj.id)
      const examScores: Record<string, number | null> = {}
      let lastRemark = ''

      assessmentConfigs.forEach((et: any) => {
        if (et.type.toUpperCase() === 'QUIZZES') {
          examScores[et.type] = quizzesAvg
        } else if (
          et.type.toUpperCase() === 'CA' ||
          et.type.toUpperCase().includes('HOME WORKS') ||
          et.type.toUpperCase().includes('H/W')
        ) {
          examScores[et.type] = activityAvg
        } else {
          const markRecord = subjMarks.find((m: any) => {
            const mType = (m.assessment_type || '').toLowerCase().trim()
            const etName = (et.type || '').toLowerCase().trim()
            return mType === etName || mType.includes(etName) || etName.includes(mType)
          })

          const score = markRecord ? parseMarkScore(markRecord).percentage : null
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
        remarks: lastRemark,
      })

      totalAverageSum += overallScore
    })

    const totalScore = totalAverageSum
    const averageScore =
      subjectsReport.length > 0 ? totalAverageSum / subjectsReport.length : 0
    const overallGrade = getGradeForPercentage(averageScore, gradingLevels)

    let attendance: { present: number; total: number; percentage: number } | undefined
    const attRecords = attendanceByStudent.get(sId) || []
    if (attRecords.length > 0) {
      const presentCount = attRecords.filter(
        (a: any) => a.status === 'Present' || a.status === 'Late'
      ).length
      const totalCount = attRecords.length
      attendance = {
        present: presentCount,
        total: totalCount,
        percentage: totalCount > 0 ? (presentCount / totalCount) * 100 : 0,
      }
    }

    const reportCardRecord = reportCardByStudent.get(sId)
    const conductGrade = reportCardRecord?.conduct_grade || 'A'
    const conductRemark =
      reportCardRecord?.conduct_remark ||
      reportCardRecord?.remarks ||
      'Excellent conduct shown in all learning fields.'
    const classTeacherComment =
      reportCardRecord?.class_teacher_comment ||
      'A hardworking student who shows keen focus in all classes.'
    let principalComment =
      reportCardRecord?.principal_comment || reportCardRecord?.principal_comments || ''

    if (!principalComment) {
      const seeded = commentsByGrade.get(overallGrade) || []
      if (seeded.length > 0) {
        const hash = sId.split('-').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        const index = Math.abs(hash) % seeded.length
        principalComment = seeded[index]
      } else {
        principalComment =
          'Commendable progress overall. Keep up the high standard in all subjects.'
      }
    }

    if (
      reportCardRecord &&
      reportCardRecord.total_sessions &&
      reportCardRecord.total_sessions > 0
    ) {
      attendance = {
        present: reportCardRecord.total_present || 0,
        total: reportCardRecord.total_sessions || 0,
        percentage: Number(reportCardRecord.attendance_percentage) || 0,
      }
    }

    let classTeacherName = 'Class Teacher'
    if (classId) {
      if (classData?.class_teacher_id) {
        const ctProf = teacherProfilesMap.get(classData.class_teacher_id)
        if (ctProf) {
          classTeacherName = `${ctProf.first_name || ''} ${ctProf.last_name || ''}`.trim()
        }
      }
      if (classTeacherName === 'Class Teacher') {
        classTeacherName = fallbackTeacherByClass.get(classId) || 'Class Teacher'
      }
    }

    let rank = 0
    let totalStudents = 0
    if (showRank && classId) {
      if (!classRanksCache.has(classId)) {
        const { data: rankRows } = await supabase.rpc('get_class_marks_summary', {
          p_class_id: classId,
          p_term: termName,
        })
        const map: Record<string, { rank: number; total: number }> = {}
        if (Array.isArray(rankRows) && rankRows.length > 0) {
          rankRows.forEach((r: any) => {
            map[r.student_id] = {
              rank: Number(r.class_rank || 0),
              total: rankRows.length,
            }
          })
        }
        classRanksCache.set(classId, map)
      }
      const rankInfo = classRanksCache.get(classId)?.[sId]
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
        admission_date: student.created_at,
      },
      term: {
        id: termId,
        term_name: termName,
        academic_year: academicYear,
      },
      classInfo: {
        class_name: className,
        section: classSection,
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
        remark: conductRemark,
      },
      comments: {
        classTeacher: classTeacherComment,
        principal: principalComment,
      },
      names: {
        classTeacher: classTeacherName,
        dean: dName,
        principal: pName,
      },
    })

    if (onProgress) {
      await onProgress(idx + 1, studentIds.length)
    }
  }

  return { pdfOptionsList, termName, academicYear }
}

export async function generateBatchReportCardPdfBuffer(
  input: BatchReportBuildInput
): Promise<{
  pdfBuffer: Buffer
  filename: string
  studentCount: number
  termName: string
}> {
  const { pdfOptionsList, termName } = await buildReportCardOptionsBatch(input)
  if (pdfOptionsList.length === 0) {
    throw new Error('No report data compiled for the given student selection')
  }

  const pdfBuffer = await generateSmartkidzReportPdf(pdfOptionsList)
  const cleanFirstName =
    input.studentIds.length === 1
      ? (pdfOptionsList[0].student.first_name || 'Student').replace(/[^a-zA-Z0-9]/g, '')
      : 'Bulk_Class'
  const cleanTerm = termName.replace(/[^a-zA-Z0-9]/g, '')

  return {
    pdfBuffer,
    filename: `ReportCard_${cleanFirstName}_${cleanTerm}.pdf`,
    studentCount: pdfOptionsList.length,
    termName,
  }
}
