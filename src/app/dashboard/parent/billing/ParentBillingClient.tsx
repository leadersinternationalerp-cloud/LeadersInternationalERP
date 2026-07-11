'use client'

import { useState } from 'react'
import { formatDate } from '@/utils/date'

export default function ParentBillingClient({ childrenData }: { childrenData: any[] }) {
  const [activeChildIndex, setActiveChildIndex] = useState(0)

  const activeChild = childrenData[activeChildIndex]

  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (!childrenData || childrenData.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <h3>No Children Linked</h3>
        <p>No student accounts are currently linked to your parent profile. Please contact the administration.</p>
      </div>
    )
  }

  // Calculate balances for the active child
  const childInvoices = activeChild.invoices || []
  const childPayments = activeChild.payments || []

  const totalBilled = childInvoices.reduce((sum: number, inv: any) => sum + Number(inv.net_amount), 0)
  const totalPaid = childPayments.reduce((sum: number, pay: any) => sum + Number(pay.amount), 0)
  const balanceDue = totalBilled - totalPaid
  const isFullyPaid = balanceDue <= 0

  return (
    <div>
      {/* Child Selector (only show if multiple children) */}
      {childrenData.length > 1 && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
          {childrenData.map((child, idx) => (
            <button
              key={child.id}
              onClick={() => setActiveChildIndex(idx)}
              className="btn"
              style={{
                background: activeChildIndex === idx ? 'var(--color-primary)' : 'var(--color-surface)',
                color: activeChildIndex === idx ? '#fff' : 'var(--color-text)',
                border: '1px solid var(--color-border)'
              }}
            >
              {child.profiles?.first_name} {child.profiles?.last_name}
            </button>
          ))}
        </div>
      )}

      {/* Fee Alert Banner */}
      <div style={{
        padding: '1.25rem 2rem',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: isFullyPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        borderLeft: `6px solid ${isFullyPaid ? 'var(--color-success)' : 'var(--color-error)'}`,
        color: isFullyPaid ? 'var(--color-success)' : 'var(--color-error)',
        fontWeight: 600,
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {isFullyPaid ? (
            <span>✓ All fees for {activeChild.profiles?.first_name} are fully settled this term. Thank you!</span>
          ) : (
            <span>⚠ Outstanding Balance: {formatTZS(balanceDue)} due for this term.</span>
          )}
        </div>
        {!isFullyPaid && (
          <span style={{ fontSize: '0.85rem', backgroundColor: 'var(--color-error)', color: '#fff', padding: '0.25rem 0.75rem', borderRadius: '4px' }}>
            Action Required
          </span>
        )}
      </div>

      {/* Overview Dashboard Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Total Billed
          </h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {formatTZS(totalBilled)}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Total Paid
          </h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-success)' }}>
            {formatTZS(totalPaid)}
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h3 style={{ fontSize: '0.9rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
            Balance Due
          </h3>
          <p style={{ fontSize: '1.75rem', fontWeight: 700, color: isFullyPaid ? 'var(--color-success)' : 'var(--color-error)' }}>
            {formatTZS(balanceDue)}
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
        {/* Invoices List */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Invoices & Statements</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {childInvoices.map((inv: any) => {
              const invPaid = childPayments
                .filter((p: any) => p.invoice_id === inv.id)
                .reduce((sum: number, p: any) => sum + Number(p.amount), 0)
              const invBal = Number(inv.net_amount) - invPaid

              return (
                <div key={inv.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{inv.term} ({inv.academic_year})</h3>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Due Date: {formatDate(inv.due_date)}</span>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                      backgroundColor: invBal <= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                      color: invBal <= 0 ? 'var(--color-success)' : 'var(--color-error)'
                    }}>
                      {invBal <= 0 ? 'PAID' : 'PENDING'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', marginBottom: '1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Subtotal Billed:</span>
                      <span style={{ fontWeight: 600 }}>{formatTZS(inv.total_amount)}</span>
                    </div>
                    {Number(inv.discount_amount) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)' }}>
                        <span>Discount ({inv.discount_reason}):</span>
                        <span>-{formatTZS(inv.discount_amount)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>Net Billed:</span>
                      <span>{formatTZS(inv.net_amount)}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span style={{ color: 'var(--color-text-muted)' }}>Remaining Balance:</span>
                    <strong style={{ color: invBal > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                      {formatTZS(invBal)}
                    </strong>
                  </div>
                </div>
              )
            })}

            {childInvoices.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>No invoices recorded.</p>
            )}
          </div>
        </div>

        {/* Payments History */}
        <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>Payment History</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {childPayments.map((pay: any) => (
              <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{pay.receipt_number}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {pay.payment_method} • {formatDate(pay.payment_date)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '0.95rem' }}>
                    {formatTZS(pay.amount)}
                  </div>
                </div>
              </div>
            ))}

            {childPayments.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>No payments logged yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
