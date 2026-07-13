import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function ChartOfAccountsPage() {
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
  const isAccountant = userRoles.includes('Accountant') || userRoles.includes('System Admin')

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('*')
    .order('code', { ascending: true })

  async function addAccountAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const code = formData.get('code') as string
    const name = formData.get('name') as string
    const account_type = formData.get('account_type') as string
    const normal_balance = formData.get('normal_balance') as string

    if (!code || !name || !account_type || !normal_balance) return

    await supabase.from('chart_of_accounts').insert({
      code,
      name,
      account_type,
      normal_balance,
      is_system: false,
      is_active: true
    })

    revalidatePath('/dashboard/accountant/accounting/coa')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Chart of Accounts</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isAccountant ? '1fr 300px' : '1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Account List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Code</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Account Name</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Type</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Normal Balance</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>System</th>
              </tr>
            </thead>
            <tbody>
              {(accounts || []).map((acc) => (
                <tr key={acc.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{acc.code}</td>
                  <td style={{ padding: '1rem' }}>{acc.name}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.8rem',
                      backgroundColor: 
                        acc.account_type === 'ASSET' ? 'rgba(59, 179, 195, 0.1)' :
                        acc.account_type === 'LIABILITY' ? 'rgba(239, 68, 68, 0.1)' :
                        acc.account_type === 'REVENUE' ? 'rgba(16, 185, 129, 0.1)' :
                        'rgba(0,0,0,0.05)',
                      color:
                        acc.account_type === 'ASSET' ? 'var(--color-primary)' :
                        acc.account_type === 'LIABILITY' ? 'var(--color-error)' :
                        acc.account_type === 'REVENUE' ? 'var(--color-success)' :
                        'var(--color-text)'
                    }}>
                      {acc.account_type}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>{acc.normal_balance}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    {acc.is_system ? '🔒' : ''}
                  </td>
                </tr>
              ))}
              {(!accounts || accounts.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No accounts found. Please run the database migration.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Account Form */}
        {isAccountant && (
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Add Account</h2>
            <form action={addAccountAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Account Code</label>
                <input type="text" name="code" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. 5220" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Account Name</label>
                <input type="text" name="name" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. Advertising Expense" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Type</label>
                <select name="account_type" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <option value="ASSET">ASSET</option>
                  <option value="LIABILITY">LIABILITY</option>
                  <option value="EQUITY">EQUITY</option>
                  <option value="REVENUE">REVENUE</option>
                  <option value="EXPENSE">EXPENSE</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Normal Balance</label>
                <select name="normal_balance" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <option value="DEBIT">DEBIT</option>
                  <option value="CREDIT">CREDIT</option>
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Add Account</button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
