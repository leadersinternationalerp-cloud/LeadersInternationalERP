import { createClient } from '@/utils/supabase/server'
import ResultsClient, { MarkRecord } from './ResultsClient'

export default async function StudentResultsPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles, role')
    .eq('id', user?.id)
    .single()
    
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Student') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch released marks
  const { data: marks } = await supabase
    .from('marks')
    .select(`
      id,
      score,
      term,
      assessment_type,
      remarks,
      subjects(name)
    `)
    .eq('student_id', user?.id)
    .eq('is_released', true)
    .order('created_at', { ascending: false })

  // Fetch grading scale
  const { data: settingData } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'grading_scale')
    .maybeSingle()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          My Academic Results
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          View your official academic performance across all terms.
        </p>
      </div>
 
      <ResultsClient marks={(marks as unknown as MarkRecord[]) || []} initialGradingScale={settingData?.value} />
    </div>
  )
}
