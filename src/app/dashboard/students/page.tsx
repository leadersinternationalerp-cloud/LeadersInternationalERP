import { createClient } from '@/utils/supabase/server'
import StudentsListClient from './StudentsListClient'
import { requireRole } from '@/lib/auth/session'
import { parsePageParams, sanitizeSearch } from '@/lib/pagination'
import { Pagination } from '@/components/Pagination'
import { ListToolbar } from '@/components/ListToolbar'
import { escapeLike } from '@/lib/sanitize'

export default async function StudentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await requireRole([
    'System Admin',
    'Director',
    'Principal',
    'Dean',
    'HOS',
    'Head of Section',
    'Teacher',
  ])
  const { user, roles, supabase } = session

  const sp = searchParams ? await searchParams : undefined
  const { page, perPage, from, to } = parsePageParams(sp)
  const q = sanitizeSearch(typeof sp?.q === 'string' ? sp.q : undefined)

  // 1. Fetch terms and classes for generators
  const { data: terms } = await supabase.from('terms').select('*').order('created_at', { ascending: false })
  const { data: classes } = await supabase.from('classes').select('*').order('class_name', { ascending: true })

  // 2. Teacher scope resolution
  const isTeacherOnly =
    roles.includes('Teacher') &&
    !roles.includes('System Admin') &&
    !roles.includes('Director') &&
    !roles.includes('Principal') &&
    !roles.includes('HOS') &&
    !roles.includes('Head of Section') &&
    !roles.includes('Dean')

  let teacherClassIds: string[] = []
  if (isTeacherOnly) {
    const { data: classSubjects } = await supabase
      .from('class_subjects')
      .select('class_id')
      .eq('teacher_id', user.id)
    teacherClassIds = Array.from(new Set((classSubjects || []).map((cs: any) => cs.class_id).filter(Boolean)))
  }

  // 3. Build paginated student query
  let query = supabase
    .from('students')
    .select(
      `
      id,
      student_id,
      grade_level,
      section,
      class_id,
      created_at,
      profiles (first_name, last_name, email, phone)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to)

  if (isTeacherOnly) {
    if (teacherClassIds.length > 0) {
      query = query.in('class_id', teacherClassIds)
    } else {
      query = query.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  if (q) {
    const escaped = escapeLike(q)
    query = query.or(`student_id.ilike.%${escaped}%,grade_level.ilike.%${escaped}%`)
  }

  const { data: students, count, error } = await query
  if (error) {
    console.error('Failed to load students:', error.message)
  }

  const studentsList = students || []

  const mappedStudentsList = studentsList.map((s: any) => {
    const profs = s.profiles
    const singleProfile = Array.isArray(profs) ? profs[0] : profs
    return {
      id: s.id,
      student_id: s.student_id,
      grade_level: s.grade_level,
      section: s.section,
      photo_url: `/api/students/photo?student_id=${s.id}`,
      parent_contact: singleProfile?.phone || 'No phone',
      class_id: s.class_id,
      profiles: singleProfile
        ? {
            first_name: singleProfile.first_name,
            last_name: singleProfile.last_name,
            email: singleProfile.email,
            phone: singleProfile.phone,
          }
        : undefined,
    }
  })

  return (
    <div className="space-y-4">
      <ListToolbar searchPlaceholder="Search by student ID or grade..." initialSearch={q || ''} initialPerPage={perPage} />
      <StudentsListClient
        initialStudents={mappedStudentsList}
        userRoles={roles}
        terms={terms || []}
        classes={classes || []}
      />
      <Pagination
        page={page}
        perPage={perPage}
        total={count || 0}
        pathname="/dashboard/students"
        params={{ q: q || '' }}
      />
    </div>
  )
}
