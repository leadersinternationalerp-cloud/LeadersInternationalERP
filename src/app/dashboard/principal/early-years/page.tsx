import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import EarlyYearsReportGenerator from '@/components/EarlyYearsReportGenerator'

export default async function PrincipalEarlyYearsPage() {
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

  const isPrincipal = userRoles.includes('System Admin') ||
                      userRoles.includes('Principal') ||
                      userRoles.includes('Dean') ||
                      userRoles.includes('HOS') ||
                      userRoles.includes('Director')

  if (!isPrincipal) {
    redirect('/dashboard')
  }

  // 3. Load early years classes
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .eq('is_early_years', true)
    .order('name', { ascending: true })

  let eyClasses = classes || []
  if (eyClasses.length === 0) {
    const { data: fallback } = await supabase.from('classes').select('*').limit(10)
    eyClasses = fallback || []
  }

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

  // 5. Load recent EY report card publications
  const { data: recentReleases } = await supabase
    .from('report_card_releases')
    .select('*')
    .eq('is_early_years', true)
    .order('created_at', { ascending: false })
    .limit(10)

  // 6. Load initial students for the first class
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
          EYFS Progress Reports Portal (Principal)
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Publish and print Early Years Foundation Stage (EYFS) reports, track progress indicators, and configure releases.
        </p>
      </div>

      <EarlyYearsReportGenerator 
        classes={eyClasses} 
        terms={terms || []} 
        initialStudents={initialStudents}
        roleLabel="Principal"
      />

      {/* Publications List */}
      <div className="glass-panel" style={{ marginTop: '2rem', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '1rem' }}>
          Recent EYFS Report Releases
        </h2>
        {recentReleases && recentReleases.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--color-border)', textAlign: 'left', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  <th style={{ padding: '0.5rem' }}>Release Title</th>
                  <th style={{ padding: '0.5rem' }}>Term</th>
                  <th style={{ padding: '0.5rem' }}>Learning Areas</th>
                  <th style={{ padding: '0.5rem' }}>Date Released</th>
                  <th style={{ padding: '0.5rem', textAlign: 'center' }}>Published?</th>
                </tr>
              </thead>
              <tbody>
                {recentReleases.map(rel => (
                  <tr key={rel.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.5rem', fontWeight: 600, color: '#be185d' }}>{rel.title}</td>
                    <td style={{ padding: '0.5rem' }}>{rel.term_id}</td>
                    <td style={{ padding: '0.5rem' }}>{(rel.learning_areas_included || []).join(', ') || 'All'}</td>
                    <td style={{ padding: '0.5rem' }}>{new Date(rel.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
            No recent Early Years report card publications recorded.
          </div>
        )}
      </div>

    </div>
  )
}
