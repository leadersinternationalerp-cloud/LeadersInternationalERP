import { createClient } from '@/utils/supabase/server'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()

  // 1. Verify user role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  const isAdmin = profile?.role === 'System Admin' || profile?.role === 'Director'

  if (!isAdmin) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  // 2. Fetch system settings
  const { data: settingsData } = await supabase
    .from('system_settings')
    .select('*')

  const settings: Record<string, any> = {}
  settingsData?.forEach((item) => {
    settings[item.key] = item.value
  })

  // 3. Fetch academic years
  const { data: academicYears } = await supabase
    .from('academic_years')
    .select('*')
    .order('name', { ascending: false })

  return (
    <SettingsClient
      initialSettings={settings}
      initialAcademicYears={academicYears || []}
    />
  )
}
