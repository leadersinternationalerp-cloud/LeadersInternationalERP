import { createClient } from '@/utils/supabase/server'
import { route, ok } from '@/lib/api/handler'
import { STAFF_ROLES } from '@/lib/auth/roles'
import { assertStudentInScope } from '@/lib/api/scope'
import { badRequest, ApiError } from '@/lib/api/errors'

export const GET = route(
  async ({ user, req, requestId }) => {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const id = searchParams.get('id')

    if (!code && !id) {
      throw badRequest({ query: 'Missing code or id search parameter' })
    }

    const supabase = await createClient()

    let query = supabase.from('students').select('id, student_id, grade_level, section')
    if (id) {
      query = query.eq('id', id)
    } else if (code) {
      query = query.eq('student_id', code)
    }

    const { data: student, error } = await query.maybeSingle()

    if (error || !student) {
      throw new ApiError('NOT_FOUND', 'Student not found')
    }

    await assertStudentInScope(user, student.id)

    return ok({ student }, { requestId })
  },
  { roles: STAFF_ROLES }
)
