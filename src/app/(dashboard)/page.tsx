import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  const role = profile?.role || 'System Admin'

  return (
    <div>
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Welcome, {profile?.first_name || 'System Admin'}!
      </h1>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem'
      }}>
        {/* Quick Stats / Info Cards */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Your Role</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-primary)' }}>
            {role}
          </p>
        </div>
        
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>Academic Year</h3>
          <p style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-primary)' }}>
            2025-2026
          </p>
        </div>
      </div>
      
      <div style={{ marginTop: '2.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Dashboard Overview</h2>
        
        {/* Role-Based Content */}
        {(role === 'System Admin' || role === 'Director' || role === 'Principal') && (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Administration Actions</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Manage users, configure academic calendars, and view school-wide analytics.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href="/dashboard/users" className="btn btn-primary">Manage Users</Link>
              <Link href="#" className="btn" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>Academic Settings</Link>
            </div>
          </div>
        )}

        {role === 'Teacher' && (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Teacher Actions</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Manage classes, enter grades, and track student attendance.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary">My Classes</button>
              <button className="btn" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>Gradebook</button>
            </div>
          </div>
        )}

        {role === 'Student' && (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Student Actions</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              View assignments, check your grades, and see announcements.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary">Assignments</button>
              <button className="btn" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>Report Card</button>
            </div>
          </div>
        )}

        {role === 'Parent' && (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Parent Actions</h3>
            <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
              Track your child's progress, view billing statements, and communicate with teachers.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary">Child's Progress</button>
              <button className="btn" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>Billing</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
