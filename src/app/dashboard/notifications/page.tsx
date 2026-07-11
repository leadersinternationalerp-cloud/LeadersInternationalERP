import { createClient } from '@/utils/supabase/server'
import { markNotificationsReadAction } from '../staff/actions'
import Link from 'next/link'

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

  async function handleMarkRead(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
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

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {notifications?.map((notif: any) => (
            <div
              key={notif.id}
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: notif.is_read ? 'transparent' : 'rgba(59, 179, 195, 0.05)',
                transition: 'background-color 200ms'
              }}
            >
              <div style={{ flex: 1, paddingRight: '2rem' }}>
                <div style={{
                  fontWeight: notif.is_read ? 400 : 600,
                  color: notif.is_read ? 'var(--color-text)' : 'var(--color-primary)'
                }}>
                  {notif.message}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  {new Date(notif.created_at).toLocaleString()}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {notif.link_url && (
                  <Link href={notif.link_url} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                    View details
                  </Link>
                )}

                {!notif.is_read && (
                  <form action={handleMarkRead}>
                    <input type="hidden" name="id" value={notif.id} />
                    <button type="submit" style={{
                      background: 'transparent', border: 'none', color: 'var(--color-secondary)',
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer'
                    }}>
                      Mark read
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}

          {(!notifications || notifications.length === 0) && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <h3>No Notifications</h3>
              <p style={{ marginTop: '0.5rem' }}>You are all caught up!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
