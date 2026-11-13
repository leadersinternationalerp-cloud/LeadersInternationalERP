'use client'

import { useState, useMemo, useTransition } from 'react'
import { FileDown, CheckCircle2, Receipt, X } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'
import { markAdmissionInvoicePaidAction } from '@/app/dashboard/principal/admissions/actions'
import { downloadApplicationInvoicePdf } from '@/lib/admissions/applicationInvoicePdf'

export default function InvoicesClient({
  initialInvoices,
  initialAdmissionInvoices = [],
}: {
  initialInvoices: any[]
  initialAdmissionInvoices?: any[]
}) {
  const [activeTab, setActiveTab] = useState<'student' | 'admission'>('student')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [gradeFilter, setGradeFilter] = useState('All')
  const [termFilter, setTermFilter] = useState('All')

  // Admission Form Invoices state
  const [admissionInvoices, setAdmissionInvoices] = useState<any[]>(initialAdmissionInvoices)
  const [admSearch, setAdmSearch] = useState('')
  const [admStatus, setAdmStatus] = useState<'all' | 'unpaid' | 'paid'>('all')
  const [payingInv, setPayingInv] = useState<any | null>(null)
  const [payMethod, setPayMethod] = useState('Cash')
  const [payRef, setPayRef] = useState('')
  const [admMessage, setAdmMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const unpaidAdmCount = useMemo(
    () => admissionInvoices.filter((i) => i.status === 'unpaid').length,
    [admissionInvoices]
  )

  const filteredAdmissionInvoices = useMemo(() => {
    return admissionInvoices.filter((inv) => {
      const app = inv.admission_applications || {}
      const q = admSearch.toLowerCase().trim()
      const matchesSearch =
        !q ||
        (inv.invoice_no || '').toLowerCase().includes(q) ||
        (app.application_no || '').toLowerCase().includes(q) ||
        `${app.first_name || ''} ${app.last_name || ''}`.toLowerCase().includes(q) ||
        (app.parent_name || '').toLowerCase().includes(q) ||
        (app.parent_phone || '').toLowerCase().includes(q)
      const matchesStatus = admStatus === 'all' || inv.status === admStatus
      return matchesSearch && matchesStatus
    })
  }, [admissionInvoices, admSearch, admStatus])

  const handleDownloadAdmPdf = (inv: any) => {
    const app = inv.admission_applications || {}
    downloadApplicationInvoicePdf({
      reference: app.application_no || inv.invoice_no,
      invoiceNo: inv.invoice_no,
      issueDate: new Date(inv.created_at || Date.now()).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      status: inv.status || 'unpaid',
      amount: Number(inv.amount || 20000),
      studentName: [app.first_name, app.middle_name, app.last_name].filter(Boolean).join(' ') || 'Applicant',
      parentName: app.parent_name || 'Parent / Guardian',
      parentPhone: app.parent_phone || '-',
      parentEmail: app.parent_email || '-',
      curriculum: app.curriculum || 'Cambridge',
      applyingFor: app.class_applied_for || '-',
      startTerm: app.start_term || 'Term 1',
      paymentMethod: inv.payment_method,
      paymentReference: inv.payment_reference,
      paidAt: inv.paid_at,
    })
  }

  const handleConfirmPaid = (e: React.FormEvent) => {
    e.preventDefault()
    if (!payingInv) return
    startTransition(async () => {
      const res = await markAdmissionInvoicePaidAction({
        invoiceId: payingInv.id,
        applicationId: payingInv.application_id,
        paymentMethod: payMethod,
        paymentReference: payRef,
      })
      if (res.ok && res.invoice) {
        setAdmissionInvoices((prev) =>
          prev.map((row) =>
            row.id === payingInv.id ? { ...row, ...res.invoice } : row
          )
        )
        setAdmMessage(`Invoice ${res.invoice.invoice_no} marked as PAID via ${payMethod}.`)
        setPayingInv(null)
        setPayMethod('Cash')
        setPayRef('')
      }
    })
  }

  const availableGrades = useMemo(() => {
    const set = new Set<string>(['Cambridge Year 1', 'Cambridge Year 2', 'Cambridge Year 3', 'Cambridge Year 4', 'Cambridge Year 5', 'Cambridge Year 6', 'Baby Class', 'Nursery', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'])
    initialInvoices.forEach((inv) => {
      if (inv.students?.grade_level) set.add(inv.students.grade_level)
    })
    return Array.from(set).sort()
  }, [initialInvoices])

  const filteredInvoices = useMemo(() => {
    return initialInvoices.filter((inv) => {
      const name = `${inv.students?.profiles?.first_name || ''} ${inv.students?.profiles?.last_name || ''}`.toLowerCase()
      const matchesSearch =
        name.includes(search.toLowerCase()) ||
        (inv.students?.student_id || '').toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === 'All' || inv.status === statusFilter
      const matchesGrade = gradeFilter === 'All' || inv.students?.grade_level === gradeFilter
      const matchesTerm = termFilter === 'All' || inv.term === termFilter

      return matchesSearch && matchesStatus && matchesGrade && matchesTerm
    })
  }, [initialInvoices, search, statusFilter, gradeFilter, termFilter])

  return (
    <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '1rem 1.5rem 0',
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'rgba(0,0,0,0.02)',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('student')}
          style={{
            padding: '0.6rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'student' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'student' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
          Student Tuition Invoices ({initialInvoices.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('admission')}
          style={{
            padding: '0.6rem 1rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'admission' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'admission' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Receipt size={15} />
          <span>Admission Form Invoices (TZS 20,000)</span>
          {unpaidAdmCount > 0 && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.1rem 0.45rem',
                borderRadius: '9999px',
                backgroundColor: '#fef3c7',
                color: '#92400e',
              }}
            >
              {unpaidAdmCount} Unpaid
            </span>
          )}
        </button>
      </div>

      {activeTab === 'student' ? (
        <>
      {/* Toolbar */}
      <div
        style={{
          padding: '1.5rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by student name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ flex: 1, minWidth: '200px' }}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
            style={{ width: '150px' }}
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending</option>
          </select>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="input-field"
            style={{ width: '170px' }}
          >
            <option value="All">All Classes</option>
            {availableGrades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={termFilter}
            onChange={(e) => setTermFilter(e.target.value)}
            className="input-field"
            style={{ width: '130px' }}
          >
            <option value="All">All Terms</option>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Student Name</th>
              <th style={{ padding: '1rem' }}>Class / Grade</th>
              <th style={{ padding: '1rem' }}>Term</th>
              <th style={{ padding: '1rem' }}>Amount Billed</th>
              <th style={{ padding: '1rem' }}>Total Paid</th>
              <th style={{ padding: '1rem' }}>Balance</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Due Date</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Invoice PDF</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((inv: any) => {
              const balance = Number(inv.net_amount) - Number(inv.total_paid || 0)
              const rowColor =
                balance === 0
                  ? 'rgba(16, 185, 129, 0.05)'
                  : Number(inv.total_paid) > 0
                  ? 'rgba(247, 178, 57, 0.05)'
                  : 'rgba(239, 68, 68, 0.05)'

              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: rowColor }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>
                      {inv.students?.profiles?.first_name} {inv.students?.profiles?.last_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      ID: {inv.students?.student_id}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>{inv.students?.grade_level}</td>
                  <td style={{ padding: '1rem' }}>{inv.term}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                    {formatCurrency(inv.net_amount)}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-success)' }}>
                    {formatCurrency(inv.total_paid || 0)}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{formatCurrency(balance)}</td>
                  <td style={{ padding: '1rem' }}>
                    <span
                      style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor:
                          inv.status === 'Paid'
                            ? 'rgba(16, 185, 129, 0.1)'
                            : inv.status === 'Partially Paid'
                            ? 'rgba(247, 178, 57, 0.1)'
                            : 'rgba(239, 68, 68, 0.1)',
                        color:
                          inv.status === 'Paid'
                            ? 'var(--color-success)'
                            : inv.status === 'Partially Paid'
                            ? 'var(--color-accent)'
                            : 'var(--color-error)',
                      }}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <a
                      href={`/api/accountant/invoices/pdf?invoice_id=${encodeURIComponent(inv.id)}&download=1`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.7rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                      }}
                    >
                      <FileDown size={13} />
                      <span>Download</span>
                    </a>
                  </td>
                </tr>
              )
            })}

            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No invoices found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      ) : (
        <>
          {/* Admission Invoices Toolbar */}
          <div
            style={{
              padding: '1.5rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Search by invoice #, application #, learner, or parent..."
                value={admSearch}
                onChange={(e) => setAdmSearch(e.target.value)}
                className="input-field"
                style={{ flex: 1, minWidth: '220px' }}
              />
              <select
                value={admStatus}
                onChange={(e) => setAdmStatus(e.target.value as 'all' | 'unpaid' | 'paid')}
                className="input-field"
                style={{ width: '160px' }}
              >
                <option value="all">All Statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            {admMessage && (
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#047857' }}>
                {admMessage}
              </div>
            )}
          </div>

          {/* Admission Invoices Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>Invoice #</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>Applicant</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>Parent / Contact</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>Class &amp; Source</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdmissionInvoices.map((inv) => {
                  const app = inv.admission_applications || {}
                  const isPaid = inv.status === 'paid'
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem 1.25rem', fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem' }}>
                        {inv.invoice_no}
                        <div style={{ fontSize: '0.72rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
                          Ref: {app.application_no || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 600 }}>
                        {app.first_name} {app.last_name}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>
                        <div>{app.parent_name || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {app.parent_phone || '-'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontSize: '0.85rem' }}>
                        <div>{app.class_applied_for || '-'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {app.sales_agent_name || app.source || 'website'}
                        </div>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', fontWeight: 700 }}>
                        {formatCurrency(Number(inv.amount || 20000))}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.6rem',
                            borderRadius: '12px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                            color: isPaid ? '#047857' : '#b45309',
                          }}
                        >
                          {isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                        {isPaid && inv.payment_method && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                            {inv.payment_method}{inv.payment_reference ? ` · ${inv.payment_reference}` : ''}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDownloadAdmPdf(inv)}
                            className="btn btn-secondary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.35rem 0.7rem',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                            }}
                          >
                            <FileDown size={13} />
                            <span>PDF</span>
                          </button>
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => {
                                setPayingInv(inv)
                                setPayMethod('Cash')
                                setPayRef('')
                              }}
                              className="btn btn-primary"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                backgroundColor: '#059669',
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Mark Paid</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {filteredAdmissionInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No admission form invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {payingInv && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(2, 6, 23, 0.65)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setPayingInv(null)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: '420px',
              width: '100%',
              padding: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              backgroundColor: 'var(--color-surface)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Mark {payingInv.invoice_no} Paid</h3>
              <button type="button" onClick={() => setPayingInv(null)} className="btn btn-ghost btn-icon">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmPaid} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="input-field" value={payMethod} onChange={(e) => setPayMethod(e.target.value)} required>
                  <option value="Cash">Cash</option>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Airtel Money">Airtel Money</option>
                  <option value="Tigo Pesa">Tigo Pesa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Receipt / Transaction Reference</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Optional receipt or transaction ID"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={() => setPayingInv(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" disabled={isPending} className="btn btn-primary" style={{ backgroundColor: '#059669' }}>
                  {isPending ? 'Saving...' : 'Confirm Paid (TZS 20,000)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
