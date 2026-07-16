import { createClient } from '@/utils/supabase/server'
import { applyLeaveAction } from '../../actions'

export default async function LeavePage() {
  const supabase = await createClient()

  // Fetch current user
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch leave balances
  const { data: balances } = await supabase
    .from('leave_balances')
    .select('*')
    .eq('employee_id', user?.id)

  // Fetch leave history
  const { data: history } = await supabase
    .from('leave_applications')
    .select(`
      *,
      actingStaff:acting_staff_id (first_name, last_name)
    `)
    .eq('employee_id', user?.id)
    .order('created_at', { ascending: false })

  // Fetch other staff for acting staff selection
  const { data: staffList } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .neq('id', user?.id)
    .in('role', ['Teacher', 'Principal', 'Accountant', 'Dean', 'Head of Section', 'Clinic', 'Transport'])
    .order('first_name', { ascending: true })

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        My Leave Management
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        {/* Apply for Leave Form & Balances */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Leave Balances Summary */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Leave Balance (2025-2026)</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {balances?.map((bal) => (
                <div key={bal.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontWeight: 500 }}>{bal.leave_type}</span>
                  <span style={{ fontWeight: 600 }}>
                    {bal.remaining_days} of {bal.entitled_days} days left
                  </span>
                </div>
              ))}
              {(!balances || balances.length === 0) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span style={{ fontWeight: 500 }}>Annual Leave</span>
                  <span style={{ fontWeight: 600 }}>21 of 21 days left</span>
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Request Leave</h2>
            
            <form action={applyLeaveAction as any} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Leave Type</label>
                <select name="leave_type" className="input-field" required>
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Maternity Leave">Maternity Leave</option>
                  <option value="Paternity Leave">Paternity Leave</option>
                  <option value="Study Leave">Study Leave</option>
                  <option value="Unpaid Leave">Unpaid Leave</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Start Date</label>
                  <input type="date" name="start_date" className="input-field" required />
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input type="date" name="end_date" className="input-field" required />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea name="reason" placeholder="State reason for leave request..." className="input-field" style={{ minHeight: '50px', resize: 'vertical' }} required />
              </div>

              <div className="form-group">
                <label className="form-label">Acting Staff (Duty Cover)</label>
                <select name="acting_staff_id" className="input-field">
                  <option value="">Select colleague...</option>
                  {staffList?.map((s) => (
                    <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Supporting Document URL</label>
                <input type="text" name="supporting_document_url" placeholder="Optional document link" className="input-field" />
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '0.6rem', marginTop: '0.5rem' }}>
                Submit Request
              </button>
            </form>
          </div>
        </div>

        {/* History Table */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Leave Applications History
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Leave Type</th>
                <th style={{ padding: '1rem' }}>Dates</th>
                <th style={{ padding: '1rem' }}>Days</th>
                <th style={{ padding: '1rem' }}>Duty Cover</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {history?.map((app: any) => (
                <tr key={app.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{app.leave_type}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{app.reason}</div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                    {new Date(app.start_date).toLocaleDateString()} to {new Date(app.end_date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{app.days}</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    {app.actingStaff ? `${app.actingStaff.first_name} ${app.actingStaff.last_name}` : 'None'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 
                        app.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 
                        app.status === 'Pending' ? 'rgba(247, 178, 57, 0.1)' : 
                        'rgba(239, 68, 68, 0.1)',
                      color: 
                        app.status === 'Approved' ? 'var(--color-success)' : 
                        app.status === 'Pending' ? 'var(--color-accent)' : 
                        'var(--color-error)'
                    }}>
                      {app.status}
                    </span>
                    {app.reviewer_notes && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                        Note: {app.reviewer_notes}
                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {(!history || history.length === 0) && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No leave requests submitted yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
