'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, CalendarDays, Users, UserCog, BookOpen, FileSpreadsheet, 
  Settings, Wallet, Receipt, Bell, Menu, X, LogOut,
  UsersRound, Scale, Plug, Fingerprint, Package, Bus, School,
  ClipboardCheck, PenLine, Baby, Puzzle, Layers, Sparkles,
  CreditCard, HandCoins, ListTree, BookCopy, Landmark, Building2,
  HeartHandshake, Umbrella, Banknote, ChevronLeft, ChevronRight
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
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const toggleMobile = () => setMobileOpen(!mobileOpen)
  const toggleCollapsed = () => setCollapsed(!collapsed)
  const toggleNotifications = () => setNotificationsOpen(!notificationsOpen)

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

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

  const sidebarWidth = collapsed ? '68px' : '240px'

  const NavLink = ({ href, icon: Icon, children: label }: { href: string; icon: any; children: React.ReactNode }) => {
    const active = isActive(href)
    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        className={`nav-link ${active ? 'active' : ''}`}
        title={collapsed ? String(label) : undefined}
        style={{
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? '0.7rem' : '0.7rem 0.85rem',
          position: 'relative',
        }}
      >
        <span className="nav-icon" style={{ flexShrink: 0 }}>{Icon && <Icon size={18} />}</span>
        <span
          className="nav-label"
          style={{
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            opacity: collapsed ? 0 : 1,
            width: collapsed ? 0 : 'auto',
            transition: 'opacity 0.2s ease, width 0.2s ease',
          }}
        >
          {label}
        </span>
      </Link>
    )
  }

  const SectionHeader = ({ children: label }: { children: React.ReactNode }) => (
    <div
      className="nav-section"
      title={collapsed ? String(label) : undefined}
      style={{
        opacity: collapsed ? 0.6 : 1,
        height: 'auto',
        overflow: 'hidden',
        padding: collapsed ? '0.35rem 0' : '0.35rem 0.85rem',
        marginTop: collapsed ? '0.5rem' : '0.85rem',
        textAlign: collapsed ? 'center' : 'left',
        fontSize: collapsed ? '0.55rem' : '0.68rem',
        transition: 'all 0.2s ease',
        borderBottom: collapsed ? '1px solid rgba(100, 116, 139, 0.2)' : 'none',
        paddingBottom: collapsed ? '0.35rem' : '0',
        letterSpacing: collapsed ? '0.1em' : '0.05em',
      }}
    >
      {collapsed ? String(label).substring(0, 3).toUpperCase() : label}
    </div>
  )

  // Sidebar content (shared between mobile overlay and desktop sidebar)
  const sidebarContent = (
    <>
      <SectionHeader>Main Menu</SectionHeader>

      {(userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal') || userRoles.includes('Dean') || userRoles.includes('HOS') || userRoles.includes('Accountant')) && (
        <NavLink href="/dashboard" icon={LayoutDashboard}>
          Dashboard Overview
        </NavLink>
      )}

      <NavLink href="/dashboard/calendar" icon={CalendarDays}>
        School Calendar
      </NavLink>

      {(userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal') || userRoles.includes('Teacher')) && (
        <NavLink href="/dashboard/students" icon={Users}>
          Students
        </NavLink>
      )}

      {(userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal')) && (
        <NavLink href="/dashboard/staff" icon={UserCog}>
          Staff & Teachers
        </NavLink>
      )}

      {(userRoles.includes('System Admin') || userRoles.includes('Principal') || userRoles.includes('Dean') || userRoles.includes('HOS')) && (
        <>
          <SectionHeader>Academic Leadership</SectionHeader>

          {(userRoles.includes('System Admin') || userRoles.includes('Principal') || userRoles.includes('Director')) && (
            <NavLink href="/dashboard/principal/lesson-plans" icon={BookOpen}>
              Lesson Plan Reports
            </NavLink>
          )}

          <NavLink href="/dashboard/principal/report-cards" icon={FileSpreadsheet}>
            Report Cards (Principal)
          </NavLink>
        </>
      )}

      {(userRoles.includes('System Admin') || userRoles.includes('Director')) && (
        <NavLink href="/dashboard/users" icon={UsersRound}>
          User Management
        </NavLink>
      )}

      {(userRoles.includes('System Admin') || userRoles.includes('Director') || userRoles.includes('Principal') || userRoles.includes('Accountant')) && (
        <NavLink href="/dashboard/accountant/fee-balances" icon={Scale}>
          Fee Balances
        </NavLink>
      )}

      {userRoles.includes('System Admin') && (
        <>
          <SectionHeader>Administration</SectionHeader>
          <NavLink href="/dashboard/admin/settings" icon={Settings}>
            School Settings
          </NavLink>
          <NavLink href="/dashboard/admin/backups" icon={Settings}>
            Database Backups
          </NavLink>
          <NavLink href="/dashboard/admin/audit-logs" icon={Settings}>
            Security Audit Logs
          </NavLink>
          <NavLink href="/dashboard/admin/integrations" icon={Plug}>
            Integrations
          </NavLink>
          <NavLink href="/dashboard/admin/syllabus" icon={Settings}>
            Syllabus Setup
          </NavLink>
          <NavLink href="/dashboard/admin/subjects" icon={Settings}>
            Subjects Setup
          </NavLink>
          <NavLink href="/dashboard/admin/teacher-assignments" icon={Settings}>
            Teacher Assignments
          </NavLink>
          <NavLink href="/dashboard/admin/biometric/devices" icon={Fingerprint}>
            Biometric Devices
          </NavLink>
          <NavLink href="/dashboard/admin/biometric/exceptions" icon={Fingerprint}>
            Biometric Exceptions
          </NavLink>
          <NavLink href="/dashboard/admin/kitchen-content" icon={Settings}>
            Kitchen Content
          </NavLink>
        </>
      )}

      {(userRoles.includes('System Admin') || userRoles.includes('Director')) && (
        <>
          <SectionHeader>Director Operations</SectionHeader>
          <NavLink href="/dashboard/director" icon={LayoutDashboard}>
            Executive Dashboard
          </NavLink>
          <NavLink href="/dashboard/director/attendance" icon={ClipboardCheck}>
            Staff Attendance
          </NavLink>
          <NavLink href="/dashboard/director/finance" icon={Wallet}>
            Financial Overview
          </NavLink>
          <NavLink href="/dashboard/director/payrolls" icon={HandCoins}>
            Manage Payrolls
          </NavLink>
          <NavLink href="/dashboard/director/applications" icon={BookOpen}>
            Self-Service Inbox
          </NavLink>
          <NavLink href="/dashboard/director/inventory" icon={Package}>
            Inventory
          </NavLink>
          <NavLink href="/dashboard/director/transport" icon={Bus}>
            Transport
          </NavLink>
        </>
      )}

      {(userRoles.includes('System Admin') || userRoles.includes('Dean')) && (
        <>
          <SectionHeader>Dean Operations</SectionHeader>
          <NavLink href="/dashboard/dean" icon={LayoutDashboard}>
            Dashboard Overview
          </NavLink>
          <NavLink href="/dashboard/dean/students" icon={UsersRound}>
            Student Enrollment
          </NavLink>
          <NavLink href="/dashboard/dean/marks-overview" icon={PenLine}>
            Marks Overview
          </NavLink>
          <NavLink href="/dashboard/dean/submissions" icon={BookOpen}>
            Submissions Review
          </NavLink>
          <NavLink href="/dashboard/dean/report-cards" icon={FileSpreadsheet}>
            Report Cards (Dean)
          </NavLink>
        </>
      )}

      {(userRoles.includes('System Admin') || userRoles.includes('HOS')) && (
        <>
          <SectionHeader>Section Operations</SectionHeader>
          <NavLink href="/dashboard/hos/marks" icon={PenLine}>
            Section Marks Overview
          </NavLink>
          <NavLink href="/dashboard/hos/attendance" icon={ClipboardCheck}>
            Section Attendance
          </NavLink>
        </>
      )}

      {(userRoles.includes('System Admin') || userRoles.includes('Teacher')) && (
        <>
          <SectionHeader>My Classes</SectionHeader>
          <NavLink href="/dashboard/teacher" icon={School}>
            Teacher Dashboard
          </NavLink>
          <NavLink href="/dashboard/teacher/attendance" icon={ClipboardCheck}>
            Daily Attendance
          </NavLink>
          <NavLink href="/dashboard/teacher/marks" icon={PenLine}>
            Academic Marks
          </NavLink>
          <NavLink href="/dashboard/teacher/lesson-plans/new" icon={BookOpen}>
            Lesson Plans
          </NavLink>
          <NavLink href="/dashboard/teacher/early-years" icon={Baby}>
            Early Years
          </NavLink>
          <NavLink href="/dashboard/teacher/class-activities" icon={Puzzle}>
            Class Activities
          </NavLink>
          <NavLink href="/dashboard/teacher/quizzes/bank" icon={Layers}>
            Quiz Bank
          </NavLink>
          <NavLink href="/dashboard/teacher/quizzes/jobs" icon={Sparkles}>
            Quiz Print Jobs
          </NavLink>
          <NavLink href="/dashboard/teacher/report-cards" icon={FileSpreadsheet}>
            Report Cards (Teacher)
          </NavLink>
        </>
      )}

      {(userRoles.includes('System Admin') || userRoles.includes('Accountant')) && (
        <>
          <SectionHeader>Finance</SectionHeader>
          <NavLink href="/dashboard/accountant" icon={Wallet}>
            Financial Dashboard
          </NavLink>
          <NavLink href="/dashboard/accountant/invoices" icon={Receipt}>
            Student Invoices
          </NavLink>
          <NavLink href="/dashboard/accountant/payments" icon={CreditCard}>
            Record Payments
          </NavLink>
          <NavLink href="/dashboard/accountant/expenses" icon={FileSpreadsheet}>
            Expenses & Bills
          </NavLink>
          <NavLink href="/dashboard/accountant/payroll" icon={HandCoins}>
            Manage Payroll
          </NavLink>
          <NavLink href="/dashboard/accountant/advances" icon={HandCoins}>
            Salary Advances
          </NavLink>
          <NavLink href="/dashboard/accountant/leave-config" icon={Settings}>
            Leave Configuration
          </NavLink>
          <SectionHeader>Accounting Suite</SectionHeader>
          <NavLink href="/dashboard/accountant/accounting/statements" icon={FileSpreadsheet}>
            Financial Statements
          </NavLink>
          <NavLink href="/dashboard/accountant/accounting/coa" icon={ListTree}>
            Chart of Accounts
          </NavLink>
          <NavLink href="/dashboard/accountant/accounting/journals" icon={BookCopy}>
            Journals
          </NavLink>
          <NavLink href="/dashboard/accountant/accounting/reconciliation" icon={Scale}>
            Reconciliation
          </NavLink>
          <NavLink href="/dashboard/accountant/accounting/bills" icon={Receipt}>
            Bills & Payables
          </NavLink>
          <NavLink href="/dashboard/accountant/accounting/deposits" icon={Landmark}>
            Bank Deposits
          </NavLink>
          <NavLink href="/dashboard/accountant/accounting/assets" icon={Building2}>
            Fixed Assets
          </NavLink>
        </>
      )}

      {(userRoles.includes('System Admin') || userRoles.includes('Student')) && (
        <>
          <SectionHeader>My Academics</SectionHeader>
          <NavLink href="/dashboard/student" icon={School}>
            Student Dashboard
          </NavLink>
          <NavLink href="/dashboard/student/report-card" icon={FileSpreadsheet}>
            Report Card
          </NavLink>
          <NavLink href="/dashboard/student/fees" icon={Receipt}>
            Fee Statements
          </NavLink>
        </>
      )}

      {(userRoles.includes('System Admin') || userRoles.includes('Parent')) && (
        <>
          <SectionHeader>Parent Portal</SectionHeader>
          <NavLink href="/dashboard/parent/dashboard" icon={HeartHandshake}>
            Parent Dashboard
          </NavLink>
          <NavLink href="/dashboard/parent/students" icon={Users}>
            My Children
          </NavLink>
          <NavLink href="/dashboard/parent/report-card" icon={FileSpreadsheet}>
            Report Card
          </NavLink>
          <NavLink href="/dashboard/parent/fees" icon={Receipt}>
            Fee Invoices
          </NavLink>
        </>
      )}

      {(userRoles.includes('Teacher') || userRoles.includes('Accountant') || userRoles.includes('HOS') || userRoles.includes('Dean') || userRoles.includes('Principal') || userRoles.includes('Director')) && (
        <>
          <SectionHeader>Self Service</SectionHeader>
          <NavLink href="/dashboard/staff/self-service/leave" icon={Umbrella}>
            My HR Dashboard
          </NavLink>
          <NavLink href="/dashboard/staff/self-service/leave" icon={Umbrella}>
            My Leave
          </NavLink>
          <NavLink href="/dashboard/staff/self-service/advances" icon={HandCoins}>
            My Salary Advances
          </NavLink>
          <NavLink href="/dashboard/staff/self-service/payslips" icon={Banknote}>
            My Payslips
          </NavLink>
        </>
      )}
    </>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column' }}>
      
      {/* Tooltip styles for collapsed sidebar */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Desktop: sidebar always visible */
        @media (min-width: 768px) {
          .sidebar-desktop {
            transform: translateX(0) !important;
            position: relative !important;
          }
          .mobile-overlay { display: none !important; }
          .mobile-sidebar { display: none !important; }
          .mobile-toggle { display: none !important; }
        }

        /* Mobile: sidebar as overlay */
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
          .desktop-collapse-toggle { display: none !important; }
        }

        /* Collapsed sidebar tooltip on hover */
        .sidebar-collapsed .nav-link {
          position: relative;
        }
        .sidebar-collapsed .nav-link:hover::after {
          content: attr(title);
          position: absolute;
          left: calc(100% + 8px);
          top: 50%;
          transform: translateY(-50%);
          background: var(--color-text, #1a2332);
          color: #fff;
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          font-size: 0.8rem;
          font-weight: 500;
          white-space: nowrap;
          z-index: 100;
          pointer-events: none;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: tooltipFade 0.15s ease-in-out;
        }
        .sidebar-collapsed .nav-link:hover::before {
          content: '';
          position: absolute;
          left: calc(100% + 2px);
          top: 50%;
          transform: translateY(-50%);
          border: 5px solid transparent;
          border-right-color: var(--color-text, #1a2332);
          z-index: 100;
          pointer-events: none;
        }
        @keyframes tooltipFade {
          from { opacity: 0; transform: translateY(-50%) translateX(-4px); }
          to   { opacity: 1; transform: translateY(-50%) translateX(0); }
        }
      `}} />

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
          {/* Mobile hamburger */}
          <button onClick={toggleMobile} className="btn btn-icon btn-ghost mobile-toggle" aria-label="Toggle Menu">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          {/* Desktop collapse/expand */}
          <button onClick={toggleCollapsed} className="btn btn-icon btn-ghost desktop-collapse-toggle" aria-label="Toggle Sidebar">
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
        
        {/* Mobile Overlay */}
        {mobileOpen && (
          <div 
            className="mobile-overlay"
            onClick={() => setMobileOpen(false)}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 30 }}
          />
        )}

        {/* Mobile Sidebar (slide-in overlay — full expanded) */}
        <aside
          className="mobile-sidebar"
          style={{
            width: '260px',
            backgroundColor: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            padding: '1.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            position: 'fixed',
            top: '64px',
            bottom: 0,
            left: 0,
            zIndex: 40,
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s ease',
            overflowY: 'auto'
          }}
        >
          {sidebarContent}
        </aside>

        {/* Desktop Sidebar (always visible, collapsible) */}
        <aside
          className={`sidebar-desktop ${collapsed ? 'sidebar-collapsed' : ''}`}
          style={{
            width: sidebarWidth,
            minWidth: sidebarWidth,
            backgroundColor: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            padding: collapsed ? '1rem 0.5rem' : '1.5rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            transition: 'width 0.25s ease, min-width 0.25s ease, padding 0.25s ease',
            overflowY: 'auto',
            overflowX: 'hidden',
            height: 'calc(100vh - 64px)',
            position: 'sticky',
            top: '64px',
          }}
        >
          {sidebarContent}
        </aside>

        {/* Main Content Area */}
        <main
          style={{ 
            flex: 1, 
            padding: '2rem', 
            backgroundColor: 'var(--color-background)',
            minWidth: 0,
          }}
          className="main-content-area"
        >
          {children}
        </main>
      </div>
      <PwaInstallPrompt />
    </div>
  )
}
