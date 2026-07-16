import { createClient } from '@/utils/supabase/server'
import { applySalaryAdvanceAction } from '../../actions'

export default async function AdvancesPage() {
  const supabase = await createClient()

  // Fetch current user
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch salary configuration or default
  // Attempt to select from salaries table (we will assume it's created or fallback safely)
  let netSalary = 1500000 // Default fallback TZS
  try {
    const { data: sal } = await supabase
      .from('salaries')
      .select('basic_pay')
      .eq('employee_id', user?.id)
      .maybeSingle()
    if (sal) {
      netSalary = Number(sal.basic_pay)
    }
  } catch (e) {
    // Ignore and use fallback
  }

  const maxAdvanceAllowed = netSalary * 0.50

  // Fetch salary advance history
  const { data: advances } = await supabase
    .from('salary_advances')
    .select('*')
    .eq('employee_id', user?.id)
    .order('created_at', { ascending: false })

  // Find any active advance
  const activeAdvance = advances?.find(a => ['Approved', 'Disbursed'].includes(a.status))
  const pendingAdvance = advances?.find(a => a.status === 'Pending')

  // Calculate repayments for active advance
  let repayments = []
  let totalRepaid = 0
  if (activeAdvance) {
    const { data: rep } = await supabase
      .from('advance_repayments')
      .select('*')
      .eq('advance_id', activeAdvance.id)
    repayments = rep || []
    totalRepaid = repayments.reduce((sum, r) => sum + Number(r.amount), 0)
  }

  const outstandingBalance = activeAdvance ? (Number(activeAdvance.amount_approved || activeAdvance.amount_requested) - totalRepaid) : 0

  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        My Salary Advance requests
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        {/* Application Form & Rules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Active Balance Indicator */}
          {activeAdvance && (
            <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', borderLeft: '6px solid var(--color-secondary)' }}>
              <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Active Advance Balance</h3>
              <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
                {formatTZS(outstandingBalance)} / {formatTZS(activeAdvance.amount_approved || activeAdvance.amount_requested)}
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Status: <strong style={{ color: 'var(--color-success)' }}>{activeAdvance.status}</strong> • Term: {activeAdvance.repayment_period_months} months
              </div>
            </div>
          )}

          {/* Form */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Request Salary Advance</h2>

            {activeAdvance || pendingAdvance ? (
              <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', border: '1px solid var(--color-error)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-error)' }}>
                {pendingAdvance ? (
                  <span>You currently have a salary advance request awaiting review. You cannot submit another request.</span>
                ) : (
                  <span>You have an outstanding active advance. Applications are blocked until the balance is fully repaid.</span>
                )}
              </div>
            ) : (
              <form action={applySalaryAdvanceAction as any} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 179, 195, 0.05)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Your Current Net Salary: <strong>{formatTZS(netSalary)}</strong><br />
                  Maximum Advance Allowed (50%): <strong>{formatTZS(maxAdvanceAllowed)}</strong>
                </div>

                <div className="form-group">
                  <label className="form-label">Requested Amount (TZS)</label>
                  <input 
                    type="number" 
                    name="amount_requested" 
                    max={maxAdvanceAllowed} 
                    min="1" 
                    placeholder="e.g. 500000" 
                    className="input-field" 
                    required 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Preferred Repayment Period</label>
                  <select name="repayment_period_months" className="input-field" required>
                    <option value="1">1 Month (Next Payroll)</option>
                    <option value="2">2 Months</option>
                    <option value="3">3 Months</option>
                    <option value="4">4 Months</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <textarea name="reason" placeholder="State reason for advance request..." className="input-field" style={{ minHeight: '60px', resize: 'vertical' }} required />
                </div>

                <div className="form-group">
                  <label className="form-label">Supporting Document URL</label>
                  <input type="text" name="supporting_document_url" placeholder="Optional invoice/medical slip link" className="input-field" />
                </div>

                <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem', marginTop: '0.5rem' }}>
                  Request Advance
                </button>
              </form>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Advance Applications History
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Requested Amount</th>
                <th style={{ padding: '1rem' }}>Approved Amount</th>
                <th style={{ padding: '1rem' }}>Period</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem' }}>Requested Date</th>
              </tr>
            </thead>
            <tbody>
              {advances?.map((adv: any) => (
                <tr key={adv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{formatTZS(adv.amount_requested)}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                    {adv.amount_approved ? formatTZS(adv.amount_approved) : 'Pending'}
                  </td>
                  <td style={{ padding: '1rem' }}>{adv.repayment_period_months} months</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 
                        adv.status === 'Fully Repaid' || adv.status === 'Disbursed' ? 'rgba(16, 185, 129, 0.1)' : 
                        adv.status === 'Pending' || adv.status === 'Approved' ? 'rgba(247, 178, 57, 0.1)' : 
                        'rgba(239, 68, 68, 0.1)',
                      color: 
                        adv.status === 'Fully Repaid' || adv.status === 'Disbursed' ? 'var(--color-success)' : 
                        adv.status === 'Pending' || adv.status === 'Approved' ? 'var(--color-accent)' : 
                        'var(--color-error)'
                    }}>
                      {adv.status}
                    </span>
                    {adv.reviewer_notes && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        Note: {adv.reviewer_notes}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {new Date(adv.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {(!advances || advances.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No advance requests submitted yet.
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
