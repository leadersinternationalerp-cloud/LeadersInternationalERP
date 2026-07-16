import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import {
  Users, UsersRound, DollarSign, Wallet, FileText,
  Calendar as CalendarIcon, CheckCircle, AlertCircle, LineChart, Banknote
} from 'lucide-react'
import { formatDate } from '@/utils/date'

export default async function DirectorDashboardPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
    
  const userRoles = profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : []

  if (!user || (!userRoles.includes('Director') && !userRoles.includes('System Admin'))) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch Summary Metrics
  const [{ count: totalStudents }, { count: totalStaff }] = await Promise.all([
    supabase.from('students').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['Teacher', 'Principal', 'Dean', 'Head of Section', 'Accountant', 'Director'])
  ])

  // Simplified Fee logic for display
  const { data: invoices } = await supabase.from('invoices').select('net_amount, total_paid, status')
  let feesCollected = 0
  let feesOutstanding = 0
  invoices?.forEach(inv => {
    const netAmount = Number(inv.net_amount || 0)
    const paidAmount = Number(inv.total_paid || 0)
    feesCollected += paidAmount
    feesOutstanding += (netAmount - paidAmount)
  })

  // Pending Items
  const [{ count: pendingLeave }, { count: pendingAdvances }] = await Promise.all([
    supabase.from('leave_applications').select('id', { count: 'exact', head: true }).in('status', ['Submitted', 'Reviewed_Principal']),
    supabase.from('salary_advances').select('id', { count: 'exact', head: true }).in('status', ['Submitted', 'Reviewed_Principal'])
  ])

  // Recent Activity Feed
  const { data: recentLogs } = await supabase
    .from('audit_logs')
    .select('action, entity, created_at, profiles(first_name, last_name)')
    .order('created_at', { ascending: false })
    .limit(5)

  // Upcoming Events
  const { data: upcomingEvents } = await supabase
    .from('calendar_events')
    .select('*')
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true })
    .limit(5)

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `TZS ${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `TZS ${(amount / 1000).toFixed(0)}K`
    return `TZS ${amount}`
  }

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.85rem', color: 'var(--color-primary)', margin: 0 }}>Director Overview</h1>
          <p className="page-subtitle">
            Executive summary of school operations, finances, and administration.
          </p>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid-auto stagger-children">
        <div className="stat-card animate-fade-up">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 179, 195, 0.1)' }}>
            <UsersRound size={20} color="var(--color-secondary)" />
          </div>
          <span className="stat-label">Total Students</span>
          <span className="stat-value" style={{ color: 'var(--color-secondary)' }}>{totalStudents || 0}</span>
        </div>

        <div className="stat-card animate-fade-up">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(0, 38, 75, 0.08)' }}>
            <Users size={20} color="var(--color-primary)" />
          </div>
          <span className="stat-label">Total Staff</span>
          <span className="stat-value" style={{ color: 'var(--color-primary)' }}>{totalStaff || 0}</span>
        </div>

        <div className="stat-card animate-fade-up">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <Wallet size={20} color="var(--color-success)" />
          </div>
          <span className="stat-label">Fees Collected</span>
          <span className="stat-value" style={{ color: 'var(--color-success)' }}>{formatCurrency(feesCollected)}</span>
        </div>

        <div className="stat-card animate-fade-up">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
            <DollarSign size={20} color="var(--color-error)" />
          </div>
          <span className="stat-label">Outstanding Fees</span>
          <span className="stat-value" style={{ color: 'var(--color-error)' }}>{formatCurrency(feesOutstanding)}</span>
        </div>
      </div>

      {/* Quick Action Links */}
      <div className="grid-auto" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <Link href="/dashboard/director/attendance" className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s' }}>
          <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: 'rgba(59, 179, 195, 0.1)' }}>
            <CheckCircle size={22} color="var(--color-secondary)" />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>Staff Attendance</span>
        </Link>
        <Link href="/dashboard/director/finance" className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s' }}>
          <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
            <LineChart size={22} color="var(--color-success)" />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>Financial Overview</span>
        </Link>
        <Link href="/dashboard/director/payrolls" className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s' }}>
          <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: 'rgba(247, 178, 57, 0.1)' }}>
            <Banknote size={22} color="var(--color-accent)" />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>Manage Payrolls</span>
        </Link>
        <Link href="/dashboard/director/applications" className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s' }}>
          <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
            <FileText size={22} color="var(--color-warning)" />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>Self-Service Inbox</span>
        </Link>
        <Link href="/dashboard/accountant/accounting/statements" className="glass-panel" style={{ padding: '1.25rem', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s' }}>
          <div style={{ padding: '0.5rem', borderRadius: '50%', backgroundColor: 'rgba(0, 38, 75, 0.08)' }}>
            <Wallet size={22} color="var(--color-primary)" />
          </div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text)' }}>Financial Statements</span>
        </Link>
      </div>

      {/* Widgets Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Pending Items Widget */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <AlertCircle size={20} color="var(--color-warning)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>Action Required</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ color: 'var(--color-text)' }}>Pending Leave Applications</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 600, color: (pendingLeave || 0) > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{pendingLeave || 0}</span>
                <Link href="/dashboard/director/leave-requests" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none' }}>Review</Link>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
              <span style={{ color: 'var(--color-text)' }}>Pending Salary Advances</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontWeight: 600, color: (pendingAdvances || 0) > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)' }}>{pendingAdvances || 0}</span>
                <Link href="/dashboard/director/salary-advances" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none' }}>Review</Link>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <CalendarIcon size={20} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>Upcoming Events</h3>
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

      {/* Widgets Row 2 */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <FileText size={20} color="var(--color-primary)" />
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>Recent Activity Feed</h3>
        </div>
        {(!recentLogs || recentLogs.length === 0) ? (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No recent activity recorded.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentLogs.map((log: any, idx: number) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--color-primary)', marginTop: 6 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--color-text)', fontSize: '0.9rem' }}>
                    <strong>{log.profiles?.first_name} {log.profiles?.last_name}</strong> performed <strong>{log.action}</strong> on <em>{log.entity}</em>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    {formatDate(log.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
