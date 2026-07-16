import { createClient } from '@/utils/supabase/server'
import AttendanceClient from './AttendanceClient'

export default async function StudentAttendancePage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles, role, first_name')
    .eq('id', user?.id)
    .single()
    
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Student') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch all attendance for this student
  const { data: attLogs } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', user?.id)
    .order('date', { ascending: false })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          My Attendance Records
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          View your daily attendance history and summary statistics.
        </p>
      </div>

      <AttendanceClient initialLogs={attLogs || []} />
    </div>
  )
}
