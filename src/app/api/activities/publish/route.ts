import { createClient } from '@/utils/supabase/server'
import { route, ok, parseJson } from '@/lib/api/handler'
import { MANAGEMENT_ROLES } from '@/lib/auth/roles'
import { assertClassInScope } from '@/lib/api/scope'
import { badRequest, ApiError } from '@/lib/api/errors'

export const POST = route(
  async ({ user, req, requestId }) => {
    const supabase = await createClient()

    const body = await parseJson<{
      class_id?: string
      title?: string
      subject?: string
      topic?: string
      grade_level?: string
      activity_type?: string
      description?: string
      questions?: unknown[]
      time_limit_minutes?: number
      max_attempts?: number
      due_date?: string | null
    }>(req)

    const {
      class_id,
      title,
      subject,
      topic,
      grade_level,
      activity_type = 'quiz',
      description = '',
      questions = [],
      time_limit_minutes = 15,
      max_attempts = 1,
      due_date = null,
    } = body

    if (!class_id || !title || !subject || !topic || !grade_level) {
      throw badRequest({
        fields: 'Missing required fields: class_id, title, subject, topic, grade_level',
      })
    }

    await assertClassInScope(user, class_id)

    const { data, error } = await supabase
      .from('class_activities')
      .insert({
        class_id,
        title,
        subject,
        date: new Date().toISOString(),
        description,
        topic,
        grade_level,
        activity_type,
        questions,
        time_limit_minutes,
        max_attempts,
        due_date,
        is_published: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      throw new ApiError('INTERNAL', 'Failed to publish activity')
    }

    return ok(data, { requestId }, 201)
  },
  { roles: [...MANAGEMENT_ROLES, 'Teacher'] }
)
