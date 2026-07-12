import { createClient } from '@/utils/supabase/server'

export default async function HOSAttendancePage() {
  const supabase = await createClient()

  // In a real implementation, we would filter by HOS department
  // For MVP, we will show all classes
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .order('class_name', { ascending: true })

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Section Attendance Overview</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-primary)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Average Section Attendance</h3>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)' }}>
            94.2%
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-error)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Students Below 80%</h3>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)' }}>
            12
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Class Attendance Rates (Today)</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Class Name</th>
              <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Present</th>
              <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Absent</th>
              <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Late</th>
              <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Attendance %</th>
            </tr>
          </thead>
          <tbody>
            {(classes || []).map((c) => {
              // Mock data for MVP
              const present = Math.floor(Math.random() * 20) + 10
              const absent = Math.floor(Math.random() * 5)
              const late = Math.floor(Math.random() * 3)
              const total = present + absent + late
              const percent = total > 0 ? Math.round((present / total) * 100) : 0

              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{c.class_name}</td>
                  <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-success)' }}>{present}</td>
                  <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-error)' }}>{absent}</td>
                  <td style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-warning)' }}>{late}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: percent < 85 ? 'var(--color-error)' : 'var(--color-success)' }}>
                    {percent}%
                  </td>
                </tr>
              )
            })}
            {(!classes || classes.length === 0) && (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No classes found in your section.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
