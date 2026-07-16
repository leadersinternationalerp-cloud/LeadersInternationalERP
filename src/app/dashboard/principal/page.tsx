import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import {
  Users, UserCheck, FileText, FileBadge, FileSpreadsheet,
  Calendar as CalendarIcon, Briefcase, CreditCard, AlertCircle
} from 'lucide-react'
import { formatDate } from '@/utils/date'

export default async function PrincipalDashboardPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
    
  const userRoles = profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : []

  if (!user || (!userRoles.includes('Principal') && !userRoles.includes('System Admin'))) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch Summary Metrics
  const [
    { count: totalStudents },
    { count: totalStaff },
    { count: pendingLessonPlans },
    { count: pendingLeave },
    { count: pendingAdvances }
  ] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['Teacher', 'Principal', 'Dean', 'Head of Section', 'Accountant', 'Director']),
    supabase.from('lesson_plans').select('id', { count: 'exact', head: true }).eq('status', 'Submitted'),
    supabase.from('leave_applications').select('id', { count: 'exact', head: true }).eq('status', 'Submitted'),
    supabase.from('salary_advances').select('id', { count: 'exact', head: true }).eq('status', 'Submitted')
  ])

  // Calendar Events
  const { data: upcomingEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(7)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>Principal Dashboard</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Daily operations, staff oversight, and academic administration.
        </p>
      </div>

      {/* Summary Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 179, 195, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <Users size={24} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Students</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>{totalStudents || 0}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 179, 195, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <UserCheck size={24} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Staff</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>{totalStaff || 0}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <FileText size={24} color="var(--color-error)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pending Plans</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-error)' }}>{pendingLessonPlans || 0}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <Briefcase size={24} color="var(--color-warning)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pending Leave</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-warning)' }}>{pendingLeave || 0}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <CreditCard size={24} color="var(--color-warning)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Salary Advances</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-warning)' }}>{pendingAdvances || 0}</div>
          </div>
        </div>
      </div>

      {/* Widgets Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Action Required Widget */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <AlertCircle size={20} color="var(--color-error)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>Action Required</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ color: 'var(--color-text)' }}>Lesson Plans</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 600, color: (pendingLessonPlans || 0) > 0 ? 'var(--color-error)' : 'var(--color-text-muted)' }}>{pendingLessonPlans || 0}</span>
                <Link href="/dashboard/principal/lesson-plans" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none' }}>Review</Link>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ color: 'var(--color-text)' }}>Staff Leave Requests</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 600, color: (pendingLeave || 0) > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{pendingLeave || 0}</span>
                <Link href="/dashboard/principal/leave-requests" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none' }}>Review</Link>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ color: 'var(--color-text)' }}>Salary Advance Requests</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 600, color: (pendingAdvances || 0) > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{pendingAdvances || 0}</span>
                <Link href="/dashboard/principal/salary-advances" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none' }}>Review</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Events Preview */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <CalendarIcon size={20} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>Calendar Preview (Next 7 Days)</h3>
          </div>
          {(!upcomingEvents || upcomingEvents.length === 0) ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No upcoming events scheduled.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {upcomingEvents.map(event => (
                <div key={event.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500, color: 'var(--color-text)' }}>{event.title}</span>
                    <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--color-surface)', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)' }}>
                      {event.event_type}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{formatDate(event.start_date)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
