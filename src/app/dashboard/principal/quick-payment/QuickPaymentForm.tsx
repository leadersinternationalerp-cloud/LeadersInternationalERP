'use client'

import { useState } from 'react'
import { recordPaymentAction } from '../../accountant/actions'

export default function QuickPaymentForm({ pendingInvoices }: { pendingInvoices: any[] }) {
  const [search, setSearch] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [receipt, setReceipt] = useState<any | null>(null)

  function formatTZS(num: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num)
  }

  // Filter invoices based on student name or student_id
  const filteredInvoices = pendingInvoices?.filter((inv: any) => {
    const fullName = `${inv.students?.profiles?.first_name} ${inv.students?.profiles?.last_name}`.toLowerCase()
    const id = (inv.students?.student_id || '').toLowerCase()
    return fullName.includes(search.toLowerCase()) || id.includes(search.toLowerCase())
  }) || []

  function selectInvoice(inv: any) {
    setSelectedInvoice(inv)
    setAmount(String(inv.net_amount)) // Default to paying full remaining balance
    setError(null)
    setReceipt(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedInvoice) return
    setIsSubmitting(true)
    setError(null)

    const formData = new FormData()
    formData.append('invoice_id', selectedInvoice.id)
    formData.append('student_id', 'RESOLVE_ON_SERVER')
    formData.append('amount', amount)
    formData.append('payment_method', paymentMethod)
    formData.append('reference_number', reference)
    formData.append('notes', notes)

    const res = await recordPaymentAction(formData)
    setIsSubmitting(false)

    if (res.error) {
      setError(res.error)
    } else {
      // Set receipt data for rendering
      setReceipt({
        receipt_number: res.receipt_number,
        student_name: `${selectedInvoice.students?.profiles?.first_name} ${selectedInvoice.students?.profiles?.last_name}`,
        student_id: selectedInvoice.students?.student_id,
        invoice_term: selectedInvoice.term,
        invoice_year: selectedInvoice.academic_year,
        amount_paid: Number(amount),
        payment_method: paymentMethod,
        reference_number: reference,
        date: new Date().toLocaleDateString()
      })

      // Reset form
      setSelectedInvoice(null)
      setAmount('')
      setReference('')
      setNotes('')
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }}>
      {/* Search & Selection */}
      <div>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ marginBottom: '0.5rem', display: 'block' }}>Search Student</label>
          <input
            type="text"
            placeholder="Type name or Student ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
          />
        </div>

        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', maxHeight: '400px', overflowY: 'auto' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Pending Invoices ({filteredInvoices.length})
          </div>
          {filteredInvoices.map((inv: any) => (
            <div
              key={inv.id}
              onClick={() => selectInvoice(inv)}
              style={{
                padding: '1rem',
                borderBottom: '1px solid var(--color-border)',
                cursor: 'pointer',
                backgroundColor: selectedInvoice?.id === inv.id ? 'rgba(59, 179, 195, 0.1)' : 'transparent',
                transition: 'background-color 200ms'
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                {inv.students?.profiles?.first_name} {inv.students?.profiles?.last_name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                <span>ID: {inv.students?.student_id}</span>
                <span>{inv.term}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontWeight: 600 }}>
                <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)' }}>
                  {inv.status}
                </span>
                <span style={{ color: 'var(--color-secondary)' }}>{formatTZS(inv.net_amount)}</span>
              </div>
            </div>
          ))}

          {filteredInvoices.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No pending invoices found matching "{search}".
            </div>
          )}
        </div>
      </div>

      {/* Payment Entry Form & Receipt */}
      <div>
        {error && <div className="auth-error" style={{ marginBottom: '1.5rem' }}>{error}</div>}

        {selectedInvoice ? (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
              Quick Payment Details
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Student Name:</span>
                <div style={{ fontWeight: 600 }}>{selectedInvoice.students?.profiles?.first_name} {selectedInvoice.students?.profiles?.last_name}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Student ID:</span>
                <div style={{ fontWeight: 600 }}>{selectedInvoice.students?.student_id}</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Invoice Term:</span>
                <div style={{ fontWeight: 600 }}>{selectedInvoice.term} ({selectedInvoice.academic_year})</div>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Remaining Balance:</span>
                <div style={{ fontWeight: 600, color: 'var(--color-error)' }}>{formatTZS(selectedInvoice.net_amount)}</div>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label className="form-label">Payment Amount (TZS)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field"
                  min="1"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="input-field"
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="Mobile Money">Mobile Money</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Reference Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. mobile cash transaction code, bank reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="input-field"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes (Optional)</label>
                <textarea
                  placeholder="Memo..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field"
                  style={{ minHeight: '50px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="btn"
                  style={{ flex: 1, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ flex: 2 }}
                >
                  {isSubmitting ? 'Recording...' : 'Submit Payment'}
                </button>
              </div>
            </form>
          </div>
        ) : receipt ? (
          /* Receipt Print Preview */
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--color-secondary)' }}>
            <div id="printable-receipt" style={{ padding: '1rem', fontFamily: 'monospace', color: '#000', backgroundColor: '#fff', borderRadius: '4px' }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
                <h2 style={{ margin: '0 0 0.25rem 0', color: '#000', fontFamily: 'monospace' }}>LEADERS INTERNATIONAL</h2>
                <div style={{ fontSize: '0.8rem' }}>School ERP System Receipt</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginTop: '0.5rem' }}>{receipt.receipt_number}</div>
              </div>

              <table style={{ width: '100%', fontSize: '0.9rem', borderCollapse: 'collapse', marginBottom: '1.5rem' }}>
                <tbody>
                  <tr>
                    <td style={{ padding: '0.25rem 0', color: '#555' }}>Student:</td>
                    <td style={{ padding: '0.25rem 0', textAlign: 'right', fontWeight: 'bold' }}>{receipt.student_name}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.25rem 0', color: '#555' }}>Student ID:</td>
                    <td style={{ padding: '0.25rem 0', textAlign: 'right' }}>{receipt.student_id}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.25rem 0', color: '#555' }}>Billing Term:</td>
                    <td style={{ padding: '0.25rem 0', textAlign: 'right' }}>{receipt.invoice_term} ({receipt.invoice_year})</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '0.25rem 0', color: '#555' }}>Method:</td>
                    <td style={{ padding: '0.25rem 0', textAlign: 'right' }}>{receipt.payment_method}</td>
                  </tr>
                  {receipt.reference_number && (
                    <tr>
                      <td style={{ padding: '0.25rem 0', color: '#555' }}>Reference:</td>
                      <td style={{ padding: '0.25rem 0', textAlign: 'right' }}>{receipt.reference_number}</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: '1px solid #ccc' }}>
                    <td style={{ padding: '0.75rem 0 0.25rem 0', fontWeight: 'bold', fontSize: '1.1rem' }}>AMOUNT PAID:</td>
                    <td style={{ padding: '0.75rem 0 0.25rem 0', textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: 'green' }}>
                      {formatTZS(receipt.amount_paid)}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div style={{ textAlign: 'center', fontSize: '0.75rem', borderTop: '1px solid #ccc', paddingTop: '1rem', color: '#777' }}>
                Thank you for your payment.<br />
                Date: {receipt.date}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setReceipt(null)}
                className="btn"
                style={{ flex: 1, background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
              >
                Dismiss
              </button>
              <button
                onClick={() => window.print()}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Print Receipt 🖨️
              </button>
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)', borderRadius: 'var(--radius-lg)' }}>
            <h3>No Student Selected</h3>
            <p style={{ marginTop: '0.5rem' }}>Choose a student from the pending list on the left to record a quick payment.</p>
          </div>
        )}
      </div>
    </div>
  )
}
