import { createClient } from '@/utils/supabase/server'
import LeaveConfigClient from './LeaveConfigClient'

export default async function LeaveConfigPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
    
  const userRoles = profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : []

  if (!user || (!userRoles.includes('Accountant') && !userRoles.includes('System Admin') && !userRoles.includes('Director'))) {
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
    .eq('key', 'leave_config')
    .single()

  const initialConfig = setting?.value || {}

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>HR Configurations</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Configure leave entitlements and salary advance rules.
        </p>
      </div>

      <LeaveConfigClient initialConfig={initialConfig} />
    </div>
  )
}
