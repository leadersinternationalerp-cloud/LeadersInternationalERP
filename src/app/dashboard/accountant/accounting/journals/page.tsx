import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { AccountingService } from '@/lib/accounting/AccountingService'

export default async function ManualJournalsPage() {
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

  const isAccountant = userRoles.includes('Accountant') || userRoles.includes('System Admin')

  const { data: journals } = await supabase
    .from('journal_entries')
    .select(`
      *,
      journal_entry_lines (
        id, debit_amount, credit_amount, description,
        chart_of_accounts ( code, name )
      )
    `)
    .order('posting_date', { ascending: false })
    .limit(50)

  const { data: accounts } = await supabase
    .from('chart_of_accounts')
    .select('code, name')
    .order('code', { ascending: true })

  async function postManualJournalAction(formData: FormData) {
    'use server'
    const reference = formData.get('reference') as string
    const description = formData.get('description') as string
    const posting_date = formData.get('posting_date') as string
    
    // We assume 2 lines for simplicity in this basic UI.
    // Real implementation would use dynamic client-side forms.
    const acc1 = formData.get('account1') as string
    const dr1 = parseFloat(formData.get('debit1') as string) || 0
    const cr1 = parseFloat(formData.get('credit1') as string) || 0
    
    const acc2 = formData.get('account2') as string
    const dr2 = parseFloat(formData.get('debit2') as string) || 0
    const cr2 = parseFloat(formData.get('credit2') as string) || 0

    if (!reference || !posting_date || !acc1 || !acc2) return

    try {
      await AccountingService.postEntry(
        reference,
        'MANUAL',
        description,
        posting_date,
        [
          { accountCode: acc1, debitAmount: dr1, creditAmount: cr1 },
          { accountCode: acc2, debitAmount: dr2, creditAmount: cr2 }
        ]
      )
      revalidatePath('/dashboard/accountant/accounting/journals')
    } catch (err) {
      console.error('Manual journal error:', err)
      // Normally we'd return { error: err.message } and show it via useFormState
    }
  }

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(val)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Journal Entries</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isAccountant ? '1fr 350px' : '1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Journals List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {(journals || []).map((journal) => (
            <div key={journal.id} className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ fontSize: '1.1rem' }}>{journal.reference}</strong>
                  <span style={{ marginLeft: '1rem', color: 'var(--color-text-muted)' }}>{journal.posting_date}</span>
                </div>
                <div>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '1rem', 
                    fontSize: '0.8rem',
                    backgroundColor: journal.status === 'POSTED' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(0,0,0,0.05)',
                    color: journal.status === 'POSTED' ? 'var(--color-success)' : 'var(--color-text)'
                  }}>
                    {journal.status}
                  </span>
                </div>
              </div>
              <div style={{ padding: '1rem' }}>
                <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>{journal.description}</p>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                      <th style={{ textAlign: 'left', paddingBottom: '0.5rem' }}>Account</th>
                      <th style={{ textAlign: 'right', paddingBottom: '0.5rem' }}>Debit</th>
                      <th style={{ textAlign: 'right', paddingBottom: '0.5rem' }}>Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(journal.journal_entry_lines || []).map((line: any) => (
                      <tr key={line.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.5rem 0' }}>{line.chart_of_accounts?.code} - {line.chart_of_accounts?.name}</td>
                        <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>{line.debit_amount > 0 ? formatTZS(line.debit_amount) : ''}</td>
                        <td style={{ textAlign: 'right', padding: '0.5rem 0' }}>{line.credit_amount > 0 ? formatTZS(line.credit_amount) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {(!journals || journals.length === 0) && (
            <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-lg)' }}>
              No journal entries found.
            </div>
          )}
        </div>

        {/* Post Manual Journal Form */}
        {isAccountant && (
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Post Manual Journal</h2>
            <form action={postManualJournalAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Reference</label>
                <input type="text" name="reference" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. ADJ-001" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Date</label>
                <input type="date" name="posting_date" required defaultValue={new Date().toISOString().slice(0, 10)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Description</label>
                <textarea name="description" rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="Journal description..."></textarea>
              </div>
              
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Line 1 (Debit)</h3>
                <select name="account1" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                  <option value="">Select Account...</option>
                  {(accounts || []).map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" step="0.01" name="debit1" placeholder="Debit Amt" style={{ width: '50%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                  <input type="number" step="0.01" name="credit1" placeholder="Credit Amt" style={{ width: '50%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>Line 2 (Credit)</h3>
                <select name="account2" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '0.5rem' }}>
                  <option value="">Select Account...</option>
                  {(accounts || []).map(a => <option key={a.code} value={a.code}>{a.code} - {a.name}</option>)}
                </select>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" step="0.01" name="debit2" placeholder="Debit Amt" style={{ width: '50%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                  <input type="number" step="0.01" name="credit2" placeholder="Credit Amt" style={{ width: '50%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Post Journal</button>
            </form>
          </div>
        )}

      </div>
    </div>
  )
}
