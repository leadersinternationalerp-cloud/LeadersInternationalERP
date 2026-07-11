import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function HOSStudentsPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (profile?.role !== 'Head of Section' && profile?.role !== 'System Admin') {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch all students belonging to Primary Section (Grade 1, 2, 3)
  const sectionGrades = ['Grade 1', 'Grade 2', 'Grade 3']
  const { data: students } = await supabase
    .from('students')
    .select(`
      *,
      profiles(first_name, last_name, email)
    `)
    .in('grade_level', sectionGrades)
    .order('grade_level', { ascending: true })

  const studentsList = students || []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
            Section Students Roster
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Primary Section (Grade 1 - Grade 3) Enrollment Records
          </p>
        </div>
        <Link href="/dashboard/hos" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
          Enrolled Student Records ({studentsList.length})
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.01)', borderBottom: '2px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Student ID</th>
                <th style={{ padding: '1rem' }}>Name</th>
                <th style={{ padding: '1rem' }}>Grade & Section</th>
                <th style={{ padding: '1rem' }}>DOB</th>
                <th style={{ padding: '1rem' }}>Gender</th>
                <th style={{ padding: '1rem' }}>Biometric ID</th>
              </tr>
            </thead>
            <tbody>
              {studentsList.map((stud) => (
                <tr key={stud.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{stud.student_id}</td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>
                    {stud.profiles?.first_name} {stud.profiles?.last_name}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                      backgroundColor: 'rgba(59, 179, 195, 0.1)', color: 'var(--color-secondary)'
                    }}>
                      {stud.grade_level} {stud.section ? `- ${stud.section}` : ''}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{stud.dob ? new Date(stud.dob).toLocaleDateString() : 'N/A'}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{stud.gender || 'N/A'}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>{stud.biometric_id || 'Not Bound'}</td>
                </tr>
              ))}

              {studentsList.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No students enrolled in this section yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
