import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function QuizJobsPage() {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from('quiz_generation_jobs')
    .select(`
      *,
      requester:requested_by(first_name, last_name)
    `)
    .order('created_at', { ascending: false })

  async function generateAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const topic = formData.get('topic') as string
    const num_questions = parseInt(formData.get('num_questions') as string)
    const difficulty = formData.get('difficulty') as string

    if (!topic || !num_questions) return

    // In a real implementation, this would trigger an Edge Function or Background Worker
    // to call the Gemini API. For this MVP, we just create the job row.
    await supabase.from('quiz_generation_jobs').insert({
      topic,
      num_questions,
      difficulty,
      requested_by: user?.id,
      status: 'PENDING'
    })

    revalidatePath('/dashboard/teacher/quizzes/jobs')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>AI Quiz Generation Jobs</h1>
        <a href="/dashboard/teacher/quizzes/bank" className="btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Quiz Banks
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Generate Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Request New Generation</h2>
          <form action={generateAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Topic / Instructions</label>
              <textarea name="topic" required rows={4} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. 5th Grade fractions, focusing on common denominators..."></textarea>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ width: '50%' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Questions</label>
                <input type="number" name="num_questions" required defaultValue="5" min="1" max="20" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
              <div style={{ width: '50%' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Difficulty</label>
                <select name="difficulty" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>
            
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Generate with AI</button>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              Jobs are sent to the AI engine and will appear in the queue for your review before being added to a bank.
            </p>
          </form>
        </div>

        {/* Jobs List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Generation Queue</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Topic</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Questions</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Requested By</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(jobs || []).map((job) => (
                <tr key={job.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.topic}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date(job.created_at).toLocaleString()}</div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>{job.num_questions}</td>
                  <td style={{ padding: '1rem' }}>{job.requester?.first_name} {job.requester?.last_name}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.8rem',
                      backgroundColor: 
                        job.status === 'COMPLETED' ? 'rgba(59, 130, 246, 0.1)' :
                        job.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' :
                        job.status === 'FAILED' ? 'rgba(239, 68, 68, 0.1)' :
                        'rgba(245, 158, 11, 0.1)',
                      color:
                        job.status === 'COMPLETED' ? 'var(--color-primary)' :
                        job.status === 'APPROVED' ? 'var(--color-success)' :
                        job.status === 'FAILED' ? 'var(--color-error)' :
                        'var(--color-warning)'
                    }}>
                      {job.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    {job.status === 'COMPLETED' && (
                      <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Review & Approve</button>
                    )}
                  </td>
                </tr>
              ))}
              {(!jobs || jobs.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No generation jobs found.
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
