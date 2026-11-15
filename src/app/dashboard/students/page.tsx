import StudentsListClient from './StudentsListClient'
import { requireRole } from '@/lib/auth/session'
import { getCachedClasses, getCachedTerms } from '@/lib/cache/referenceData'
import { getWingContext } from '@/lib/wingServer'
import { inferWing, matchesWingFilter } from '@/lib/wing'
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
  const { user, profile, roles, supabase } = session
  const wingContext = await getWingContext(user.id, profile)
  const serviceSupabase = createServiceClient()

  const sp = searchParams ? await searchParams : undefined
  const { page, perPage, from, to } = parsePageParams(sp)
  const q = sanitizeSearch(typeof sp?.q === 'string' ? sp.q : undefined)

  // 1. Fetch cached terms and classes in parallel
  const [terms, classes] = await Promise.all([
    getCachedTerms(),
    getCachedClasses(),
  ])

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

  // 4. Fetch linked admission applications & parent links in parallel
  const admissionMap = new Map<string, any>()
  const parentMap = new Map<string, any>()

  const [appsResult, spResult] = await Promise.all([
    studentIds.length > 0 || admissionIds.length > 0
      ? serviceSupabase
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
          .then((r) => r, () => ({ data: [] as any[] }))
      : Promise.resolve({ data: [] as any[] }),
    studentIds.length > 0
      ? serviceSupabase
          .from('student_parents')
          .select('student_id, relationship, parent_id, profiles:parent_id(id, first_name, last_name, email, phone)')
          .in('student_id', studentIds)
          .then((r) => r, () => ({ data: [] as any[] }))
      : Promise.resolve({ data: [] as any[] }),
  ])

  ;(appsResult?.data || []).forEach((app: any) => {
    if (app.id) admissionMap.set(app.id, app)
    if (app.enrolled_student_id) admissionMap.set(app.enrolled_student_id, app)
  })

  ;(spResult?.data || []).forEach((sp: any) => {
    const pProf = Array.isArray(sp.profiles) ? sp.profiles[0] : sp.profiles
    if (pProf && !parentMap.has(sp.student_id)) {
      parentMap.set(sp.student_id, {
        name: `${pProf.first_name || ''} ${pProf.last_name || ''}`.trim(),
        relationship: sp.relationship || 'Parent',
        email: pProf.email,
        phone: pProf.phone,
      })
    }
  })

  const allMappedStudents = studentsList.map((s: any) => {
    const profs = s.profiles
    const singleProfile = Array.isArray(profs) ? profs[0] : profs
    const linkedApp = admissionMap.get(s.admission_id) || admissionMap.get(s.id)
    const linkedParent = parentMap.get(s.id)
    const wing = inferWing({
      wing: s.wing,
      curriculum: linkedApp?.curriculum,
      grade_level: s.grade_level,
    })

    return {
      id: s.id,
      student_id: s.student_id,
      grade_level: s.grade_level,
      section: s.section,
      wing,
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

  // Enforce strict server-side wing isolation for wing-assigned staff
  const mappedStudentsList =
    wingContext.assignedWing === 'Cambridge' || wingContext.assignedWing === 'NECTA'
      ? allMappedStudents.filter((s) => matchesWingFilter(s, wingContext.assignedWing))
      : allMappedStudents

  const scopedClasses =
    wingContext.assignedWing === 'Cambridge' || wingContext.assignedWing === 'NECTA'
      ? (classes || []).filter((c: any) => matchesWingFilter(c, wingContext.assignedWing))
      : classes || []

  return (
    <div className="space-y-4">
      <ListToolbar searchPlaceholder="Search by student ID or grade..." initialSearch={q || ''} initialPerPage={perPage} />
      <StudentsListClient
        initialStudents={mappedStudentsList}
        userRoles={roles}
        terms={terms || []}
        classes={scopedClasses}
        assignedWing={wingContext.assignedWing}
        initialWingFilter={wingContext.activeWingFilter}
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
