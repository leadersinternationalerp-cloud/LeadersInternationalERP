import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()
  const userRoles: string[] = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  // Role-based redirections for pure student/parent users
  if (userRoles.includes('Student') && userRoles.length === 1) {
    redirect('/dashboard/student')
  }
  if (userRoles.includes('Parent') && userRoles.length === 1) {
    redirect('/dashboard/parent/dashboard')
  }

  // 1. Fetch KPI totals for Director/Principal/Accountant
  const { count: studentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })

  const { count: staffCount } = await supabase
    .from('staff')
    .select('*', { count: 'exact', head: true })

  const { count: pendingLeaves } = await supabase
    .from('leave_applications')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Pending')

  const { count: pendingAdvances } = await supabase
    .from('salary_advances')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Pending')

  // Fetch financial summary
  const { data: invoices } = await supabase
    .from('invoices')
    .select('net_amount, paid_amount')

  const totalInvoiced = (invoices || []).reduce((acc, curr) => acc + Number(curr.net_amount), 0)
  const totalCollected = (invoices || []).reduce((acc, curr) => acc + Number(curr.paid_amount), 0)
  const totalOutstanding = totalInvoiced - totalCollected

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--color-primary)', margin: 0 }}>
            Welcome back, {profile?.first_name}!
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
            Role: <strong>{userRoles.join(', ')}</strong> • Academic Year: <strong>2025-2026</strong>
          </p>
        </div>
        <Link href="/dashboard/profile" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          ⚙ Profile Settings
        </Link>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Enrolled Students</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-secondary)', margin: 0 }}>{studentCount || 0}</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Active School Staff</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-secondary)', margin: 0 }}>{staffCount || 0}</p>
        </div>

        {(userRoles.includes('Director') || userRoles.includes('Accountant') || userRoles.includes('System Admin')) && (
          <>
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Outstanding Fees (TZS)</h3>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-error)', margin: 0 }}>
                {formatTZS(totalOutstanding)}
              </p>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Collections (TZS)</h3>
              <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success)', margin: 0 }}>
                {formatTZS(totalCollected)}
              </p>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Quick Actions & Widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Action widgets by role */}
          {userRoles.includes('Director') && (
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Director Operations Control</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Review institutional finance status, authorize payroll proposals, manage leave balances, and review attendance metrics.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href="/dashboard/director/payrolls" className="btn btn-primary" style={{ textDecoration: 'none' }}>Approve Payrolls</Link>
                <Link href="/dashboard/director/staff" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Setup Staff Records</Link>
                <Link href="/dashboard/director/leave-requests" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Leave Requests ({pendingLeaves})</Link>
              </div>
            </div>
          )}

          {userRoles.includes('Principal') && (
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Principal Operations Control</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Review weekly lesson plans submitted by instructors, view generated class academic report cards, and endorse staff leave/advance workflows.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href="/dashboard/principal/lesson-plans" className="btn btn-primary" style={{ textDecoration: 'none' }}>Review Lesson Plans</Link>
                <Link href="/dashboard/principal/academic-reports" className="btn btn-secondary" style={{ textDecoration: 'none' }}>View Report Cards</Link>
                <Link href="/dashboard/principal/payrolls" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Review Draft Payrolls</Link>
              </div>
            </div>
          )}

          {userRoles.includes('Accountant') && (
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Accountant Financial Hub</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Generate monthly employee payroll summaries, setup base salaries, record payments, and dispatch unpaid fee alerts to parents.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href="/dashboard/accountant/payroll" className="btn btn-primary" style={{ textDecoration: 'none' }}>Generate Payroll</Link>
                <Link href="/dashboard/accountant/fee-reminders" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Send Fee Reminders</Link>
                <Link href="/dashboard/accountant/payments" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Collections</Link>
              </div>
            </div>
          )}

          {userRoles.includes('Teacher') && (
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Teacher Academic Control</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Mark biometric student attendance rosters, enter academic grading scores, manage class activities, and publish homework worksheets.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href="/dashboard/teacher/attendance" className="btn btn-primary" style={{ textDecoration: 'none' }}>Mark Attendance</Link>
                <Link href="/dashboard/teacher/marks" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Enter Grades</Link>
                <Link href="/dashboard/teacher/homework" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Publish Homework</Link>
              </div>
            </div>
          )}

          {/* System Admin panel */}
          {userRoles.includes('System Admin') && (
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>System Administration</h3>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Register database backups, inspect security logs, update core school parameters, and manage users credentials.
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <Link href="/dashboard/users" className="btn btn-primary" style={{ textDecoration: 'none' }}>User Management</Link>
                <Link href="/dashboard/admin/backups" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Backups Log</Link>
                <Link href="/dashboard/admin/audit-logs" className="btn btn-secondary" style={{ textDecoration: 'none' }}>Security Audits</Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pending Approvals / Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', fontWeight: 600 }}>Workflow Tasks Queue</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span>Pending Leave Requests</span>
                <span style={{
                  padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                  backgroundColor: pendingLeaves && pendingLeaves > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0,0,0,0.05)',
                  color: pendingLeaves && pendingLeaves > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)'
                }}>{pendingLeaves || 0} Pending</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                <span>Pending Salary Advances</span>
                <span style={{
                  padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                  backgroundColor: pendingAdvances && pendingAdvances > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0,0,0,0.05)',
                  color: pendingAdvances && pendingAdvances > 0 ? 'var(--color-warning)' : 'var(--color-text-muted)'
                }}>{pendingAdvances || 0} Pending</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
