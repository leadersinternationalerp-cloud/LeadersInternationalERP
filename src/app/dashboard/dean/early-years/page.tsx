import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import EarlyYearsReportGenerator from '@/components/EarlyYearsReportGenerator'

export default async function DeanEarlyYearsPage() {
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

  const isDean = userRoles.includes('System Admin') ||
                 userRoles.includes('Dean') ||
                 userRoles.includes('Principal') ||
                 userRoles.includes('HOS') ||
                 userRoles.includes('Director')

  if (!isDean) {
    redirect('/dashboard')
  }

  const isEarlyYearsClass = (c: any) => {
    if (!c) return false
    if (c.is_early_years) return true
    const nameStr = (c.name || c.class_name || '').toLowerCase()
    return ['baby', 'nursery', 'reception', 'kg', 'playgroup', 'pre-primary'].some(ey => nameStr.includes(ey))
  }

  // 3. Load early years classes
  const { data: allEY } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true })

  const eyClasses = (allEY || []).filter(isEarlyYearsClass)

  // 4. Load academic terms
  const { data: termsData } = await supabase
    .from('terms')
    .select('*, academic_years(name)')
    .order('created_at', { ascending: false })

  const terms = (termsData || []).map((t: any) => ({
    id: t.id,
    term_name: t.name || t.term_name || 'Term',
    academic_year: t.academic_years?.name || t.academic_year || '',
    is_current: t.is_current
  }))

  // 5. Load initial students for the first class
  let initialStudents: any[] = []
  if (eyClasses.length > 0) {
    const firstClassId = eyClasses[0].id
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
          EYFS Progress Reports Portal (Dean)
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Review student developmental progress reports across all early years classes and print/compile cards.
        </p>
      </div>

      <EarlyYearsReportGenerator 
        classes={eyClasses} 
        terms={terms || []} 
        initialStudents={initialStudents}
        roleLabel="Dean of Studies"
      />
    </div>
  )
}
