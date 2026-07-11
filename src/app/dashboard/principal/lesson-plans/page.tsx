import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function LessonPlanReportPage({ searchParams }: { searchParams: { week?: string, term?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (profile?.role !== 'Principal' && profile?.role !== 'Director' && profile?.role !== 'Dean') {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this report.</p>
      </div>
    )
  }

  const currentWeek = parseInt(searchParams.week || '1')
  const currentTerm = searchParams.term || 'Term 1'

  // Fetch all teachers
  const { data: teachers } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .contains('role', ['Teacher'])

  // Fetch all lesson plans for the current week and term
  const { data: lessonPlans } = await supabase
    .from('lesson_plans')
    .select('teacher_id, status, class_id, subject_id, submitted_at, file_url, classes(name), subjects(name)')
    .eq('week_number', currentWeek)
    .eq('term', currentTerm)
    .eq('academic_year', '2025-2026')

  // Combine data
  const reportData = teachers?.map(teacher => {
    const plans = lessonPlans?.filter(lp => lp.teacher_id === teacher.id) || []
    return {
      teacher,
      plans,
      status: plans.length > 0 ? (plans.some(p => p.status === 'Approved') ? 'Approved' : 'Submitted') : 'Not Submitted'
    }
  })

  const submittedCount = reportData?.filter(d => d.status !== 'Not Submitted').length || 0
  const unsubmittedCount = (reportData?.length || 0) - submittedCount

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Lesson Plan Report</h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Track which teachers have submitted their lesson plans for {currentTerm}, Week {currentWeek}.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Submitted</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-success)' }}>
            {submittedCount} Teachers
          </p>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Not Submitted</h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--color-error)' }}>
            {unsubmittedCount} Teachers
          </p>
        </div>
      </div>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Teacher</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Submitted Plans</th>
              <th style={{ padding: '1rem' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reportData?.map((data) => (
              <tr key={data.teacher.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 500 }}>
                  {data.teacher.first_name} {data.teacher.last_name}
                </td>
                <td style={{ padding: '1rem' }}>
                  {data.status === 'Not Submitted' ? (
                    <span style={{ color: 'var(--color-error)' }}>Not Submitted</span>
                  ) : (
                    <span style={{ color: 'var(--color-success)' }}>{data.status}</span>
                  )}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  {data.plans.map(p => {
                    const cls = p.classes as any
                    const sub = p.subjects as any
                    return (
                      <div key={`${p.class_id}-${p.subject_id}`}>
                        {cls?.name} - {sub?.name} ({p.status})
                      </div>
                    )
                  })}
                  {data.plans.length === 0 && '-'}
                </td>
                <td style={{ padding: '1rem' }}>
                  {data.plans.length > 0 && (
                    <Link href={`/dashboard/principal/lesson-plans/review?teacher=${data.teacher.id}`} className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', background: 'transparent', border: '1px solid var(--color-border)' }}>
                      Review
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
