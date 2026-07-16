import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function BankReconciliationPage() {
  const supabase = await createClient()

  // Verify Accountant/Admin access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user?.id).single()
  const userRoles = profile?.roles || []

  if (!userRoles.includes('Accountant') && !userRoles.includes('System Admin') && !userRoles.includes('Director')) {
    return <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}><h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2></div>
  }

  const isAccountant = userRoles.includes('Accountant') || userRoles.includes('System Admin')

  // Fetch pending and reconciled bank statements
  const { data: reconciliations } = await supabase
    .from('bank_reconciliations')
    .select(`
      *,
      reconciler:reconciled_by(first_name, last_name)
    `)
    .order('statement_date', { ascending: false })

  async function createDraftAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const bank_account_id = formData.get('bank_account_id') as string
    const statement_date = formData.get('statement_date') as string
    const statement_balance = parseFloat(formData.get('statement_balance') as string)
    const system_balance = parseFloat(formData.get('system_balance') as string) // Normally auto-calculated

    if (!bank_account_id || !statement_date) return

    await supabase.from('bank_reconciliations').insert({
      bank_account_id,
      statement_date,
      statement_balance,
      system_balance,
      status: 'DRAFT'
    })

    revalidatePath('/dashboard/accountant/accounting/reconciliation')
  }

  async function markReconciledAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const id = formData.get('id') as string

    if (id) {
      await supabase.from('bank_reconciliations').update({
        status: 'RECONCILED',
        reconciled_by: user?.id,
        reconciled_at: new Date().toISOString()
      }).eq('id', id)
      revalidatePath('/dashboard/accountant/accounting/reconciliation')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Bank Reconciliation</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isAccountant ? '1fr 350px' : '1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Reconciliations List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Date</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Account</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Statement Bal</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>System Bal</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Difference</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Status</th>
                {isAccountant && <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {(reconciliations || []).map((recon) => (
                <tr key={recon.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{new Date(recon.statement_date).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem' }}>{recon.bank_account_id}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace' }}>{recon.statement_balance.toLocaleString()}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace' }}>{recon.system_balance.toLocaleString()}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', color: recon.difference === 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 }}>
                    {recon.difference.toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.8rem',
                      backgroundColor: recon.status === 'RECONCILED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: recon.status === 'RECONCILED' ? 'var(--color-success)' : 'var(--color-warning)'
                    }}>
                      {recon.status}
                    </span>
                  </td>
                  {isAccountant && (
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {recon.status === 'DRAFT' && recon.difference === 0 && (
                        <form action={markReconciledAction}>
                          <input type="hidden" name="id" value={recon.id} />
                          <button type="submit" className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', borderColor: 'var(--color-success)', color: 'var(--color-success)' }}>Reconcile</button>
                        </form>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {(!reconciliations || reconciliations.length === 0) && (
                <tr>
                  <td colSpan={isAccountant ? 7 : 6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No reconciliations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Create Draft Form */}
        {isAccountant && (
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Start Reconciliation</h2>
            <form action={createDraftAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Bank Account</label>
                <select name="bank_account_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <option value="CRDB Main Account">CRDB Main Account</option>
                  <option value="NMB Fees Account">NMB Fees Account</option>
                  <option value="M-Pesa Till">M-Pesa Till</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Statement Date</label>
                <input type="date" name="statement_date" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Statement Ending Balance</label>
                <input type="number" step="0.01" name="statement_balance" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>System Balance (Ledger)</label>
                <input type="number" step="0.01" name="system_balance" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
              
              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Compare & Draft</button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
