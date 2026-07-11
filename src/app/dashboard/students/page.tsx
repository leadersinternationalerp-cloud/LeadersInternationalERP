import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function StudentsPage() {
  const supabase = await createClient()

  // Verify Admin or Teacher access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
  const role = profile?.role
  
  if (role !== 'System Admin' && role !== 'Director' && role !== 'Principal' && role !== 'Teacher') {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch students joining with profiles
  const { data: students, error } = await supabase
    .from('students')
    .select(`
      *,
      profiles(first_name, last_name, email)
    `)
    .order('created_at', { ascending: false })

  const studentsList = students || []

  // 1. Calculate statistics per class/grade
  const gradeCounts: Record<string, number> = {}
  studentsList.forEach(s => {
    const gl = s.grade_level || 'Unassigned'
    gradeCounts[gl] = (gradeCounts[gl] || 0) + 1
  })

  // 2. Population growth month-over-month simulation or grouping
  const growthMap: Record<string, number> = {}
  studentsList.forEach(s => {
    if (s.created_at) {
      const month = new Date(s.created_at).toLocaleString('en-US', { month: 'short', year: 'numeric' })
      growthMap[month] = (growthMap[month] || 0) + 1
    }
  })

  const sortedMonths = Object.keys(growthMap).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
  let runningTotal = 0
  const growthTrend = sortedMonths.map(month => {
    runningTotal += growthMap[month]
    return { month, total: runningTotal }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Student Directory</h1>
        {(role === 'System Admin' || role === 'Director' || role === 'Principal') && (
          <button className="btn btn-primary">+ Enroll Student</button>
        )}
      </div>

      {/* Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Class Enrollment Counts */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', fontWeight: 600 }}>Enrollment Count per Class</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
            {Object.entries(gradeCounts).map(([grade, count]) => (
              <div key={grade} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{grade}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{count}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Students</div>
              </div>
            ))}
            {Object.keys(gradeCounts).length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No class enrollments found.</p>
            )}
          </div>
        </div>

        {/* Growth Curve Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '1.25rem', fontWeight: 600 }}>School Population Growth Curve</h3>
          {growthTrend.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {growthTrend.map(pt => (
                <div key={pt.month} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', width: '80px' }}>{pt.month}</span>
                  <div style={{ flex: 1, height: '12px', backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: '6px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${Math.min((pt.total / Math.max(...growthTrend.map(g => g.total))) * 100, 100)}%`,
                      height: '100%',
                      backgroundColor: 'var(--color-secondary)',
                      borderRadius: '6px',
                      transition: 'width 0.5s ease-out'
                    }} />
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, width: '40px', textAlign: 'right' }}>{pt.total}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No trend data available.</p>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Student ID</th>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>Grade & Section</th>
              <th style={{ padding: '1rem' }}>Contact Email</th>
            </tr>
          </thead>
          <tbody>
            {studentsList.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{s.student_id}</td>
                <td style={{ padding: '1rem' }}>{s.profiles?.first_name} {s.profiles?.last_name}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{
                    padding: '0.25rem 0.5rem', borderRadius: '4px',
                    backgroundColor: 'rgba(59, 179, 195, 0.1)', color: 'var(--color-secondary)'
                  }}>
                    {s.grade_level} {s.section ? `- ${s.section}` : ''}
                  </span>
                </td>
                <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{s.profiles?.email}</td>
              </tr>
            ))}
            
            {studentsList.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No students enrolled yet. (Create a User with role 'Student' first, then enroll them).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
