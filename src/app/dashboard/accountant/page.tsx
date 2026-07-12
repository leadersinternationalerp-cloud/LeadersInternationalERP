import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import {
  Wallet, DollarSign, TrendingUp, CreditCard, Banknote, FileSpreadsheet,
  AlertCircle, History, Clock
} from 'lucide-react'
import { formatDate } from '@/utils/date'

export default async function AccountantDashboardPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
    
  const userRoles = profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : []

  if (!user || (!userRoles.includes('Accountant') && !userRoles.includes('System Admin'))) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch Summary Metrics
  const { data: invoices } = await supabase.from('invoices').select('net_amount, total_paid, status')
  let feesBilled = 0
  let feesCollected = 0
  let feesOutstanding = 0

  invoices?.forEach(inv => {
    const netAmount = Number(inv.net_amount || 0)
    const paidAmount = Number(inv.total_paid || 0)
    
    feesBilled += netAmount
    feesCollected += paidAmount
    feesOutstanding += (netAmount - paidAmount)
  })

  // Pending Disbursements
  const { data: pendingAdvances } = await supabase
    .from('salary_advances')
    .select('id, amount_requested, status, created_at, profiles(first_name, last_name)')
    .eq('status', 'Approved')
    .limit(5)

  // Recent Transactions
  const { data: recentPayments } = await supabase
    .from('payments')
    .select('amount, payment_method, payment_date, students(profiles(first_name, last_name))')
    .order('payment_date', { ascending: false })
    .limit(5)

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `TZS ${(amount / 1000000).toFixed(1)}M`
    if (amount >= 1000) return `TZS ${(amount / 1000).toFixed(0)}K`
    return `TZS ${amount}`
  }

  const collectionProgress = feesBilled > 0 ? (feesCollected / feesBilled) * 100 : 0
  const progressColor = collectionProgress > 75 ? 'var(--color-success)' : collectionProgress > 50 ? 'var(--color-warning)' : 'var(--color-error)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>Accountant Dashboard</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Financial overview, collections, and disbursements.
        </p>
      </div>

      {/* Summary Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(59, 179, 195, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <Wallet size={24} color="var(--color-primary)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Fees Billed</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text)' }}>{formatCurrency(feesBilled)}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <TrendingUp size={24} color="var(--color-success)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Fees Collected</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>{formatCurrency(feesCollected)}</div>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-md)' }}>
            <DollarSign size={24} color="var(--color-error)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Outstanding</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-error)' }}>{formatCurrency(feesOutstanding)}</div>
          </div>
        </div>
      </div>

      {/* Fee Progress Bar Widget */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>Term Collection Progress</h3>
          <span style={{ fontWeight: 700, color: progressColor }}>{collectionProgress.toFixed(1)}%</span>
        </div>
        <div style={{ height: '8px', backgroundColor: 'var(--color-surface)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${collectionProgress}%`, height: '100%', backgroundColor: progressColor, transition: 'width 0.5s ease' }} />
        </div>
      </div>

      {/* Widgets Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '1.5rem' }}>
        
        {/* Pending Disbursements */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <AlertCircle size={20} color="var(--color-warning)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>Pending Disbursements</h3>
          </div>
          {(!pendingAdvances || pendingAdvances.length === 0) ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No pending disbursements.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingAdvances.map(advance => (
                <div key={advance.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{(advance.profiles as any)?.first_name} {(advance.profiles as any)?.last_name}</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Salary Advance</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-warning)' }}>{formatCurrency(advance.amount_requested)}</span>
                    <Link href="/dashboard/accountant/advances" style={{ fontSize: '0.75rem', color: 'var(--color-primary)', textDecoration: 'none' }}>Mark Disbursed</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <History size={20} color="var(--color-primary)" />
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-text)' }}>Recent Transactions</h3>
          </div>
          {(!recentPayments || recentPayments.length === 0) ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No recent transactions.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {recentPayments.map((payment, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>Payment Received</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                      {(payment.students as any)?.profiles?.first_name} {(payment.students as any)?.profiles?.last_name} • {payment.payment_method}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>+{formatCurrency(payment.amount)}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{formatDate(payment.payment_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
