import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatDate } from '@/utils/date'
import Link from 'next/link'
import { BookOpen, CheckCircle2, Clock, AlertTriangle, ExternalLink, ArrowLeft } from 'lucide-react'

export default async function HOSLessonPlansPage() {
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

  const allowedRoles = ['Head of Section', 'HOS', 'Academic Dean', 'Dean', 'Principal', 'Director', 'System Admin']
  const isSupervisor = userRoles.some((r: string) => allowedRoles.includes(r))

  if (!isSupervisor) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have supervisor access to review section lesson plans.</p>
      </div>
    )
  }

  // Fetch all lesson plans
  const { data: plans } = await supabase
    .from('lesson_plans')
    .select(`
      *,
      classes (id, name, section),
      subjects (id, name),
      teacher:teacher_id (id, first_name, last_name)
    `)
    .order('submitted_at', { ascending: false })

  const lessonPlans = plans || []

  const totalPending = lessonPlans.filter(p => p.status === 'Submitted').length
  const totalApproved = lessonPlans.filter(p => p.status === 'Approved').length
  const totalReturned = lessonPlans.filter(p => p.status === 'Returned').length

  // Server Action to review lesson plan
  async function handleReviewPlanHOSAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const planId = formData.get('planId') as string
    const teacherId = formData.get('teacherId') as string
    const status = formData.get('status') as string // 'Approved' or 'Returned'
    const notes = formData.get('notes') as string

    if (!planId || !status) return

    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('lesson_plans')
      .update({
        status,
        review_notes: notes || '',
        reviewer_id: user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', planId)

    if (error) {
      console.error('Error reviewing lesson plan:', error.message)
      return
    }

    // Notify Teacher with clickable link
    if (teacherId) {
      const statusText = status === 'Approved' ? 'approved' : 'returned for revision'
      await supabase.from('notifications').insert({
        user_id: teacherId,
        message: `Your weekly lesson plan has been ${statusText} by Head of Section. Remarks: "${notes || 'No remarks provided.'}"`,
        link_url: '/dashboard/teacher/lesson-plans'
      })
    }

    revalidatePath('/dashboard/hos/lesson-plans')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0, fontWeight: 700 }}>
            Section Lesson Plans Review
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Review, evaluate, and provide feedback on teacher weekly lesson plan submissions.
          </p>
        </div>
        <Link href="/dashboard/hos" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* KPI Stats Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Pending Review</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f59e0b' }}>{totalPending}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Approved</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>{totalApproved}</span>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Returned / Revisions</span>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{totalReturned}</span>
          </div>
        </div>
      </div>

      {/* Lesson Plans List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {lessonPlans.map((plan) => {
          const teacherName = plan.teacher ? `${(plan.teacher as any).first_name} ${(plan.teacher as any).last_name}` : 'Instructor'
          const isApproved = plan.status === 'Approved'
          const isReturned = plan.status === 'Returned'

          return (
            <div key={plan.id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: 'var(--color-secondary)' }}>
                    {plan.classes?.name} {plan.classes?.section ? `(${plan.classes?.section})` : ''} — {plan.subjects?.name}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    Teacher: <strong style={{ color: 'var(--color-primary)' }}>{teacherName}</strong> • Week {plan.week_number} ({plan.term}) • {plan.academic_year}
                  </span>
                </div>

                <span style={{
                  padding: '0.25rem 0.65rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                  backgroundColor: isApproved ? 'rgba(16, 185, 129, 0.12)' : isReturned ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                  color: isApproved ? '#10b981' : isReturned ? '#ef4444' : '#b45309',
                  border: isApproved ? '1px solid rgba(16, 185, 129, 0.3)' : isReturned ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                }}>
                  {plan.status === 'Submitted' ? 'Pending Review' : plan.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                    <strong>Submitted At:</strong> {formatDate(plan.submitted_at)}
                  </div>

                  {plan.teacher_comments && (
                    <div style={{ marginBottom: '1rem', fontSize: '0.85rem', backgroundColor: 'rgba(0,0,0,0.02)', padding: '0.6rem 0.8rem', borderRadius: '6px' }}>
                      <strong style={{ color: 'var(--color-text-muted)' }}>Teacher Notes:</strong> "{plan.teacher_comments}"
                    </div>
                  )}

                  {plan.file_url ? (
                    <a
                      href={plan.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                    >
                      <BookOpen size={16} />
                      <span>Open Lesson Plan Document</span>
                      <ExternalLink size={14} style={{ opacity: 0.7 }} />
                    </a>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No document attachment.</span>
                  )}

                  {plan.review_notes && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: isReturned ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)', borderLeft: isReturned ? '3px solid #ef4444' : '3px solid #10b981', borderRadius: '4px', fontSize: '0.825rem' }}>
                      <strong>Supervisor Feedback:</strong> "{plan.review_notes}"
                    </div>
                  )}
                </div>

                {/* Review Form */}
                <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                    {plan.status === 'Submitted' ? 'Review Evaluation' : 'Update Review Remarks'}
                  </h4>
                  <form action={handleReviewPlanHOSAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input type="hidden" name="planId" value={plan.id} />
                    <input type="hidden" name="teacherId" value={(plan.teacher as any)?.id || ''} />

                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Review Remarks / Feedback</label>
                      <textarea
                        name="notes"
                        defaultValue={plan.review_notes || ''}
                        placeholder="Enter feedback or return instructions for teacher..."
                        className="input-field"
                        style={{ minHeight: '70px', resize: 'vertical', fontSize: '0.85rem' }}
                        required
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="submit"
                        name="status"
                        value="Returned"
                        className="btn"
                        style={{ flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', fontSize: '0.85rem' }}
                      >
                        Return to Teacher
                      </button>
                      <button
                        type="submit"
                        name="status"
                        value="Approved"
                        className="btn btn-primary"
                        style={{ flex: 1.2, backgroundColor: '#10b981', borderColor: '#10b981', fontSize: '0.85rem' }}
                      >
                        Approve Plan
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )
        })}

        {lessonPlans.length === 0 && (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No weekly lesson plans submitted by teachers yet.
          </div>
        )}
      </div>
    </div>
  )
}
