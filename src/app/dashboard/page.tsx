import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { 
  Users, UserCog, Wallet, TrendingDown, TrendingUp,
  ClipboardCheck, HandCoins, Settings, BookOpen, PenLine,
  Receipt, School, FileSpreadsheet, Umbrella, ArrowRight
} from 'lucide-react'

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
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.85rem', color: 'var(--color-primary)', margin: 0 }}>
            Welcome back, {profile?.first_name}!
          </h1>
          <p className="page-subtitle">
            Role: <strong>{userRoles.join(', ')}</strong> • Academic Year: <strong>2025-2026</strong>
          </p>
        </div>
        <div className="page-actions">
          <Link href="/dashboard/profile" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            <Settings size={16} /> Profile Settings
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid-auto stagger-children" style={{ '--auto-min': '220px' } as any}>
        
        <div className="stat-card animate-fade-up">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 179, 195, 0.1)' }}>
            <Users size={20} color="var(--color-secondary)" />
          </div>
          <span className="stat-label">Total Enrolled Students</span>
          <span className="stat-value" style={{ color: 'var(--color-secondary)' }}>{studentCount || 0}</span>
        </div>

        <div className="stat-card animate-fade-up">
          <div className="stat-icon" style={{ backgroundColor: 'rgba(0, 38, 75, 0.08)' }}>
            <UserCog size={20} color="var(--color-primary)" />
          </div>
          <span className="stat-label">Active School Staff</span>
          <span className="stat-value" style={{ color: 'var(--color-primary)' }}>{staffCount || 0}</span>
        </div>

        {(userRoles.includes('Director') || userRoles.includes('Accountant') || userRoles.includes('System Admin')) && (
          <>
            <div className="stat-card animate-fade-up">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)' }}>
                <TrendingDown size={20} color="var(--color-error)" />
              </div>
              <span className="stat-label">Outstanding Fees (TZS)</span>
              <span className="stat-value" style={{ color: 'var(--color-error)' }}>{formatTZS(totalOutstanding)}</span>
            </div>

            <div className="stat-card animate-fade-up">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)' }}>
                <TrendingUp size={20} color="var(--color-success)" />
              </div>
              <span className="stat-label">Total Collections (TZS)</span>
              <span className="stat-value" style={{ color: 'var(--color-success)' }}>{formatTZS(totalCollected)}</span>
            </div>
          </>
        )}
      </div>

      <div className="split-layout">
        
        {/* Left Column: Quick Actions & Widgets */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Action widgets by role */}
          {userRoles.includes('Director') && (
            <div className="glass-panel animate-fade-up" style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(59, 179, 195, 0.1)' }}>
                  <Wallet size={20} color="var(--color-secondary)" />
                </div>
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--color-primary)' }}>Director Operations Control</h3>
              </div>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Review institutional finance status, authorize payroll proposals, manage leave balances, and review attendance metrics.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href="/dashboard/director/payrolls" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                  <HandCoins size={14} /> Approve Payrolls
                </Link>
                <Link href="/dashboard/director/staff" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  <UserCog size={14} /> Setup Staff Records
                </Link>
                <Link href="/dashboard/director/leave-requests" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  <Umbrella size={14} /> Leave Requests
                  {pendingLeaves && pendingLeaves > 0 ? <span className="badge badge-warning">{pendingLeaves}</span> : null}
                </Link>
              </div>
            </div>
          )}

          {userRoles.includes('Principal') && (
            <div className="glass-panel animate-fade-up" style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(247, 178, 57, 0.1)' }}>
                  <School size={20} color="var(--color-accent)" />
                </div>
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--color-primary)' }}>Principal Operations Control</h3>
              </div>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Review weekly lesson plans submitted by instructors, view generated class academic report cards, and endorse staff leave/advance workflows.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href="/dashboard/principal/lesson-plans" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                  <BookOpen size={14} /> Review Lesson Plans
                </Link>
                <Link href="/dashboard/principal/academic-reports" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  <FileSpreadsheet size={14} /> View Report Cards
                </Link>
                <Link href="/dashboard/principal/payrolls" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  <HandCoins size={14} /> Review Draft Payrolls
                </Link>
              </div>
            </div>
          )}

          {userRoles.includes('Accountant') && (
            <div className="glass-panel animate-fade-up" style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                  <Wallet size={20} color="var(--color-success)" />
                </div>
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--color-primary)' }}>Accountant Financial Hub</h3>
              </div>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Generate monthly employee payroll summaries, setup base salaries, record payments, and dispatch unpaid fee alerts to parents.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href="/dashboard/accountant/payroll" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                  <HandCoins size={14} /> Generate Payroll
                </Link>
                <Link href="/dashboard/accountant/fee-reminders" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  <Receipt size={14} /> Send Fee Reminders
                </Link>
                <Link href="/dashboard/accountant/payments" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  <Wallet size={14} /> Collections
                </Link>
              </div>
            </div>
          )}

          {userRoles.includes('Teacher') && (
            <div className="glass-panel animate-fade-up" style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(59, 179, 195, 0.1)' }}>
                  <BookOpen size={20} color="var(--color-secondary)" />
                </div>
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--color-primary)' }}>Teacher Academic Control</h3>
              </div>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Mark biometric student attendance rosters, enter academic grading scores, manage class activities, and publish homework worksheets.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href="/dashboard/teacher/attendance" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                  <ClipboardCheck size={14} /> Mark Attendance
                </Link>
                <Link href="/dashboard/teacher/marks" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  <PenLine size={14} /> Enter Grades
                </Link>
                <Link href="/dashboard/teacher/homework" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  <BookOpen size={14} /> Publish Homework
                </Link>
              </div>
            </div>
          )}

          {/* System Admin panel */}
          {userRoles.includes('System Admin') && (
            <div className="glass-panel animate-fade-up" style={{ padding: '1.75rem', borderRadius: 'var(--radius-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'rgba(0, 38, 75, 0.08)' }}>
                  <Settings size={20} color="var(--color-primary)" />
                </div>
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--color-primary)' }}>System Administration</h3>
              </div>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.25rem', fontSize: '0.88rem', lineHeight: 1.6 }}>
                Register database backups, inspect security logs, update core school parameters, and manage users credentials.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Link href="/dashboard/users" className="btn btn-primary btn-sm" style={{ textDecoration: 'none' }}>
                  <Users size={14} /> User Management
                </Link>
                <Link href="/dashboard/admin/backups" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  <Settings size={14} /> Backups Log
                </Link>
                <Link href="/dashboard/admin/audit-logs" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
                  <ClipboardCheck size={14} /> Security Audits
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pending Approvals / Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel animate-fade-up" style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ClipboardCheck size={18} color="var(--color-secondary)" /> Workflow Tasks Queue
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              
              <Link href="/dashboard/director/leave-requests" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0', borderBottom: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-text)', transition: 'all 150ms ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Umbrella size={16} color="var(--color-text-muted)" />
                  <span style={{ fontSize: '0.875rem' }}>Pending Leave Requests</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`badge ${pendingLeaves && pendingLeaves > 0 ? 'badge-warning' : 'badge-muted'}`}>
                    {pendingLeaves || 0} Pending
                  </span>
                  <ArrowRight size={14} color="var(--color-text-muted)" />
                </div>
              </Link>

              <Link href="/dashboard/director/advance-requests" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 0', textDecoration: 'none', color: 'var(--color-text)', transition: 'all 150ms ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <HandCoins size={16} color="var(--color-text-muted)" />
                  <span style={{ fontSize: '0.875rem' }}>Pending Salary Advances</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={`badge ${pendingAdvances && pendingAdvances > 0 ? 'badge-warning' : 'badge-muted'}`}>
                    {pendingAdvances || 0} Pending
                  </span>
                  <ArrowRight size={14} color="var(--color-text-muted)" />
                </div>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
