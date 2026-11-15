import { createClient } from '@/utils/supabase/server'
import { Download } from 'lucide-react'

export default async function StudentReportCardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // 1. Fetch all terms so we can match term names & IDs
  const { data: termsData } = await supabase
    .from('terms')
    .select('id, name, is_current, academic_years(name)')
    .order('is_current', { ascending: false })

  const defaultTerm = termsData?.find(t => t.is_current) || termsData?.[0]

  // 2. Fetch published report card rows for this student
  const { data: rawReportCards } = await supabase
    .from('report_cards')
    .select(`
      *,
      term_ref:term_id(id, name, academic_years(name))
    `)
    .eq('student_id', user?.id || '')
    .order('created_at', { ascending: false })

  // 3. Also check released marks for this student so released terms always have a downloadable report card
  const { data: releasedMarks } = await supabase
    .from('marks')
    .select('term, academic_year, created_at')
    .eq('student_id', user?.id || '')
    .eq('is_released', true)
    .order('created_at', { ascending: false })

  const cardsMap = new Map<string, {
    id: string
    term: string
    academic_year: string
    generated_at: string
    pdf_url: string
  }>()

  // Add published report_cards rows
  ;(rawReportCards || []).forEach((rc: any) => {
    const isReleased = rc.is_published === true || rc.status === 'RELEASED'
    if (!isReleased) return

    const termObj = Array.isArray(rc.term_ref) ? rc.term_ref[0] : rc.term_ref
    const ayObj = termObj?.academic_years
      ? Array.isArray(termObj.academic_years)
        ? termObj.academic_years[0]
        : termObj.academic_years
      : null

    const termName = rc.term || termObj?.name || defaultTerm?.name || 'Term 1'
    const termId = rc.term_id || termObj?.id || defaultTerm?.id
    const academicYear = rc.academic_year || ayObj?.name || '2026-2027'
    const pdfUrl =
      rc.pdf_url ||
      (termId ? `/api/report-cards/download?student_id=${user?.id}&term_id=${termId}&download=true` : '')

    cardsMap.set(termName.toLowerCase(), {
      id: rc.id,
      term: termName,
      academic_year: academicYear,
      generated_at: rc.generated_at || rc.updated_at || rc.created_at,
      pdf_url: pdfUrl
    })
  })

  // Synthesize any term that has released marks
  ;(releasedMarks || []).forEach((m: any) => {
    const termName = m.term || defaultTerm?.name || 'Term 1'
    const key = termName.toLowerCase()
    if (cardsMap.has(key)) return

    const matchedTerm =
      (termsData || []).find(t => (t.name || '').toLowerCase() === key) || defaultTerm
    const ayObj = matchedTerm?.academic_years
      ? Array.isArray(matchedTerm.academic_years)
        ? matchedTerm.academic_years[0]
        : matchedTerm.academic_years
      : null

    if (matchedTerm?.id && user?.id) {
      cardsMap.set(key, {
        id: `rel_${matchedTerm.id}`,
        term: termName,
        academic_year: m.academic_year || ayObj?.name || '2026-2027',
        generated_at: m.created_at,
        pdf_url: `/api/report-cards/download?student_id=${user.id}&term_id=${matchedTerm.id}&download=true`
      })
    }
  })

  const reportCards = Array.from(cardsMap.values())

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
            {reportCards.map((card) => (
              <tr key={card.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{card.academic_year}</td>
                <td style={{ padding: '1rem' }}>{card.term}</td>
                <td style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>
                  {card.generated_at ? new Date(card.generated_at).toLocaleDateString() : 'N/A'}
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  {card.pdf_url ? (
                    <a
                      href={card.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary"
                      style={{
                        textDecoration: 'none',
                        padding: '0.45rem 0.95rem',
                        fontSize: '0.85rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Download size={14} />
                      Download Official PDF
                    </a>
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>Pending PDF Generation</span>
                  )}
                </td>
              </tr>
            ))}
            {reportCards.length === 0 && (
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
