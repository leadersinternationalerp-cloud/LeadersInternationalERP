import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function FeeBalancesPage() {
  const supabase = await createClient()

  // Fetch student invoices with balances
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      *,
      student:student_id(first_name, last_name, admission_number)
    `)
    .gt('amount_due', 0)
    .order('due_date', { ascending: true })

  // Calculate aging
  const today = new Date()
  const aging = {
    current: 0,
    overdue_30: 0,
    overdue_60: 0,
    overdue_90_plus: 0
  }

  const enhancedInvoices = (invoices || []).map(inv => {
    const dueDate = new Date(inv.due_date)
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24))
    
    let bucket = 'Current'
    if (daysOverdue > 90) { bucket = '90+ Days'; aging.overdue_90_plus += inv.amount_due }
    else if (daysOverdue > 60) { bucket = '61-90 Days'; aging.overdue_60 += inv.amount_due }
    else if (daysOverdue > 0) { bucket = '1-60 Days'; aging.overdue_30 += inv.amount_due }
    else { aging.current += inv.amount_due }

    return { ...inv, daysOverdue, bucket }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Fee Balances (A/R Aging)</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" style={{ textDecoration: 'none' }}>Export Excel</button>
          <button className="btn-secondary" style={{ textDecoration: 'none' }}>Print PDF</button>
        </div>
      </div>

      {/* Aging Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Current (Not Due)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>TZS {aging.current.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>1-60 Days Overdue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-warning)' }}>TZS {aging.overdue_30.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>61-90 Days Overdue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-warning)' }}>TZS {aging.overdue_60.toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>90+ Days Overdue</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-error)' }}>TZS {aging.overdue_90_plus.toLocaleString()}</div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Student</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Invoice Ref</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Due Date</th>
              <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Aging Bucket</th>
              <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Balance Due</th>
              <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {enhancedInvoices.map((inv) => (
              <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{inv.student?.first_name} {inv.student?.last_name}</td>
                <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{inv.id.substring(0, 8).toUpperCase()}</td>
                <td style={{ padding: '1rem' }}>{new Date(inv.due_date).toLocaleDateString()}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '1rem', 
                    fontSize: '0.8rem',
                    backgroundColor: inv.daysOverdue > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    color: inv.daysOverdue > 0 ? 'var(--color-warning)' : 'var(--color-primary)'
                  }}>
                    {inv.bucket}
                  </span>
                </td>
                <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>TZS {inv.amount_due.toLocaleString()}</td>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}>Send Reminder</button>
                </td>
              </tr>
            ))}
            {enhancedInvoices.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-success)', fontWeight: 600 }}>
                  All invoices are paid in full. No outstanding balances.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
