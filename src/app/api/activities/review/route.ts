import { createClient } from '@/utils/supabase/server'
import { markQuiz } from '@/lib/cambridge-syllabus'
import { parseGradingLevels, getGradeForPercentage } from '@/utils/grading'
import { route, ok } from '@/lib/api/handler'
import { assertParentOf, assertClassInScope } from '@/lib/api/scope'
import { badRequest, ApiError } from '@/lib/api/errors'

export const GET = route(
  async ({ user, req, requestId }) => {
    const supabase = await createClient()

    const { searchParams } = new URL(req.url)
    const activityId = searchParams.get('activity_id')
    if (!activityId) {
      throw badRequest({ activity_id: 'Missing activity_id' })
    }

    let targetStudentId = user.id
    if (user.roles.includes('Parent')) {
      const parentStudentId = searchParams.get('student_id')
      if (!parentStudentId) {
        throw badRequest({ student_id: 'Parent must supply student_id' })
      }
      await assertParentOf(user, parentStudentId)
      targetStudentId = parentStudentId
    } else if (user.roles.includes('Teacher') || user.roles.includes('System Admin')) {
      const queryStudentId = searchParams.get('student_id')
      if (queryStudentId) {
        targetStudentId = queryStudentId
      }
    }

    // 1. Load quiz questions
    const { data: activity, error: activityError } = await supabase
      .from('class_activities')
      .select('id, class_id, questions')
      .eq('id', activityId)
      .maybeSingle()

    if (activityError || !activity) {
      throw new ApiError('NOT_FOUND', 'Quiz not found')
    }

    if (user.roles.includes('Teacher')) {
      await assertClassInScope(user, activity.class_id)
    }

    // 2. Load the attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('activity_attempts')
      .select('*')
      .eq('activity_id', activityId)
      .eq('student_id', targetStudentId)
      .maybeSingle()

    if (attemptError || !attempt) {
      throw new ApiError('NOT_FOUND', 'No attempt found')
    }

    // 3. Re-mark the submitted answers
    const questions = activity.questions || []
    const answers = attempt.answers || {}
    const evaluation = markQuiz(questions, answers)

    // 4. Fetch grading scale
    const { data: setting } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'grading_scale')
      .maybeSingle()
    const gradingLevels = parseGradingLevels(setting?.value)
    const grade = attempt.grade || getGradeForPercentage(evaluation.percentage, gradingLevels)

    return ok(
      {
        attempt: {
          ...attempt,
          grade,
        },
        evaluation,
        questions,
      },
      { requestId }
    )
  },
  { roles: ['System Admin', 'Teacher', 'Student', 'Parent'] }
)
