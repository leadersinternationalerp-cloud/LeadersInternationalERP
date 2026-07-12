import { createClient } from '@/utils/supabase/server'

export default async function ParentReportCardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Find linked children
  const { data: parentLinks } = await supabase
    .from('parent_student_links')
    .select('student_id')
    .eq('parent_id', user?.id)

  const studentIds = (parentLinks || []).map(link => link.student_id)

  let reportCards: any[] = []

  if (studentIds.length > 0) {
    const { data } = await supabase
      .from('report_cards')
      .select(`
        id,
        term,
        academic_year,
        status,
        pdf_url,
        generated_at,
        student:student_id(first_name, last_name, admission_number)
      `)
      .in('student_id', studentIds)
      .eq('status', 'RELEASED')
      .order('generated_at', { ascending: false })

    reportCards = data || []
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>My Children's Report Cards</h1>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Student Name</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Academic Year</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Term</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Released Date</th>
              <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Download</th>
            </tr>
          </thead>
          <tbody>
            {reportCards.map((card) => (
              <tr key={card.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{card.student?.first_name} {card.student?.last_name}</td>
                <td style={{ padding: '1rem' }}>{card.academic_year}</td>
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
            {reportCards.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No released report cards available for your children yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
