import { createClient } from '@/utils/supabase/server'

export default async function FinancialReportsPage() {
  const supabase = await createClient()

  // 1. Fetch total invoiced (net_amount)
  const { data: invoiceSum } = await supabase
    .from('invoices')
    .select('net_amount')
  const totalBilled = invoiceSum?.reduce((sum, inv) => sum + Number(inv.net_amount), 0) || 0

  // 2. Fetch total collected (payments)
  const { data: paymentSum } = await supabase
    .from('payments')
    .select('amount')
  const totalCollected = paymentSum?.reduce((sum, pay) => sum + Number(pay.amount), 0) || 0

  // 3. Fetch total expenses
  const { data: expenseSum } = await supabase
    .from('expenses')
    .select('amount')
  const totalExpenses = expenseSum?.reduce((sum, exp) => sum + Number(exp.amount), 0) || 0

  // Calculations
  const outstandingBalance = totalBilled - totalCollected
  const collectionRate = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0
  const netCashflow = totalCollected - totalExpenses

  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Fetch breakdown of expenses by category for a breakdown widget
  const { data: expenseCategories } = await supabase
    .from('expenses')
    .select('category, amount')

  const categoryTotals: Record<string, number> = {}
  expenseCategories?.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount)
  })

  // Fetch breakdown of fees collected by payment method
  const { data: paymentMethods } = await supabase
    .from('payments')
    .select('payment_method, amount')

  const methodTotals: Record<string, number> = {}
  paymentMethods?.forEach(p => {
    methodTotals[p.payment_method] = (methodTotals[p.payment_method] || 0) + Number(p.amount)
  })

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Financial Reports & Analytics
      </h1>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Total Billed</h3>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>{formatTZS(totalBilled)}</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Total Collected</h3>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-success)' }}>{formatTZS(totalCollected)}</p>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            Collection Rate: <strong style={{ color: 'var(--color-success)' }}>{collectionRate}%</strong>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Outstanding Balance</h3>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-error)' }}>{formatTZS(outstandingBalance)}</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Net Cashflow</h3>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: netCashflow >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
            {formatTZS(netCashflow)}
          </p>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            After <strong style={{ color: 'var(--color-error)' }}>{formatTZS(totalExpenses)}</strong> expenses
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Collection Progress & Methods */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Fee Collection Progress</h2>
          
          {/* Progress Bar */}
          <div style={{ height: '24px', backgroundColor: 'var(--color-border)', borderRadius: '12px', overflow: 'hidden', position: 'relative', marginBottom: '2rem' }}>
            <div style={{
              height: '100%',
              width: `${collectionRate}%`,
              backgroundColor: collectionRate >= 80 ? 'var(--color-success)' : collectionRate >= 50 ? 'var(--color-accent)' : 'var(--color-error)',
              transition: 'width 1s ease-in-out'
            }} />
            <span style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)'
            }}>
              {collectionRate}% Collected
            </span>
          </div>

          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Collection by Method</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(methodTotals).map(([method, total]) => (
              <div key={method} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontWeight: 600 }}>{method}</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>{formatTZS(total)}</span>
              </div>
            ))}

            {Object.keys(methodTotals).length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>No payment records available.</p>
            )}
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Expense Breakdown</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(categoryTotals).map(([cat, total]) => {
              const pct = totalExpenses > 0 ? Math.round((total / totalExpenses) * 100) : 0
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 600 }}>{cat}</span>
                    <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>{formatTZS(total)} ({pct}%)</span>
                  </div>
                  <div style={{ height: '8px', backgroundColor: 'var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, backgroundColor: 'var(--color-error)' }} />
                  </div>
                </div>
              )
            })}

            {Object.keys(categoryTotals).length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>No expenditures recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
