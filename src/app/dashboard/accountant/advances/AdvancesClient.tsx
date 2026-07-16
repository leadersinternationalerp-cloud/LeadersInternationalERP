'use client'

import { useState } from 'react'
import { markAdvanceDisbursedAction } from './actions'

export default function AdvancesClient({ pendingAdvances, activeAdvances }: { pendingAdvances: any[], activeAdvances: any[] }) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleDisburse = async (id: string) => {
    setLoading(id)
    setError('')
    const res = await markAdvanceDisbursedAction(id)
    setLoading(null)
    if (res?.error) {
      setError(res.error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {error && (
        <div style={{ padding: '1rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', borderRadius: 'var(--radius-md)' }}>
          {error}
        </div>
      )}

      {/* Pending Disbursements */}
      <section className="glass-panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>Pending Disbursements</h2>
        {(!pendingAdvances || pendingAdvances.length === 0) ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No advances pending disbursement.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {pendingAdvances.map(adv => (
              <div key={adv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{adv.profiles?.first_name} {adv.profiles?.last_name}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Approved: {formatCurrency(adv.amount_approved)} • Repayment: {adv.repayment_period_months} months
                  </div>
                </div>
                <button 
                  onClick={() => handleDisburse(adv.id)}
                  disabled={loading === adv.id}
                  className="btn btn-primary"
                >
                  {loading === adv.id ? 'Processing...' : 'Mark Disbursed'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active Advances */}
      <section className="glass-panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', color: 'var(--color-primary)', marginBottom: '1rem' }}>Active Advances (Disbursed)</h2>
        {(!activeAdvances || activeAdvances.length === 0) ? (
          <p style={{ color: 'var(--color-text-muted)' }}>No active advances.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '0.75rem 0' }}>Employee</th>
                <th style={{ padding: '0.75rem 0' }}>Approved</th>
                <th style={{ padding: '0.75rem 0' }}>Repaid</th>
                <th style={{ padding: '0.75rem 0' }}>Monthly Ded.</th>
                <th style={{ padding: '0.75rem 0' }}>Term</th>
              </tr>
            </thead>
            <tbody>
              {activeAdvances.map(adv => {
                const repaid = adv.advance_repayments?.reduce((sum: number, r: any) => sum + Number(r.amount), 0) || 0
                const monthly = Math.round(Number(adv.amount_approved) / Number(adv.repayment_period_months))
                return (
                  <tr key={adv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem 0' }}>{adv.profiles?.first_name} {adv.profiles?.last_name}</td>
                    <td style={{ padding: '1rem 0' }}>{formatCurrency(adv.amount_approved)}</td>
                    <td style={{ padding: '1rem 0', color: 'var(--color-success)' }}>{formatCurrency(repaid)}</td>
                    <td style={{ padding: '1rem 0' }}>{formatCurrency(monthly)}</td>
                    <td style={{ padding: '1rem 0' }}>{adv.repayment_period_months} mos</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
