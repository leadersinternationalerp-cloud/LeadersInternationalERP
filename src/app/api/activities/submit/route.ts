import { createClient } from '@/utils/supabase/server'
import { createServiceClient } from '@/utils/supabase/service'
import { markQuiz } from '@/lib/cambridge-syllabus'
import { parseGradingLevels, getGradeForPercentage } from '@/utils/grading'
import { route, ok, parseJson } from '@/lib/api/handler'
import { badRequest, ApiError } from '@/lib/api/errors'

export const POST = route(
  async ({ user, req, requestId }) => {
    const supabase = await createClient()

    const body = await parseJson<{
      activity_id?: string
      answers?: Record<string, unknown>
      time_taken_seconds?: number
    }>(req)

    const { activity_id, answers, time_taken_seconds } = body

    if (!activity_id || !answers) {
      throw badRequest({ fields: 'Missing required fields: activity_id, answers' })
    }

    // 1. Retrieve activity
    const { data: activity, error: activityError } = await supabase
      .from('class_activities')
      .select('*')
      .eq('id', activity_id)
      .maybeSingle()

    if (activityError || !activity) {
      throw new ApiError('NOT_FOUND', 'Quiz activity not found')
    }

    if (!activity.is_published) {
      throw badRequest({ is_published: 'This quiz is not published yet' })
    }

    // 2. Assert student is enrolled in the class of the activity
    const { data: enrollment } = await supabase
      .from('student_classes')
      .select('student_id')
      .eq('student_id', user.id)
      .eq('class_id', activity.class_id)
      .maybeSingle()

    if (!enrollment) {
      const { data: studentRow } = await supabase
        .from('students')
        .select('id')
        .eq('id', user.id)
        .eq('class_id', activity.class_id)
        .maybeSingle()

      if (!studentRow) {
        throw new ApiError('FORBIDDEN', 'You are not enrolled in this class')
      }
    }

    // 3. Check for existing attempts
    const { data: existingAttempt } = await supabase
      .from('activity_attempts')
      .select('id')
      .eq('activity_id', activity_id)
      .eq('student_id', user.id)
      .maybeSingle()

    if (existingAttempt) {
      throw new ApiError('CONFLICT', 'You have already submitted an attempt for this quiz.')
    }

    // 4. Score quiz server-side
    const questions = activity.questions || []
    const evaluation = markQuiz(questions, answers as Record<string, number>)

    // 5. Fetch grading scale
    const { data: setting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'grading_scale')
      .maybeSingle()

    const gradingLevels = parseGradingLevels(setting?.value)
    const grade = getGradeForPercentage(evaluation.percentage, gradingLevels)

    // 6. Insert attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('activity_attempts')
      .insert({
        activity_id,
        student_id: user.id,
        score: evaluation.score,
        max_score: evaluation.maxScore,
        percentage: evaluation.percentage,
        grade,
        answers,
        time_taken_seconds: time_taken_seconds || null,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (attemptError) {
      throw new ApiError('INTERNAL', 'Failed to record quiz attempt')
    }

    // 7. Record in marks table linked to class_activity_id
    try {
      const serviceClient = createServiceClient()
      const { data: termData } = await supabase
        .from('terms')
        .select('id')
        .eq('is_current', true)
        .maybeSingle()

      let termId = termData?.id
      if (!termId) {
        const { data: fallbackTerm } = await supabase
          .from('terms')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        termId = fallbackTerm?.id
      }

      const { data: subj } = await supabase
        .from('subjects')
        .select('id')
        .ilike('name', activity.subject)
        .maybeSingle()

      if (termId && subj?.id) {
        await serviceClient.from('marks').upsert(
          {
            student_id: user.id,
            class_id: activity.class_id,
            subject_id: subj.id,
            term_id: termId,
            class_activity_id: activity.id,
            score: evaluation.percentage,
            assessment_type: 'HOME WORKS (H/W)',
            remarks: `Quiz: ${activity.title} (Auto-marked)`,
            graded_by: activity.created_by,
            is_released: false,
          },
          {
            onConflict: 'student_id,class_activity_id',
          }
        )
      }
    } catch {
      // Non-fatal marks persistence warning
    }

    return ok(
      {
        attempt_id: attempt.id,
        score: evaluation.score,
        max_score: evaluation.maxScore,
        percentage: evaluation.percentage,
        grade,
      },
      { requestId },
      201
    )
  },
  {
    roles: ['Student'],
    rateLimit: { key: 'activity-submit', max: 20, windowMs: 60_000 },
  }
)
