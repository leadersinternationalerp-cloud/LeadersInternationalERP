import { createClient } from '@/utils/supabase/server'
import { parseGradingLevels, getGradeForPercentage } from '@/utils/grading'
import { route, ok } from '@/lib/api/handler'
import { MANAGEMENT_ROLES } from '@/lib/auth/roles'
import { assertClassInScope } from '@/lib/api/scope'
import { badRequest, ApiError } from '@/lib/api/errors'

export const GET = route(
  async ({ user, req, requestId }) => {
    const supabase = await createClient()

    const { searchParams } = new URL(req.url)
    const activityId = searchParams.get('activity_id')
    if (!activityId) {
      throw badRequest({ activity_id: 'Missing required query parameter: activity_id' })
    }

    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get('perPage')) || 50))
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    // 1. Fetch activity to check existence and scope
    const { data: activity, error: actError } = await supabase
      .from('class_activities')
      .select('id, class_id')
      .eq('id', activityId)
      .maybeSingle()

    if (actError || !activity) {
      throw new ApiError('NOT_FOUND', 'Activity not found')
    }

    await assertClassInScope(user, activity.class_id)

    // 2. Fetch grading scale
    const { data: setting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'grading_scale')
      .maybeSingle()
    const gradingLevels = parseGradingLevels(setting?.value)

    // 3. Fetch attempts with count and range
    const { data: attempts, count, error: fetchError } = await supabase
      .from('activity_attempts')
      .select(
        `
        id,
        activity_id,
        student_id,
        score,
        max_score,
        percentage,
        grade,
        time_taken_seconds,
        submitted_at,
        profiles:student_id (
          first_name,
          last_name
        )
      `,
        { count: 'exact' }
      )
      .eq('activity_id', activityId)
      .order('percentage', { ascending: false })
      .range(from, to)

    if (fetchError) {
      throw new ApiError('INTERNAL', 'Failed to fetch activity results')
    }

    interface AttemptRecord {
      id: string
      activity_id: string
      student_id: string
      score: number
      max_score: number
      percentage: number
      grade?: string | null
      time_taken_seconds?: number
      submitted_at: string
      profiles?: { first_name?: string; last_name?: string } | { first_name?: string; last_name?: string }[]
    }

    const sanitizedAttempts = (attempts || []).map((attempt: AttemptRecord) => {
      const prof = Array.isArray(attempt.profiles) ? attempt.profiles[0] : attempt.profiles
      const studentName = prof ? `${prof.first_name || ''} ${prof.last_name || ''}`.trim() : 'Unknown Student'
      const computedGrade = attempt.grade || getGradeForPercentage(attempt.percentage, gradingLevels)

      return {
        id: attempt.id,
        activity_id: attempt.activity_id,
        student_id: attempt.student_id,
        student_name: studentName,
        score: attempt.score,
        max_score: attempt.max_score,
        percentage: attempt.percentage,
        grade: computedGrade,
        time_taken_seconds: attempt.time_taken_seconds,
        submitted_at: attempt.submitted_at,
      }
    })

    return ok(sanitizedAttempts, {
      requestId,
      total: count || 0,
      page,
      perPage,
    })
  },
  { roles: [...MANAGEMENT_ROLES, 'Teacher'] }
)
