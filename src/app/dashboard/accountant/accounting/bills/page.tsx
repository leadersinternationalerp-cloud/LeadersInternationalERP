import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export default async function VendorBillsPage() {
  const supabase = await createClient()

  const { data: bills } = await supabase
    .from('vendor_bills')
    .select(`
      *,
      expense_account:expense_account_id(code, name)
    `)
    .order('bill_date', { ascending: false })

  const { data: expenseAccounts } = await supabase
    .from('chart_of_accounts')
    .select('id, code, name')
    .eq('account_type', 'EXPENSE')

  async function addBillAction(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const vendor_name = formData.get('vendor_name') as string
    const invoice_number = formData.get('invoice_number') as string
    const bill_date = formData.get('bill_date') as string
    const due_date = formData.get('due_date') as string
    const amount = parseFloat(formData.get('amount') as string)
    const expense_account_id = formData.get('expense_account_id') as string
    const description = formData.get('description') as string

    if (!vendor_name || !bill_date || !amount || !expense_account_id) return

    await supabase.from('vendor_bills').insert({
      vendor_name,
      invoice_number,
      bill_date,
      due_date: due_date || null,
      amount,
      expense_account_id,
      description,
      status: 'DRAFT'
    })

    revalidatePath('/dashboard/accountant/accounting/bills')
  }

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', minimumFractionDigits: 0 }).format(val)
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Vendor Bills & Accounts Payable</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', alignItems: 'start' }}>
        
        {/* Bills List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Vendor</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Inv #</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Date</th>
                <th style={{ textAlign: 'left', padding: '1rem', fontWeight: 600 }}>Expense Account</th>
                <th style={{ textAlign: 'right', padding: '1rem', fontWeight: 600 }}>Amount</th>
                <th style={{ textAlign: 'center', padding: '1rem', fontWeight: 600 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(bills || []).map((bill) => (
                <tr key={bill.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{bill.vendor_name}</td>
                  <td style={{ padding: '1rem' }}>{bill.invoice_number}</td>
                  <td style={{ padding: '1rem' }}>{bill.bill_date}</td>
                  <td style={{ padding: '1rem' }}>{bill.expense_account?.name}</td>
                  <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{formatTZS(bill.amount)}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '1rem', 
                      fontSize: '0.8rem',
                      backgroundColor: bill.status === 'PAID' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: bill.status === 'PAID' ? 'var(--color-success)' : 'var(--color-error)'
                    }}>
                      {bill.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!bills || bills.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No vendor bills found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add Bill Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>Record Vendor Bill</h2>
          <form action={addBillAction} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Vendor Name</label>
              <input type="text" name="vendor_name" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="e.g. ABC Stationers" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ width: '50%' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Invoice #</label>
                <input type="text" name="invoice_number" style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
              <div style={{ width: '50%' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Bill Date</label>
                <input type="date" name="bill_date" required defaultValue={new Date().toISOString().slice(0, 10)} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Expense Account</label>
              <select name="expense_account_id" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <option value="">Select Account...</option>
                {(expenseAccounts || []).map(a => (
                  <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Total Amount</label>
              <input type="number" step="0.01" name="amount" required style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="Amount..." />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Description</label>
              <textarea name="description" rows={2} style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }} placeholder="What was purchased..."></textarea>
            </div>
            
            <button type="submit" className="btn-primary" style={{ marginTop: '0.5rem' }}>Record Bill</button>
          </form>
        </div>

      </div>
    </div>
  )
}
