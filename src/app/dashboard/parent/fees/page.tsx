import { createClient } from '@/utils/supabase/server'

export default async function ParentFeesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Find relationships
  const { data: relationships } = await supabase
    .from('student_relationships')
    .select('student_id')
    .eq('parent_id', user?.id)

  const studentIds = (relationships || []).map(r => r.student_id)

  let invoices: any[] = []
  if (studentIds.length > 0) {
    const { data } = await supabase
      .from('invoices')
      .select(`
        id,
        amount,
        status,
        due_date,
        term:term_id(term_name),
        academic_year,
        student:student_id(first_name, last_name)
      `)
      .in('student_id', studentIds)
      .order('due_date', { ascending: false })
      
    invoices = data || []
  }

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val)
  }

  const totalUnpaid = invoices.filter(i => i.status !== 'PAID').reduce((sum, i) => sum + Number(i.amount), 0)

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Family Fee Statements</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', borderLeft: '4px solid var(--color-error)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>Total Unpaid Balance</h3>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-text)' }}>
            {formatTZS(totalUnpaid)}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>All Invoices</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Student</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Academic Year / Term</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Due Date</th>
              <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Amount</th>
              <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{inv.student?.first_name} {inv.student?.last_name}</td>
                <td style={{ padding: '1rem' }}>{inv.academic_year} - {inv.term?.term_name || 'N/A'}</td>
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
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No fee invoices available for your children.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
