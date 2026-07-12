import { createClient } from '@/utils/supabase/server'

export default async function StudentFeesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id,
      amount,
      status,
      due_date,
      term:term_id(term_name),
      academic_year
    `)
    .eq('student_id', user?.id)
    .order('due_date', { ascending: false })

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val)
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>My Fee Statements</h1>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Academic Year</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Term</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Due Date</th>
              <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Amount</th>
              <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {(invoices || []).map((inv) => {
              const term: any = Array.isArray(inv.term) ? inv.term[0] : inv.term
              return (
              <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{inv.academic_year}</td>
                <td style={{ padding: '1rem' }}>{term?.term_name || 'N/A'}</td>
                <td style={{ padding: '1rem' }}>{new Date(inv.due_date).toLocaleDateString()}</td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{formatTZS(inv.amount)}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '1rem', 
                    fontSize: '0.8rem',
                    backgroundColor: inv.status === 'PAID' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: inv.status === 'PAID' ? 'var(--color-success)' : 'var(--color-error)'
                  }}>
                    {inv.status}
                  </span>
                </td>
              </tr>
              )
            })}
            {(!invoices || invoices.length === 0) && (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No fee invoices available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
