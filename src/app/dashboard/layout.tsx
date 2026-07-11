import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import InactivityTimeout from '@/components/InactivityTimeout'

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

  // Fetch user profile to get their role
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

  // Parse roles from the new roles array or fall back to comma-separated role column
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      <InactivityTimeout />
      
      {/* Top Navbar */}
      <header style={{ 
        height: '64px', 
        backgroundColor: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1.5rem',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Image src="/logo.png" alt="Logo" width={40} height={40} />
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Leaders ERP</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Notification Bell Badge */}
          <Link href="/dashboard/notifications" style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '0.5rem', textDecoration: 'none', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
            <span style={{ fontSize: '1rem' }}>🔔</span>
            {Number(unreadCount) > 0 && (
              <span style={{
                position: 'absolute', top: '-5px', right: '-5px',
                backgroundColor: 'var(--color-error)', color: '#fff',
                fontSize: '0.65rem', fontWeight: 700, borderRadius: '50%',
                width: '16px', height: '16px', display: 'flex',
                alignItems: 'center', justifyContent: 'center'
              }}>
                {unreadCount}
              </span>
            )}
          </Link>

          <Link href="/dashboard/profile" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'right', display: 'block' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {profile?.first_name} {profile?.last_name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {userRoles.join(', ') || 'System Admin'}
            </div>
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn" style={{ padding: '0.5rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              Logout
            </button>
          </form>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside style={{
          width: '240px',
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          padding: '1.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>
            Main Menu
          </div>
          
          <Link href="/dashboard" style={{
            display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
            textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
          }}>
            Dashboard Overview
          </Link>

          <Link href="/dashboard/calendar" style={{
            display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
            textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
          }}>
            School Calendar
          </Link>

          {(userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal') || userRoles.includes('Teacher')) && (
            <Link href="/dashboard/students" style={{
              display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
            }}>
              Students
            </Link>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal')) && (
            <Link href="/dashboard/staff" style={{
              display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
            }}>
              Staff & Teachers
            </Link>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal')) && (
            <Link href="/dashboard/principal/lesson-plans" style={{
              display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
            }}>
              Lesson Plan Reports
            </Link>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Director')) && (
            <Link href="/dashboard/users" style={{
              display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
            }}>
              User Management
            </Link>
          )}

          {userRoles.includes('System Admin') && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Administration
              </div>
              <Link href="/dashboard/admin/settings" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                School Settings
              </Link>
              <Link href="/dashboard/admin/backups" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Database Backups
              </Link>
              <Link href="/dashboard/admin/audit-logs" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Security Audit Logs
              </Link>
            </>
          )}

          {userRoles.includes('Teacher') && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Teacher Portal
              </div>
              <Link href="/dashboard/teacher" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                My Classes
              </Link>
              <Link href="/dashboard/teacher/class-activities" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Class Activities
              </Link>
              <Link href="/dashboard/teacher/attendance" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Mark Attendance
              </Link>
              <Link href="/dashboard/teacher/marks" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Enter Marks & Grades
              </Link>
              <Link href="/dashboard/teacher/homework" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Homework Assignments
              </Link>
            </>
          )}

          {/* Student Portal Links */}
          {userRoles.includes('Student') && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Student Portal
              </div>
              <Link href="/dashboard/student" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Student Dashboard
              </Link>
              <Link href="/dashboard/student/homework" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                My Homework
              </Link>
            </>
          )}

          {/* Finance Portal Links */}
          {(userRoles.includes('System Admin') || userRoles.includes('Accountant')) && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Finance Portal
              </div>
              <Link href="/dashboard/accountant/fee-structures" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Fee Structures
              </Link>
            </>
          )}

          {userRoles.includes('Accountant') && (
            <>
              <Link href="/dashboard/accountant/invoices" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Invoices
              </Link>
              <Link href="/dashboard/accountant/payments" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Payments & Collections
              </Link>
              <Link href="/dashboard/accountant/expenses" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Expenses
              </Link>
              <Link href="/dashboard/accountant/payroll" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Payroll Management
              </Link>
              <Link href="/dashboard/accountant/payroll/salary-setup" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Salary Setup
              </Link>
              <Link href="/dashboard/accountant/reports" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Financial Reports
              </Link>
              <Link href="/dashboard/accountant/fee-reminders" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Fee Outstanding Reminders
              </Link>
            </>
          )}

          {/* Principal Cashier & Review Links */}
          {userRoles.includes('Principal') && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Principal Operations
              </div>
              <Link href="/dashboard/principal/quick-payment" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Quick Payment Entry
              </Link>
              <Link href="/dashboard/principal/collection-report" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Daily Collection Report
              </Link>
              <Link href="/dashboard/principal/leave-requests" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Staff Leave Requests
              </Link>
              <Link href="/dashboard/principal/advance-requests" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Staff Advance Requests
              </Link>
              <Link href="/dashboard/principal/payrolls" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Payroll Review
              </Link>
              <Link href="/dashboard/principal/lesson-plans/review" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Lesson Plans Review
              </Link>
              <Link href="/dashboard/principal/academic-reports" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Academic Report Cards
              </Link>
              <Link href="/dashboard/principal/reports" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Submitted Staff Reports
              </Link>
            </>
          )}

          {/* Parent Portal */}
          {userRoles.includes('Parent') && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Parent Portal
              </div>
              <Link href="/dashboard/parent/dashboard" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Parent Dashboard
              </Link>
              <Link href="/dashboard/parent/billing" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Billing & Fees
              </Link>
              <Link href="/dashboard/parent/discipline" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Discipline Logs
              </Link>
            </>
          )}

          {/* Dean Operations Links */}
          {userRoles.includes('Dean') && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Dean Operations
              </div>
              <Link href="/dashboard/dean/discipline" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Discipline Management
              </Link>
              <Link href="/dashboard/dean/marks" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Grades Release Control
              </Link>
            </>
          )}

          {/* Head of Section Operations */}
          {userRoles.includes('Head of Section') && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Section Operations
              </div>
              <Link href="/dashboard/hos" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Section Dashboard
              </Link>
              <Link href="/dashboard/hos/students" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Section Students
              </Link>
              <Link href="/dashboard/hos/lesson-plans" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Review Lesson Plans
              </Link>
            </>
          )}

          {/* Director Operations Links */}
          {userRoles.includes('Director') && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Director Operations
              </div>
              <Link href="/dashboard/director/finance" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Finance Overview
              </Link>
              <Link href="/dashboard/director/staff" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Staff Records Setup
              </Link>
              <Link href="/dashboard/director/attendance" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Staff & Student Attendance
              </Link>
              <Link href="/dashboard/director/leave-requests" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Staff Leave Requests
              </Link>
              <Link href="/dashboard/director/advance-requests" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Staff Advance Requests
              </Link>
              <Link href="/dashboard/director/leave-advance-records" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Staff Requests Archive
              </Link>
              <Link href="/dashboard/director/payrolls" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Payroll Approvals
              </Link>
              <Link href="/dashboard/accountant/fee-structures" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Fee Structures (CRUD)
              </Link>
              <Link href="/dashboard/director/reports" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Submitted Staff Reports
              </Link>
              <Link href="/dashboard/director/appraisals" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Staff Appraisals Cycle
              </Link>
            </>
          )}

          {/* Staff Self-Service Links (Visible to all staff members except Director) */}
          {(userRoles.includes('System Admin') || ['Principal', 'Accountant', 'Teacher', 'Dean', 'Head of Section', 'Clinic', 'Transport'].some(r => userRoles.includes(r))) && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Staff Self-Service
              </div>
              <Link href="/dashboard/staff/self-service/leave" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                My Leave Requests
              </Link>
              <Link href="/dashboard/staff/self-service/advances" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                My Salary Advances
              </Link>
              <Link href="/dashboard/staff/self-service/payslips" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                My Monthly Payslips
              </Link>
              <Link href="/dashboard/staff/self-service/reports" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Submit Report
              </Link>
              <Link href="/dashboard/staff/self-service/appraisals" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                My Appraisals
              </Link>
            </>
          )}
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '2rem', backgroundColor: 'var(--color-bg)', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
