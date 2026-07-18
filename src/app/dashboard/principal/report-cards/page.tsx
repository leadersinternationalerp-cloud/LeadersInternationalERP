import { createClient } from '@/utils/supabase/server'
import ReportCardsGenerator from '@/components/ReportCardsGenerator'
import Link from 'next/link'
import { ChevronLeft, History } from 'lucide-react'

export default async function PrincipalReportCardsPage() {
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

  const isAuthorized = userRoles.includes('Principal') || 
                      userRoles.includes('Dean') || 
                      userRoles.includes('HOS') || 
                      userRoles.includes('Director') || 
                      userRoles.includes('System Admin')

  if (!isAuthorized) {
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

  // 3. Fetch all classes
  const { data: classesData } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true })
  
  const classes = (classesData || []).map(c => ({
    id: c.id,
    class_name: c.name || '',
    section: c.section || '',
    name: c.name || ''
  }))

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

  // 5. Fetch recent 10 releases
  const { data: releases } = await supabase
    .from('report_card_releases')
    .select(`
      *,
      term:term_id (term_name),
      class:class_id (class_name),
      publisher:published_by (first_name, last_name)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  // Label for current role
  let roleLabel = 'Principal'
  if (userRoles.includes('System Admin')) roleLabel = 'System Admin'
  else if (userRoles.includes('Director')) roleLabel = 'Director'
  else if (userRoles.includes('Dean')) roleLabel = 'Dean of Studies'
  else if (userRoles.includes('HOS')) roleLabel = 'Head of Section'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link href="/dashboard" className="btn btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.5rem' }}>
          <ChevronLeft size={16} /> Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Official Report Card Generator</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '2rem', alignItems: 'start' }}>
        {/* Main Generator Form and list */}
        <div>
          {classes.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ color: 'var(--color-text-muted)' }}>No Classes</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                No classes have been created in the system yet.
              </p>
            </div>
          ) : (
            <ReportCardsGenerator 
              classes={classes} 
              terms={terms} 
              initialStudents={initialStudents} 
              roleLabel={roleLabel} 
            />
          )}
        </div>

        {/* Releases Audit Panel */}
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', fontWeight: 700, borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
            <History size={18} />
            Recent Releases
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(releases || []).map((release: any) => {
              const pName = release.publisher ? `${release.publisher.first_name || ''} ${release.publisher.last_name || ''}`.trim() : 'System'
              return (
                <div key={release.id} style={{ fontSize: '0.8rem', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{release.class?.class_name || 'Class'}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-success)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Published</span>
                  </div>
                  <div style={{ marginTop: '0.25rem', color: 'var(--color-text-muted)' }}>
                    Term: <strong>{release.term?.term_name || 'Term'}</strong>
                  </div>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Published By: {pName}
                  </div>
                  <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {new Date(release.published_at || release.created_at).toLocaleString()}
                  </div>
                </div>
              )
            })}

            {(!releases || releases.length === 0) && (
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                No active releases audited.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
