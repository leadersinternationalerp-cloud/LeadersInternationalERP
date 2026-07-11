import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

export default async function TeacherHomeworkReviewPage({
  searchParams
}: {
  searchParams: Promise<{ homework_id?: string }>
}) {
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

  if (!userRoles.includes('Teacher') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  const params = await searchParams
  const homeworkId = params.homework_id

  if (!homeworkId) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>No Homework Selected</h2>
        <Link href="/dashboard/teacher/homework" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-block' }}>
          Back to Homeworks
        </Link>
      </div>
    )
  }

  // Fetch homework details
  const { data: homework } = await supabase
    .from('homework')
    .select(`
      *,
      classes(name, section),
      subjects(name)
    `)
    .eq('id', homeworkId)
    .single()

  // Fetch submissions
  const { data: submissions } = await supabase
    .from('homework_submissions')
    .select(`
      *,
      student:student_id (
        id,
        student_id,
        profiles:id (first_name, last_name)
      )
    `)
    .eq('homework_id', homeworkId)
    .order('submitted_at', { ascending: false })

  const subList = submissions || []

  // Server Action to grade submission
  async function handleGradeSubmissionAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const subId = formData.get('subId') as string
    const studentId = formData.get('studentId') as string
    const homeworkTitle = formData.get('homeworkTitle') as string
    const grade = formData.get('grade') as string
    const feedback = formData.get('feedback') as string

    if (!subId || !grade) return

    const { error } = await supabase
      .from('homework_submissions')
      .update({
        grade,
        feedback: feedback || ''
      })
      .eq('id', subId)

    if (error) {
      console.error('Error grading submission:', error.message)
      return
    }

    // Trigger notification to student
    if (studentId) {
      await supabase.from('notifications').insert({
        user_id: studentId,
        message: `Your submission for homework "${homeworkTitle}" has been graded: "${grade}".`,
        link_url: `/dashboard/student/homework`
      })
    }

    revalidatePath(`/dashboard/teacher/homework/review`)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
            Review Student Submissions
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Assignment: <strong>{homework?.title}</strong> ({homework?.classes?.name} • {homework?.subjects?.name})
          </p>
        </div>
        <Link href="/dashboard/teacher/homework" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to List
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {subList.map((sub) => {
          const studentProfile: any = (sub.student as any)?.profiles
          const studentName = studentProfile ? `${studentProfile.first_name} ${studentProfile.last_name}` : 'Unknown Student'
          const studentNumber = (sub.student as any)?.student_id || 'N/A'

          return (
            <div key={sub.id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 600 }}>{studentName}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Student ID: {studentNumber}
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Submitted: {formatDate(sub.submitted_at)}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
                
                {/* Submission Content */}
                <div>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Student Response / Attachment:</h4>
                  <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.02)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', wordBreak: 'break-all' }}>
                    {sub.file_url}
                  </div>

                  {sub.grade && (
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid var(--color-success)', borderRadius: '4px', fontSize: '0.85rem' }}>
                      <strong>Awarded Grade:</strong> {sub.grade} <br />
                      <strong>Feedback:</strong> "{sub.feedback || 'Good effort!'}"
                    </div>
                  )}
                </div>

                {/* Grading Action */}
                {!sub.grade && (
                  <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '2rem' }}>
                    <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>Grade Submission</h4>
                    <form action={handleGradeSubmissionAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <input type="hidden" name="subId" value={sub.id} />
                      <input type="hidden" name="studentId" value={sub.student_id} />
                      <input type="hidden" name="homeworkTitle" value={homework?.title || ''} />

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Grade</label>
                        <select name="grade" className="input-field" required>
                          <option value="A">A (Excellent)</option>
                          <option value="B">B (Very Good)</option>
                          <option value="C">C (Good)</option>
                          <option value="D">D (Pass)</option>
                          <option value="F">F (Fail)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Feedback Remarks</label>
                        <input type="text" name="feedback" placeholder="e.g. Well researched essay" className="input-field" />
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.5rem' }}>
                        Submit Grade & Feedback
                      </button>
                    </form>
                  </div>
                )}

              </div>
            </div>
          )
        })}

        {subList.length === 0 && (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-lg)' }}>
            No submissions turned in for this homework yet.
          </div>
        )}
      </div>
    </div>
  )
}
