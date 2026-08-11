import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Bell, CheckCircle2, AlertCircle, Eye, ArrowLeft } from 'lucide-react'

export default async function LessonPlanReportPage({
  searchParams
}: {
  searchParams: Promise<{ week?: string; term?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()

  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  const allowedRoles = ['Principal', 'Vice Principal', 'Director', 'Dean', 'Head of Section', 'HOS', 'System Admin']
  if (!userRoles.some((r: string) => allowedRoles.includes(r))) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view the lesson plan compliance report.</p>
      </div>
    )
  }

  const currentWeek = parseInt(params.week || '1', 10)
  const currentTerm = params.term || 'Term 1'

  // Fetch all teachers (profiles with role containing Teacher or in roles array)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role, roles')

  const teachers = (profiles || []).filter(p => {
    const roles = p.roles && Array.isArray(p.roles) && p.roles.length > 0
      ? p.roles
      : (p.role ? p.role.split(',').map((r: string) => r.trim()) : [])
    return roles.includes('Teacher')
  })

  // Fetch all lesson plans for the current week and term
  const { data: lessonPlans } = await supabase
    .from('lesson_plans')
    .select('id, teacher_id, status, class_id, subject_id, submitted_at, file_url, classes(name, section), subjects(name)')
    .eq('week_number', currentWeek)
    .eq('term', currentTerm)
    .eq('academic_year', '2025-2026')

  // Combine data for compliance tracking
  const reportData = teachers.map(teacher => {
    const plans = lessonPlans?.filter(lp => lp.teacher_id === teacher.id) || []
    let status = 'Not Submitted'
    if (plans.length > 0) {
      if (plans.some(p => p.status === 'Approved')) {
        status = 'Approved'
      } else if (plans.some(p => p.status === 'Returned')) {
        status = 'Returned'
      } else {
        status = 'Submitted'
      }
    }

    return {
      teacher,
      plans,
      status
    }
  })

  const submittedCount = reportData.filter(d => d.status !== 'Not Submitted').length
  const unsubmittedCount = reportData.length - submittedCount

  // Server action to send lesson plan submission reminder to unsubmitted teachers
  async function sendSubmissionReminderAction(formData: FormData) {
    'use server'
    const teacherId = formData.get('teacherId') as string
    const week = formData.get('week') as string
    const term = formData.get('term') as string

    if (!teacherId) return

    const supabase = await createClient()
    await supabase.from('notifications').insert({
      user_id: teacherId,
      message: `Reminder: Please submit your weekly lesson plan for ${term}, Week ${week}.`,
      link_url: '/dashboard/teacher/lesson-plans/new'
    })

    revalidatePath('/dashboard/principal/lesson-plans')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0, fontWeight: 700 }}>
            Lesson Plan Compliance Report
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Track teacher lesson plan submission rates for <strong>{currentTerm}</strong>, <strong>Week {currentWeek}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <form method="GET" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select name="term" defaultValue={currentTerm} className="input-field" style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}>
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
            <select name="week" defaultValue={currentWeek.toString()} className="input-field" style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}>
              {Array.from({ length: 15 }, (_, i) => i + 1).map(w => (
                <option key={w} value={w}>Week {w}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-secondary" style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
              Filter
            </button>
          </form>

          <Link href="/dashboard/principal" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}>
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Submitted Rate
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#10b981', margin: 0 }}>
            {submittedCount} / {reportData.length}
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            {reportData.length > 0 ? Math.round((submittedCount / reportData.length) * 100) : 0}% compliance rate
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Pending Submissions
          </h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#ef4444', margin: 0 }}>
            {unsubmittedCount} Teachers
          </p>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Haven't submitted for Week {currentWeek}
          </span>
        </div>
      </div>

      {/* Compliance Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.03)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>Teacher Name</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>Overall Status</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 700 }}>Class & Subject Submissions</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((data) => {
              const isNotSubmitted = data.status === 'Not Submitted'
              const isApproved = data.status === 'Approved'
              const isReturned = data.status === 'Returned'

              return (
                <tr key={data.teacher.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>
                    {data.teacher.first_name} {data.teacher.last_name}
                  </td>

                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        backgroundColor: isApproved
                          ? 'rgba(16, 185, 129, 0.12)'
                          : isReturned
                          ? 'rgba(239, 68, 68, 0.12)'
                          : isNotSubmitted
                          ? 'rgba(156, 163, 175, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                        color: isApproved
                          ? '#10b981'
                          : isReturned
                          ? '#ef4444'
                          : isNotSubmitted
                          ? '#6b7280'
                          : '#b45309'
                      }}
                    >
                      {isApproved && <CheckCircle2 size={14} />}
                      {isNotSubmitted && <AlertCircle size={14} />}
                      {data.status}
                    </span>
                  </td>

                  <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                    {data.plans.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {data.plans.map(p => {
                          const cls = p.classes as any
                          const sub = p.subjects as any
                          return (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>{cls?.name} — {sub?.name}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>({p.status})</span>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No submissions for Week {currentWeek}</span>
                    )}
                  </td>

                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {data.plans.length > 0 ? (
                        <Link
                          href={`/dashboard/principal/lesson-plans/review?teacher=${data.teacher.id}`}
                          className="btn btn-secondary"
                          style={{ textDecoration: 'none', padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Eye size={14} />
                          <span>Review Plans</span>
                        </Link>
                      ) : (
                        <form action={sendSubmissionReminderAction}>
                          <input type="hidden" name="teacherId" value={data.teacher.id} />
                          <input type="hidden" name="week" value={currentWeek.toString()} />
                          <input type="hidden" name="term" value={currentTerm} />
                          <button
                            type="submit"
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                          >
                            <Bell size={14} />
                            <span>Remind Teacher</span>
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}

            {reportData.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No teachers found in system records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  )
}
