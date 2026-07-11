import { createClient } from '@/utils/supabase/server'
import { reviewLeaveAction } from '../../staff/actions'
import Link from 'next/link'

export default async function DirectorLeaveRequestsPage() {
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

  // Fetch all pending leave applications
  const { data: pending } = await supabase
    .from('leave_applications')
    .select(`
      *,
      employee:employee_id (first_name, last_name, role),
      actingStaff:acting_staff_id (first_name, last_name)
    `)
    .eq('status', 'Pending')

  // Filter only Principal's requests
  const principalPending = pending?.filter((p: any) => p.employee?.role === 'Principal') || []

  // Fetch all reviewed leave applications of Principal
  const { data: reviewed } = await supabase
    .from('leave_applications')
    .select(`
      *,
      employee:employee_id (first_name, last_name, role),
      actingStaff:acting_staff_id (first_name, last_name)
    `)
    .neq('status', 'Pending')

  const principalReviewed = reviewed?.filter((r: any) => r.employee?.role === 'Principal') || []

  // Action handlers
  async function handleApprove(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const notes = formData.get('notes') as string
    if (id) {
      await reviewLeaveAction(id, 'Approved', notes)
    }
  }

  async function handleDecline(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const notes = formData.get('notes') as string
    if (id) {
      await reviewLeaveAction(id, 'Declined', notes)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Principal's Leave Requests Review
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', alignItems: 'start' }}>
        {/* Pending Requests */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Pending Requests ({principalPending.length})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
            {principalPending.map((req: any) => (
              <div key={req.id} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                      {req.employee?.first_name} {req.employee?.last_name} (Principal)
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-secondary)' }}>
                    {req.leave_type} ({req.days} days)
                  </span>
                </div>

                <div style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
                  <strong>Duration:</strong> {new Date(req.start_date).toLocaleDateString()} to {new Date(req.end_date).toLocaleDateString()}<br />
                  <strong>Reason:</strong> "{req.reason}"<br />
                  <strong>Duty Cover:</strong> {req.actingStaff ? `${req.actingStaff.first_name} ${req.actingStaff.last_name}` : 'None'}
                </div>

                <form style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                  <input type="hidden" name="id" value={req.id} />
                  <input type="text" name="notes" placeholder="Remarks or reasoning..." className="input-field" />
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button formAction={handleDecline} className="btn" style={{ flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
                      Decline
                    </button>
                    <button formAction={handleApprove} className="btn btn-primary" style={{ flex: 2 }}>
                      Approve Leave
                    </button>
                  </div>
                </form>
              </div>
            ))}

            {principalPending.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
                No pending leave requests from the Principal.
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
            {principalReviewed.map((req: any) => (
              <div key={req.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600 }}>{req.employee?.first_name} {req.employee?.last_name}</span>
                  <span style={{
                    padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                    backgroundColor: req.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: req.status === 'Approved' ? 'var(--color-success)' : 'var(--color-error)'
                  }}>
                    {req.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {req.leave_type} ({req.days} days) • {new Date(req.start_date).toLocaleDateString()}
                  {req.reviewer_notes && <div style={{ marginTop: '0.25rem', color: 'var(--color-text)' }}>Remarks: "{req.reviewer_notes}"</div>}
                </div>
              </div>
            ))}

            {principalReviewed.length === 0 && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
                No reviewed Principal leave history.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
