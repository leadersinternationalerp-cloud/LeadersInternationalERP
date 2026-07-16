import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

export default async function StudentHomeworkPage() {
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

  if (!userRoles.includes('Student') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // 1. Fetch student class details
  const { data: student } = await supabase
    .from('students')
    .select('class_id')
    .eq('id', user?.id)
    .single()

  let homeworkList: any[] = []
  let submissions: any[] = []
  let classId = student?.class_id

  if (!classId) {
    const { data: junction } = await supabase
      .from('student_classes')
      .select('class_id')
      .eq('student_id', user?.id)
      .maybeSingle()
    classId = junction?.class_id
  }

  if (classId) {
    // Fetch homework for this class
    const { data: hw } = await supabase
      .from('homework')
      .select(`
        *,
        subjects(name),
        teacher:created_by (first_name, last_name)
      `)
      .eq('class_id', classId)
      .order('due_date', { ascending: true })

    homeworkList = hw || []

    // Fetch student's submissions
    const { data: subs } = await supabase
      .from('homework_submissions')
      .select('*')
      .eq('student_id', user?.id)

    submissions = subs || []
  }

  // Server Action to submit homework
  async function handleHomeworkSubmitAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const homeworkId = formData.get('homeworkId') as string
    const fileUrl = formData.get('fileUrl') as string // text submission or attachment URL

    if (!homeworkId || !fileUrl) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('homework_submissions')
      .insert({
        homework_id: homeworkId,
        student_id: user.id,
        file_url: fileUrl,
        submitted_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error submitting homework:', error.message)
    }

    revalidatePath('/dashboard/student/homework')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          My Homework Assignments
        </h1>
        <Link href="/dashboard/student" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {homeworkList.map((hw) => {
          const sub = submissions.find(s => s.homework_id === hw.id)
          const isOverdue = new Date(hw.due_date) < new Date() && !sub

          let statusText = 'Pending Submission'
          let statusColor = 'var(--color-warning)'
          let statusBg = 'rgba(245, 158, 11, 0.1)'

          if (sub) {
            if (sub.grade) {
              statusText = `Graded: ${sub.grade}`
              statusColor = 'var(--color-success)'
              statusBg = 'rgba(16, 185, 129, 0.1)'
            } else {
              statusText = 'Submitted (Awaiting Grading)'
              statusColor = 'var(--color-secondary)'
              statusBg = 'rgba(59, 179, 195, 0.1)'
            }
          } else if (isOverdue) {
            statusText = 'Overdue / Missing'
            statusColor = 'var(--color-error)'
            statusBg = 'rgba(239, 68, 68, 0.1)'
          }

          return (
            <div key={hw.id} className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600 }}>{hw.title}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    Subject: {hw.subjects?.name} • Teacher: {hw.teacher?.first_name} {hw.teacher?.last_name}
                  </span>
                </div>

                <span style={{
                  padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                  backgroundColor: statusBg, color: statusColor
                }}>
                  {statusText}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', alignItems: 'start' }}>
                
                {/* Description & Instruction */}
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: '1.5', margin: '0 0 1rem 0' }}>
                    {hw.description}
                  </p>

                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                    <strong>Due Date:</strong> {formatDate(hw.due_date)}
                  </div>

                  {hw.file_url && (
                    <a href={hw.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', textDecoration: 'none' }}>
                      📂 Attached Resource File
                    </a>
                  )}

                  {sub?.grade && (
                    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'rgba(0,0,0,0.02)', borderLeft: '3px solid var(--color-success)', borderRadius: '4px', fontSize: '0.85rem' }}>
                      <strong>Teacher Feedback:</strong> "{sub.feedback || 'Good work!'}"
                    </div>
                  )}
                </div>

                {/* Submission Form or Submitted content */}
                <div>
                  {sub ? (
                    <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '2rem' }}>
                      <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 600 }}>My Submission</h4>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', wordBreak: 'break-all', backgroundColor: 'rgba(0,0,0,0.02)', padding: '0.75rem', borderRadius: 'var(--radius-sm)' }}>
                        "{sub.file_url}"
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
                        Submitted: {formatDate(sub.submitted_at)}
                      </div>
                    </div>
                  ) : (
                    !isOverdue && (
                      <div style={{ borderLeft: '1px solid var(--color-border)', paddingLeft: '2rem' }}>
                        <h4 style={{ fontSize: '0.9rem', marginBottom: '1rem', fontWeight: 600 }}>Submit Assignment</h4>
                        <form action={handleHomeworkSubmitAction} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <input type="hidden" name="homeworkId" value={hw.id} />
                          
                          <div className="form-group">
                            <label className="form-label" style={{ fontSize: '0.8rem' }}>Submission Text / File URL</label>
                            <textarea 
                              name="fileUrl" 
                              placeholder="Write your essay answer or insert a shareable URL to your worksheet file..." 
                              className="input-field" 
                              style={{ minHeight: '80px', resize: 'vertical' }} 
                              required 
                            />
                          </div>

                          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.5rem' }}>
                            Submit Homework
                          </button>
                        </form>
                      </div>
                    )
                  )}
                </div>

              </div>
            </div>
          )
        })}

        {homeworkList.length === 0 && (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No homework assignments published for your class level yet.
          </div>
        )}
      </div>
    </div>
  )
}
