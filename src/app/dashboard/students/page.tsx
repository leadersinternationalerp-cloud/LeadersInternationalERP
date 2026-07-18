import { createClient } from '@/utils/supabase/server'
import StudentsListClient from './StudentsListClient'

export default async function StudentsPage() {
  const supabase = await createClient()

  // 1. Verify access (Admin, Director, Principal, Dean, HOS, Teacher)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2></div>
  }

  const { data: profile } = await supabase.from('profiles').select('roles, role').eq('id', user.id).single()
  const userRoles: string[] = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  const isAuthorized = userRoles.includes('System Admin') ||
                      userRoles.includes('Director') ||
                      userRoles.includes('Principal') ||
                      userRoles.includes('Dean') ||
                      userRoles.includes('HOS') ||
                      userRoles.includes('Teacher')

  if (!isAuthorized) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2></div>
  }

  // 2. Fetch terms and classes for generators
  const { data: terms } = await supabase.from('terms').select('*').order('created_at', { ascending: false })
  const { data: classes } = await supabase.from('classes').select('*').order('class_name', { ascending: true })

  // 3. Fetch students joining with profiles
  const { data: students } = await supabase
    .from('students')
    .select(`
      id,
      student_id,
      grade_level,
      section,
      class_id,
      profiles (first_name, last_name, email, phone)
    `)
    .order('created_at', { ascending: false })

  let studentsList = students || []

  // 4. Scope filtering for Teachers
  if (
    userRoles.includes('Teacher') && 
    !userRoles.includes('System Admin') && 
    !userRoles.includes('Director') && 
    !userRoles.includes('Principal') && 
    !userRoles.includes('HOS') && 
    !userRoles.includes('Dean')
  ) {
    const { data: classSubjects } = await supabase
      .from('class_subjects')
      .select('classes (name, section)')
      .eq('teacher_id', user.id)

    const assignedClasses = classSubjects?.map((cs: any) => cs.classes).filter(Boolean) || []
    
    studentsList = studentsList.filter(s => {
      return assignedClasses.some((ac: any) => 
        ac.name === s.grade_level && 
        (ac.section === s.section || (!ac.section && !s.section))
      )
    })
  }

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
      profiles: singleProfile ? {
        first_name: singleProfile.first_name,
        last_name: singleProfile.last_name,
        email: singleProfile.email
      } : undefined
    }
  })

  return (
    <StudentsListClient 
      initialStudents={mappedStudentsList} 
      userRoles={userRoles} 
      terms={terms || []}
      classes={classes || []}
    />
  )
}
