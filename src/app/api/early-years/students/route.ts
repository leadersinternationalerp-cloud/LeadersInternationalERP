import { createClient } from '@/utils/supabase/server'
import { route, ok } from '@/lib/api/handler'
import { MANAGEMENT_ROLES } from '@/lib/auth/roles'
import { assertClassInScope } from '@/lib/api/scope'
import { badRequest, ApiError } from '@/lib/api/errors'

export const GET = route(
  async ({ user, req, requestId }) => {
    const { searchParams } = new URL(req.url)
    const class_id = searchParams.get('class_id')

    if (!class_id) {
      throw badRequest({ class_id: 'Missing class_id' })
    }

    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get('perPage')) || 50))
    const from = (page - 1) * perPage
    const to = from + perPage - 1

    const supabase = await createClient()

    // 1. Verify Class Existence & Scope
    const { data: classInfo } = await supabase.from('classes').select('*').eq('id', class_id).maybeSingle()

    if (!classInfo) {
      throw new ApiError('NOT_FOUND', 'Class not found')
    }

    await assertClassInScope(user, class_id)

    // 2. Fetch students directly by class_id
    const { data: students, count, error: fetchErr } = await supabase
      .from('students')
      .select(
        `
        id,
        student_id,
        class_id,
        grade_level,
        status,
        profiles:id (
          first_name,
          last_name,
          gender,
          dob
        )
      `,
        { count: 'exact' }
      )
      .eq('class_id', class_id)
      .eq('status', 'Active')
      .order('student_id', { ascending: true })
      .range(from, to)

    if (fetchErr) {
      throw new ApiError('INTERNAL', 'Failed to fetch class students')
    }

    interface StudentRecord {
      id: string
      student_id?: string
      class_id?: string
      grade_level?: string
      status?: string
      profiles?: { first_name?: string; last_name?: string; gender?: string; dob?: string } | { first_name?: string; last_name?: string; gender?: string; dob?: string }[]
    }

    const studentIds = (students || []).map((s: StudentRecord) => s.id)
    const { data: photos } = await supabase
      .from('student_photos')
      .select('student_id, photo_url')
      .in('student_id', studentIds.length > 0 ? studentIds : ['00000000-0000-0000-0000-000000000000'])

    const photoMap: Record<string, string> = {}
    photos?.forEach((p: { student_id: string; photo_url: string }) => {
      photoMap[p.student_id] = p.photo_url
    })

    const formattedStudents = (students || []).map((s: StudentRecord) => {
      const p = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
      return {
        id: s.id,
        student_id: s.student_id || '',
        class_id: s.class_id,
        grade_level: s.grade_level,
        status: s.status,
        first_name: p?.first_name || '',
        last_name: p?.last_name || '',
        gender: p?.gender || '',
        dob: p?.dob || '',
        photo_url: photoMap[s.id] || null,
      }
    })

    return ok(formattedStudents, {
      requestId,
      total: count || 0,
      page,
      perPage,
    })
  },
  { roles: [...MANAGEMENT_ROLES, 'Teacher'] }
)
