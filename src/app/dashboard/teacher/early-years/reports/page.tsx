import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import EarlyYearsReportGenerator from '@/components/EarlyYearsReportGenerator'

export default async function TeacherEarlyYearsReportsPage() {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch profile and roles
  const { data: prof } = await supabase.from('profiles').select('roles, role').eq('id', user.id).single()
  const userRoles: string[] = prof?.roles && Array.isArray(prof.roles) && prof.roles.length > 0
    ? prof.roles
    : (prof?.role ? prof.role.split(',').map((r: string) => r.trim()) : [])

  const isStaff = userRoles.includes('System Admin') ||
                  userRoles.includes('Principal') ||
                  userRoles.includes('Dean') ||
                  userRoles.includes('HOS') ||
                  userRoles.includes('Teacher') ||
                  userRoles.includes('Director')

  if (!isStaff) {
    redirect('/dashboard')
  }

  const isManagement = userRoles.includes('System Admin') ||
                       userRoles.includes('Principal') ||
                       userRoles.includes('Dean') ||
                       userRoles.includes('HOS') ||
                       userRoles.includes('Director')

  // 3. Load early years classes
  let classes: any[] = []
  if (isManagement) {
    const { data: allEY } = await supabase
      .from('classes')
      .select('*')
      .eq('is_early_years', true)
      .order('name', { ascending: true })
    classes = allEY || []
    
    // Fallback if none seeded yet
    if (classes.length === 0) {
      const { data: fallback } = await supabase.from('classes').select('*').limit(10)
      classes = fallback || []
    }
  } else {
    // Teacher specific classes (homeroom + subject assignment)
    const { data: homeroom } = await supabase
      .from('classes')
      .select('*')
      .eq('class_teacher_id', user.id)

    const { data: assignments } = await supabase
      .from('class_subjects')
      .select('classes (*)')
      .eq('teacher_id', user.id)

    const assignedClasses = (assignments || []).map((a: any) => a.classes).filter(Boolean)
    const combined = [...(homeroom || []), ...assignedClasses]
    
    // Deduplicate
    const uniqueIds = new Set<string>()
    classes = combined.filter(c => {
      if (uniqueIds.has(c.id)) return false
      uniqueIds.add(c.id)
      return true
    })

    // Filter early years or sort by is_early_years descending
    classes.sort((a, b) => (b.is_early_years ? 1 : 0) - (a.is_early_years ? 1 : 0))
  }

  // 4. Load academic terms
  const { data: terms } = await supabase
    .from('terms')
    .select('*')
    .order('created_at', { ascending: false })

  // 5. Load initial students for the first class
  let initialStudents: any[] = []
  if (classes.length > 0) {
    const firstClassId = classes[0].id
    const { data: directStudents } = await supabase
      .from('students')
      .select(`
        id,
        student_id,
        grade_level,
        section,
        class_id,
        profiles (first_name, last_name, email)
      `)
      .eq('class_id', firstClassId)
    
    initialStudents = (directStudents || []).map((s: any) => {
      const sp = Array.isArray(s.profiles) ? s.profiles[0] : s.profiles
      return {
        id: s.id,
        student_id: s.student_id,
        grade_level: s.grade_level,
        section: s.section,
        photo_url: `/api/students/photo?student_id=${s.id}`,
        class_id: s.class_id,
        profiles: sp ? {
          first_name: sp.first_name,
          last_name: sp.last_name,
          email: sp.email
        } : undefined
      }
    })
  }

  return (
    <div className="container-fluid" style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          EYFS Progress Report Cards
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Generate, print, and compile Early Years Foundation Stage (EYFS) reports.
        </p>
      </div>

      <EarlyYearsReportGenerator 
        classes={classes} 
        terms={terms || []} 
        initialStudents={initialStudents}
        roleLabel="Class Teacher"
      />
    </div>
  )
}
