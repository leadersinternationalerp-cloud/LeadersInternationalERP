import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

export default async function HOSLessonPlansPage() {
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

  // Fetch all lesson plans
  const { data: plans } = await supabase
    .from('lesson_plans')
    .select(`
      *,
      classes(name, section),
      subjects(name),
      teacher:teacher_id (first_name, last_name, id)
    `)
    .order('submitted_at', { ascending: false })

  const lessonPlans = plans || []

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
        reviewer_id: user?.id
      })
      .eq('id', planId)

    if (error) {
      console.error('Error reviewing lesson plan:', error.message)
      return
    }

    // Notify Teacher
    if (teacherId) {
      await supabase.from('notifications').insert({
        user_id: teacherId,
        message: `Your lesson plan has been ${status} by Head of Section. Remarks: "${notes || 'No comments'}"`,
        link_url: null
      })
    }

    revalidatePath('/dashboard/hos/lesson-plans')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
            Section Lesson Plans Review
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Review, approve, or return teacher weekly lesson plan proposals.
          </p>
        </div>
        <Link href="/dashboard/hos" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {lessonPlans.map((plan) => {
          const teacherName = plan.teacher ? `${(plan.teacher as any).first_name} ${(plan.teacher as any).last_name}` : 'Instructor'
          return (
            <div key={plan.id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: 'var(--color-secondary)' }}>
                    {plan.classes?.name} {plan.classes?.section ? `(${plan.classes?.section})` : ''} — {plan.subjects?.name}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Teacher: <strong>{teacherName}</strong> • Week: {plan.week_number} • Term: {plan.term}
                  </span>
                </div>

                <span style={{
                  padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                  backgroundColor: 
                    plan.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 
                    plan.status === 'Returned' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color:
                    plan.status === 'Approved' ? 'var(--color-success)' : 
                    plan.status === 'Returned' ? 'var(--color-error)' : 'var(--color-warning)'
                }}>
                  {plan.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
                <div>
                  <div style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
                    <strong>Submitted:</strong> {formatDate(plan.submitted_at)}
                  </div>

                  {plan.file_url ? (
                    <a href={plan.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ textDecoration: 'none', display: 'inline-block', padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                      📂 Open Lesson Plan Document
                    </a>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No attachment worksheet.</span>
                  )}

                  {plan.review_notes && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.02)', borderLeft: '3px solid var(--color-primary)', borderRadius: '4px', fontSize: '0.8rem' }}>
                      <strong>Review Comments:</strong> "{plan.review_notes}"
                    </div>
                  )}
                </div>

                {/* Review Form */}
                {plan.status === 'Submitted' && (
                  <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '2rem' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>Review Evaluation</h4>
                    <form action={handleReviewPlanHOSAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <input type="hidden" name="teacherId" value={(plan.teacher as any)?.id || ''} />

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Review Remarks</label>
                        <textarea name="notes" placeholder="Enter instructions or feedback..." className="input-field" style={{ minHeight: '60px', resize: 'vertical' }} required />
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" name="status" value="Returned" className="btn" style={{ flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}>
                          Return
                        </button>
                        <button type="submit" name="status" value="Approved" className="btn btn-primary" style={{ flex: 1.5 }}>
                          Approve
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {lessonPlans.length === 0 && (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No weekly lesson plans submitted by instructors yet.
          </div>
        )}
      </div>
    </div>
  )
}
