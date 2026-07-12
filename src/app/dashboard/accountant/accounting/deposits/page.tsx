import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function BankDepositsPage() {
  const supabase = await createClient()

  const { data: deposits } = await supabase
    .from('bank_deposits')
    .select(`
      *,
      bank_account:bank_account_id(code, name)
    `)
    .order('deposit_date', { ascending: false })

  const { data: bankAccounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name')
    .eq('account_sub_type', 'Bank')

  async function addDepositAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const deposit_date = formData.get('deposit_date') as string
    const amount = parseFloat(formData.get('amount') as string)
    const reference = formData.get('reference') as string
    const bank_account_id = formData.get('bank_account_id') as string

    if (!deposit_date || !amount || !bank_account_id) return

    // Insert deposit
    await supabase.from('bank_deposits').insert({
      deposit_date,
      amount,
      reference,
      bank_account_id,
      status: 'PENDING'
    })

    revalidatePath('/dashboard/accountant/accounting/deposits')
  }

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(val)
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Bank Deposits</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Deposits List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Date</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Reference</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Bank Account</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Amount</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(deposits || []).map((dep) => (
                <tr key={dep.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>{dep.deposit_date}</td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{dep.reference}</td>
                  <td style={{ padding: '1rem' }}>{dep.bank_account?.name}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{formatTZS(dep.amount)}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.8rem',
                      backgroundColor: dep.status === 'ALLOCATED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: dep.status === 'ALLOCATED' ? 'var(--color-success)' : 'var(--color-warning)'
                    }}>
                      {dep.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!deposits || deposits.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No bank deposits found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Deposit Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Record Bank Deposit</h2>
          <form action={addDepositAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Deposit Date</label>
              <input type="date" name="deposit_date" required defaultValue={new Date().toISOString().slice(0, 10)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Reference / Slip No</label>
              <input type="text" name="reference" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. SLP-9923" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Bank Account</label>
              <select name="bank_account_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <option value="">Select Bank...</option>
                {(bankAccounts || []).map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Amount</label>
              <input type="number" step="0.01" name="amount" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="Amount..." />
            </div>
            
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Record Deposit</button>
          </form>
        </div>

      </div>
    </div>
  )
}
