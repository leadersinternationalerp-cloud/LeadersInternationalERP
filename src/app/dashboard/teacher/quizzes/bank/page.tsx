import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function QuizBankPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: subjects } = await supabase.from('subjects').select('*').order('name', { ascending: true })

  // Load Banks
  const { data: banks } = await supabase
    .from('quiz_banks')
    .select(`
      *,
      subject:subject_id(subject_name),
      items:quiz_bank_items(count)
    `)
    .order('created_at', { ascending: false })

  async function createBankAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const name = formData.get('name') as string
    const subject_id = formData.get('subject_id') as string

    if (!name) return

    await supabase.from('quiz_banks').insert({
      name,
      subject_id: subject_id || null,
      created_by: user?.id
    })

    revalidatePath('/dashboard/teacher/quizzes/bank')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Quiz Bank</h1>
        <a href="/dashboard/teacher/quizzes/jobs" className="btn-secondary" style={{ textDecoration: 'none' }}>
          Generate New Questions (AI)
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Banks List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Bank Name</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Subject</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Questions</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {(banks || []).map((bank) => (
                <tr key={bank.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                    <a href={`/dashboard/teacher/quizzes/bank/${bank.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                      {bank.name}
                    </a>
                  </td>
                  <td style={{ padding: '1rem' }}>{bank.subject?.subject_name || 'General'}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.8rem',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      color: 'var(--color-primary)',
                      fontWeight: 'bold'
                    }}>
                      {bank.items?.[0]?.count || 0}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                    {new Date(bank.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {(!banks || banks.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No quiz banks found. Create one to start storing questions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Create Bank Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Create Question Bank</h2>
          <form action={createBankAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Bank Name</label>
              <input type="text" name="name" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. Grade 5 Math (Fractions)" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Subject (Optional)</label>
              <select name="subject_id" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <option value="">No specific subject</option>
                {(subjects || []).map(s => <option key={s.id} value={s.id}>{s.name || s.subject_name}</option>)}
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Create Bank</button>
          </form>
        </div>

      </div>
    </div>
  )
}
