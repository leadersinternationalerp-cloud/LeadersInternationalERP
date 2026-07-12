import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function SyllabusAdminPage() {
  const supabase = await createClient()

  // Verify Admin access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user?.id).single()
  
  if (!profile?.roles?.includes('System Admin')) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2></div>
  }

  // Load existing topics and objectives
  const { data: topics } = await supabase.from('cambridge_topics').select(`
    *,
    subject:subject_id(name, code),
    stage:stage_id(name, code),
    objectives:cambridge_objectives(count)
  `).order('created_at', { ascending: false })

  async function uploadSyllabusAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const subject_id = formData.get('subject_id') as string
    const stage_id = formData.get('stage_id') as string
    const text_content = formData.get('text_content') as string
    
    // In a real implementation, this action would:
    // 1. Send the text_content to an LLM (Gemini) to extract structured topics and objectives
    // 2. Save the topics into cambridge_topics
    // 3. Save the objectives into cambridge_objectives
    // 4. Generate embeddings via OpenAI/Gemini
    // 5. Save the embeddings into syllabus_kb
    
    // For now, we simulate inserting a topic and a mock vector
    const { data: topic } = await supabase.from('cambridge_topics').insert({
      subject_id,
      stage_id,
      topic_code: 'NEW-TOPIC',
      title: 'Automatically Extracted Topic',
      description: text_content.substring(0, 100) + '...'
    }).select().single()
    
    if (topic) {
      // Mock objective
      await supabase.from('cambridge_objectives').insert({
        topic_id: topic.id,
        objective_code: 'OBJ-1',
        description: 'Understand ' + text_content.substring(0, 50)
      })
    }

    revalidatePath('/dashboard/admin/syllabus')
  }

  // Fetch subjects and stages for the dropdown
  const { data: subjects } = await supabase.from('cambridge_subjects').select('*')
  const { data: stages } = await supabase.from('cambridge_stages').select('*')

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Syllabus RAG Management</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Extracted Data List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Extracted Topics in Vector Store</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Subject & Stage</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Topic</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Objectives</th>
              </tr>
            </thead>
            <tbody>
              {(topics || []).map((topic: any) => (
                <tr key={topic.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{topic.subject?.name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{topic.stage?.name}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>{topic.topic_code}</div>
                    <div style={{ fontSize: '0.9rem' }}>{topic.title}</div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 600 }}>
                    {topic.objectives?.[0]?.count || 0}
                  </td>
                </tr>
              ))}
              {(!topics || topics.length === 0) && (
                <tr>
                  <td colSpan={3} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No syllabus topics imported yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Upload Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', position: 'sticky', top: '2rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Upload Syllabus Content</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Paste raw syllabus text here. The AI will extract the topics, objectives, and insert them into the `syllabus_kb` vector store for RAG-based quiz generation.
          </p>
          <form action={uploadSyllabusAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Subject</label>
              <select name="subject_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                {(subjects || []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Stage / Year</label>
              <select name="stage_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                {(stages || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Raw Syllabus Content</label>
              <textarea name="text_content" required rows={8} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. Topic 1: Cells. Objective 1.1: Identify cell structures..."></textarea>
            </div>
            
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Extract & Vectorize via AI</button>
          </form>
        </div>

      </div>
    </div>
  )
}
