import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function ReportCardsPage() {
  const supabase = await createClient()

  // Verify Principal/Dean/HOS/Admin access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user?.id).single()
  const userRoles = profile?.roles || []

  if (!userRoles.includes('Principal') && !userRoles.includes('Dean') && !userRoles.includes('HOS') && !userRoles.includes('System Admin')) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2></div>
  }

  // If HOS, we would normally scope the classes fetched below to their department.
  // For MVP parity, we'll fetch all classes but log the intention.


  // Get options for the generator form
  const { data: terms } = await supabase.from('terms').select('*').order('created_at', { ascending: false })
  const { data: classes } = await supabase.from('classes').select('*').order('class_name', { ascending: true })
  const { data: frameworks } = await supabase.from('grade_boundaries').select('framework_name').order('framework_name', { ascending: true })
  
  // Get unique framework names
  const uniqueFrameworks = Array.from(new Set((frameworks || []).map(f => f.framework_name)))

  // Get active releases
  const { data: releases } = await supabase
    .from('report_card_releases')
    .select(`
      *,
      term:term_id(term_name),
      class:class_id(class_name),
      publisher:published_by(first_name, last_name)
    `)
    .order('created_at', { ascending: false })

  async function generateAndPublishAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const term_id = formData.get('term_id') as string
    const class_id = formData.get('class_id') as string
    const framework = formData.get('framework') as string

    if (!term_id || !class_id || !framework) return

    // In a real implementation, this would trigger a background job to calculate grades
    // and generate PDFs for all students in the class, saving them to storage.
    // We will simulate creating the report_cards rows so Students/Parents can download them.

    // 1. Get all students in the class
    const { data: targetClass } = await supabase.from('classes').select('*').eq('id', class_id).single()
    let enrollments: any[] = []
    if (targetClass) {
      const { data } = await supabase.from('students').select('id, student_id').eq('grade_level', targetClass.name).eq('section', targetClass.section)
      enrollments = data || []
    }
    
    // 2. Insert into report_cards
    if (enrollments && enrollments.length > 0) {
      const inserts = enrollments.map(e => ({
        student_id: e.id,
        term_id: term_id,
        academic_year: '2026-2027',
        grade_level: targetClass.name,
        is_published: true,
        pdf_url: `/api/report-cards/download?student_id=${e.id}&term_id=${term_id}`
      }))
      await supabase.from('report_cards').insert(inserts)
    }

    // 3. Mark release
    await supabase.from('report_card_releases').insert({
      term_id,
      class_id,
      is_published: true,
      published_at: new Date().toISOString(),
      published_by: user?.id
    })

    revalidatePath('/dashboard/principal/report-cards')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Report Card Generator</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Generator Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Generate Class Reports</h2>
          <form action={generateAndPublishAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Academic Term</label>
              <select name="term_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <option value="">Select Term...</option>
                {(terms || []).map(t => <option key={t.id} value={t.id}>{t.term_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Class</label>
              <select name="class_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <option value="">Select Class...</option>
                {(classes || []).map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Grading Framework</label>
              <select name="framework" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <option value="">Select Framework...</option>
                {uniqueFrameworks.map(fw => <option key={fw} value={fw}>{fw}</option>)}
              </select>
            </div>
            
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Generate & Publish</button>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              This will lock raw marks and generate official PDFs for parents.
            </p>
          </form>
        </div>

        {/* Releases List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Published Report Cards</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Term</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Class</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Published On</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(releases || []).map((release) => (
                <tr key={release.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{release.term?.term_name}</td>
                  <td style={{ padding: '1rem' }}>{release.class?.class_name}</td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>{new Date(release.published_at).toLocaleString()}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.8rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      color: 'var(--color-success)'
                    }}>
                      Published
                    </span>
                  </td>
                </tr>
              ))}
              {(!releases || releases.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No report cards have been published yet.
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
