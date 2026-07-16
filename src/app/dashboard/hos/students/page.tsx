import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function HOSStudentsPage() {
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
  const studentIds = studentsList.map(s => s.id)

  // Fetch parent links
  let parentRelations: any[] = []
  if (studentIds.length > 0) {
    const { data: relations } = await supabase
      .from('student_parents')
      .select(`
        student_id,
        relationship,
        parent:parent_id (
          profiles (first_name, last_name, email, phone)
        )
      `)
      .in('student_id', studentIds)
    parentRelations = relations || []
  }

  // Fetch attendance records
  let attendanceLogs: any[] = []
  if (studentIds.length > 0) {
    const { data: logs } = await supabase
      .from('attendance')
      .select('student_id, status')
      .in('student_id', studentIds)
    attendanceLogs = logs || []
  }

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
                <th style={{ padding: '1rem' }}>Student Contact</th>
                <th style={{ padding: '1rem' }}>Parent Contacts</th>
                <th style={{ padding: '1rem' }}>Attendance Rate</th>
                <th style={{ padding: '1rem' }}>Biometric ID</th>
              </tr>
            </thead>
            <tbody>
              {studentsList.map((stud) => {
                // Calculate attendance rate
                const studentLogs = attendanceLogs.filter(log => log.student_id === stud.id)
                const total = studentLogs.length
                const present = studentLogs.filter(log => log.status === 'Present' || log.status === 'Late').length
                const rate = total > 0 ? Math.round((present / total) * 100) : 100

                // Get parent contacts
                const studentParents = parentRelations.filter(rel => rel.student_id === stud.id)
                const parentContacts = studentParents.map(rel => {
                  const parentProfile = (rel.parent as any)?.profiles
                  if (!parentProfile) return null
                  return `${parentProfile.first_name} ${parentProfile.last_name} (${rel.relationship}): ${parentProfile.phone || 'No Phone'}`
                }).filter(Boolean)

                return (
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
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{stud.profiles?.email}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {parentContacts.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {parentContacts.map((contact, idx) => (
                            <div key={idx}>{contact}</div>
                          ))}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>None Linked</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: rate >= 90 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: rate >= 90 ? 'var(--color-success)' : 'var(--color-warning)'
                      }}>
                        {rate}%
                      </span>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>{stud.biometric_id || 'Not Bound'}</td>
                  </tr>
                )
              })}

              {studentsList.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
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
