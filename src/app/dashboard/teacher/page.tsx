import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function TeacherDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles, first_name')
    .eq('id', user?.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Teacher') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>This portal is for Teachers only.</p>
      </div>
    )
  }

  // Fetch classes assigned to this teacher
  const { data: classSubjects } = await supabase
    .from('class_subjects')
    .select(`
      id,
      classes (id, name, section),
      subjects (id, name)
    `)
    .eq('teacher_id', user?.id)

  // Fetch pending lesson plans (draft or returned)
  const { data: lessonPlans } = await supabase
    .from('lesson_plans')
    .select('*')
    .eq('teacher_id', user?.id)
    .in('status', ['Draft', 'Returned'])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Teacher Portal</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link href="/dashboard/teacher/lesson-plans/new" className="btn btn-primary">
            + Submit Lesson Plan
          </Link>
          <Link href="/dashboard/teacher/homework/new" className="btn" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            + Create Homework
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>My Classes</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-primary)' }}>
            {classSubjects?.length || 0}
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Action Required</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-error)' }}>
            {lessonPlans?.length || 0} Plans
          </p>
        </div>
      </div>

      <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>My Assigned Classes</h2>
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Class</th>
              <th style={{ padding: '1rem' }}>Subject</th>
              <th style={{ padding: '1rem' }}>Section</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classSubjects?.map((cs: any) => (
              <tr key={cs.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{cs.classes?.name}</td>
                <td style={{ padding: '1rem' }}>{cs.subjects?.name}</td>
                <td style={{ padding: '1rem' }}>{cs.classes?.section}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Link href={`/dashboard/teacher/marks?class=${cs.classes?.id}&subject=${cs.subjects?.id}`} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', background: 'transparent', border: '1px solid var(--color-border)' }}>
                      Enter Marks
                    </Link>
                    <Link href={`/dashboard/teacher/homework?class=${cs.classes?.id}&subject=${cs.subjects?.id}`} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', background: 'transparent', border: '1px solid var(--color-border)' }}>
                      Homework
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            
            {(!classSubjects || classSubjects.length === 0) && (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  You have not been assigned to any classes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
