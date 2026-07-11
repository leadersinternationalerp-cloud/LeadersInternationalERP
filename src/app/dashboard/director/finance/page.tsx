import { createClient } from '@/utils/supabase/server'

export default async function DirectorFinancePage() {
  const supabase = await createClient()

  // Verify access (only Directors and Admins can access Director Finance)
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  const hasAccess = userRoles.includes('Director') || userRoles.includes('System Admin')

  if (!hasAccess) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

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
  const netProfit = totalCollected - totalExpenses

  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Fetch recent payments for dashboard feed
  const { data: recentPayments } = await supabase
    .from('payments')
    .select(`
      id,
      receipt_number,
      amount,
      payment_date,
      students (
        profiles (
          first_name,
          last_name
        )
      )
    `)
    .order('payment_date', { ascending: false })
    .limit(5)

  // Fetch recent expenses for dashboard feed
  const { data: recentExpenses } = await supabase
    .from('expenses')
    .select('*')
    .order('date', { ascending: false })
    .limit(5)

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Director Finance Dashboard (TZS)
      </h1>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>School Billed Revenue</h3>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-primary)' }}>{formatTZS(totalBilled)}</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Collected Revenue</h3>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-success)' }}>{formatTZS(totalCollected)}</p>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            Collection Rate: <strong style={{ color: 'var(--color-success)' }}>{collectionRate}%</strong>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Outstanding Fees</h3>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-error)' }}>{formatTZS(outstandingBalance)}</p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Net Cash Position</h3>
          <p style={{ fontSize: '1.6rem', fontWeight: 700, color: netProfit >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
            {formatTZS(netProfit)}
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
            Operating Expenses: <strong style={{ color: 'var(--color-error)' }}>{formatTZS(totalExpenses)}</strong>
          </div>
        </div>
      </div>

      {/* Collection Rate Progress Bar */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Collection Progress Against Billed</h2>
        <div style={{ height: '28px', backgroundColor: 'var(--color-border)', borderRadius: '14px', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%',
            width: `${collectionRate}%`,
            backgroundColor: collectionRate >= 80 ? 'var(--color-success)' : collectionRate >= 50 ? 'var(--color-accent)' : 'var(--color-error)',
            transition: 'width 1s ease-in-out'
          }} />
          <span style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)'
          }}>
            {collectionRate}% Collected ({formatTZS(totalCollected)} of {formatTZS(totalBilled)})
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Recent Collections */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Recent Student Collections</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentPayments?.map((p: any) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.students?.profiles?.first_name} {p.students?.profiles?.last_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Receipt: {p.receipt_number}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>{formatTZS(p.amount)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {new Date(p.payment_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
            {(!recentPayments || recentPayments.length === 0) && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>No recent collections found.</p>
            )}
          </div>
        </div>

        {/* Recent Expenditures */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Recent School Expenses</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentExpenses?.map((e: any) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{e.description}</div>
                  <span style={{
                    padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)',
                    marginTop: '0.25rem', display: 'inline-block'
                  }}>
                    {e.category}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-error)' }}>{formatTZS(e.amount)}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {new Date(e.date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
            {(!recentExpenses || recentExpenses.length === 0) && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>No recent expenses recorded.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
