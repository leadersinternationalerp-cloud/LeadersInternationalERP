import { createClient } from '@/utils/supabase/server'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

export default async function StudentDashboardPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
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

  // 1. Fetch student details
  const { data: studentRecord } = await supabase
    .from('students')
    .select('*')
    .eq('id', user?.id)
    .single()

  let homeworkCount = 0
  let upcomingActivitiesCount = 0
  let attendanceRate = 100
  let newResultsCount = 0
  
  let activeHomework: any[] = []
  let upcomingActivities: any[] = []
  let submissions: any[] = []

  if (studentRecord) {
    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .eq('name', studentRecord.grade_level)
      .eq('section', studentRecord.section)
      .single()

    if (cls) {
      const classId = cls.id

      // Fetch active homework
      const { data: homework } = await supabase
        .from('homework')
        .select(`*, subjects(name)`)
        .eq('class_id', classId)
        .order('due_date', { ascending: true })

      activeHomework = homework || []
      homeworkCount = activeHomework.length

      // Fetch student's submissions
      const { data: subs } = await supabase
        .from('homework_submissions')
        .select('*')
        .eq('student_id', user?.id)
      
      submissions = subs || []

      // Fetch upcoming activities next 7 days
      const now = new Date()
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const { data: activities } = await supabase
        .from('class_activities')
        .select('*')
        .eq('class_id', classId)
        .gte('date', now.toISOString())
        .lte('date', nextWeek.toISOString())
        .order('date', { ascending: true })

      upcomingActivities = activities || []
      upcomingActivitiesCount = upcomingActivities.length
    }

    // Fetch attendance rate this term (simplified to all for now)
    const { data: attLogs } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', user?.id)

    const totalAtt = attLogs ? attLogs.length : 0
    const presentAtt = attLogs ? attLogs.filter((r: any) => r.status === 'Present' || r.status === 'Late').length : 0
    attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100

    // Fetch new results count (released recently)
    const { data: marks } = await supabase
      .from('marks')
      .select('id')
      .eq('student_id', user?.id)
      .eq('is_released', true)
      
    newResultsCount = marks ? marks.length : 0
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Welcome back, {profile?.first_name}!
        </h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Student ID: <strong>{studentRecord?.student_id || 'N/A'}</strong> • Class: <strong>{studentRecord?.grade_level} {studentRecord?.section ? `- ${studentRecord?.section}` : ''}</strong>
        </p>
      </div>

      {/* 4 Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <Link href="/dashboard/student/homework" style={{ textDecoration: 'none' }}>
          <div className="glass-panel summary-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', transition: 'transform 0.2s', cursor: 'pointer' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pending Homework</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.5rem' }}>{homeworkCount}</div>
          </div>
        </Link>
        <Link href="/dashboard/student/activities" style={{ textDecoration: 'none' }}>
          <div className="glass-panel summary-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', transition: 'transform 0.2s', cursor: 'pointer' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Upcoming Activities</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-secondary)', marginTop: '0.5rem' }}>{upcomingActivitiesCount}</div>
          </div>
        </Link>
        <Link href="/dashboard/student/attendance" style={{ textDecoration: 'none' }}>
          <div className="glass-panel summary-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', transition: 'transform 0.2s', cursor: 'pointer' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Attendance Rate</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: attendanceRate >= 90 ? 'var(--color-success)' : 'var(--color-warning)', marginTop: '0.5rem' }}>{attendanceRate}%</div>
          </div>
        </Link>
        <Link href="/dashboard/student/results" style={{ textDecoration: 'none' }}>
          <div className="glass-panel summary-card" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', transition: 'transform 0.2s', cursor: 'pointer' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>New Results</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.5rem' }}>{newResultsCount}</div>
          </div>
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Homework */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>My Homework Widgets</h3>
              <Link href="/dashboard/student/homework" style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', textDecoration: 'none', fontWeight: 600 }}>
                View All
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeHomework.slice(0, 4).map(hw => {
                const sub = submissions.find(s => s.homework_id === hw.id)
                return (
                  <div key={hw.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>{hw.subjects?.name}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Due: {formatDate(hw.due_date)}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{hw.title}</div>
                    </div>
                    <div>
                      <span style={{ 
                        padding: '0.3rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: sub ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: sub ? 'var(--color-success)' : 'var(--color-error)'
                      }}>
                        {sub ? 'Submitted' : 'Pending'}
                      </span>
                    </div>
                  </div>
                )
              })}

              {activeHomework.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  No active homework assignments assigned.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Activities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Upcoming Activities</h3>
              <Link href="/dashboard/student/activities" style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', textDecoration: 'none', fontWeight: 600 }}>
                View All
              </Link>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcomingActivities.map(act => (
                <div key={act.id} style={{ display: 'flex', flexDirection: 'column', padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{act.title}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>{act.subject}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {new Date(act.date).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {upcomingActivities.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
                  No upcoming class activities for the next 7 days.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
