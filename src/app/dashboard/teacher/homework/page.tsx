import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

export default async function TeacherHomeworkPage() {
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

  // Fetch classes and subjects for form dropdowns
  const { data: classes } = await supabase
    .from('classes')
    .select('*')
    .order('name', { ascending: true })

  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('name', { ascending: true })

  // Fetch homework published by this teacher
  const { data: homeworkList } = await supabase
    .from('homework')
    .select(`
      *,
      classes(name, section),
      subjects(name)
    `)
    .eq('created_by', user?.id)
    .order('created_at', { ascending: false })

  // Server Action to create homework and trigger notifications
  async function handlePublishHomeworkAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const classId = formData.get('classId') as string
    const subjectId = formData.get('subjectId') as string
    const dueDate = formData.get('dueDate') as string
    const fileUrl = formData.get('fileUrl') as string

    if (!title || !classId || !subjectId || !dueDate) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // 1. Insert homework record
    const { data: hw, error } = await supabase
      .from('homework')
      .insert({
        title,
        description: description || '',
        class_id: classId,
        subject_id: subjectId,
        due_date: dueDate,
        file_url: fileUrl || null,
        created_by: user.id
      })
      .select()
      .single()

    if (error || !hw) {
      console.error('Error publishing homework:', error?.message)
      return
    }

    // 2. Fetch all students in this class to alert them
    const selectedClass = classes?.find(c => c.id === classId)
    if (selectedClass) {
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('grade_level', selectedClass.name)
        .eq('section', selectedClass.section)

      if (students && students.length > 0) {
        for (const stud of students) {
          // Notify Student
          await supabase.from('notifications').insert({
            user_id: stud.id,
            message: `New homework published: "${title}". Due date: ${formatDate(dueDate)}.`,
            link_url: `/dashboard/student/homework`
          })

          // Notify linked parents
          const { data: parentLinks } = await supabase
            .from('student_parents')
            .select('parent_id')
            .eq('student_id', stud.id)

          if (parentLinks) {
            for (const link of parentLinks) {
              await supabase.from('notifications').insert({
                user_id: link.parent_id,
                message: `New homework assigned to your child: "${title}". Due: ${formatDate(dueDate)}.`,
                link_url: `/dashboard/parent/dashboard`
              })
            }
          }
        }
      }
    }

    revalidatePath('/dashboard/teacher/homework')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Homework Assignments Manager
        </h1>
        <Link href="/dashboard/teacher" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Publish Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Publish New Homework</h2>
          <form action={handlePublishHomeworkAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Homework Title</label>
              <input type="text" name="title" placeholder="e.g. Kiswahili Methali Essay" className="input-field" required />
            </div>

            <div className="form-group">
              <label className="form-label">Description / Instructions</label>
              <textarea name="description" placeholder="Enter writing instructions..." className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} required />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Class</label>
                <select name="classId" className="input-field" required>
                  <option value="">-- Choose Class --</option>
                  {classes?.map(c => (
                    <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Subject</label>
                <select name="subjectId" className="input-field" required>
                  <option value="">-- Choose Subject --</option>
                  {subjects?.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input type="date" name="dueDate" className="input-field" required />
            </div>

            <div className="form-group">
              <label className="form-label">Document Attachment Link (Optional)</label>
              <input type="text" name="fileUrl" placeholder="https://example.com/homework-resource.pdf" className="input-field" />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              🚀 Publish Homework Assignment
            </button>
          </form>
        </div>

        {/* Homework List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Published Homework Assignments ({homeworkList?.length || 0})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.5rem' }}>
            {homeworkList?.map((hw) => (
              <div key={hw.id} style={{ padding: '1.25rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: 'var(--color-secondary)' }}>
                      {hw.title}
                    </h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      Class: {hw.classes?.name} {hw.classes?.section ? `(${hw.classes?.section})` : ''} • Subject: {hw.subjects?.name}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-error)', fontWeight: 600 }}>
                      Due: {formatDate(hw.due_date)}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      Published: {new Date(hw.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', margin: '0.75rem 0', whiteSpace: 'pre-wrap' }}>
                  {hw.description}
                </p>

                {hw.file_url && (
                  <div style={{ marginBottom: '1rem' }}>
                    <a href={hw.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none' }}>
                      📁 Download Attached Worksheet Resource
                    </a>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
                  <Link 
                    href={`/dashboard/teacher/homework/review?homework_id=${hw.id}`}
                    className="btn btn-secondary"
                    style={{ textDecoration: 'none', padding: '0.35rem 1rem', fontSize: '0.85rem' }}
                  >
                    📝 Review Submissions
                  </Link>
                </div>
              </div>
            ))}

            {(!homeworkList || homeworkList.length === 0) && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                No homework assignments published yet.
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
