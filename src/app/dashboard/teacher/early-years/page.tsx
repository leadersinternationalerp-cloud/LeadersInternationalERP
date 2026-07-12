import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function EarlyYearsPage() {
  const supabase = await createClient()

  // Get active terms and subjects
  const { data: terms } = await supabase.from('terms').select('*').eq('is_active', true)
  const { data: classes } = await supabase.from('classes').select('id, class_name')
  
  // Try to load some students based on search or just the first few
  const { data: students } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('role', 'Student')
    .limit(10)

  async function saveObservationAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const student_id = formData.get('student_id') as string
    const term_id = formData.get('term_id') as string
    const learning_area = formData.get('learning_area') as string
    const achievement_level = formData.get('achievement_level') as string
    const teacher_observation = formData.get('teacher_observation') as string

    if (!student_id || !term_id || !learning_area || !achievement_level) return

    await supabase.from('learning_area_progress').insert({
      student_id,
      term_id,
      learning_area,
      achievement_level,
      teacher_observation,
      recorded_by: user?.id
    })

    revalidatePath('/dashboard/teacher/early-years')
  }

  // Get recent observations
  const { data: recentObservations } = await supabase
    .from('learning_area_progress')
    .select(`
      *,
      student:student_id(first_name, last_name),
      term:term_id(term_name)
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Early Years Progress Tracking</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Entry Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Record Observation</h2>
          <form action={saveObservationAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Term</label>
              <select name="term_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                {(terms || []).map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Student</label>
              <select name="student_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <option value="">Select Student...</option>
                {(students || []).map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Learning Area</label>
              <select name="learning_area" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <option value="Personal, Social and Emotional">Personal, Social & Emotional</option>
                <option value="Communication and Language">Communication & Language</option>
                <option value="Physical Development">Physical Development</option>
                <option value="Literacy">Literacy</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Understanding the World">Understanding the World</option>
                <option value="Expressive Arts and Design">Expressive Arts & Design</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Achievement Level</label>
              <select name="achievement_level" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <option value="Emerging">Emerging</option>
                <option value="Expected">Expected</option>
                <option value="Exceeding">Exceeding</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Teacher Observation (Optional)</label>
              <textarea name="teacher_observation" rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="Notes on child's progress..."></textarea>
            </div>
            
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Save Observation</button>
          </form>
        </div>

        {/* Recent Observations List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Recent Observations</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Student</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Learning Area</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Level</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Observation</th>
              </tr>
            </thead>
            <tbody>
              {(recentObservations || []).map((obs) => (
                <tr key={obs.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{obs.student?.first_name} {obs.student?.last_name}</td>
                  <td style={{ padding: '1rem' }}>{obs.learning_area}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.8rem',
                      backgroundColor: 
                        obs.achievement_level === 'Exceeding' ? 'rgba(16, 185, 129, 0.1)' :
                        obs.achievement_level === 'Expected' ? 'rgba(59, 130, 246, 0.1)' :
                        'rgba(245, 158, 11, 0.1)',
                      color:
                        obs.achievement_level === 'Exceeding' ? 'var(--color-success)' :
                        obs.achievement_level === 'Expected' ? 'var(--color-primary)' :
                        'var(--color-warning)'
                    }}>
                      {obs.achievement_level}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{obs.teacher_observation || '-'}</td>
                </tr>
              ))}
              {(!recentObservations || recentObservations.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No observations recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
