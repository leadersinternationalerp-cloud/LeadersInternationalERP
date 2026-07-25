'use client'

import { useState, useRef, useEffect } from 'react'
import { Info, Printer, FileDown, MessageSquare, Eye, Search, Users, Check, AlertCircle, X } from 'lucide-react'
import { recordPaymentAction } from '../actions'

interface PaymentsClientProps {
  initialPayments: any[]
  pendingInvoices: any[]
  initialBankDeposits: any[]
}

export default function PaymentsClient({
  initialPayments,
  pendingInvoices,
  initialBankDeposits
}: PaymentsClientProps) {
  const [payments, setPayments] = useState<any[]>(initialPayments)
  const [bankDeposits, setBankDeposits] = useState<any[]>(initialBankDeposits)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Controlled form states
  const [amount, setAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [notes, setNotes] = useState('')

  // Search & Selector states
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null)
  
  // Family & allocation details
  const [familyInfo, setFamilyInfo] = useState<{
    parents: any[]
    siblings: any[]
  } | null>(null)
  const [loadingFamily, setLoadingFamily] = useState(false)
  const [selectedDeposit, setSelectedDeposit] = useState<any | null>(null)

  // WhatsApp Modal State
  const [isWhatsappModalOpen, setIsWhatsappModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null)
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false)

  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsSearching(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Format currency helper
  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Handle student selection
  async function selectInvoice(inv: any) {
    setSelectedInvoice(inv)
    setSearchQuery('')
    setIsSearching(false)
    
    // Fetch family info & matched deposits
    setLoadingFamily(true)
    try {
      const res = await fetch(`/api/accountant/payments/student-details?student_id=${inv.student_id}`)
      if (res.ok) {
        const data = await res.json()
        setFamilyInfo({
          parents: data.parents || [],
          siblings: data.siblings || []
        })
        // Update local bank deposits list with server matched status
        setBankDeposits(data.deposits || [])

        // If we already selected a deposit before choosing the student, check if it's in the list
        if (selectedDeposit) {
          const matchingDep = data.deposits.find((d: any) => d.id === selectedDeposit.id)
          if (matchingDep) {
            setSelectedDeposit(matchingDep)
          }
        }
      }
    } catch (err) {
      console.error('Error fetching family details:', err)
    } finally {
      setLoadingFamily(false)
    }
  }

  // Reset selected student and restore general pending deposits
  function clearSelectedInvoice() {
    setSelectedInvoice(null)
    setFamilyInfo(null)
    setBankDeposits(initialBankDeposits)
    // Clear selection if deposit was matched, but keep allocation if they want
  }

  // Allocate deposit to form fields
  function allocateDeposit(dep: any) {
    setSelectedDeposit(dep)
    setAmount(dep.amount.toString())
    setPaymentMethod('Bank Transfer')
    setReferenceNumber(dep.reference || '')
    setNotes(`Allocated from bank deposit: ${dep.reference || 'N/A'}`)
  }

  // Reset deposit allocation
  function clearAllocation() {
    setSelectedDeposit(null)
    setAmount('')
    setPaymentMethod('Cash')
    setReferenceNumber('')
    setNotes('')
  }

  // Handle Recording Payment
  async function handleRecordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedInvoice) {
      setFormError('Please search and select a student/invoice first.')
      return
    }

    setSaving(true)
    setFormError(null)
    const formData = new FormData(e.currentTarget)
    
    try {
      const res = await recordPaymentAction(formData)
      if (res.error) {
        setFormError(res.error)
      } else {
        // Reset states
        setSelectedInvoice(null)
        setFamilyInfo(null)
        setSelectedDeposit(null)
        setAmount('')
        setPaymentMethod('Cash')
        setReferenceNumber('')
        setNotes('')
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

  // Send Receipt to WhatsApp programmatically
  async function handleSendWhatsapp() {
    if (!selectedPayment) return
    if (!whatsappNumber.trim()) {
      alert('Please enter a WhatsApp phone number')
      return
    }

    setSendingWhatsapp(true)
    try {
      const res = await fetch('/api/whatsapp/send-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId: selectedPayment.id,
          phone: whatsappNumber.trim()
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send receipt')
      }

      alert('Receipt PDF successfully sent via WhatsApp!')
      setIsWhatsappModalOpen(false)
      setSelectedPayment(null)
      setWhatsappNumber('')
    } catch (err: any) {
      alert(err.message || 'An error occurred while sending the receipt.')
    } finally {
      setSendingWhatsapp(false)
    }
  }

  // Filter invoices based on search query
  const filteredInvoices = pendingInvoices.filter((inv: any) => {
    const s = inv.students
    const prof = s?.profiles
    const fullName = `${prof?.first_name || ''} ${prof?.last_name || ''}`.toLowerCase()
    const idStr = `${s?.student_id || s?.admission_number || ''}`.toLowerCase()
    const q = searchQuery.toLowerCase()
    return fullName.includes(q) || idStr.includes(q)
  })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '2rem', alignItems: 'start' }}>
      
      {/* LEFT COLUMN: Recording and Allocation Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Record Payment Form */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>Record Student Payment</h2>

          <form onSubmit={handleRecordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Student Search Select */}
            <div className="form-group" style={{ position: 'relative' }} ref={dropdownRef}>
              <label className="form-label" style={{ fontWeight: 600 }}>Select Student / Invoice</label>
              
              {!selectedInvoice ? (
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Search by name or admission number..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setIsSearching(true)
                    }}
                    onFocus={() => setIsSearching(true)}
                    style={{ paddingRight: '2rem' }}
                  />
                  <Search size={16} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', opacity: 0.7 }} />
                  
                  {isSearching && searchQuery.trim() !== '' && (
                    <div className="glass-panel" style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      maxHeight: '220px',
                      overflowY: 'auto',
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      marginTop: '0.25rem',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                    }}>
                      {filteredInvoices.map((inv: any) => {
                        const bal = Number(inv.net_amount) - (inv.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0)
                        return (
                          <div
                            key={inv.id}
                            onClick={() => selectInvoice(inv)}
                            style={{
                              padding: '0.75rem 1rem',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--color-border)',
                              transition: 'background-color 0.2s',
                            }}
                            className="hover-bg"
                          >
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                              {inv.students?.profiles?.first_name} {inv.students?.profiles?.last_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between', marginTop: '0.15rem' }}>
                              <span>Adm: {inv.students?.student_id || inv.students?.admission_number}</span>
                              <span style={{ fontWeight: 600, color: 'var(--color-secondary)' }}>{inv.term} (Bal: {formatTZS(bal)})</span>
                            </div>
                          </div>
                        )
                      })}
                      {filteredInvoices.length === 0 && (
                        <div style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>
                          No pending invoices found matching "{searchQuery}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{
                  padding: '1rem',
                  backgroundColor: 'rgba(59, 179, 195, 0.05)',
                  border: '1px solid var(--color-primary)',
                  borderRadius: 'var(--radius-md)',
                  position: 'relative'
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                    {selectedInvoice.students?.profiles?.first_name} {selectedInvoice.students?.profiles?.last_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                    Admission: {selectedInvoice.students?.student_id || selectedInvoice.students?.admission_number}
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-secondary)', marginTop: '0.2rem' }}>
                    Invoice Term: {selectedInvoice.term} [{formatTZS(selectedInvoice.net_amount)}]
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-error)', marginTop: '0.2rem' }}>
                    Outstanding Balance: {formatTZS(Number(selectedInvoice.net_amount) - (selectedInvoice.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount), 0))}
                  </div>
                  
                  <button
                    type="button"
                    onClick={clearSelectedInvoice}
                    style={{
                      position: 'absolute',
                      top: '0.5rem',
                      right: '0.5rem',
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-error)',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.25rem'
                    }}
                  >
                    Change Student
                  </button>
                </div>
              )}

              {/* Hidden Inputs for Form submission */}
              <input type="hidden" name="invoice_id" value={selectedInvoice?.id || ''} required />
              <input type="hidden" name="student_id" value={selectedInvoice?.student_id || ''} />
              <input type="hidden" name="bank_deposit_id" value={selectedDeposit?.id || ''} />
            </div>

            {/* Sibling and Parent Family Card */}
            {loadingFamily && (
              <div style={{ textAlign: 'center', padding: '0.5rem', color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                Fetching family details & matching deposits...
              </div>
            )}

            {familyInfo && !loadingFamily && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                padding: '0.85rem',
                backgroundColor: 'rgba(0, 0, 0, 0.02)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                fontSize: '0.8rem'
              }}>
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>👨‍👩‍👧‍👦 Associated Parents:</span>
                  {familyInfo.parents.length > 0 ? (
                    familyInfo.parents.map((p) => (
                      <div key={p.id} style={{ paddingLeft: '0.75rem', marginTop: '0.2rem', color: 'var(--color-text)' }}>
                        • {p.name} {p.phone ? `(${p.phone})` : p.email ? `(${p.email})` : ''}
                      </div>
                    ))
                  ) : (
                    <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', display: 'block', paddingLeft: '0.75rem' }}>No registered parents found</span>
                  )}
                </div>

                {familyInfo.siblings.length > 0 && (
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-muted)' }}>👧👦 Registered Siblings:</span>
                    {familyInfo.siblings.map((sib: any) => (
                      <div key={sib.id} style={{ paddingLeft: '0.75rem', marginTop: '0.2rem', color: 'var(--color-text)' }}>
                        • {sib.name} (Adm: {sib.admission_number})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Form Inputs */}
            <div className="form-group">
              <label className="form-label">Amount Paid (TZS)</label>
              <input
                type="number"
                name="amount"
                min="1"
                placeholder="e.g. 50000"
                className="input-field"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Payment Method</label>
              <select
                name="payment_method"
                className="input-field"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
              >
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Reference Number (Optional)</label>
              <input
                type="text"
                name="reference_number"
                placeholder="Transaction ID, Bank Slip No., Check No."
                className="input-field"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes (Optional)</label>
              <textarea
                name="notes"
                placeholder="Any payment memo..."
                className="input-field"
                style={{ minHeight: '60px', resize: 'vertical' }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {selectedDeposit && (
              <div style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(59, 179, 195, 0.1)',
                color: 'var(--color-primary)',
                fontSize: '0.8rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Linked to bank deposit: <strong>{selectedDeposit.reference}</strong></span>
                <button
                  type="button"
                  onClick={clearAllocation}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-error)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    fontWeight: 700
                  }}
                >
                  Unlink
                </button>
              </div>
            )}

            {selectedDeposit && !selectedInvoice && (
              <div style={{
                padding: '0.65rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                color: '#d97706',
                fontSize: '0.75rem',
                display: 'flex',
                gap: '0.4rem',
                alignItems: 'center',
                fontWeight: 500
              }}>
                <AlertCircle size={14} />
                <span>Select a student/invoice above to complete allocation.</span>
              </div>
            )}

            {formError && (
              <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', fontSize: '0.85rem' }}>
                {formError}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={saving || (!selectedInvoice)} style={{ padding: '0.75rem', marginTop: '0.5rem' }}>
              {saving ? 'Recording Payment...' : 'Record Payment'}
            </button>
          </form>
        </div>

        {/* PENDING BANK DEPOSITS QUEUE */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Pending Bank Deposits</h3>
            {selectedDeposit && (
              <button
                type="button"
                onClick={clearAllocation}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-error)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                Clear Allocation
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '380px', overflowY: 'auto', paddingRight: '0.25rem' }}>
            {bankDeposits.map((dep: any) => {
              const isSelected = selectedDeposit?.id === dep.id
              return (
                <div
                  key={dep.id}
                  style={{
                    padding: '0.85rem',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected
                      ? '2px solid var(--color-primary)'
                      : dep.matched
                        ? '1.5px dashed #25D366'
                        : '1px solid var(--color-border)',
                    backgroundColor: isSelected
                      ? 'rgba(59, 179, 195, 0.08)'
                      : dep.matched
                        ? 'rgba(37, 211, 102, 0.03)'
                        : 'var(--color-surface)',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-secondary)' }}>
                      {formatTZS(dep.amount)}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {new Date(dep.deposit_date).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.78rem', marginTop: '0.35rem', color: 'var(--color-text)' }}>
                    <span style={{ fontWeight: 500, color: 'var(--color-text-muted)' }}>Ref:</span>{' '}
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{dep.reference || 'N/A'}</span>
                  </div>

                  {dep.matched && (
                    <div style={{
                      marginTop: '0.5rem',
                      fontSize: '0.7rem',
                      color: '#16a34a',
                      fontWeight: 700,
                      backgroundColor: 'rgba(37, 211, 102, 0.1)',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}>
                      <span>✨ Matches: {dep.matchReason}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => allocateDeposit(dep)}
                      className={`btn ${isSelected ? 'btn-success' : 'btn-secondary'}`}
                      style={{
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        backgroundColor: isSelected ? '#16a34a' : 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {isSelected ? 'Allocated ✓' : 'Allocate'}
                    </button>
                  </div>
                </div>
              )
            })}

            {bankDeposits.length === 0 && (
              <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                No pending deposits available.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Payments History Table */}
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
                  setWhatsappNumber('')
                }}
                className="btn"
                style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: 'var(--color-text)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendWhatsapp}
                className="btn btn-primary"
                style={{ backgroundColor: '#25D366', color: '#ffffff', borderColor: '#25D366', opacity: sendingWhatsapp ? 0.7 : 1 }}
                disabled={sendingWhatsapp}
              >
                {sendingWhatsapp ? 'Sending...' : 'Send Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
