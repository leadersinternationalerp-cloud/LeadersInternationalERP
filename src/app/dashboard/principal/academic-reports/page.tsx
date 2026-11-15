import { normalizeRoles } from '@/lib/auth/roles'
import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import PrintButton from '@/components/PrintButton'
import { getWingContext } from '@/lib/wingServer'
import { inferWing, matchesWingFilter } from '@/lib/wing'
import { WingBadge } from '@/components/WingFilterBar'
import { parseGradingLevels, getGradeForPercentage, parseMarkScore } from '@/utils/grading'

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
    .select('*')
    .eq('id', user?.id)
    .single()
  const userRoles = normalizeRoles(profile)
  const wingContext = await getWingContext(user?.id, profile)

  if (!userRoles.includes('Principal') && !userRoles.includes('System Admin') && !userRoles.includes('Dean') && !userRoles.includes('Director')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch all students and filter by active wing
  const { data: studentsRaw } = await supabase
    .from('students')
    .select(`
      *,
      profiles(id, first_name, last_name)
    `)

  const students = (studentsRaw || []).filter((s: any) =>
    matchesWingFilter(s, wingContext.activeWingFilter)
  )

  const params = await searchParams
  const selectedStudentId = params.student_id || (students && students.length > 0 ? students[0].id : null)

  let selectedStudent = null
  if (selectedStudentId && students) {
    selectedStudent = students.find(s => s.id === selectedStudentId) || null
  }

  // Fetch system settings for grading scale
  const { data: settingData } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'grading_scale')
    .maybeSingle()

  const gradingLevels = parseGradingLevels(settingData?.value)

  // Fetch real released marks for student
  let realMarks: any[] = []
  if (selectedStudentId) {
    const { data: marks } = await supabase
      .from('marks')
      .select(`
        *,
        subjects (name)
      `)
      .eq('student_id', selectedStudentId)
      .eq('is_released', true)
      .order('created_at', { ascending: false })
    realMarks = marks || []
  }

  const subjectsReport = realMarks.map((m, idx) => {
    const parsed = parseMarkScore(m)
    const scoreVal = parsed?.percentage ?? Number(m.score ?? 0)
    const grade = getGradeForPercentage(scoreVal, gradingLevels)

    return {
      key: `${m.id || idx}`,
      subject: m.subjects?.name || 'Unknown',
      assessmentType: m.assessment_type || 'Exam',
      score: scoreVal,
      rawScore: parsed?.rawScore ?? scoreVal,
      outOf: parsed?.outOf ?? 100,
      grade,
      remarks: m.remarks || 'No remarks provided.'
    }
  })

  const totalScore = subjectsReport.reduce((acc, curr) => acc + curr.score, 0)
  const averageScore = subjectsReport.length > 0 ? totalScore / subjectsReport.length : 0

  const overallGrade = getGradeForPercentage(averageScore, gradingLevels)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.75rem', margin: 0, color: 'var(--color-primary)' }}>
          View Student Academic Report Cards
        </h1>
        <Link href="/dashboard/principal/report-cards" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Open Official PDF Report Card Generator →
        </Link>
      </div>

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
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {stud.profiles?.first_name} {stud.profiles?.last_name}
                    </span>
                    <WingBadge wing={inferWing(stud)} />
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
          <>
            <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                header, aside, footer, nav, button, .btn, .no-print {
                  display: none !important;
                }
                body {
                  background: white !important;
                  color: black !important;
                }
                body, main, #printable-report-card {
                  margin: 0 !important;
                  padding: 0 !important;
                  border: none !important;
                  box-shadow: none !important;
                  background: transparent !important;
                  width: 100% !important;
                  max-width: 100% !important;
                }
                h2, h3, span, div, td, th, strong {
                  color: black !important;
                }
              }
            ` }} />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }} className="no-print">
              <PrintButton label="Print Report Card 🖨️" className="btn btn-primary" />
            </div>

            <div className="glass-panel" id="printable-report-card" style={{ padding: '2.5rem', borderRadius: 'var(--radius-lg)', border: '2px solid rgba(0,0,0,0.05)', backgroundColor: '#fff', color: '#000' }}>
            
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
                Term: <strong>{realMarks[0]?.term || 'Current Term'}</strong> • Academic Year: <strong>{realMarks[0]?.academic_year || '2026-2027'}</strong>
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
            {subjectsReport.length > 0 ? (
              <>
                {/* Subjects Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginBottom: '2rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(0,0,0,0.03)', borderBottom: '2px solid var(--color-border)' }}>
                      <th style={{ padding: '0.75rem' }}>Subject Name</th>
                      <th style={{ padding: '0.75rem' }}>Assessment</th>
                      <th style={{ padding: '0.75rem' }}>Score (%)</th>
                      <th style={{ padding: '0.75rem' }}>Grade</th>
                      <th style={{ padding: '0.75rem' }}>Teacher's Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectsReport.map(sub => (
                      <tr key={sub.key} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 500 }}>{sub.subject}</td>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{sub.assessmentType}</td>
                        <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                          {sub.score}%
                          {sub.outOf !== 100 && (
                            <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 400, color: 'var(--color-text-muted)' }}>
                              Raw: {sub.rawScore} / {sub.outOf}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{
                            padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                            backgroundColor: sub.grade === 'A' || sub.grade === 'A*' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.05)',
                            color: sub.grade === 'A' || sub.grade === 'A*' ? 'var(--color-success)' : 'var(--color-text)'
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
                    <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-secondary)' }}>{overallGrade}</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-md)', marginBottom: '2rem' }}>
                No official academic marks have been released for this student in the current term.
              </div>
            )}

            {/* Signatures */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem', fontSize: '0.85rem' }}>
              <div>
                <strong>Principal Recommendation Remarks:</strong>
                <p style={{ fontStyle: 'italic', color: 'var(--color-text-muted)', margin: '0.5rem 0' }}>
                  "A very consistent performance. Keep up the high standard of academic dedication."
                </p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                <div style={{ borderBottom: '1px dashed var(--color-text-muted)', width: '150px', height: '30px', marginBottom: '0.5rem' }}></div>
                <strong>School Principal</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Leaders International School</span>
              </div>
            </div>

            </div>
          </>
        ) : (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Select a student to view their generated report card.
          </div>
        )}
      </div>
    </div>
  )
}
