import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import InactivityTimeout from '@/components/InactivityTimeout'
import DashboardLayoutClient from '@/components/DashboardLayoutClient'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile && !profile.is_active) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', padding: '2rem' }}>
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', border: '1px solid var(--color-error)' }}>
          <h1 style={{ color: 'var(--color-error)', fontSize: '2rem', marginBottom: '1rem' }}>Account Suspended ⚠️</h1>
          <p style={{ color: 'var(--color-text)', marginBottom: '1.5rem' }}>
            Your account has been suspended by the school administration. If you believe this is an error, please contact your System Administrator.
          </p>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Go Back to Login
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Roles
  const userRoles: string[] = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role 
        ? profile.role.split(',').map((r: string) => r.trim()) 
        : (user?.email === 'admin@leaders.ac.tz' ? ['System Admin'] : []))

  // Fetch unread notifications count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  // Fetch 5 most recent notifications
  const { data: recentNotifications } = await supabase
    .from('notifications')
    .select('id, title, message, is_read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <>
      <InactivityTimeout />
      <DashboardLayoutClient 
        profile={profile} 
        userRoles={userRoles} 
        unreadCount={unreadCount || 0}
        recentNotifications={recentNotifications || []}
      >
        {children}
      </DashboardLayoutClient>
    </>
  )
}
