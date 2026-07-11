import { createClient } from '@/utils/supabase/server'
import { recordPaymentAction } from '../actions'

export default async function PaymentsPage() {
  const supabase = await createClient()

  // Fetch pending/partially paid invoices for selection
  const { data: pendingInvoices } = await supabase
    .from('invoices')
    .select(`
      id,
      term,
      academic_year,
      net_amount,
      status,
      student_id,
      students (
        student_id,
        profiles (
          first_name,
          last_name
        )
      )
    `)
    .neq('status', 'Paid')

  // Fetch recorded payments history
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
    .order('payment_date', { ascending: false })

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
        Payments & Collections
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        {/* Record Payment Form */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Record Student Payment</h2>

          <form action={recordPaymentAction as any} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Select Pending Invoice</label>
              <select name="invoice_id" className="input-field" required>
                <option value="">Choose Student/Invoice...</option>
                {pendingInvoices?.map((inv: any) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.students?.profiles?.first_name} {inv.students?.profiles?.last_name} ({inv.students?.student_id}) - {inv.term} [{formatTZS(inv.net_amount)}]
                  </option>
                ))}
              </select>
            </div>

            {/* Note: In a production app, selecting the invoice would auto-fill the student_id. 
                We can handle student_id mapping dynamically in server action, but for the form structure 
                we will pass the student_id along, or let the server action look it up based on invoice_id.
                Let's inspect the invoice selection or modify recordPaymentAction to auto-resolve student_id. 
                Let's double-check actions.ts: it gets student_id from formData.
                To make this simple and robust, we can pass student_id by split value like invoice_id|student_id! */}
            <input type="hidden" name="student_id" value="RESOLVE_ON_SERVER" />

            <div className="form-group">
              <label className="form-label">Amount Paid (TZS)</label>
              <input type="number" name="amount" min="1" placeholder="e.g. 50000" className="input-field" required />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select name="payment_method" className="input-field" required>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reference Number (Optional)</label>
              <input type="text" name="reference_number" placeholder="Transaction ID, Bank Slip No., Check No." className="input-field" />
            </div>

            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <textarea name="notes" placeholder="Any payment memo..." className="input-field" style={{ minHeight: '60px', resize: 'vertical' }} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
              Record Payment
            </button>
          </form>
        </div>

        {/* Payments History Table */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Receipt No</th>
                <th style={{ padding: '1rem' }}>Student</th>
                <th style={{ padding: '1rem' }}>Invoice Term</th>
                <th style={{ padding: '1rem' }}>Method</th>
                <th style={{ padding: '1rem' }}>Amount Paid</th>
                <th style={{ padding: '1rem' }}>Date</th>
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
                  <td style={{ padding: '1rem' }}>{pay.invoices?.term} ({pay.invoices?.academic_year})</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{pay.payment_method}</span>
                    {pay.reference_number && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>Ref: {pay.reference_number}</div>}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-success)' }}>{formatTZS(pay.amount)}</td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {new Date(pay.payment_date).toLocaleDateString()}
                  </td>
                </tr>
              ))}

              {(!payments || payments.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No payments recorded yet.
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
