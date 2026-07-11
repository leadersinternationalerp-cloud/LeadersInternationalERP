import { createClient } from '@/utils/supabase/server'
import { reviewSalaryAdvanceAction } from '../../staff/actions'
import Link from 'next/link'

export default async function DirectorAdvanceRequestsPage() {
  const supabase = await createClient()

  // Verify access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (profile?.role !== 'Director' && profile?.role !== 'System Admin') {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  // Fetch pending advances
  const { data: pending } = await supabase
    .from('salary_advances')
    .select(`
      *,
      employee:employee_id (first_name, last_name, role)
    `)
    .eq('status', 'Pending')

  const staffPending = pending || []

  // Fetch reviewed advances
  const { data: reviewed } = await supabase
    .from('salary_advances')
    .select(`
      *,
      employee:employee_id (first_name, last_name, role)
    `)
    .neq('status', 'Pending')

  const staffReviewed = reviewed || []

  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Action handlers
  async function handleApprove(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const notes = formData.get('notes') as string
    const amount_approved = parseFloat(formData.get('amount_approved') as string)
    if (id && !isNaN(amount_approved)) {
      await reviewSalaryAdvanceAction(id, 'Approved', amount_approved, notes)
    }
  }

  async function handleDecline(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const notes = formData.get('notes') as string
    if (id) {
      await reviewSalaryAdvanceAction(id, 'Declined', undefined, notes)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Staff Salary Advance Review
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', alignItems: 'start' }}>
        {/* Pending Requests */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Pending Salary Advances ({staffPending.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
            {staffPending.map((adv: any) => (
              <div key={adv.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                      {adv.employee?.first_name} {adv.employee?.last_name} ({adv.employee?.role || 'Staff'})
                    </h3>
                  </div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
                    {formatTZS(adv.amount_requested)}
                  </span>
                </div>

                <div style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
                  <strong>Repayment:</strong> {adv.repayment_period_months} Months<br />
                  <strong>Reason:</strong> "{adv.reason}"
                </div>

                <form style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                  <input type="hidden" name="id" value={adv.id} />
                  
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Approved Amount (TZS)</label>
                    <input type="number" name="amount_approved" defaultValue={adv.amount_requested} className="input-field" required />
                  </div>

                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Remarks</label>
                    <input type="text" name="notes" placeholder="Notes or remarks..." className="input-field" />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button formAction={handleDecline} className="btn" style={{ flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
                      Decline
                    </button>
                    <button formAction={handleApprove} className="btn btn-primary" style={{ flex: 2 }}>
                      Approve Advance
                    </button>
                  </div>
                </form>
              </div>
            ))}

            {staffPending.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
                No pending salary advance requests.
              </p>
            )}
          </div>
        </div>

        {/* History */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Recent Decisions
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
            {staffReviewed.map((adv: any) => (
              <div key={adv.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600 }}>{adv.employee?.first_name} {adv.employee?.last_name} ({adv.employee?.role || 'Staff'})</span>
                  <span style={{
                    padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                    backgroundColor: 
                      adv.status === 'Approved' || adv.status === 'Disbursed' || adv.status === 'Fully Repaid' ? 'rgba(16, 185, 129, 0.1)' : 
                      'rgba(239, 68, 68, 0.1)',
                    color: 
                      adv.status === 'Approved' || adv.status === 'Disbursed' || adv.status === 'Fully Repaid' ? 'var(--color-success)' : 
                      'var(--color-error)'
                  }}>
                    {adv.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  Requested: {formatTZS(adv.amount_requested)} • Repayment: {adv.repayment_period_months} months
                  {adv.amount_approved && <div>Approved: <strong>{formatTZS(adv.amount_approved)}</strong></div>}
                  {adv.reviewer_notes && <div style={{ marginTop: '0.25rem', color: 'var(--color-text)' }}>Remarks: "{adv.reviewer_notes}"</div>}
                </div>
              </div>
            ))}

            {staffReviewed.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
                No reviewed advance history.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
