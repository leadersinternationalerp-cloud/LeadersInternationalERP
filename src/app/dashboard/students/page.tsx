import StudentsListClient from './StudentsListClient'
import { requireRole } from '@/lib/auth/session'
import { parsePageParams, sanitizeSearch } from '@/lib/pagination'
import { Pagination } from '@/components/Pagination'
import { ListToolbar } from '@/components/ListToolbar'
import { escapeLike } from '@/lib/sanitize'
import { createServiceClient } from '@/utils/supabase/service'

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
    'Head of Section',
    'Teacher',
    'Receptionist',
  ])
  const { user, roles, supabase } = session
  const serviceSupabase = createServiceClient()

  const sp = searchParams ? await searchParams : undefined
  const { page, perPage, from, to } = parsePageParams(sp)
  const q = sanitizeSearch(typeof sp?.q === 'string' ? sp.q : undefined)

  // 1. Fetch terms and classes for placement & generators
  const { data: terms } = await supabase.from('terms').select('*').order('created_at', { ascending: false })
  const { data: classes } = await supabase.from('classes').select('*').order('class_name', { ascending: true })

  // 2. Teacher scope resolution (Receptionist and Management see all students)
  const isTeacherOnly =
    roles.includes('Teacher') &&
    !roles.includes('System Admin') &&
    !roles.includes('Director') &&
    !roles.includes('Principal') &&
    !roles.includes('Head of Section') &&
    !roles.includes('Dean') &&
    !roles.includes('Receptionist')

  let teacherClassIds: string[] = []
  if (isTeacherOnly) {
    const { data: classSubjects } = await supabase
      .from('class_subjects')
      .select('class_id')
      .eq('teacher_id', user.id)
    teacherClassIds = Array.from(new Set((classSubjects || []).map((cs: any) => cs.class_id).filter(Boolean)))
  }

  // 3. Build paginated student query (including all bio-data fields)
  let query = serviceSupabase
    .from('students')
    .select(
      `
      *,
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
  const studentIds = studentsList.map((s: any) => s.id).filter(Boolean)
  const admissionIds = studentsList.map((s: any) => s.admission_id).filter(Boolean)

  // 4. Fetch linked admission applications & parent links for rich bio-data
  const admissionMap = new Map<string, any>()
  if (studentIds.length > 0 || admissionIds.length > 0) {
    try {
      const { data: appsData } = await serviceSupabase
        .from('admission_applications')
        .select('*')
        .or(
          [
            studentIds.length > 0 ? `enrolled_student_id.in.(${studentIds.join(',')})` : '',
            admissionIds.length > 0 ? `id.in.(${admissionIds.join(',')})` : '',
          ]
            .filter(Boolean)
            .join(',')
        )
      ;(appsData || []).forEach((app: any) => {
        if (app.id) admissionMap.set(app.id, app)
        if (app.enrolled_student_id) admissionMap.set(app.enrolled_student_id, app)
      })
    } catch {
      // non-fatal
    }
  }

  const parentMap = new Map<string, any>()
  if (studentIds.length > 0) {
    try {
      const { data: spData } = await serviceSupabase
        .from('student_parents')
        .select('student_id, relationship, parent_id')
        .in('student_id', studentIds)

      const parentIds = Array.from(new Set((spData || []).map((sp: any) => sp.parent_id).filter(Boolean)))
      const parentProfileMap = new Map<string, any>()
      if (parentIds.length > 0) {
        const { data: parentProfs } = await serviceSupabase
          .from('profiles')
          .select('id, first_name, last_name, email, phone')
          .in('id', parentIds)
        ;(parentProfs || []).forEach((p: any) => parentProfileMap.set(p.id, p))
      }

      ;(spData || []).forEach((sp: any) => {
        const pProf = parentProfileMap.get(sp.parent_id)
        if (pProf && !parentMap.has(sp.student_id)) {
          parentMap.set(sp.student_id, {
            name: `${pProf.first_name || ''} ${pProf.last_name || ''}`.trim(),
            relationship: sp.relationship || 'Parent',
            email: pProf.email,
            phone: pProf.phone,
          })
        }
      })
    } catch {
      // non-fatal
    }
  }

  const mappedStudentsList = studentsList.map((s: any) => {
    const profs = s.profiles
    const singleProfile = Array.isArray(profs) ? profs[0] : profs
    const linkedApp = admissionMap.get(s.admission_id) || admissionMap.get(s.id)
    const linkedParent = parentMap.get(s.id)

    return {
      id: s.id,
      student_id: s.student_id,
      grade_level: s.grade_level,
      section: s.section,
      photo_url: `/api/students/photo?student_id=${s.id}`,
      parent_contact:
        singleProfile?.phone ||
        s.parent_contact ||
        linkedParent?.phone ||
        linkedApp?.parent_phone ||
        'No phone',
      class_id: s.class_id,
      dob: s.dob || linkedApp?.date_of_birth || null,
      gender: s.gender || linkedApp?.gender || null,
      nationality: s.nationality || linkedApp?.nationality || 'Tanzanian',
      place_of_birth: linkedApp?.place_of_birth || null,
      medical_info: s.medical_info || linkedApp?.medical_conditions || null,
      allergies: s.allergies || null,
      language_at_home: s.language_at_home || null,
      previous_school: s.previous_school || linkedApp?.previous_school || null,
      emergency_contact:
        s.emergency_contact ||
        (linkedApp?.parent_name ? `${linkedApp.parent_name} (${linkedApp.parent_phone || ''})` : null),
      admission_date: s.admission_date || (s.created_at ? String(s.created_at).slice(0, 10) : null),
      parent_name: linkedParent?.name || linkedApp?.parent_name || null,
      parent_relationship: linkedParent?.relationship || linkedApp?.parent_relationship || 'Parent',
      parent_email: linkedParent?.email || linkedApp?.parent_email || singleProfile?.email || null,
      parent_address: linkedApp?.parent_address || null,
      parent_occupation: linkedApp?.parent_occupation || null,
      source: s.source || linkedApp?.source || 'website',
      sales_agent_name: s.sales_agent_name || linkedApp?.sales_agent_name || null,
      is_active: s.is_active,
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
