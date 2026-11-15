import { createClient } from '@/utils/supabase/server'
import { route, ok, parseJson } from '@/lib/api/handler'
import { MANAGEMENT_ROLES, hasAny } from '@/lib/auth/roles'
import { assertClassInScope, assertStudentInScope } from '@/lib/api/scope'
import { badRequest, ApiError } from '@/lib/api/errors'
import { syncClassReportCardRelease } from '@/lib/reportCardReleaseSync'

export const GET = route(
  async ({ user, req, requestId }) => {
    const { searchParams } = new URL(req.url)
    const class_id = searchParams.get('class_id')
    const term_id = searchParams.get('term_id')

    const supabase = await createClient()

    // 1. Fetch Assessment Weights Config
    const { data: dbWeights } = await supabase
      .from('assessment_weights')
      .select('assessment_type, weight, is_active, display_order')
      .order('display_order', { ascending: true })

    let assessmentConfigs: {
      type: string
      weight: number
      is_active: boolean
      display_order: number
    }[] = []

    if (dbWeights && dbWeights.length > 0) {
      assessmentConfigs = dbWeights.map((w: any) => ({
        type: w.assessment_type,
        weight: Number(w.weight || 0),
        is_active: Boolean(w.is_active),
        display_order: Number(w.display_order || 0),
      }))
    } else {
      const { data: sysSetting } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'assessment_weights')
        .maybeSingle()

      if (sysSetting?.value && Array.isArray(sysSetting.value)) {
        assessmentConfigs = sysSetting.value.map((w: any, idx: number) => ({
          type: w.type || w.assessment_type,
          weight: Number(w.weight || 0),
          is_active: w.is_active !== false,
          display_order: Number(w.display_order ?? idx),
        }))
      } else {
        assessmentConfigs = [
          { type: 'QUIZZES', weight: 20, is_active: true, display_order: 0 },
          { type: 'Test 1', weight: 20, is_active: true, display_order: 1 },
          { type: 'Test 2', weight: 20, is_active: true, display_order: 2 },
          { type: 'Mid-Term', weight: 20, is_active: true, display_order: 3 },
          { type: 'Terminal', weight: 40, is_active: true, display_order: 4 },
        ]
      }
    }

    let isReleased = false
    let publishedAt: string | null = null
    const studentComments: Record<
      string,
      {
        conductGrade: string
        conductRemark: string
        classTeacherComment: string
        principalComment: string
      }
    > = {}

    if (class_id && term_id) {
      await assertClassInScope(user, class_id)

      const { data: releaseRow } = await supabase
        .from('report_card_releases')
        .select('is_published, published_at, created_at')
        .eq('class_id', class_id)
        .eq('term_id', term_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (releaseRow) {
        isReleased = Boolean(releaseRow.is_published)
        publishedAt = releaseRow.published_at || releaseRow.created_at || null
      } else {
        const { data: termRow } = await supabase
          .from('terms')
          .select('name, term_name')
          .eq('id', term_id)
          .maybeSingle()
        const tName = termRow?.term_name || termRow?.name
        if (tName) {
          const { data: releasedMarks } = await supabase
            .from('marks')
            .select('id')
            .eq('class_id', class_id)
            .eq('term', tName)
            .eq('is_released', true)
            .limit(1)
          if (releasedMarks && releasedMarks.length > 0) {
            isReleased = true
          }
        }
      }

      const { data: classStudents } = await supabase
        .from('students')
        .select('id')
        .eq('class_id', class_id)

      const sIds = (classStudents || []).map((s: any) => s.id)
      if (sIds.length > 0) {
        const { data: cards } = await supabase
          .from('report_cards')
          .select('*')
          .in('student_id', sIds)
          .eq('term_id', term_id)

        ;(cards || []).forEach((c: any) => {
          studentComments[c.student_id] = {
            conductGrade: c.conduct_grade || 'A',
            conductRemark: c.conduct_remark || c.remarks || '',
            classTeacherComment: c.class_teacher_comment || '',
            principalComment: c.principal_comment || c.principal_comments || '',
          }
        })
      }
    }

    return ok(
      {
        assessmentConfigs,
        releaseInfo: { isReleased, publishedAt },
        studentComments,
      },
      { requestId }
    )
  },
  { roles: [...MANAGEMENT_ROLES, 'Teacher'] }
)

export const POST = route(
  async ({ user, req, requestId }) => {
    const body = await parseJson<{
      action: 'save_comments' | 'toggle_release'
      studentId?: string
      classId?: string
      termId?: string
      conductGrade?: string
      conductRemark?: string
      classTeacherComment?: string
      principalComment?: string
      release?: boolean
      includedAssessments?: string[]
      showRank?: boolean
    }>(req)

    const supabase = await createClient()

    if (body.action === 'save_comments') {
      const {
        studentId,
        termId,
        conductGrade = 'A',
        conductRemark = '',
        classTeacherComment = '',
        principalComment = '',
      } = body

      if (!studentId || !termId) {
        throw badRequest('Missing studentId or termId')
      }

      await assertStudentInScope(user, studentId)

      const { data: studentRow } = await supabase
        .from('students')
        .select('id, grade_level, class_id')
        .eq('id', studentId)
        .maybeSingle()

      const { data: termRow } = await supabase
        .from('terms')
        .select('id, name, term_name, academic_year')
        .eq('id', termId)
        .maybeSingle()

      const academicYear = termRow?.academic_year || '2026-2027'
      const gradeLevel = studentRow?.grade_level || 'Grade 1'

      const { data: existing } = await supabase
        .from('report_cards')
        .select('id')
        .eq('student_id', studentId)
        .eq('term_id', termId)
        .limit(1)
        .maybeSingle()

      const extendedPayload: Record<string, any> = {
        student_id: studentId,
        term_id: termId,
        academic_year: academicYear,
        grade_level: gradeLevel,
        conduct_grade: conductGrade,
        conduct_remark: conductRemark,
        remarks: conductRemark,
        class_teacher_comment: classTeacherComment,
        principal_comment: principalComment,
        principal_comments: principalComment,
        updated_at: new Date().toISOString(),
      }

      const fallbackPayload: Record<string, any> = {
        student_id: studentId,
        term_id: termId,
        academic_year: academicYear,
        grade_level: gradeLevel,
        conduct_grade: conductGrade,
        remarks: conductRemark,
        class_teacher_comment: classTeacherComment,
        principal_comments: principalComment,
        updated_at: new Date().toISOString(),
      }

      if (existing?.id) {
        const { error: extErr } = await supabase
          .from('report_cards')
          .update(extendedPayload)
          .eq('id', existing.id)
        if (extErr) {
          const { error: fbErr } = await supabase
            .from('report_cards')
            .update(fallbackPayload)
            .eq('id', existing.id)
          if (fbErr) throw new ApiError('INTERNAL', fbErr.message)
        }
      } else {
        const { error: extErr } = await supabase
          .from('report_cards')
          .insert(extendedPayload)
        if (extErr) {
          const { error: fbErr } = await supabase
            .from('report_cards')
            .insert(fallbackPayload)
          if (fbErr) throw new ApiError('INTERNAL', fbErr.message)
        }
      }

      return ok({ saved: true }, { requestId })
    }

    if (body.action === 'toggle_release') {
      const { classId, termId, release = true, includedAssessments, showRank } = body
      if (!classId || !termId) {
        throw badRequest('Missing classId or termId')
      }

      if (!hasAny(user.roles, MANAGEMENT_ROLES)) {
        throw new ApiError(
          'FORBIDDEN',
          'Only Management (Dean, Principal, Director, HOS, or Admin) can publish or retract report cards.'
        )
      }

      await assertClassInScope(user, classId)

      const res = await syncClassReportCardRelease(supabase, {
        classId,
        termId,
        release,
        publishedBy: user.id,
        includedAssessments,
        showRank,
      })

      return ok(res, { requestId })
    }

    throw badRequest('Unsupported action')
  },
  { roles: [...MANAGEMENT_ROLES, 'Teacher'] }
)
