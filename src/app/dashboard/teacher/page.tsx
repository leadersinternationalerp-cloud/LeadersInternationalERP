import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import {
  Users, Calendar as CalendarIcon, BookOpen, PenTool,
  AlertCircle, Bell, BellRing
} from 'lucide-react'
import { formatDate } from '@/utils/date'

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
    
  const userRoles = profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : []

  if (!user || (!userRoles.includes('Teacher') && !userRoles.includes('System Admin'))) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>This portal is for Teachers only.</p>
      </div>
    )
  }

  // Fetch classes assigned to this teacher
  const { data: classSubjects } = await supabase
    .from('class_subjects')
    .select(`
      id,
      classes (id, name, section),
      subjects (id, name)
    `)
    .eq('teacher_id', user.id)

  // Fetch pending lesson plans
  const { count: pendingPlans } = await supabase
    .from('lesson_plans')
    .select('id', { count: 'exact', head: true })
    .eq('teacher_id', user.id)
    .in('status', ['Draft', 'Returned'])

  // Fetch unread notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)
    
  const unreadCount = notifications?.filter(n => !n.is_read).length || 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>Teacher Dashboard</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage your classes, students, and academic tasks.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/dashboard/teacher/lesson-plans/new" className="btn btn-primary">
            + Lesson Plan
          </Link>
          <Link href="/dashboard/teacher/homework/new" className="btn" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            + Homework
          </Link>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 179, 195, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <Users size={24} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>My Classes</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>{classSubjects?.length || 0}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <CalendarIcon size={24} color="var(--color-success)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Attendance</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>Record</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <BookOpen size={24} color="var(--color-warning)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Homework</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-warning)' }}>Manage</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 179, 195, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <PenTool size={24} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Marks</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>Enter</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <AlertCircle size={24} color="var(--color-error)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Submissions</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-error)' }}>{pendingPlans || 0}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: unreadCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 179, 195, 0.1)', borderRadius: 'var(--radius-md)' }}>
            {unreadCount > 0 ? <BellRing size={24} color="var(--color-warning)" /> : <Bell size={24} color="var(--color-primary)" />}
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Notifications</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: unreadCount > 0 ? 'var(--color-warning)' : 'var(--color-text)' }}>{unreadCount}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* My Classes Widget */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 2 }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-text)' }}>My Assigned Classes</h2>
          {(!classSubjects || classSubjects.length === 0) ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No classes assigned yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem 0', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Class</th>
                  <th style={{ padding: '0.75rem 0', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Subject</th>
                  <th style={{ padding: '0.75rem 0', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: '0.85rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {classSubjects.map((cs: any) => (
                  <tr key={cs.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem 0', fontWeight: 600 }}>{cs.classes?.name} <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>{cs.classes?.section}</span></td>
                    <td style={{ padding: '1rem 0', color: 'var(--color-text)' }}>{cs.subjects?.name}</td>
                    <td style={{ padding: '1rem 0' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link href={`/dashboard/teacher/attendance?class=${cs.classes?.id}`} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--color-border)' }}>
                          Attendance
                        </Link>
                        <Link href={`/dashboard/teacher/marks?class=${cs.classes?.id}&subject=${cs.subjects?.id}`} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--color-border)' }}>
                          Marks
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Notifications Feed */}
        <div className="glass-panel" style={{ padding: '1.5rem', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Bell size={20} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>Recent Notifications</h3>
          </div>
          {(!notifications || notifications.length === 0) ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>You're all caught up!</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notifications.map(note => (
                <div key={note.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '0.9rem', color: note.is_read ? 'var(--color-text-muted)' : 'var(--color-text)', fontWeight: note.is_read ? 400 : 600 }}>{note.message}</span>
                    {!note.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-error)', flexShrink: 0, marginTop: 4 }} />}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{formatDate(note.created_at)}</span>
                    {note.link_url && (
                      <Link href={note.link_url} style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none' }}>View Details</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
