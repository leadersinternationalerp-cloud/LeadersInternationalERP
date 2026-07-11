import { createClient } from '@/utils/supabase/server'
import BackupsClient from './BackupsClient'

export default async function BackupsPage() {
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

  // 2. Fetch historical backups joining creator profile
  const { data: backups, error } = await supabase
    .from('backups')
    .select(`
      id,
      file_name,
      file_size_kb,
      status,
      created_at,
      profiles (
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Error Loading Backups</h2>
        <p>{error.message}</p>
      </div>
    )
  }

  return <BackupsClient initialBackups={backups || []} />
}
