import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

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
          <Image src="/logo.png" alt="Logo" width={40} height={40} />
          <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 600 }}>Leaders ERP</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {profile?.first_name} {profile?.last_name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {profile?.role || 'System Admin'}
            </div>
          </div>
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

          {(profile?.role === 'System Admin' || profile?.role === 'Director' || profile?.role === 'Principal' || profile?.role === 'Teacher') && (
            <Link href="/dashboard/students" style={{
              display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
            }}>
              Students
            </Link>
          )}
          
          {(profile?.role === 'System Admin' || profile?.role === 'Director' || profile?.role === 'Principal') && (
            <>
              <Link href="/dashboard/staff" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Staff & Teachers
              </Link>
              <Link href="/dashboard/principal/lesson-plans" style={{
                display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
              }}>
                Lesson Plan Reports
              </Link>
            </>
          )}

          {(profile?.role === 'System Admin' || profile?.role === 'Director') && (
            <Link href="/dashboard/users" style={{
              display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
            }}>
              User Management
            </Link>
          )}

          {(profile?.role === 'System Admin' || profile?.role === 'Teacher') && (
            <Link href="/dashboard/teacher" style={{
              display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)',
              textDecoration: 'none', color: 'var(--color-text)', fontWeight: 500,
            }}>
              Teacher Portal
            </Link>
          )}
        </aside>

        {/* Main Content Area */}
        <main style={{ flex: 1, padding: '2rem', backgroundColor: 'var(--color-bg)' }}>
          {children}
        </main>
      </div>
    </div>
  )
}
