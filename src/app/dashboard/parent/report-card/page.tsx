import { createClient } from '@/utils/supabase/server'
import { Download } from 'lucide-react'

export default async function ParentReportCardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // 1. Fetch active terms
  const { data: termsData } = await supabase
    .from('terms')
    .select('id, name, is_current, academic_years(name)')
    .order('is_current', { ascending: false })

  const activeTerm = termsData?.find(t => t.is_current) || termsData?.[0]

  // 2. Find linked children
  const { data: parentLinks } = await supabase
    .from('student_parents')
    .select('student_id, students (id, student_id, grade_level, section, class_id, is_active, profiles(first_name, last_name))')
    .eq('parent_id', user?.id || '')

  const children = (parentLinks || []).map(link => link.students).filter(Boolean) as any[]
  const studentIds = children.map(c => c.id)
  const childMap = new Map<string, any>(children.map(c => [c.id, c]))

  // 3. Fetch released primary report cards + released marks fallback
  const primaryCardsMap = new Map<string, any>()
  if (studentIds.length > 0) {
    const { data: rawReportCards } = await supabase
      .from('report_cards')
      .select(`
        *,
        term_ref:term_id(id, name, academic_years(name))
      `)
      .in('student_id', studentIds)
      .order('created_at', { ascending: false })

    ;(rawReportCards || []).forEach((rc: any) => {
      const isReleased = rc.is_published === true || rc.status === 'RELEASED'
      if (!isReleased) return

      const child = childMap.get(rc.student_id)
      const childProf = Array.isArray(child?.profiles) ? child.profiles[0] : child?.profiles
      const studentName = childProf
        ? `${childProf.first_name || ''} ${childProf.last_name || ''}`.trim()
        : 'Student'

      const termObj = Array.isArray(rc.term_ref) ? rc.term_ref[0] : rc.term_ref
      const ayObj = termObj?.academic_years
        ? Array.isArray(termObj.academic_years)
          ? termObj.academic_years[0]
          : termObj.academic_years
        : null

      const termName = rc.term || termObj?.name || activeTerm?.name || 'Term 1'
      const termId = rc.term_id || termObj?.id || activeTerm?.id
      const academicYear = rc.academic_year || ayObj?.name || '2026-2027'
      const pdfUrl =
        rc.pdf_url ||
        (termId
          ? `/api/report-cards/download?student_id=${rc.student_id}&term_id=${termId}&download=true`
          : '')

      const key = `${rc.student_id}_${termName.toLowerCase()}`
      primaryCardsMap.set(key, {
        id: rc.id,
        studentName,
        academic_year: academicYear,
        term: termName,
        pdf_url: pdfUrl,
        generated_at: rc.generated_at || rc.updated_at || rc.created_at
      })
    })

    // Also synthesize report cards for any child + term that has released marks
    const { data: releasedMarks } = await supabase
      .from('marks')
      .select('student_id, term, academic_year, created_at')
      .in('student_id', studentIds)
      .eq('is_released', true)
      .order('created_at', { ascending: false })

    ;(releasedMarks || []).forEach((m: any) => {
      const termName = m.term || activeTerm?.name || 'Term 1'
      const key = `${m.student_id}_${termName.toLowerCase()}`
      if (primaryCardsMap.has(key)) return

      const child = childMap.get(m.student_id)
      const childProf = Array.isArray(child?.profiles) ? child.profiles[0] : child?.profiles
      const studentName = childProf
        ? `${childProf.first_name || ''} ${childProf.last_name || ''}`.trim()
        : 'Student'

      const matchedTerm =
        (termsData || []).find(t => (t.name || '').toLowerCase() === termName.toLowerCase()) ||
        activeTerm
      const ayObj = matchedTerm?.academic_years
        ? Array.isArray(matchedTerm.academic_years)
          ? matchedTerm.academic_years[0]
          : matchedTerm.academic_years
        : null

      if (matchedTerm?.id) {
        primaryCardsMap.set(key, {
          id: `rel_${m.student_id}_${matchedTerm.id}`,
          studentName,
          academic_year: m.academic_year || ayObj?.name || '2026-2027',
          term: termName,
          pdf_url: `/api/report-cards/download?student_id=${m.student_id}&term_id=${matchedTerm.id}&download=true`,
          generated_at: m.created_at
        })
      }
    })
  }

  const reportCards = Array.from(primaryCardsMap.values())

  const isEarlyYearsName = (name: string) => {
    const n = (name || '').toLowerCase()
    return ['baby', 'nursery', 'reception', 'kg', 'playgroup', 'pre-primary'].some(ey => n.includes(ey))
  }

  // 4. Build Early Years report entries for linked EYFS children
  const eyfsCards: any[] = []
  if (activeTerm) {
    children.forEach(c => {
      if (isEarlyYearsName(c.grade_level || '')) {
        const termName = activeTerm.name || 'Term'
        const ay = Array.isArray(activeTerm.academic_years) ? activeTerm.academic_years[0] : activeTerm.academic_years
        const yearName = ay?.name || '2026-2027'
        const cProf = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
        eyfsCards.push({
          id: `eyfs_${c.id}_${activeTerm.id}`,
          studentName: `${cProf?.first_name || ''} ${cProf?.last_name || ''}`.trim(),
          academic_year: yearName,
          term: termName,
          pdf_url: `/api/early-years/report?student_id=${c.id}&term_id=${activeTerm.id}&download=true`,
          isEyfs: true
        })
      }
    })
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
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Report Type</th>
              <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Download</th>
            </tr>
          </thead>
          <tbody>
            {/* Early Years Cards */}
            {eyfsCards.map(card => (
              <tr key={card.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(219, 39, 119, 0.02)' }}>
                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-text)' }}>{card.studentName}</td>
                <td style={{ padding: '1rem' }}>{card.academic_year}</td>
                <td style={{ padding: '1rem' }}>{card.term}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: 'rgba(219, 39, 119, 0.1)', color: '#db2777', fontWeight: 600 }}>
                    EYFS Progress Card
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <a 
                    href={card.pdf_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="btn" 
                    style={{ textDecoration: 'none', padding: '0.45rem 1rem', fontSize: '0.85rem', backgroundColor: '#db2777', color: '#ffffff', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Download size={14} />
                    Download EYFS PDF
                  </a>
                </td>
              </tr>
            ))}

            {/* Released Primary Cards */}
            {reportCards.map((card) => (
              <tr key={card.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{card.studentName}</td>
                <td style={{ padding: '1rem' }}>{card.academic_year}</td>
                <td style={{ padding: '1rem' }}>{card.term}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', fontWeight: 600 }}>
                    Primary Report Card
                  </span>
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
                        padding: '0.45rem 1rem',
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

            {eyfsCards.length === 0 && reportCards.length === 0 && (
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
