import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function TeacherAssignmentsPage() {
  const supabase = await createClient()

  const { data: teachers } = await supabase.from('profiles').select('id, first_name, last_name').eq('role', 'Teacher').order('first_name', { ascending: true })
  const { data: classes } = await supabase.from('classes').select('*').order('class_name', { ascending: true })
  const { data: subjects } = await supabase.from('subjects').select('*').order('name', { ascending: true })

  // Assume table `teacher_allocations(id, teacher_id, class_id, subject_id)` exists from initial setup
  // We'll catch errors gracefully if the table is slightly differently named.
  const { data: allocations, error: allocError } = await supabase
    .from('teacher_allocations')
    .select(`
      id,
      teacher:teacher_id(first_name, last_name),
      class:class_id(class_name),
      subject:subject_id(subject_name)
    `)
    .order('created_at', { ascending: false })

  async function assignTeacherAction(formData: FormData) {
    'use server'
    const supabase = await createClient()

    const teacher_id = formData.get('teacher_id') as string
    const class_id = formData.get('class_id') as string
    const subject_id = formData.get('subject_id') as string

    if (!teacher_id || !class_id || !subject_id) return

    // Insert allocation
    await supabase.from('teacher_allocations').insert({
      teacher_id,
      class_id,
      subject_id
    })

    revalidatePath('/dashboard/admin/teacher-assignments')
  }

  async function removeAllocationAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const id = formData.get('allocation_id') as string
    
    if (id) {
      await supabase.from('teacher_allocations').delete().eq('id', id)
      revalidatePath('/dashboard/admin/teacher-assignments')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Teacher Assignments Matrix</h1>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Assign Teacher to Class & Subject</h2>
        <form action={assignTeacherAction} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Teacher</label>
            <select name="teacher_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <option value="">Select Teacher...</option>
              {(teachers || []).map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Class</label>
            <select name="class_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <option value="">Select Class...</option>
              {(classes || []).map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Subject</label>
            <select name="subject_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <option value="">Select Subject...</option>
              {(subjects || []).map(s => <option key={s.id} value={s.id}>{s.name || s.subject_name}</option>)}
            </select>
          </div>
          
          <button type="submit" className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>Assign</button>
        </form>
      </div>

      {/* Allocations Matrix/List */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Current Assignments</h3>
        </div>
        
        {allocError ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-error)' }}>
            Error loading allocations: {allocError.message}. Make sure `teacher_allocations` table exists.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Teacher</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Class</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Subject</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(allocations || []).map((alloc: any) => (
                <tr key={alloc.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{alloc.teacher?.first_name} {alloc.teacher?.last_name}</td>
                  <td style={{ padding: '1rem' }}>{alloc.class?.class_name}</td>
                  <td style={{ padding: '1rem' }}>{alloc.subject?.subject_name}</td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <form action={removeAllocationAction}>
                      <input type="hidden" name="allocation_id" value={alloc.id} />
                      <button type="submit" className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', backgroundColor: 'transparent', color: 'var(--color-error)', border: '1px solid var(--color-error)' }}>
                        Remove
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {(!allocations || allocations.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No teacher assignments configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}
