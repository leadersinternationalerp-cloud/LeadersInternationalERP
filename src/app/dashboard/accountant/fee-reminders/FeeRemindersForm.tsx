'use client'

import { useState } from 'react'

interface Invoice {
  id: string
  invoice_number: string
  term: string
  net_amount: number
  paid_amount: number
  status: string
  student: {
    student_id: string
    profiles: {
      first_name: string
      last_name: string
    }
  }
}

export default function FeeRemindersForm({
  invoices,
  sendRemindersAction
}: {
  invoices: Invoice[]
  sendRemindersAction: (formData: FormData) => Promise<void>
}) {
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const [sending, setSending] = useState(false)

  const handleSelectAll = (checked: boolean) => {
    const updated: Record<string, boolean> = {}
    if (checked) {
      invoices.forEach(inv => {
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
      formData.append(`invoice_${id}`, id)
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

  const isAllSelected = invoices.length > 0 && invoices.every(inv => selectedIds[inv.id])

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
              <th style={{ padding: '1rem' }}>Student ID & Name</th>
              <th style={{ padding: '1rem' }}>Invoice Details</th>
              <th style={{ padding: '1rem' }}>Net Amount</th>
              <th style={{ padding: '1rem' }}>Paid Amount</th>
              <th style={{ padding: '1rem' }}>Remaining Balance</th>
              <th style={{ padding: '1rem' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => {
              const balance = Number(inv.net_amount) - Number(inv.paid_amount)
              const isChecked = !!selectedIds[inv.id]
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
                      {inv.student?.profiles?.first_name} {inv.student?.profiles?.last_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      ID: {inv.student?.student_id}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 500 }}>{inv.invoice_number}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{inv.term}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>{formatTZS(inv.net_amount)}</td>
                  <td style={{ padding: '1rem', color: 'var(--color-success)' }}>{formatTZS(inv.paid_amount)}</td>
                  <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--color-error)' }}>
                    {formatTZS(balance)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                      backgroundColor: inv.status === 'Partial' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: inv.status === 'Partial' ? 'var(--color-warning)' : 'var(--color-error)'
                    }}>
                      {inv.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </form>
  )
}
