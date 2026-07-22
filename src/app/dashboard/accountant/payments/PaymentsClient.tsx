'use client'

import { useState } from 'react'
import { Info, Printer, FileDown, MessageSquare, Eye } from 'lucide-react'
import { recordPaymentAction } from '../actions'

interface PaymentsClientProps {
  initialPayments: any[]
  pendingInvoices: any[]
}

export default function PaymentsClient({
  initialPayments,
  pendingInvoices
}: PaymentsClientProps) {
  const [payments, setPayments] = useState<any[]>(initialPayments)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // WhatsApp Modal State
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null)
  const [whatsappNumber, setWhatsappNumber] = useState('')

  // Format currency helper
  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Handle Recording Payment
  async function handleRecordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await recordPaymentAction(formData)
      if (res.error) {
        setFormError(res.error)
      } else {
        e.currentTarget.reset()
        window.location.reload() // Clean refresh
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to record payment')
    } finally {
      setSaving(false)
    }
  }

  // Open PDF for viewing/printing
  function handleViewPDF(payId: string) {
    window.open(`/api/accountant/payments/pdf?payment_id=${payId}`, '_blank')
  }

  // Trigger Send WhatsApp modal
  function triggerWhatsappShare(pay: any) {
    setSelectedPayment(pay)
    setIsWhatsappModalOpen(true)
  }

  // Send Receipt to WhatsApp
  function handleSendWhatsapp() {
    if (!selectedPayment) return
    if (!whatsappNumber.trim()) {
      alert('Please enter a WhatsApp phone number')
      return
    }

    // Clean phone number (remove +, spaces, leading zeros if with country code)
    let cleanPhone = whatsappNumber.replace(/[+\s-]/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '255' + cleanPhone.substring(1)
    }

    const pay = selectedPayment
    const studentName = `${pay.students?.profiles?.first_name} ${pay.students?.profiles?.last_name}`
    const recNo = pay.receipt_number.split('-').pop() || pay.receipt_number

    // Compose receipt WhatsApp text
    const headerStr = `*LEADERS INTERNATIONAL SCHOOL*\n*OFFICIAL PAYMENT RECEIPT*\n\n`
    const bodyStr = `*Receipt No:* REC-${recNo}\n*Date:* ${new Date(pay.payment_date).toLocaleDateString()}\n*Student Name:* ${studentName}\n*Admission No:* ${pay.students?.student_id || pay.students?.admission_number}\n*Payment Method:* ${pay.payment_method}\n*Total Paid:* ${formatTZS(pay.amount).replace('TZS', 'TZS ')}\n`
    
    const pdfUrl = `${window.location.origin}/api/accountant/payments/pdf?payment_id=${pay.id}`
    const downloadStr = `\nDownload your official Receipt PDF here:\n${pdfUrl}`

    const finalMessage = encodeURIComponent(headerStr + bodyStr + downloadStr)
    window.open(`https://wa.me/${cleanPhone}?text=${finalMessage}`, '_blank')
    setIsWhatsappModalOpen(false)
    setSelectedPayment(null)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr', gap: '2rem', alignItems: 'start' }}>
      
      {/* Record Payment Form */}
      <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>Record Student Payment</h2>

        <form onSubmit={handleRecordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Select Pending Invoice</label>
            <select name="invoice_id" className="input-field" required>
              <option value="">Choose Student/Invoice...</option>
              {pendingInvoices?.map((inv: any) => (
                <option key={inv.id} value={inv.id}>
                  {inv.students?.profiles?.first_name} {inv.students?.profiles?.last_name} ({inv.students?.student_id || inv.students?.admission_number}) - {inv.term} [{formatTZS(inv.net_amount)}]
                </option>
              ))}
            </select>
          </div>

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

          {formError && (
            <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', fontSize: '0.85rem' }}>
              {formError}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
            {saving ? 'Recording Payment...' : 'Record Payment'}
          </button>
        </form>
      </div>

      {/* Payments History Table */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Receipt No</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Student</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Invoice Term</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Method</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Amount Paid</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem' }}>Date</th>
              <th style={{ padding: '1rem', fontSize: '0.85rem', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments?.map((pay: any) => (
              <tr key={pay.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-secondary)' }}>
                  REC-{pay.receipt_number.split('-').pop() || pay.receipt_number}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 600 }}>{pay.students?.profiles?.first_name} {pay.students?.profiles?.last_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ID: {pay.students?.student_id || pay.students?.admission_number}</div>
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
                <td style={{ padding: '1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => handleViewPDF(pay.id)}
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      title="View / Print PDF"
                    >
                      <Eye size={13} />
                      View
                    </button>
                    <button
                      onClick={() => triggerWhatsappShare(pay)}
                      className="btn btn-secondary"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.35rem 0.65rem', fontSize: '0.75rem', backgroundColor: '#25D366', color: '#ffffff', borderColor: '#25D366' }}
                      title="Send via WhatsApp"
                    >
                      <MessageSquare size={13} />
                      WhatsApp
                    </button>
                  </div>
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

      {/* WhatsApp Recipient Modal */}
      {isWhatsappModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.4)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)', maxWidth: '400px', width: '90%' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#00264b' }}>
              Send Receipt via WhatsApp
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.25rem' }}>
              Enter the recipient's phone number including country code (e.g. 255712345678 for Tanzania).
            </p>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. 255712345678"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setIsWhatsappModalOpen(false)
                  setSelectedPayment(null)
                }}
                className="btn"
                style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--color-text)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendWhatsapp}
                className="btn btn-primary"
                style={{ backgroundColor: '#25D366', color: '#ffffff', borderColor: '#25D366' }}
              >
                Send Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
