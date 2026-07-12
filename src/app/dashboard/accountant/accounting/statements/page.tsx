import { createClient } from '@/utils/supabase/server'
import { TrialBalanceService } from '@/lib/accounting/TrialBalanceService'

export default async function FinancialStatementsPage() {
  const supabase = await createClient()

  // Verify Accountant/Director access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()
  
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Accountant') && !userRoles.includes('Director') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  // Ensure tables exist or fail gracefully
  let tb: any[] = []
  let pl = { revenue: [], expenses: [], totalRevenue: 0, totalExpenses: 0, netIncome: 0 }
  let bs = { assets: [], liabilities: [], equity: [], totalAssets: 0, totalLiabilities: 0, totalEquity: 0 }
  let errorMsg = null

  try {
    tb = await TrialBalanceService.getTrialBalance()
    pl = await TrialBalanceService.getProfitAndLoss()
    bs = await TrialBalanceService.getBalanceSheet()
  } catch (err: any) {
    errorMsg = err.message
  }

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
          Financial Statements
        </h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-secondary" style={{ textDecoration: 'none' }}>Export Excel</button>
          <button className="btn-primary" style={{ textDecoration: 'none' }}>Export PDF</button>
        </div>
      </div>

      {/* Date Filters */}
      <div className="glass-panel" style={{ padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Start Date</label>
          <input type="date" name="start_date" style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>End Date</label>
          <input type="date" name="end_date" style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
        </div>
        <div>
          <button className="btn-secondary" style={{ padding: '0.5rem 1rem' }}>Apply Filters</button>
        </div>
      </div>

      {errorMsg ? (
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
          <p><strong>Error loading statements:</strong> {errorMsg}</p>
          <p>Please ensure you have run the accounting database migration.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          
          {/* PROFIT & LOSS */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem' }}>Profit & Loss</h2>
            
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-success)', marginTop: '1rem' }}>Revenue</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
              <tbody>
                {pl.revenue.map((acc: any) => (
                  <tr key={acc.account_id}>
                    <td style={{ padding: '0.5rem 0' }}>{acc.account_code} - {acc.account_name}</td>
                    <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>{formatTZS(acc.balance)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Total Revenue</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem 0', fontWeight: 'bold', color: 'var(--color-success)' }}>{formatTZS(pl.totalRevenue)}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-error)', marginTop: '1rem' }}>Expenses</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
              <tbody>
                {pl.expenses.map((acc: any) => (
                  <tr key={acc.account_id}>
                    <td style={{ padding: '0.5rem 0' }}>{acc.account_code} - {acc.account_name}</td>
                    <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>{formatTZS(acc.balance)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Total Expenses</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem 0', fontWeight: 'bold', color: 'var(--color-error)' }}>{formatTZS(pl.totalExpenses)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: pl.netIncome >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)', fontWeight: 'bold', fontSize: '1.2rem' }}>
              <span>Net Income</span>
              <span style={{ color: pl.netIncome >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{formatTZS(pl.netIncome)}</span>
            </div>
          </div>

          {/* BALANCE SHEET */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem' }}>Balance Sheet</h2>
            
            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', marginTop: '1rem' }}>Assets</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
              <tbody>
                {bs.assets.map((acc: any) => (
                  <tr key={acc.account_id}>
                    <td style={{ padding: '0.5rem 0' }}>{acc.account_code} - {acc.account_name}</td>
                    <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>{formatTZS(acc.balance)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Total Assets</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem 0', fontWeight: 'bold', color: 'var(--color-primary)' }}>{formatTZS(bs.totalAssets)}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-error)', marginTop: '1rem' }}>Liabilities</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
              <tbody>
                {bs.liabilities.map((acc: any) => (
                  <tr key={acc.account_id}>
                    <td style={{ padding: '0.5rem 0' }}>{acc.account_code} - {acc.account_name}</td>
                    <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>{formatTZS(acc.balance)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Total Liabilities</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem 0', fontWeight: 'bold', color: 'var(--color-error)' }}>{formatTZS(bs.totalLiabilities)}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-success)', marginTop: '1rem' }}>Equity</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
              <tbody>
                {bs.equity.map((acc: any) => (
                  <tr key={acc.account_id}>
                    <td style={{ padding: '0.5rem 0' }}>{acc.account_code} - {acc.account_name}</td>
                    <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>{formatTZS(acc.balance)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ padding: '0.5rem 0' }}>Retained Earnings (Net Income)</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>{formatTZS(pl.netIncome)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>Total Equity</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem 0', fontWeight: 'bold', color: 'var(--color-success)' }}>{formatTZS(bs.totalEquity)}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'rgba(0, 0, 0, 0.05)', borderRadius: 'var(--radius-md)', fontWeight: 'bold', fontSize: '1.2rem', marginTop: '1rem' }}>
              <span>Total Liabilities & Equity</span>
              <span>{formatTZS(bs.totalLiabilities + bs.totalEquity)}</span>
            </div>
            {bs.totalAssets !== (bs.totalLiabilities + bs.totalEquity) && (
              <p style={{ color: 'var(--color-error)', marginTop: '0.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
                Warning: Balance Sheet does not balance (Diff: {formatTZS(bs.totalAssets - (bs.totalLiabilities + bs.totalEquity))})
              </p>
            )}
          </div>

          {/* TRIAL BALANCE */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem' }}>Trial Balance</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--color-text-muted)' }}>Account</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--color-text-muted)' }}>Type</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-text-muted)' }}>Debit</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-text-muted)' }}>Credit</th>
                </tr>
              </thead>
              <tbody>
                {tb.map((acc: any) => (
                  <tr key={acc.account_id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.5rem' }}>{acc.account_code} - {acc.account_name}</td>
                    <td style={{ padding: '0.5rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{acc.account_type}</td>
                    <td style={{ textAlign: 'right', padding: '0.5rem', color: acc.balance > 0 && acc.normal_balance === 'DEBIT' ? 'var(--color-text)' : 'transparent' }}>
                      {acc.normal_balance === 'DEBIT' && acc.balance > 0 ? formatTZS(acc.balance) : (acc.normal_balance === 'CREDIT' && acc.balance < 0 ? formatTZS(Math.abs(acc.balance)) : '-')}
                    </td>
                    <td style={{ textAlign: 'right', padding: '0.5rem', color: acc.balance > 0 && acc.normal_balance === 'CREDIT' ? 'var(--color-text)' : 'transparent' }}>
                      {acc.normal_balance === 'CREDIT' && acc.balance > 0 ? formatTZS(acc.balance) : (acc.normal_balance === 'DEBIT' && acc.balance < 0 ? formatTZS(Math.abs(acc.balance)) : '-')}
                    </td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 'bold' }}>
                  <td colSpan={2} style={{ padding: '0.5rem' }}>Total</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem' }}>{formatTZS(tb.filter((a: any) => a.normal_balance === 'DEBIT').reduce((s: number, a: any) => s + Math.max(0, a.balance), 0) + tb.filter((a: any) => a.normal_balance === 'CREDIT').reduce((s: number, a: any) => s + Math.max(0, -a.balance), 0))}</td>
                  <td style={{ textAlign: 'right', padding: '0.5rem' }}>{formatTZS(tb.filter((a: any) => a.normal_balance === 'CREDIT').reduce((s: number, a: any) => s + Math.max(0, a.balance), 0) + tb.filter((a: any) => a.normal_balance === 'DEBIT').reduce((s: number, a: any) => s + Math.max(0, -a.balance), 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* BUDGET VS ACTUAL */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.5rem' }}>Budget vs Actual (Expenditure)</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--color-text-muted)' }}>Expense Account</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-text-muted)' }}>Budget</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-text-muted)' }}>Actual</th>
                  <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--color-text-muted)' }}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {pl.expenses.map((acc: any) => {
                  // MVP Simulation: Assuming a fixed budget for MVP until Budget tables are fully seeded
                  const mockBudget = acc.balance * 1.15; // 15% padding
                  const variance = mockBudget - acc.balance;
                  return (
                    <tr key={`bud-${acc.account_id}`} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.5rem' }}>{acc.account_code} - {acc.account_name}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem' }}>{formatTZS(mockBudget)}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem' }}>{formatTZS(acc.balance)}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: variance >= 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 }}>
                        {formatTZS(variance)}
                      </td>
                    </tr>
                  )
                })}
                {pl.expenses.length === 0 && (
                   <tr>
                     <td colSpan={4} style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No expense data available for comparison.</td>
                   </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}
    </div>
  )
}
