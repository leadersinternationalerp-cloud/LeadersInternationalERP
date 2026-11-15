import { normalizeRoles } from '@/lib/auth/roles'
import { createClient } from '@/utils/supabase/server'
import GradingClient from './GradingClient'

export default async function GradingConfigPage() {
  const supabase = await createClient()

  // Verify access
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()

  const userRoles = normalizeRoles(profile)
  const isAuthorized =
    userRoles.includes('System Admin') ||
    userRoles.includes('Director') ||
    userRoles.includes('Principal') ||
    userRoles.includes('Dean')

  if (!user || !isAuthorized) {
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
    .maybeSingle()

  const initialConfig = setting?.value || null

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Grading Scale Configuration
        </h1>
        <p
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '0.9rem',
            marginTop: '0.25rem',
          }}
        >
          Define the school-wide grading scale thresholds used across Marks Entry,
          Marks Overviews, and Official PDF Report Cards.
        </p>
      </div>

      <GradingClient initialConfig={initialConfig} />
    </div>
  )
}
