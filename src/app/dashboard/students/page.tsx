import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function StudentsPage() {
  const supabase = await createClient()

  // Verify Admin or Teacher access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Student Directory</h1>
        {(role === 'System Admin' || role === 'Director' || role === 'Principal') && (
          <button className="btn btn-primary">+ Enroll Student</button>
        )}
      </div>

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
            {students?.map((s) => (
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
            
            {(!students || students.length === 0) && (
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
