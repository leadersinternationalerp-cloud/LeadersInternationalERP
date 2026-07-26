'use client'

import { useState } from 'react'

interface Invoice {
  id: string
  invoice_number: string
  term: string
  net_amount: number
  paid_amount: number
  status: string
  studentName?: string
  admissionNo?: string
  amount_due?: number
  student: {
    student_id: string
    profiles?: any
  }
}

export default function FeeRemindersForm({
  invoices, // Now represents grouped students
  sendRemindersAction
}: {
  invoices: any[]
  sendRemindersAction: (formData: FormData) => Promise<void>
}) {
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const [sending, setSending] = useState(false)
  const [classFilter, setClassFilter] = useState('All')
  const [termFilter, setTermFilter] = useState('All')
  const [paymentPctFilter, setPaymentPctFilter] = useState('All')

  // Extract unique options for filters
  const classes = Array.from(new Set(invoices.map(s => s.gradeLevel))).filter(Boolean).sort()
  const terms = Array.from(new Set(invoices.flatMap(s => s.terms))).filter(Boolean).sort()

  const filteredStudents = invoices.filter(student => {
    if (classFilter !== 'All' && student.gradeLevel !== classFilter) return false
    if (termFilter !== 'All' && !student.terms.includes(termFilter)) return false
    if (paymentPctFilter !== 'All') {
      // paymentPctFilter looks for students who have paid LESS THAN this % of their net amount
      const pctPaid = student.total_net_amount > 0 ? (student.total_paid / student.total_net_amount) * 100 : 0
      const threshold = Number(paymentPctFilter)
      if (pctPaid >= threshold) return false
    }
    return true
  })

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    if (checked) {
      filteredStudents.forEach(inv => {
        updated[inv.id] = true
      })
    }
    setSelectedIds(updated)
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    setSelectedIds(prev => ({
      ...prev,
      [id]: checked
    }))
  }

  const handleTriggerReminders = async (e: React.FormEvent) => {
    e.preventDefault()
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id])
    if (ids.length === 0) {
      alert('Please select at least one outstanding invoice to send reminders.')
      return
    }

    setSending(true)
    const formData = new FormData()
    ids.forEach(id => {
      formData.append(`student_${id}`, id)
    })

    try {
      await sendRemindersAction(formData)
      alert(`Fee reminders successfully triggered for ${ids.length} parents!`)
      setSelectedIds({})
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
    }
  }

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val)
  }

  const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(inv => selectedIds[inv.id])

  return (
    <form onSubmit={handleTriggerReminders} className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Outstanding Student Balances</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: '0.25rem 0 0 0' }}>
            Check parent numbers to dispatch automated reminders.
          </p>
        </div>

        <button
          type="submit"
          disabled={sending || Object.values(selectedIds).filter(Boolean).length === 0}
          className="btn btn-primary"
          style={{ padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {sending ? 'Sending...' : '✉ Send Selected Alerts'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Class</label>
          <select className="input-field" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="All">All Classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Term</label>
          <select className="input-field" value={termFilter} onChange={e => setTermFilter(e.target.value)}>
            <option value="All">All Terms</option>
            {terms.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>Payment %</label>
          <select className="input-field" value={paymentPctFilter} onChange={e => setPaymentPctFilter(e.target.value)}>
            <option value="All">All Students</option>
            <option value="25">Paid less than 25%</option>
            <option value="50">Paid less than 50%</option>
            <option value="75">Paid less than 75%</option>
            <option value="100">Paid less than 100%</option>
          </select>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '2px solid var(--color-border)' }}>
              <th style={{ padding: '1rem', width: '40px' }}>
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '1rem' }}>Student Details</th>
              <th style={{ padding: '1rem' }}>Class</th>
              <th style={{ padding: '1rem' }}>Included Terms</th>
              <th style={{ padding: '1rem' }}>Total Billed</th>
              <th style={{ padding: '1rem' }}>Total Paid</th>
              <th style={{ padding: '1rem' }}>Remaining Balance</th>
              <th style={{ padding: '1rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map((inv) => {
              const isChecked = !!selectedIds[inv.id]
              
              const pctPaid = inv.total_net_amount > 0 ? Math.round((inv.total_paid / inv.total_net_amount) * 100) : 0

              return (
                <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isChecked ? 'rgba(59, 179, 195, 0.02)' : 'transparent' }}>
                  <td style={{ padding: '1rem' }}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleSelectRow(inv.id, e.target.checked)}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>
                      {inv.studentName}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      ID: {inv.admissionNo}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{inv.gradeLevel}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {inv.terms.join(', ')}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>{formatTZS(inv.total_net_amount)}</td>
                  <td style={{ padding: '1rem', color: 'var(--color-success)' }}>
                    {formatTZS(inv.total_paid)}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--color-error)' }}>
                    {formatTZS(inv.amount_due)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                      backgroundColor: pctPaid > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: pctPaid > 0 ? 'var(--color-warning)' : 'var(--color-error)'
                    }}>
                      {pctPaid}% Paid
                    </span>
                  </td>
                </tr>
              )
            })}
            
            {filteredStudents.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No students match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </form>
  )
}
