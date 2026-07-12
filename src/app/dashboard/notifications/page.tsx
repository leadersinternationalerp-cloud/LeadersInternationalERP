import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })

  async function markReadAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const id = formData.get('id') as string

    if (id) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id)
      revalidatePath('/dashboard/notifications')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>My Notifications</h1>
      </div>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Date</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Message</th>
              <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {(notifications || []).map((notif: any) => (
              <tr key={notif.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: notif.is_read ? 'transparent' : 'rgba(59, 130, 246, 0.05)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{new Date(notif.created_at).toLocaleString()}</td>
                <td style={{ padding: '1rem' }}>{notif.message}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  {!notif.is_read && (
                    <form action={markReadAction}>
                      <input type="hidden" name="id" value={notif.id} />
                      <button type="submit" className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Mark Read</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {(!notifications || notifications.length === 0) && (
              <tr>
                <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  You're all caught up! No new notifications.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
