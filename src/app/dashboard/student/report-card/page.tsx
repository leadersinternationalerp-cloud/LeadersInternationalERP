import { createClient } from '@/utils/supabase/server'

export default async function StudentReportCardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Fetch the student profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user?.id)
    .single()

  // Fetch released report cards for this student
  const { data: reportCards } = await supabase
    .from('report_cards')
    .select(`
      id,
      term,
      academic_year,
      status,
      pdf_url,
      generated_at
    `)
    .eq('student_id', user?.id)
    .eq('status', 'RELEASED')
    .order('generated_at', { ascending: false })

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>My Report Cards</h1>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Academic Year</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Term</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Released Date</th>
              <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Download</th>
            </tr>
          </thead>
          <tbody>
            {(reportCards || []).map((card) => (
              <tr key={card.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{card.academic_year}</td>
                <td style={{ padding: '1rem' }}>{card.term}</td>
                <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>
                  {card.generated_at ? new Date(card.generated_at).toLocaleDateString() : 'N/A'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  {card.pdf_url ? (
                    <a href={card.pdf_url} target="_blank" className="btn-primary" style={{ textDecoration: 'none', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>
                      Download PDF
                    </a>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Pending PDF Generation</span>
                  )}
                </td>
              </tr>
            ))}
            {(!reportCards || reportCards.length === 0) && (
              <tr>
                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No released report cards available yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
