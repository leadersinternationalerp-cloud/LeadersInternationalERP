import { createClient } from '@/utils/supabase/server'
import ReportCardsGenerator from '@/components/ReportCardsGenerator'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function TeacherReportCardsPage() {
  const supabase = await createClient()

  // 1. Verify access
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2></div>
  }

  const { data: profile } = await supabase.from('profiles').select('roles, role').eq('id', user.id).single()
  const userRoles: string[] = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Teacher') && !userRoles.includes('System Admin')) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2></div>
  }

  // 2. Fetch terms
  const { data: termsData } = await supabase
    .from('terms')
    .select('*')
    .order('created_at', { ascending: false })

  const terms = (termsData || []).map(t => ({
    id: t.id,
    term_name: t.term_name || t.name || 'Term',
    academic_year: t.academic_year || '2026-2027'
  }))

  // 3. Fetch Teacher's assigned classes
  let classes: any[] = []
  if (userRoles.includes('System Admin')) {
    const { data: allCls } = await supabase
      .from('classes')
      .select('*')
      .order('name', { ascending: true })
    classes = (allCls || []).map(c => ({
      id: c.id,
      class_name: c.name || '',
      section: c.section || '',
      name: c.name || ''
    }))
  } else {
    const { data: classSubjects } = await supabase
      .from('class_subjects')
      .select(`
        class_id,
        classes:class_id (id, name, section)
      `)
      .eq('teacher_id', user.id)

    // Deduplicate classes
    const uniqueClassMap = new Map<string, any>()
    if (classSubjects) {
      classSubjects.forEach((cs: any) => {
        if (cs.classes && cs.classes.id) {
          uniqueClassMap.set(cs.classes.id, {
            id: cs.classes.id,
            class_name: cs.classes.name || '',
            section: cs.classes.section || '',
            name: cs.classes.name || ''
          })
        }
      })
    }
    classes = Array.from(uniqueClassMap.values())
  }

  // 4. Fetch initial student list for the first class
  let initialStudents: any[] = []
  const firstClassId = classes[0]?.id

  if (firstClassId) {
    const { data: stdData } = await supabase
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
    
    initialStudents = (stdData || []).map((s: any) => {
      const profs = s.profiles
      const singleProfile = Array.isArray(profs) ? profs[0] : profs
      return {
        id: s.id,
        student_id: s.student_id,
        grade_level: s.grade_level,
        section: s.section,
        photo_url: `/api/students/photo?student_id=${s.id}`,
        class_id: s.class_id,
        profiles: singleProfile ? {
          first_name: singleProfile.first_name,
          last_name: singleProfile.last_name,
          email: singleProfile.email
        } : undefined
      }
    })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link href="/dashboard/teacher" className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem' }}>
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Report Cards Manager</h1>
      </div>

      {classes.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ color: 'var(--color-text-muted)' }}>No Assigned Classes</h3>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            You are not currently assigned as a teacher for any subjects or classes.
          </p>
        </div>
      ) : (
        <ReportCardsGenerator 
          classes={classes} 
          terms={terms} 
          initialStudents={initialStudents} 
          roleLabel={userRoles.includes('System Admin') ? 'System Admin' : 'Class Teacher'} 
        />
      )}
    </div>
  )
}
