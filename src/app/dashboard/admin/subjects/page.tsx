import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function SubjectsPage() {
  const supabase = await createClient()

  const { data: subjects } = await supabase.from('subjects').select('*').order('name', { ascending: true })

  async function addSubjectAction(formData: FormData) {
    'use server'
    const supabase = await createClient()

    const subject_name = formData.get('subject_name') as string
    const subject_code = formData.get('subject_code') as string
    const department = formData.get('department') as string

    if (!subject_name) return

    await supabase.from('subjects').insert({
      name: subject_name,
      subject_name,
      code: subject_code,
      subject_code,
      department
    })

    revalidatePath('/dashboard/admin/subjects')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Subjects Setup</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Subjects List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Subject Name</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Code</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Department</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(subjects || []).map((sub) => (
                <tr key={sub.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{sub.name || sub.subject_name}</td>
                  <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{sub.code || sub.subject_code || '-'}</td>
                  <td style={{ padding: '1rem' }}>{sub.department || 'General'}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.8rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      color: 'var(--color-success)'
                    }}>
                      Active
                    </span>
                  </td>
                </tr>
              ))}
              {(!subjects || subjects.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No subjects defined.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Subject Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Add New Subject</h2>
          <form action={addSubjectAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Subject Name</label>
              <input type="text" name="subject_name" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. Further Mathematics" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Subject Code (Optional)</label>
              <input type="text" name="subject_code" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. MATH-401" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Department (Optional)</label>
              <select name="department" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <option value="">General</option>
                <option value="Sciences">Sciences</option>
                <option value="Humanities">Humanities</option>
                <option value="Arts">Arts</option>
                <option value="Languages">Languages</option>
                <option value="Mathematics">Mathematics</option>
              </select>
            </div>
            
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Save Subject</button>
          </form>
        </div>

      </div>
    </div>
  )
}
