import { createClient } from '@/utils/supabase/server'
import GradingClient from './GradingClient'

export default async function GradingConfigPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
    
  const userRoles = profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : []

  if (!user || (!userRoles.includes('System Admin') && !userRoles.includes('Director'))) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch existing config
  const { data: setting } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'grading_scale')
    .single()

  const initialConfig = setting?.value || {}

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>Grading Scale Configuration</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Define the school-wide grading scale thresholds.
        </p>
      </div>

      <GradingClient initialConfig={initialConfig} />
    </div>
  )
}
