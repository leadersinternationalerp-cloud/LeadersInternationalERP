import { createClient } from '@/utils/supabase/server'
import { FileText, Download } from 'lucide-react'

export default async function ParentReportCardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // 1. Fetch active terms
  const { data: termsData } = await supabase
    .from('terms')
    .select('id, term_name, name, academic_year, is_current, academic_years(name)')
    .order('is_current', { ascending: false })

  const activeTerm = termsData?.find(t => t.is_current) || termsData?.[0]

  // 2. Find linked children
  const { data: parentLinks } = await supabase
    .from('student_parents')
    .select('student_id, students (id, student_id, grade_level, section, class_id, is_active, profiles(first_name, last_name))')
    .eq('parent_id', user?.id || '')

  const children = (parentLinks || []).map(link => link.students).filter(Boolean) as any[]
  const studentIds = children.map(c => c.id)

  // 3. Fetch released primary report cards
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

  const isEarlyYearsName = (name: string) => {
    const n = (name || '').toLowerCase()
    return ['baby', 'nursery', 'reception', 'kg', 'playgroup', 'pre-primary'].some(ey => n.includes(ey))
  }

  // 4. Build Early Years report entries for linked EYFS children
  const eyfsCards: any[] = []
  if (activeTerm) {
    children.forEach(c => {
      if (isEarlyYearsName(c.grade_level || '')) {
        const termName = activeTerm.term_name || activeTerm.name || 'Term'
        const ay = Array.isArray(activeTerm.academic_years) ? activeTerm.academic_years[0] : activeTerm.academic_years
        const yearName = activeTerm.academic_year || ay?.name || 'Academic Year'
        eyfsCards.push({
          id: `eyfs_${c.id}_${activeTerm.id}`,
          studentName: `${c.profiles?.first_name || ''} ${c.profiles?.last_name || ''}`.trim(),
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
                <td style={{ padding: '1rem', fontWeight: 600 }}>{card.student?.first_name} {card.student?.last_name}</td>
                <td style={{ padding: '1rem' }}>{card.academic_year}</td>
                <td style={{ padding: '1rem' }}>{card.term}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '20px', backgroundColor: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', fontWeight: 600 }}>
                    Primary Report Card
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  {card.pdf_url ? (
                    <a href={card.pdf_url} target="_blank" rel="noreferrer" className="btn-primary" style={{ textDecoration: 'none', padding: '0.45rem 1rem', fontSize: '0.85rem' }}>
                      Download PDF
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
