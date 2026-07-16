import { createClient } from '@/utils/supabase/server'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

export default async function HOSDashboardPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Head of Section') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch student enrollment counts in HOS section (Primary section Grade 1 to 3)
  const { data: students } = await supabase
    .from('students')
    .select('grade_level')

  const sectionGrades = ['Grade 1', 'Grade 2', 'Grade 3']
  const sectionStudents = (students || []).filter(s => sectionGrades.includes(s.grade_level || ''))
  const totalSectionEnrollment = sectionStudents.length

  // Fetch section teacher profiles
  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .eq('role', 'Teacher')

  // Fetch lesson plans status
  const { data: lessonPlans } = await supabase
    .from('lesson_plans')
    .select('*')
    .eq('academic_year', '2025-2026')

  const activePlans = lessonPlans || []
  const submittedTeachersCount = teachers?.filter(t => activePlans.some(p => p.teacher_id === t.id)).length || 0
  const unsubmittedTeachersCount = (teachers?.length || 0) - submittedTeachersCount

  // Fetch upcoming calendar events targeting section
  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .order('start_date', { ascending: true })

  const upcomingEvents = (events || []).slice(0, 3)

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Head of Section Dashboard
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Monitoring Primary Section (Grade 1 - 3) academic submissions, enrollment, and activities.
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Section Enrollment</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-secondary)', margin: 0 }}>
            {totalSectionEnrollment} Students
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Lesson Plans Submitted</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)', margin: 0 }}>
            {submittedTeachersCount} Teachers
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Pending Submissions</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-error)', margin: 0 }}>
            {unsubmittedTeachersCount} Teachers
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Teacher Lesson Plans list */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Section Teacher Submissions Tracker
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.01)', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Teacher Name</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Plans</th>
              </tr>
            </thead>
            <tbody>
              {(teachers || []).map(t => {
                const plans = activePlans.filter(p => p.teacher_id === t.id)
                const hasSubmitted = plans.length > 0
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>
                      {t.first_name} {t.last_name}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                        backgroundColor: hasSubmitted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: hasSubmitted ? 'var(--color-success)' : 'var(--color-error)'
                      }}>
                        {hasSubmitted ? 'Submitted' : 'Pending'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                      {plans.length} Lesson Plans
                    </td>
                  </tr>
                )
              })}

              {(teachers || []).length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No teachers assigned to this section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Right Column: Section Calendar Events */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '1.25rem', fontWeight: 600 }}>Section Events Calendar</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {upcomingEvents.map(evt => (
              <div key={evt.id} style={{ borderLeft: '3px solid var(--color-secondary)', paddingLeft: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{evt.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  {formatDate(evt.start_date)} to {formatDate(evt.end_date)}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>{evt.description}</p>
              </div>
            ))}

            {upcomingEvents.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>No calendar events scheduled.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
