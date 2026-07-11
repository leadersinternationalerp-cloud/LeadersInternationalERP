import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

export default async function PrincipalLessonPlanReviewPage({
  searchParams
}: {
  searchParams: Promise<{ teacher?: string }>
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

  const params = await searchParams
  const teacherId = params.teacher

  if (!teacherId) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>No Teacher Selected</h2>
        <Link href="/dashboard/principal/lesson-plans" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Back to Reports
        </Link>
      </div>
    )
  }

  // Fetch teacher profile
  const { data: teacherProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', teacherId)
    .single()

  // Fetch all lesson plans submitted by this teacher
  const { data: plans } = await supabase
    .from('lesson_plans')
    .select(`
      *,
      classes(name),
      subjects(name)
    `)
    .eq('teacher_id', teacherId)
    .order('submitted_at', { ascending: false })

  const lessonPlans = plans || []

  // Server Action to update lesson plan review status
  async function handleReviewPlanAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const planId = formData.get('planId') as string
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
    }

    revalidatePath(`/dashboard/principal/lesson-plans/review`)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
            Review Lesson Plans
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Submitted by: <strong>{teacherProfile?.first_name} {teacherProfile?.last_name}</strong>
          </p>
        </div>
        <Link href="/dashboard/principal/lesson-plans" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Summary
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {lessonPlans.map((plan) => (
          <div key={plan.id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-secondary)' }}>
                  {plan.classes?.name} — {plan.subjects?.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
                  Term: {plan.term} • Week: {plan.week_number} • Academic Year: {plan.academic_year}
                </p>
              </div>
              <span style={{
                padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
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
                <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                  <strong>Submitted At:</strong> {formatDate(plan.submitted_at)}
                </div>

                {plan.file_url ? (
                  <a 
                    href={plan.file_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-secondary" 
                    style={{ textDecoration: 'none', display: 'inline-block', padding: '0.5rem 1rem' }}
                  >
                    📂 Open Attached Lesson Plan Document
                  </a>
                ) : (
                  <div style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    No attachment uploaded for this lesson plan.
                  </div>
                )}

                {plan.review_notes && (
                  <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.02)', borderLeft: '3px solid var(--color-primary)', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <strong>Reviewer Comments:</strong> "{plan.review_notes}"
                  </div>
                )}
              </div>

              {/* Review Decision Form */}
              {plan.status === 'Submitted' && (
                <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '2rem' }}>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '1rem', fontWeight: 600 }}>Review Decision</h4>
                  <form action={handleReviewPlanAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <input type="hidden" name="planId" value={plan.id} />
                    
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.8rem' }}>Remarks / Feedback</label>
                      <textarea name="notes" placeholder="Specify any corrections or feedback..." className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} required />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="submit" name="status" value="Returned" className="btn" style={{ flex: 1, backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
                        Return to Teacher
                      </button>
                      <button type="submit" name="status" value="Approved" className="btn btn-primary" style={{ flex: 1.5 }}>
                        Approve Plan
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        ))}

        {lessonPlans.length === 0 && (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No lesson plan submissions found for this teacher.
          </div>
        )}
      </div>
    </div>
  )
}
