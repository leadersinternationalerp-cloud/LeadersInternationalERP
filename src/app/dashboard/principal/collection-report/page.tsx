import { createClient } from '@/utils/supabase/server'

export default async function CollectionReportPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  const hasAccess = userRoles.includes('Principal') || userRoles.includes('System Admin')

  if (!hasAccess) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  // Get start of today (UTC or local, let's filter by today's date range in DB)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  // Fetch payments collected today by the logged-in user
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      invoices (term, academic_year),
      students (
        student_id,
        profiles (
          first_name,
          last_name
        )
      )
    `)
    .eq('received_by', user?.id)
    .gte('payment_date', startOfToday.toISOString())
    .order('payment_date', { ascending: false })

  const totalCollectedToday = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0

  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Group by payment method
  const methodTotals: Record<string, number> = {}
  payments?.forEach(p => {
    methodTotals[p.payment_method] = (methodTotals[p.payment_method] || 0) + Number(p.amount)
  })

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Daily Collection Report (Cashier Shift)
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        {/* Daily Summary Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Collected Today
            </h3>
            <p style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-success)' }}>
              {formatTZS(totalCollectedToday)}
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              Number of Transactions: <strong>{payments?.length || 0}</strong>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>Collected by Method</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.entries(methodTotals).map(([method, total]) => (
                <div key={method} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontWeight: 500 }}>{method}</span>
                  <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{formatTZS(total)}</span>
                </div>
              ))}
              {Object.keys(methodTotals).length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No payments collected today.</p>
              )}
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Today's Transaction Log
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Receipt No</th>
                <th style={{ padding: '1rem' }}>Student</th>
                <th style={{ padding: '1rem' }}>Method</th>
                <th style={{ padding: '1rem' }}>Amount Paid</th>
                <th style={{ padding: '1rem' }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {payments?.map((pay: any) => (
                <tr key={pay.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-secondary)' }}>{pay.receipt_number}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{pay.students?.profiles?.first_name} {pay.students?.profiles?.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ID: {pay.students?.student_id}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{pay.payment_method}</span>
                    {pay.reference_number && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Ref: {pay.reference_number}</div>}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-success)' }}>{formatTZS(pay.amount)}</td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {new Date(pay.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}

              {(!payments || payments.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No collections logged during your shift today.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
