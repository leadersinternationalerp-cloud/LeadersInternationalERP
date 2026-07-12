'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

type Notification = {
  id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

export default function DashboardLayoutClient({
  profile,
  userRoles,
  recentNotifications,
  unreadCount,
  children,
}: {
  profile: any
  userRoles: string[]
  recentNotifications: Notification[]
  unreadCount: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen)
  const toggleNotifications = () => setNotificationsOpen(!notificationsOpen)

  // Map routes to dynamic titles
  const getPageTitle = () => {
    if (pathname.includes('/director')) return 'Executive Dashboard'
    if (pathname.includes('/principal')) return 'Principal Dashboard'
    if (pathname.includes('/accountant')) return 'Financial Dashboard'
    if (pathname.includes('/dean')) return 'Dean Operations'
    if (pathname.includes('/hos')) return 'Section Operations'
    if (pathname.includes('/staff/self-service')) return 'Self Service'
    if (pathname.includes('/students/enroll')) return 'Student Enrollment'
    if (pathname.includes('/profile')) return 'My Profile'
    if (pathname.includes('/settings')) return 'Settings'
    return 'Dashboard Overview'
  }

  // Helper for active styling
  const isActive = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') return true
    if (path !== '/dashboard' && pathname.startsWith(path)) return true
    return false
  }

  const linkStyle = (path: string) => ({
    display: 'block',
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    color: isActive(path) ? 'var(--color-primary)' : 'var(--color-text)',
    backgroundColor: isActive(path) ? 'rgba(59, 179, 195, 0.1)' : 'transparent',
    fontWeight: isActive(path) ? 600 : 500,
    borderLeft: isActive(path) ? '3px solid var(--color-primary)' : '3px solid transparent',
  })

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      
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
          <button onClick={toggleSidebar} className="btn" style={{ padding: '0.5rem', display: 'flex', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)', cursor: 'pointer' }} aria-label="Toggle Menu">
            ☰
          </button>
          <Image src="/logo.png" alt="Logo" width={40} height={40} />
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600, display: 'none' }}>Leaders ERP</h2>
        </div>

        {/* Dynamic Page Title (Center) */}
        <div style={{ flex: 1, textAlign: 'center', display: 'flex', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: 'var(--color-text-muted)' }}>
            {getPageTitle()}
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          
          {/* Notification Dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={toggleNotifications} style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '0.5rem', background: 'transparent', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', color: 'var(--color-text)' }}>
              <span style={{ fontSize: '1rem' }}>🔔</span>
              {unreadCount > 0 && (
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
            </button>

            {notificationsOpen && (
              <div className="glass-panel" style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                width: '320px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 60,
                display: 'flex', flexDirection: 'column'
              }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  Notifications
                  {unreadCount > 0 && <span style={{ fontSize: '0.75rem', backgroundColor: 'var(--color-primary)', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '12px' }}>{unreadCount} New</span>}
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {recentNotifications.length > 0 ? recentNotifications.map(n => (
                    <Link key={n.id} href="/dashboard/notifications" onClick={() => setNotificationsOpen(false)} style={{
                      display: 'block', padding: '1rem', borderBottom: '1px solid var(--color-border)', textDecoration: 'none', color: 'var(--color-text)',
                      backgroundColor: n.is_read ? 'transparent' : 'rgba(59, 179, 195, 0.05)'
                    }}>
                      <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{n.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{n.message.substring(0, 60)}...</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-primary)', marginTop: '0.5rem' }}>{new Date(n.created_at).toLocaleString()}</div>
                    </Link>
                  )) : (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>No recent notifications</div>
                  )}
                </div>
                <Link href="/dashboard/notifications" onClick={() => setNotificationsOpen(false)} style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, borderTop: '1px solid var(--color-border)' }}>
                  View All Notifications
                </Link>
              </div>
            )}
          </div>

          <Link href="/dashboard/profile" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'none' }}>
              {/* Could be visible on desktop */}
            </div>
            {profile?.avatar_url ? (
               <img src={profile.avatar_url} alt="Profile" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }} />
            ) : (
               <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.8rem' }}>
                 {profile?.first_name?.charAt(0)}{profile?.last_name?.charAt(0)}
               </div>
            )}
          </Link>
          <form action="/auth/signout" method="post" style={{ margin: 0 }}>
            <button type="submit" className="btn" style={{ padding: '0.5rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
              Logout
            </button>
          </form>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        
        {/* Sidebar Overlay for Mobile */}
        {sidebarOpen && (
          <div 
            onClick={() => setSidebarOpen(false)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 30 }}
          />
        )}

        {/* Sidebar */}
        <aside style={{
          width: '240px',
          backgroundColor: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          padding: '1.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 40,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.3s ease',
          overflowY: 'auto'
        }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>
            Main Menu
          </div>
          
          <Link href="/dashboard" style={linkStyle('/dashboard')} onClick={() => setSidebarOpen(false)}>
            Dashboard Overview
          </Link>

          <Link href="/dashboard/calendar" style={linkStyle('/dashboard/calendar')} onClick={() => setSidebarOpen(false)}>
            School Calendar
          </Link>

          {(userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal') || userRoles.includes('Teacher')) && (
            <Link href="/dashboard/students" style={linkStyle('/dashboard/students')} onClick={() => setSidebarOpen(false)}>
              Students
            </Link>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal')) && (
            <Link href="/dashboard/staff" style={linkStyle('/dashboard/staff')} onClick={() => setSidebarOpen(false)}>
              Staff & Teachers
            </Link>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Principal') || userRoles.includes('Dean') || userRoles.includes('HOS')) && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Academic Leadership
              </div>
              
              {(userRoles.includes('System Admin') || userRoles.includes('Principal') || userRoles.includes('Director')) && (
                <Link href="/dashboard/principal/lesson-plans" style={linkStyle('/dashboard/principal/lesson-plans')} onClick={() => setSidebarOpen(false)}>
                  Lesson Plan Reports
                </Link>
              )}

              <Link href="/dashboard/principal/report-cards" style={linkStyle('/dashboard/principal/report-cards')} onClick={() => setSidebarOpen(false)}>
                Report Cards Generator
              </Link>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Director')) && (
            <Link href="/dashboard/users" style={linkStyle('/dashboard/users')} onClick={() => setSidebarOpen(false)}>
              User Management
            </Link>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal') || userRoles.includes('Accountant')) && (
            <Link href="/dashboard/accountant/fee-balances" style={linkStyle('/dashboard/accountant/fee-balances')} onClick={() => setSidebarOpen(false)}>
              Fee Balances
            </Link>
          )}

          {userRoles.includes('System Admin') && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Administration
              </div>
              <Link href="/dashboard/director" style={linkStyle('/dashboard/director')} onClick={() => setSidebarOpen(false)}>
                Executive Dashboard
              </Link>
              <Link href="/dashboard/admin/settings" style={linkStyle('/dashboard/admin/settings')} onClick={() => setSidebarOpen(false)}>
                School Settings
              </Link>
              <Link href="/dashboard/admin/backups" style={linkStyle('/dashboard/admin/backups')} onClick={() => setSidebarOpen(false)}>
                Database Backups
              </Link>
              <Link href="/dashboard/admin/audit-logs" style={linkStyle('/dashboard/admin/audit-logs')} onClick={() => setSidebarOpen(false)}>
                Security Audit Logs
              </Link>
              <Link href="/dashboard/admin/integrations" style={linkStyle('/dashboard/admin/integrations')} onClick={() => setSidebarOpen(false)}>
                Integrations
              </Link>
              <Link href="/dashboard/admin/syllabus" style={linkStyle('/dashboard/admin/syllabus')} onClick={() => setSidebarOpen(false)}>
                Syllabus Setup
              </Link>
              <Link href="/dashboard/admin/subjects" style={linkStyle('/dashboard/admin/subjects')} onClick={() => setSidebarOpen(false)}>
                Subjects Setup
              </Link>
              <Link href="/dashboard/admin/teacher-assignments" style={linkStyle('/dashboard/admin/teacher-assignments')} onClick={() => setSidebarOpen(false)}>
                Teacher Assignments
              </Link>
              <Link href="/dashboard/admin/biometric/devices" style={linkStyle('/dashboard/admin/biometric/devices')} onClick={() => setSidebarOpen(false)}>
                Biometric Devices
              </Link>
              <Link href="/dashboard/admin/biometric/exceptions" style={linkStyle('/dashboard/admin/biometric/exceptions')} onClick={() => setSidebarOpen(false)}>
                Biometric Exceptions
              </Link>
              <Link href="/dashboard/admin/kitchen-content" style={linkStyle('/dashboard/admin/kitchen-content')} onClick={() => setSidebarOpen(false)}>
                Kitchen Content
              </Link>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Director')) && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Director Operations
              </div>
              <Link href="/dashboard/director/inventory" style={linkStyle('/dashboard/director/inventory')} onClick={() => setSidebarOpen(false)}>
                Inventory
              </Link>
              <Link href="/dashboard/director/transport" style={linkStyle('/dashboard/director/transport')} onClick={() => setSidebarOpen(false)}>
                Transport
              </Link>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Dean')) && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Dean Operations
              </div>
              <Link href="/dashboard/dean" style={linkStyle('/dashboard/dean')} onClick={() => setSidebarOpen(false)}>
                Dashboard Overview
              </Link>
              <Link href="/dashboard/dean/students" style={linkStyle('/dashboard/dean/students')} onClick={() => setSidebarOpen(false)}>
                Student Enrollment
              </Link>
              <Link href="/dashboard/dean/marks-overview" style={linkStyle('/dashboard/dean/marks-overview')} onClick={() => setSidebarOpen(false)}>
                Marks Overview
              </Link>
              <Link href="/dashboard/dean/submissions" style={linkStyle('/dashboard/dean/submissions')} onClick={() => setSidebarOpen(false)}>
                Submissions Review
              </Link>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('HOS')) && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Section Operations
              </div>
              <Link href="/dashboard/hos/marks" style={linkStyle('/dashboard/hos/marks')} onClick={() => setSidebarOpen(false)}>
                Section Marks Overview
              </Link>
              <Link href="/dashboard/hos/attendance" style={linkStyle('/dashboard/hos/attendance')} onClick={() => setSidebarOpen(false)}>
                Section Attendance
              </Link>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Teacher')) && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                My Classes
              </div>
              <Link href="/dashboard/teacher" style={linkStyle('/dashboard/teacher')} onClick={() => setSidebarOpen(false)}>
                Teacher Dashboard
              </Link>
              <Link href="/dashboard/teacher/attendance" style={linkStyle('/dashboard/teacher/attendance')} onClick={() => setSidebarOpen(false)}>
                Daily Attendance
              </Link>
              <Link href="/dashboard/teacher/marks" style={linkStyle('/dashboard/teacher/marks')} onClick={() => setSidebarOpen(false)}>
                Academic Marks
              </Link>
              <Link href="/dashboard/teacher/lesson-plans/new" style={linkStyle('/dashboard/teacher/lesson-plans')} onClick={() => setSidebarOpen(false)}>
                Lesson Plans
              </Link>
              <Link href="/dashboard/teacher/early-years" style={linkStyle('/dashboard/teacher/early-years')} onClick={() => setSidebarOpen(false)}>
                Early Years
              </Link>
              <Link href="/dashboard/teacher/class-activities" style={linkStyle('/dashboard/teacher/class-activities')} onClick={() => setSidebarOpen(false)}>
                Class Activities
              </Link>
              <Link href="/dashboard/teacher/quizzes/bank" style={linkStyle('/dashboard/teacher/quizzes/bank')} onClick={() => setSidebarOpen(false)}>
                Quiz Bank
              </Link>
              <Link href="/dashboard/teacher/quizzes/jobs" style={linkStyle('/dashboard/teacher/quizzes/jobs')} onClick={() => setSidebarOpen(false)}>
                Quiz Print Jobs
              </Link>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Accountant')) && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Finance
              </div>
              <Link href="/dashboard/accountant" style={linkStyle('/dashboard/accountant')} onClick={() => setSidebarOpen(false)}>
                Financial Dashboard
              </Link>
              <Link href="/dashboard/accountant/invoices" style={linkStyle('/dashboard/accountant/invoices')} onClick={() => setSidebarOpen(false)}>
                Student Invoices
              </Link>
              <Link href="/dashboard/accountant/payments" style={linkStyle('/dashboard/accountant/payments')} onClick={() => setSidebarOpen(false)}>
                Record Payments
              </Link>
              <Link href="/dashboard/accountant/expenses" style={linkStyle('/dashboard/accountant/expenses')} onClick={() => setSidebarOpen(false)}>
                Expenses & Bills
              </Link>
              <Link href="/dashboard/accountant/payroll" style={linkStyle('/dashboard/accountant/payroll')} onClick={() => setSidebarOpen(false)}>
                Manage Payroll
              </Link>
              <Link href="/dashboard/accountant/advances" style={linkStyle('/dashboard/accountant/advances')} onClick={() => setSidebarOpen(false)}>
                Salary Advances
              </Link>
              <Link href="/dashboard/accountant/leave-config" style={linkStyle('/dashboard/accountant/leave-config')} onClick={() => setSidebarOpen(false)}>
                Leave Configuration
              </Link>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                Accounting Suite
              </div>
              <Link href="/dashboard/accountant/accounting/statements" style={linkStyle('/dashboard/accountant/accounting/statements')} onClick={() => setSidebarOpen(false)}>
                Financial Statements
              </Link>
              <Link href="/dashboard/accountant/accounting/coa" style={linkStyle('/dashboard/accountant/accounting/coa')} onClick={() => setSidebarOpen(false)}>
                Chart of Accounts
              </Link>
              <Link href="/dashboard/accountant/accounting/journals" style={linkStyle('/dashboard/accountant/accounting/journals')} onClick={() => setSidebarOpen(false)}>
                Journals
              </Link>
              <Link href="/dashboard/accountant/accounting/reconciliation" style={linkStyle('/dashboard/accountant/accounting/reconciliation')} onClick={() => setSidebarOpen(false)}>
                Reconciliation
              </Link>
              <Link href="/dashboard/accountant/accounting/bills" style={linkStyle('/dashboard/accountant/accounting/bills')} onClick={() => setSidebarOpen(false)}>
                Bills & Payables
              </Link>
              <Link href="/dashboard/accountant/accounting/deposits" style={linkStyle('/dashboard/accountant/accounting/deposits')} onClick={() => setSidebarOpen(false)}>
                Bank Deposits
              </Link>
              <Link href="/dashboard/accountant/accounting/assets" style={linkStyle('/dashboard/accountant/accounting/assets')} onClick={() => setSidebarOpen(false)}>
                Fixed Assets
              </Link>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Student')) && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                My Academics
              </div>
              <Link href="/dashboard/student" style={linkStyle('/dashboard/student')} onClick={() => setSidebarOpen(false)}>
                Student Dashboard
              </Link>
              <Link href="/dashboard/student/report-card" style={linkStyle('/dashboard/student/report-card')} onClick={() => setSidebarOpen(false)}>
                Report Card
              </Link>
              <Link href="/dashboard/student/fees" style={linkStyle('/dashboard/student/fees')} onClick={() => setSidebarOpen(false)}>
                Fee Statements
              </Link>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Parent')) && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Parent Portal
              </div>
              <Link href="/dashboard/parent/dashboard" style={linkStyle('/dashboard/parent')} onClick={() => setSidebarOpen(false)}>
                Parent Dashboard
              </Link>
              <Link href="/dashboard/parent/students" style={linkStyle('/dashboard/parent/students')} onClick={() => setSidebarOpen(false)}>
                My Children
              </Link>
              <Link href="/dashboard/parent/fees" style={linkStyle('/dashboard/parent/fees')} onClick={() => setSidebarOpen(false)}>
                Fee Invoices
              </Link>
            </>
          )}

          {(userRoles.includes('Teacher') || userRoles.includes('Accountant') || userRoles.includes('HOS') || userRoles.includes('Dean') || userRoles.includes('Principal') || userRoles.includes('Director')) && (
            <>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', fontWeight: 600, paddingLeft: '0.75rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                Self Service
              </div>
              <Link href="/dashboard/staff/self-service/leave" style={linkStyle('/dashboard/staff/self-service')} onClick={() => setSidebarOpen(false)}>
                My HR Dashboard
              </Link>
              <Link href="/dashboard/staff/self-service/leave" style={linkStyle('/dashboard/staff/self-service/leave')} onClick={() => setSidebarOpen(false)}>
                My Leave
              </Link>
              <Link href="/dashboard/staff/self-service/advances" style={linkStyle('/dashboard/staff/self-service/advances')} onClick={() => setSidebarOpen(false)}>
                My Salary Advances
              </Link>
              <Link href="/dashboard/staff/self-service/payslips" style={linkStyle('/dashboard/staff/self-service/payslips')} onClick={() => setSidebarOpen(false)}>
                My Payslips
              </Link>
            </>
          )}
        </aside>

        {/* Main Content Area */}
        <main style={{ 
          flex: 1, 
          padding: '2rem', 
          backgroundColor: 'var(--color-background)',
          // Adjust padding-left to match sidebar width when expanded
          // For simplicity in this demo, we'll just push the content on desktop
          // and overlay on mobile. 
        }}
        // simple desktop spacer logic could go here, but a CSS class is better.
        // We'll rely on inline styles for now.
        className="main-content-area"
        >
          {/* We add a style tag to handle desktop media query for sidebar */}
          <style dangerouslySetInnerHTML={{__html: `
            @media (min-width: 768px) {
              aside { transform: translateX(0) !important; position: static !important; }
            }
          `}} />
          {children}
        </main>
      </div>
    </div>
  )
}
