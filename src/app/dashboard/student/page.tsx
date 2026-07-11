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

  if (profile?.role !== 'Student' && profile?.role !== 'System Admin') {
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

  let classId = ''
  let homeworkCount = 0
  let attendanceRate = 100
  let totalAtt = 0
  let presentAtt = 0
  let recentAttendance: any[] = []
  let releasedMarks: any[] = []
  let activeHomework: any[] = []

  if (studentRecord) {
    // Find class matching grade level & section
    const { data: cls } = await supabase
      .from('classes')
      .select('id')
      .eq('name', studentRecord.grade_level)
      .eq('section', studentRecord.section)
      .single()

    if (cls) {
      classId = cls.id

      // Fetch active homework
      const { data: homework } = await supabase
        .from('homework')
        .select(`
          *,
          subjects(name)
        `)
        .eq('class_id', classId)
        .order('due_date', { ascending: true })

      activeHomework = homework || []
      homeworkCount = activeHomework.length
    }

    // Fetch attendance
    const { data: attLogs } = await supabase
      .from('attendance')
      .select('*')
      .eq('student_id', user?.id)
      .order('date', { ascending: false })

    recentAttendance = attLogs || []
    totalAtt = recentAttendance.length
    presentAtt = recentAttendance.filter(r => r.status === 'Present' || r.status === 'Late').length
    attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100

    // Fetch released marks
    const { data: marks } = await supabase
      .from('marks')
      .select(`
        *,
        subjects(name)
      `)
      .eq('student_id', user?.id)
      .eq('is_released', true)
      .order('created_at', { ascending: false })

    releasedMarks = marks || []
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

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Homework & Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Active Homework */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>Active Homework Assignments</h3>
              <Link href="/dashboard/student/homework" style={{ fontSize: '0.85rem', color: 'var(--color-secondary)', textDecoration: 'none' }}>
                View All
              </Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeHomework.slice(0, 3).map(hw => (
                <div key={hw.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>{hw.subjects?.name}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-error)', fontWeight: 500 }}>
                      Due: {formatDate(hw.due_date)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{hw.title}</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>{hw.description.substring(0, 100)}...</p>
                </div>
              ))}

              {activeHomework.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                  No active homework assignments assigned.
                </p>
              )}
            </div>
          </div>

          {/* Real Released Marks */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
              Official Academic Marks (Released)
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.01)', borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Subject</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Assessment</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Score</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {releasedMarks.map((res) => {
                  const scoreVal = res.score
                  let grade = 'F'
                  if (scoreVal >= 80) grade = 'A'
                  else if (scoreVal >= 70) grade = 'B'
                  else if (scoreVal >= 60) grade = 'C'
                  else if (scoreVal >= 50) grade = 'D'

                  return (
                    <tr key={res.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{res.subjects?.name}</td>
                      <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                        {res.assessment_type} ({res.term})
                      </td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{res.score}%</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: grade === 'A' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.05)',
                          color: grade === 'A' ? 'var(--color-success)' : 'var(--color-text)'
                        }}>
                          {grade}
                        </span>
                      </td>
                    </tr>
                  )
                })}

                {releasedMarks.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No academic marks released for this term yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Attendance & Recent Logs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Attendance Overview */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', fontWeight: 600 }}>My Attendance Rate</h3>
            <div style={{
              fontSize: '3rem', fontWeight: 800, color: attendanceRate >= 90 ? 'var(--color-success)' : 'var(--color-warning)',
              margin: '1.5rem 0'
            }}>
              {attendanceRate}%
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              Total Logs: {totalAtt} Days • Present/Late: {presentAtt} Days
            </div>
          </div>

          {/* Recent Logs list */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
              Recent Attendance History
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
              {recentAttendance.slice(0, 5).map(rec => (
                <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.85rem' }}>{formatDate(rec.date)}</span>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600,
                    color: rec.status === 'Present' ? 'var(--color-success)' : 'var(--color-error)'
                  }}>{rec.status}</span>
                </div>
              ))}
              {recentAttendance.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem' }}>
                  No attendance logs found in database.
                </p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
