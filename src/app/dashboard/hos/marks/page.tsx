import { createClient } from '@/utils/supabase/server'
import HOSMarksClient from './HOSMarksClient'

export default async function HOSMarksPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
    
  const userRoles = profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : []

  if (!user || (!userRoles.includes('HOS') && !userRoles.includes('System Admin'))) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch marks with joins
  const { data: marksData, error } = await supabase
    .from('marks')
    .select(`
      id,
      score,
      term,
      assessment_type,
      is_released,
      subjects ( name ),
      classes ( name, section ),
      students (
        student_id,
        profiles ( first_name, last_name )
      )
    `)
    .order('term', { ascending: false })

  if (error) {
    console.error('Error fetching marks:', error)
  }

  // Fetch system settings for grading scale
  const { data: settingData } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'grading_scale')
    .maybeSingle()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Section Marks Overview
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Head of Section view of academic marks. Missing marks are highlighted in red. Use the class filter to focus on your specific section.
        </p>
      </div>

      <HOSMarksClient marks={(marksData as any[]) || []} initialGradingScale={settingData?.value} />
    </div>
  )
}
