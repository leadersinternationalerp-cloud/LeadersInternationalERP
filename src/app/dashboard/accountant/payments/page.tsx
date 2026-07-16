import { createClient } from '@/utils/supabase/server'
import { recordPaymentAction } from '../actions'
import Link from 'next/link'
import PrintButton from '@/components/PrintButton'

export default async function PaymentsPage({
  searchParams
}: {
  searchParams: Promise<{ print_id?: string }>
}) {
  const supabase = await createClient()
  const params = await searchParams
  const printId = params.print_id

  let printPayment: any = null
  if (printId) {
    const { data } = await supabase
      .from('payments')
      .select(`
        *,
        invoices (term, academic_year, invoice_number),
        students (
          student_id,
          profiles (first_name, last_name)
        )
      `)
      .eq('id', printId)
      .single()
    printPayment = data
  }

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

  if (printPayment) {
    const studentName = `${printPayment.students?.profiles?.first_name} ${printPayment.students?.profiles?.last_name}`
    const invoiceNum = printPayment.invoices?.invoice_number || 'N/A'
    const invoicePeriod = `${printPayment.invoices?.term} (${printPayment.invoices?.academic_year})`

    return (
      <div>
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              background: white !important;
              color: black !important;
            }
            header, aside, footer, nav, button, .btn, .no-print {
              display: none !important;
            }
            body, main, #printable-receipt {
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              background: transparent !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            h2, h3, span, div, td, th, strong {
              color: black !important;
            }
          }
        ` }} />
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <Link href="/dashboard/accountant/payments" className="btn" style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}>
            ← Back to Payments
          </Link>
          <PrintButton label="Print Receipt 🖨️" className="btn btn-primary" />
        </div>

        <div className="glass-panel" id="printable-receipt" style={{ padding: '3rem', borderRadius: 'var(--radius-lg)', maxWidth: '700px', margin: '0 auto', border: '1px solid var(--color-border)', backgroundColor: '#fff', color: '#000' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid var(--color-primary)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--color-primary)' }}>LEADERS INTERNATIONAL SCHOOL</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>Official Payment Receipt Voucher</div>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2.5rem', fontSize: '0.95rem' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Student Name:</span>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', marginTop: '0.25rem' }}>{studentName}</div>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Student ID:</span>
              <div style={{ fontWeight: 600, fontSize: '1.1rem', marginTop: '0.25rem' }}>{printPayment.students?.student_id}</div>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Receipt Number:</span>
              <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{printPayment.receipt_number}</div>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Invoice Number:</span>
              <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{invoiceNum}</div>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Payment Date:</span>
              <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{new Date(printPayment.payment_date).toLocaleString('en-TZ')}</div>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Invoice Period:</span>
              <div style={{ fontWeight: 600, marginTop: '0.25rem' }}>{invoicePeriod}</div>
            </div>
          </div>

          {/* Payment Summary */}
          <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem', marginBottom: '2.5rem', backgroundColor: 'rgba(0,0,0,0.01)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              <span>Payment Method:</span>
              <strong style={{ textTransform: 'uppercase' }}>{printPayment.payment_method}</strong>
            </div>
            {printPayment.reference_number && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                <span>Reference Number:</span>
                <strong>{printPayment.reference_number}</strong>
              </div>
            )}
            {printPayment.notes && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
                <span>Memo/Notes:</span>
                <span style={{ color: 'var(--color-text-muted)' }}>{printPayment.notes}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '0.75rem', marginTop: '0.75rem', fontSize: '1.1rem', fontWeight: 700 }}>
              <span>Total Amount Paid:</span>
              <span style={{ color: 'var(--color-success)' }}>{formatTZS(Number(printPayment.amount))}</span>
            </div>
          </div>

          {/* Signatures */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '4rem', fontSize: '0.85rem' }}>
            <div>
              <div style={{ borderBottom: '1px dashed var(--color-text-muted)', height: '30px', width: '150px', marginBottom: '0.5rem' }}></div>
              <strong>Received By (Cashier)</strong>
            </div>
            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ borderBottom: '1px dashed var(--color-text-muted)', height: '30px', width: '150px', marginBottom: '0.5rem' }}></div>
              <strong>Payer Signature</strong>
            </div>
          </div>
        </div>
      </div>
    )
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
                <th style={{ padding: '1rem' }}>Action</th>
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
                  <td style={{ padding: '1rem' }}>
                    <Link href={`/dashboard/accountant/payments?print_id=${pay.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', textDecoration: 'none' }}>
                      🖨️ Receipt
                    </Link>
                  </td>
                </tr>
              ))}

              {(!payments || payments.length === 0) && (
                <tr>
                  <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
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
