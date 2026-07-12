import { createClient } from '@/utils/supabase/server'
import { markNotificationsReadAction } from '../staff/actions'
import NotificationsClient from './NotificationsClient'

export default async function NotificationsPage() {
  const supabase = await createClient()

  // Fetch notifications for the user
  const { data: { user } } = await supabase.auth.getUser()
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  async function handleMarkAllRead() {
    'use server'
    await markNotificationsReadAction()
  }

  async function handleMarkRead(id: string) {
    'use server'
    if (id) {
      await markNotificationsReadAction(id)
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>My Notifications</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
            You have {unreadCount} unread notifications.
          </p>
        </div>
        
        {unreadCount > 0 && (
          <form action={handleMarkAllRead}>
            <button type="submit" className="btn" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              Mark All as Read
            </button>
          </form>
        )}
      </div>

      <NotificationsClient 
        initialNotifications={notifications || []} 
        markReadAction={handleMarkRead} 
      />
    </div>
  )
}
