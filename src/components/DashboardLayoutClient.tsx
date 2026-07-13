'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, CalendarDays, Users, UserCog, BookOpen, FileSpreadsheet, 
  Settings, Wallet, Receipt, Bell, Menu, X, LogOut,
  UsersRound, Scale, Plug, Fingerprint, Package, Bus, School,
  ClipboardCheck, PenLine, Baby, Puzzle, Layers, Sparkles,
  CreditCard, HandCoins, ListTree, BookCopy, Landmark, Building2,
  HeartHandshake, Umbrella, Banknote
} from 'lucide-react'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'


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


  const NavLink = ({ href, icon: Icon, children, onClick }: any) => {
    const active = isActive(href)
    return (
      <Link href={href} onClick={onClick} className={`nav-link ${active ? 'active' : ''}`}>
        <span className="nav-icon">{Icon && <Icon size={18} />}</span>
        {children}
      </Link>
    )
  }

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
          <button onClick={toggleSidebar} className="btn btn-icon btn-ghost" aria-label="Toggle Menu">
            <Menu size={20} />
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
            <button onClick={toggleNotifications} className="btn btn-icon btn-ghost">
              <Bell size={20} />
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
            <button type="submit" className="btn btn-ghost" style={{ fontSize: '0.8rem' }}>
              <LogOut size={16} /> Logout
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
          <div className="nav-section">
              Main Menu
            </div>
          
          <NavLink href="/dashboard" onClick={() => setSidebarOpen(false)} icon={LayoutDashboard}>
            Dashboard Overview
          </NavLink>

          <NavLink href="/dashboard/calendar" onClick={() => setSidebarOpen(false)} icon={CalendarDays}>
            School Calendar
          </NavLink>

          {(userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal') || userRoles.includes('Teacher')) && (
            <NavLink href="/dashboard/students" onClick={() => setSidebarOpen(false)} icon={Users}>
            Students
          </NavLink>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal')) && (
            <NavLink href="/dashboard/staff" onClick={() => setSidebarOpen(false)} icon={UserCog}>
            Staff & Teachers
          </NavLink>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Principal') || userRoles.includes('Dean') || userRoles.includes('HOS')) && (
            <>
              <div className="nav-section">
              Academic Leadership
            </div>
              
              {(userRoles.includes('System Admin') || userRoles.includes('Principal') || userRoles.includes('Director')) && (
                <NavLink href="/dashboard/principal/lesson-plans" onClick={() => setSidebarOpen(false)} icon={BookOpen}>
            Lesson Plan Reports
          </NavLink>
              )}

              <NavLink href="/dashboard/principal/report-cards" onClick={() => setSidebarOpen(false)} icon={FileSpreadsheet}>
            Report Cards Generator
          </NavLink>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Director')) && (
            <NavLink href="/dashboard/users" onClick={() => setSidebarOpen(false)} icon={UsersRound}>
            User Management
          </NavLink>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal') || userRoles.includes('Accountant')) && (
            <NavLink href="/dashboard/accountant/fee-balances" onClick={() => setSidebarOpen(false)} icon={Scale}>
            Fee Balances
          </NavLink>
          )}

          {userRoles.includes('System Admin') && (
            <>
              <div className="nav-section">
              Administration
            </div>
              <NavLink href="/dashboard/admin/settings" onClick={() => setSidebarOpen(false)} icon={Settings}>
            School Settings
          </NavLink>
              <NavLink href="/dashboard/admin/backups" onClick={() => setSidebarOpen(false)} icon={Settings}>
            Database Backups
          </NavLink>
              <NavLink href="/dashboard/admin/audit-logs" onClick={() => setSidebarOpen(false)} icon={Settings}>
            Security Audit Logs
          </NavLink>
              <NavLink href="/dashboard/admin/integrations" onClick={() => setSidebarOpen(false)} icon={Plug}>
            Integrations
          </NavLink>
              <NavLink href="/dashboard/admin/syllabus" onClick={() => setSidebarOpen(false)} icon={Settings}>
            Syllabus Setup
          </NavLink>
              <NavLink href="/dashboard/admin/subjects" onClick={() => setSidebarOpen(false)} icon={Settings}>
            Subjects Setup
          </NavLink>
              <NavLink href="/dashboard/admin/teacher-assignments" onClick={() => setSidebarOpen(false)} icon={Settings}>
            Teacher Assignments
          </NavLink>
              <NavLink href="/dashboard/admin/biometric/devices" onClick={() => setSidebarOpen(false)} icon={Fingerprint}>
            Biometric Devices
          </NavLink>
              <NavLink href="/dashboard/admin/biometric/exceptions" onClick={() => setSidebarOpen(false)} icon={Fingerprint}>
            Biometric Exceptions
          </NavLink>
              <NavLink href="/dashboard/admin/kitchen-content" onClick={() => setSidebarOpen(false)} icon={Settings}>
            Kitchen Content
          </NavLink>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Director')) && (
            <>
              <div className="nav-section">
              Director Operations
            </div>
              <NavLink href="/dashboard/director" onClick={() => setSidebarOpen(false)} icon={LayoutDashboard}>
            Executive Dashboard
          </NavLink>
              <NavLink href="/dashboard/director/attendance" onClick={() => setSidebarOpen(false)} icon={ClipboardCheck}>
            Staff Attendance
          </NavLink>
              <NavLink href="/dashboard/director/finance" onClick={() => setSidebarOpen(false)} icon={Wallet}>
            Financial Overview
          </NavLink>
              <NavLink href="/dashboard/director/payrolls" onClick={() => setSidebarOpen(false)} icon={HandCoins}>
            Manage Payrolls
          </NavLink>
              <NavLink href="/dashboard/director/applications" onClick={() => setSidebarOpen(false)} icon={BookOpen}>
            Self-Service Inbox
          </NavLink>
              <NavLink href="/dashboard/director/inventory" onClick={() => setSidebarOpen(false)} icon={Package}>
            Inventory
          </NavLink>
              <NavLink href="/dashboard/director/transport" onClick={() => setSidebarOpen(false)} icon={Bus}>
            Transport
          </NavLink>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Dean')) && (
            <>
              <div className="nav-section">
              Dean Operations
            </div>
              <NavLink href="/dashboard/dean" onClick={() => setSidebarOpen(false)} icon={LayoutDashboard}>
            Dashboard Overview
          </NavLink>
              <NavLink href="/dashboard/dean/students" onClick={() => setSidebarOpen(false)} icon={UsersRound}>
            Student Enrollment
          </NavLink>
              <NavLink href="/dashboard/dean/marks-overview" onClick={() => setSidebarOpen(false)} icon={PenLine}>
            Marks Overview
          </NavLink>
              <NavLink href="/dashboard/dean/submissions" onClick={() => setSidebarOpen(false)} icon={BookOpen}>
            Submissions Review
          </NavLink>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('HOS')) && (
            <>
              <div className="nav-section">
              Section Operations
            </div>
              <NavLink href="/dashboard/hos/marks" onClick={() => setSidebarOpen(false)} icon={PenLine}>
            Section Marks Overview
          </NavLink>
              <NavLink href="/dashboard/hos/attendance" onClick={() => setSidebarOpen(false)} icon={ClipboardCheck}>
            Section Attendance
          </NavLink>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Teacher')) && (
            <>
              <div className="nav-section">
              My Classes
            </div>
              <NavLink href="/dashboard/teacher" onClick={() => setSidebarOpen(false)} icon={School}>
            Teacher Dashboard
          </NavLink>
              <NavLink href="/dashboard/teacher/attendance" onClick={() => setSidebarOpen(false)} icon={ClipboardCheck}>
            Daily Attendance
          </NavLink>
              <NavLink href="/dashboard/teacher/marks" onClick={() => setSidebarOpen(false)} icon={PenLine}>
            Academic Marks
          </NavLink>
              <NavLink href="/dashboard/teacher/lesson-plans/new" onClick={() => setSidebarOpen(false)} icon={BookOpen}>
            Lesson Plans
          </NavLink>
              <NavLink href="/dashboard/teacher/early-years" onClick={() => setSidebarOpen(false)} icon={Baby}>
            Early Years
          </NavLink>
              <NavLink href="/dashboard/teacher/class-activities" onClick={() => setSidebarOpen(false)} icon={Puzzle}>
            Class Activities
          </NavLink>
              <NavLink href="/dashboard/teacher/quizzes/bank" onClick={() => setSidebarOpen(false)} icon={Layers}>
            Quiz Bank
          </NavLink>
              <NavLink href="/dashboard/teacher/quizzes/jobs" onClick={() => setSidebarOpen(false)} icon={Sparkles}>
            Quiz Print Jobs
          </NavLink>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Accountant')) && (
            <>
              <div className="nav-section">
              Finance
            </div>
              <NavLink href="/dashboard/accountant" onClick={() => setSidebarOpen(false)} icon={Wallet}>
            Financial Dashboard
          </NavLink>
              <NavLink href="/dashboard/accountant/invoices" onClick={() => setSidebarOpen(false)} icon={Receipt}>
            Student Invoices
          </NavLink>
              <NavLink href="/dashboard/accountant/payments" onClick={() => setSidebarOpen(false)} icon={CreditCard}>
            Record Payments
          </NavLink>
              <NavLink href="/dashboard/accountant/expenses" onClick={() => setSidebarOpen(false)} icon={FileSpreadsheet}>
            Expenses & Bills
          </NavLink>
              <NavLink href="/dashboard/accountant/payroll" onClick={() => setSidebarOpen(false)} icon={HandCoins}>
            Manage Payroll
          </NavLink>
              <NavLink href="/dashboard/accountant/advances" onClick={() => setSidebarOpen(false)} icon={HandCoins}>
            Salary Advances
          </NavLink>
              <NavLink href="/dashboard/accountant/leave-config" onClick={() => setSidebarOpen(false)} icon={Settings}>
            Leave Configuration
          </NavLink>
              <div className="nav-section">
              Accounting Suite
            </div>
              <NavLink href="/dashboard/accountant/accounting/statements" onClick={() => setSidebarOpen(false)} icon={FileSpreadsheet}>
            Financial Statements
          </NavLink>
              <NavLink href="/dashboard/accountant/accounting/coa" onClick={() => setSidebarOpen(false)} icon={ListTree}>
            Chart of Accounts
          </NavLink>
              <NavLink href="/dashboard/accountant/accounting/journals" onClick={() => setSidebarOpen(false)} icon={BookCopy}>
            Journals
          </NavLink>
              <NavLink href="/dashboard/accountant/accounting/reconciliation" onClick={() => setSidebarOpen(false)} icon={Scale}>
            Reconciliation
          </NavLink>
              <NavLink href="/dashboard/accountant/accounting/bills" onClick={() => setSidebarOpen(false)} icon={Receipt}>
            Bills & Payables
          </NavLink>
              <NavLink href="/dashboard/accountant/accounting/deposits" onClick={() => setSidebarOpen(false)} icon={Landmark}>
            Bank Deposits
          </NavLink>
              <NavLink href="/dashboard/accountant/accounting/assets" onClick={() => setSidebarOpen(false)} icon={Building2}>
            Fixed Assets
          </NavLink>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Student')) && (
            <>
              <div className="nav-section">
              My Academics
            </div>
              <NavLink href="/dashboard/student" onClick={() => setSidebarOpen(false)} icon={School}>
            Student Dashboard
          </NavLink>
              <NavLink href="/dashboard/student/report-card" onClick={() => setSidebarOpen(false)} icon={FileSpreadsheet}>
            Report Card
          </NavLink>
              <NavLink href="/dashboard/student/fees" onClick={() => setSidebarOpen(false)} icon={Receipt}>
            Fee Statements
          </NavLink>
            </>
          )}

          {(userRoles.includes('System Admin') || userRoles.includes('Parent')) && (
            <>
              <div className="nav-section">
              Parent Portal
            </div>
              <NavLink href="/dashboard/parent/dashboard" onClick={() => setSidebarOpen(false)} icon={HeartHandshake}>
            Parent Dashboard
          </NavLink>
              <NavLink href="/dashboard/parent/students" onClick={() => setSidebarOpen(false)} icon={Users}>
            My Children
          </NavLink>
              <NavLink href="/dashboard/parent/report-card" onClick={() => setSidebarOpen(false)} icon={FileSpreadsheet}>
            Report Card
          </NavLink>
              <NavLink href="/dashboard/parent/fees" onClick={() => setSidebarOpen(false)} icon={Receipt}>
            Fee Invoices
          </NavLink>
            </>
          )}

          {(userRoles.includes('Teacher') || userRoles.includes('Accountant') || userRoles.includes('HOS') || userRoles.includes('Dean') || userRoles.includes('Principal') || userRoles.includes('Director')) && (
            <>
              <div className="nav-section">
              Self Service
            </div>
              <NavLink href="/dashboard/staff/self-service/leave" onClick={() => setSidebarOpen(false)} icon={Umbrella}>
            My HR Dashboard
          </NavLink>
              <NavLink href="/dashboard/staff/self-service/leave" onClick={() => setSidebarOpen(false)} icon={Umbrella}>
            My Leave
          </NavLink>
              <NavLink href="/dashboard/staff/self-service/advances" onClick={() => setSidebarOpen(false)} icon={HandCoins}>
            My Salary Advances
          </NavLink>
              <NavLink href="/dashboard/staff/self-service/payslips" onClick={() => setSidebarOpen(false)} icon={Banknote}>
            My Payslips
          </NavLink>
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
      <PwaInstallPrompt />
    </div>
  )
}
