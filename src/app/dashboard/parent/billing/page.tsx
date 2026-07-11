import { createClient } from '@/utils/supabase/server'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

export default async function ParentBillingHistoryPage({
  searchParams
}: {
  searchParams: Promise<{ child_id?: string }>
}) {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (!user || (profile?.role !== 'Parent' && profile?.role !== 'System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  const params = await searchParams
  let childId = params.child_id

  if (!childId) {
    const { data: relations } = await supabase
      .from('student_parents')
      .select('student_id')
      .eq('parent_id', user.id)
      .limit(1)
    
    if (relations && relations.length > 0) {
      childId = relations[0].student_id
    }
  }

  if (!childId) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>No Child Assigned</h2>
        <p>No child student profile links found for your parent account.</p>
      </div>
    )
  }

  // Fetch student profile details
  const { data: student } = await supabase
    .from('students')
    .select('id, student_id, grade_level, profiles:id (first_name, last_name)')
    .eq('id', childId)
    .single()

  // Fetch student invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('student_id', childId)
    .order('created_at', { ascending: false })

  // Fetch payment logs for this child
  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('student_id', childId)
    .order('payment_date', { ascending: false })

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val)
  }

  const studentName = student ? `${(student.profiles as any).first_name} ${(student.profiles as any).last_name}` : 'Student'

  return (
    <div>
      {/* Hide elements in print mode */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          header, aside, .btn, .no-print {
            display: none !important;
          }
          .glass-panel {
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
        }
      ` }} />

      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)', margin: 0 }}>
            Billing Statements & Payment History
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Fee schedules for: <strong>{studentName}</strong> ({student?.student_id})
          </p>
        </div>
        <Link href="/dashboard/parent/dashboard" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Dashboard
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Invoices List */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Issued Invoices</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '1rem' }}>Invoice</th>
                  <th style={{ padding: '1rem' }}>Term</th>
                  <th style={{ padding: '1rem' }}>Total Fee</th>
                  <th style={{ padding: '1rem' }}>Paid</th>
                  <th style={{ padding: '1rem' }}>Remaining</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {(invoices || []).map(inv => {
                  const balance = Number(inv.net_amount) - Number(inv.paid_amount)
                  return (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{inv.invoice_number}</td>
                      <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                        <div>{inv.term}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Due: {formatDate(inv.due_date)}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>{formatTZS(Number(inv.net_amount))}</td>
                      <td style={{ padding: '1rem', color: 'var(--color-success)' }}>{formatTZS(Number(inv.paid_amount))}</td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: balance > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                        {formatTZS(balance)}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                          backgroundColor: 
                            inv.status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 
                            inv.status === 'Partial' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color:
                            inv.status === 'Paid' ? 'var(--color-success)' : 
                            inv.status === 'Partial' ? 'var(--color-warning)' : 'var(--color-error)'
                        }}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}

                {(invoices || []).length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No billing statements found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Payments Log & Print Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Recent Payment Receipts</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(payments || []).map(p => (
                <div key={p.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{formatTZS(p.amount)}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{formatDate(p.payment_date)}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    Receipt No: <strong>{p.receipt_number}</strong>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                    Method: {p.payment_method} {p.notes ? `• ${p.notes}` : ''}
                  </div>
                </div>
              ))}

              {(payments || []).length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', textAlign: 'center' }}>No payments logged.</p>
              )}
            </div>
          </div>

          <button 
            type="button" 
            onClick={() => window.print()} 
            className="btn btn-primary no-print" 
            style={{ padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
          >
            🖨 Print Statement Summary
          </button>
        </div>

      </div>
    </div>
  )
}
