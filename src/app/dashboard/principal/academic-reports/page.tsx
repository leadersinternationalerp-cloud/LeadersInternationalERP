import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function PrincipalAcademicReportsPage({
  searchParams
}: {
  searchParams: Promise<{ student_id?: string }>
}) {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (profile?.role !== 'Principal' && profile?.role !== 'System Admin' && profile?.role !== 'Dean') {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch all students
  const { data: students } = await supabase
    .from('students')
    .select(`
      *,
      profiles(id, first_name, last_name)
    `)

  const params = await searchParams
  const selectedStudentId = params.student_id || (students && students.length > 0 ? students[0].id : null)

  let selectedStudent = null
  if (selectedStudentId && students) {
    selectedStudent = students.find(s => s.id === selectedStudentId) || null
  }

  // Mock generated report card data
  const subjectsReport = [
    { subject: 'Mathematics', score: 88, grade: 'A', remarks: 'Excellent performance.' },
    { subject: 'English Language', score: 76, grade: 'B', remarks: 'Good vocabulary and reading skills.' },
    { subject: 'Science', score: 92, grade: 'A', remarks: 'Outstanding work in practical experiments.' },
    { subject: 'Social Studies', score: 65, grade: 'C', remarks: 'Capable of higher achievement.' },
    { subject: 'Kiswahili', score: 84, grade: 'A', remarks: 'Very strong grammar and expression.' }
  ]

  const totalScore = subjectsReport.reduce((acc, curr) => acc + curr.score, 0)
  const averageScore = totalScore / subjectsReport.length

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        View Student Academic Report Cards
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Student Selection List */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem', fontWeight: 600 }}>Select Student</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {(students || []).map(stud => {
              const isSelected = stud.id === selectedStudentId
              return (
                <Link
                  key={stud.id}
                  href={`/dashboard/principal/academic-reports?student_id=${stud.id}`}
                  style={{
                    display: 'block', padding: '0.75rem', borderRadius: 'var(--radius-md)', textDecoration: 'none',
                    backgroundColor: isSelected ? 'rgba(59, 179, 195, 0.05)' : 'transparent',
                    border: isSelected ? '1px solid var(--color-secondary)' : '1px solid var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {stud.profiles?.first_name} {stud.profiles?.last_name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Grade: {stud.grade_level} {stud.section ? `- ${stud.section}` : ''}
                  </div>
                </Link>
              )
            })}

            {(students || []).length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No student profiles found.</p>
            )}
          </div>
        </div>

        {/* Generated Report Card View */}
        {selectedStudent ? (
          <div className="glass-panel" style={{ padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '2px solid rgba(0,0,0,0.05)' }}>
            
            {/* Report Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid var(--color-primary)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700, letterSpacing: '1px' }}>
                LEADERS INTERNATIONAL SCHOOL
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', margin: '0.25rem 0' }}>
                Zanzibar, Tanzania • Tel: +255 24 223 1234
              </p>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--color-secondary)', fontWeight: 600, marginTop: '0.75rem', textTransform: 'uppercase' }}>
                Official Academic Report Card
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
                Term: <strong>Term 1</strong> • Academic Year: <strong>2025-2026</strong>
              </p>
            </div>

            {/* Student Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem', marginBottom: '2rem' }}>
              <div>
                <strong>Student Name:</strong> {selectedStudent.profiles?.first_name} {selectedStudent.profiles?.last_name}
              </div>
              <div>
                <strong>Student ID:</strong> {selectedStudent.student_id}
              </div>
              <div>
                <strong>Grade:</strong> {selectedStudent.grade_level} {selectedStudent.section ? `- ${selectedStudent.section}` : ''}
              </div>
              <div>
                <strong>Date of Report:</strong> {new Date().toLocaleDateString('en-TZ')}
              </div>
            </div>

            {/* Subjects Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.03)', borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem' }}>Subject Name</th>
                  <th style={{ padding: '0.75rem' }}>Score (%)</th>
                  <th style={{ padding: '0.75rem' }}>Grade</th>
                  <th style={{ padding: '0.75rem' }}>Teacher's Remarks</th>
                </tr>
              </thead>
              <tbody>
                {subjectsReport.map(sub => (
                  <tr key={sub.subject} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 500 }}>{sub.subject}</td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>{sub.score}%</td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{
                        padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                        backgroundColor: sub.grade === 'A' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.05)',
                        color: sub.grade === 'A' ? 'var(--color-success)' : 'var(--color-text)'
                      }}>
                        {sub.grade}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      "{sub.remarks}"
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Performance Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '2rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Average Score</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                  {averageScore.toFixed(1)}%
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Overall Grade</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-secondary)' }}>A</div>
              </div>
            </div>

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', fontSize: '0.85rem' }}>
              <div>
                <strong>Principal Recommendation Remarks:</strong>
                <p style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', margin: '0.5rem 0' }}>
                  "A very consistent performance. Promoted to next class with honours. Keep up the high standard of academic dedication."
                </p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                <div style={{ borderBottom: '1px dashed var(--color-text-muted)', width: '150px', height: '30px', marginBottom: '0.5rem' }}></div>
                <strong>Fatma Suleiman</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>School Principal</span>
              </div>
            </div>

          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Select a student to view their generated report card.
          </div>
        )}
      </div>
    </div>
  )
}
