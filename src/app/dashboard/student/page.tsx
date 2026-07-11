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

  // Fetch student specific record
  const { data: studentRecord } = await supabase
    .from('students')
    .select('*')
    .eq('id', user?.id)
    .single()

  // Fetch student's attendance records
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('student_id', user?.id)
    .order('date', { ascending: false })

  const attRecords = attendance || []
  const totalAtt = attRecords.length
  const presentAtt = attRecords.filter(r => r.status === 'Present' || r.status === 'Late').length
  const attendanceRate = totalAtt > 0 ? Math.round((presentAtt / totalAtt) * 100) : 100

  // Mock student homework list
  const homeworkList = [
    { id: '1', subject: 'Mathematics', topic: 'Fractions Calculation', dueDate: '2026-07-15', instructions: 'Solve exercises 4 to 8 on Page 45 of the primary workbook.' },
    { id: '2', subject: 'Kiswahili', topic: 'Swahili Methali Composition', dueDate: '2026-07-18', instructions: 'Write a composition illustrating the methali: Haraka haraka haina baraka.' }
  ]

  // Mock term results
  const termResults = [
    { subject: 'Mathematics', score: 88, grade: 'A', status: 'Passed' },
    { subject: 'English Language', score: 76, grade: 'B', status: 'Passed' },
    { subject: 'Science', score: 92, grade: 'A', status: 'Passed' },
    { subject: 'Kiswahili', score: 84, grade: 'A', status: 'Passed' }
  ]

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
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', fontWeight: 600 }}>Active Homework Assignments</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {homeworkList.map(hw => (
                <div key={hw.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>{hw.subject}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-error)', fontWeight: 500 }}>
                      Due: {formatDate(hw.dueDate)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{hw.topic}</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: 0 }}>{hw.instructions}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Term Results */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
              Term 1 Academic Results
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.01)', borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Subject</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Score</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Grade</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {termResults.map(res => (
                  <tr key={res.subject} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{res.subject}</td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{res.score}%</td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: res.grade === 'A' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.05)',
                        color: res.grade === 'A' ? 'var(--color-success)' : 'var(--color-text)'
                      }}>
                        {res.grade}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-success)', fontSize: '0.85rem' }}>{res.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Attendance & Calendar Summary */}
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

          {/* Personal Log Summary Table */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
              Recent Attendance History
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
              {attRecords.slice(0, 5).map(rec => (
                <div key={rec.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontSize: '0.85rem' }}>{formatDate(rec.date)}</span>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600,
                    color: rec.status === 'Present' ? 'var(--color-success)' : 'var(--color-error)'
                  }}>{rec.status}</span>
                </div>
              ))}
              {attRecords.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>No attendance logs.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
