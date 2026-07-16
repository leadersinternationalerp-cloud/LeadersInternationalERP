import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { formatDate } from '@/utils/date'
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { revalidatePath } from 'next/cache'

export default async function DirectorApplicationsInbox({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()

  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Director') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  const params = await searchParams
  const activeTab = params.tab || 'leave'

  // Fetch Leave Applications
  const { data: leaveRequests } = await supabase
    .from('leave_applications')
    .select(`
      *,
      employee:employee_id (
        id,
        profiles (first_name, last_name, role, roles)
      )
    `)
    .order('created_at', { ascending: false })

  // Fetch Salary Advances
  const { data: salaryAdvances } = await supabase
    .from('salary_advances')
    .select(`
      *,
      employee:employee_id (
        id,
        profiles (first_name, last_name, role, roles)
      )
    `)
    .order('created_at', { ascending: false })

  // Actions
  async function actionApplication(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const id = formData.get('id') as string
    const type = formData.get('type') as string
    const action = formData.get('action') as string
    const notes = formData.get('notes') as string || ''

    if (!id || !type || !action) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let status = action === 'approve' ? 'Approved' : action === 'decline' ? 'Declined' : 'Returned'

    if (type === 'leave') {
      await supabase.from('leave_applications').update({
        status,
        reviewer_id: user.id,
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString()
      }).eq('id', id)
      
      // Trigger notification
      const { triggerLeaveReviewed } = await import('@/utils/notifications')
      await triggerLeaveReviewed(id)

    } else if (type === 'advance') {
      // For salary advances, Director approves the request submitted by Principal
      await supabase.from('salary_advances').update({
        status,
        reviewer_id: user.id,
        reviewer_notes: notes,
        reviewed_at: new Date().toISOString()
      }).eq('id', id)
      
      if (status === 'Approved') {
        const { triggerSalaryAdvanceDisbursed } = await import('@/utils/notifications')
        await triggerSalaryAdvanceDisbursed(id)
      }
    }

    revalidatePath('/dashboard/director/applications')
  }

  function formatTZS(amount: number) {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Check if an applicant is a Principal (meaning Director can act on it)
  function isPrincipal(applicantProfile: any) {
    if (!applicantProfile) return false
    const role = applicantProfile.role
    const roles = applicantProfile.roles
    return role === 'Principal' || (Array.isArray(roles) && roles.includes('Principal'))
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Self-Service Applications Inbox
      </h1>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '2rem' }}>
        Review and authorize self-service requests. Note: You can only approve/decline applications submitted by Principals. Other staff applications are managed by the Principal.
      </p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--color-border)', marginBottom: '2rem' }}>
        <Link 
          href="?tab=leave" 
          style={{ 
            padding: '0.75rem 1.5rem', 
            textDecoration: 'none', 
            fontWeight: 600,
            borderBottom: activeTab === 'leave' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'leave' ? 'var(--color-primary)' : 'var(--color-text-muted)'
          }}
        >
          Leave Applications ({leaveRequests?.filter(r => r.status === 'Submitted' || r.status === 'Reviewed_Principal').length || 0} Pending)
        </Link>
        <Link 
          href="?tab=advance" 
          style={{ 
            padding: '0.75rem 1.5rem', 
            textDecoration: 'none', 
            fontWeight: 600,
            borderBottom: activeTab === 'advance' ? '3px solid var(--color-primary)' : '3px solid transparent',
            color: activeTab === 'advance' ? 'var(--color-primary)' : 'var(--color-text-muted)'
          }}
        >
          Salary Advances ({salaryAdvances?.filter(a => a.status === 'Submitted' || a.status === 'Reviewed_Principal').length || 0} Pending)
        </Link>
      </div>

      {/* Tab Content: Leave */}
      {activeTab === 'leave' && (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Applicant</th>
                <th style={{ padding: '1rem' }}>Leave Type</th>
                <th style={{ padding: '1rem' }}>Duration</th>
                <th style={{ padding: '1rem' }}>Dates</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveRequests?.map((req: any) => {
                const profile = req.employee?.profiles
                const canAct = isPrincipal(profile) && (req.status === 'Submitted' || req.status === 'Reviewed_Principal' || req.status === 'Pending')
                return (
                  <tr key={req.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>{profile?.first_name} {profile?.last_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{profile?.role || 'Staff'}</div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>{req.leave_type}</td>
                    <td style={{ padding: '1rem' }}>{req.days} days</td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                      {formatDate(req.start_date)} - {formatDate(req.end_date)}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600,
                        backgroundColor: req.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : req.status === 'Declined' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: req.status === 'Approved' ? 'var(--color-success)' : req.status === 'Declined' ? 'var(--color-error)' : 'var(--color-warning)'
                      }}>
                        {req.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {canAct ? (
                        <form action={actionApplication} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <input type="hidden" name="id" value={req.id} />
                          <input type="hidden" name="type" value="leave" />
                          <button type="submit" name="action" value="approve" className="btn btn-primary" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle size={16} /> Approve
                          </button>
                          <button type="submit" name="action" value="decline" className="btn btn-secondary" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <XCircle size={16} /> Decline
                          </button>
                        </form>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertCircle size={14} /> View Only
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {(!leaveRequests || leaveRequests.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No leave applications found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content: Salary Advances */}
      {activeTab === 'advance' && (
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Applicant</th>
                <th style={{ padding: '1rem' }}>Requested Amount</th>
                <th style={{ padding: '1rem' }}>Reason</th>
                <th style={{ padding: '1rem' }}>Date</th>
                <th style={{ padding: '1rem' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {salaryAdvances?.map((adv: any) => {
                const profile = adv.employee?.profiles
                const canAct = isPrincipal(profile) && (adv.status === 'Submitted' || adv.status === 'Reviewed_Principal' || adv.status === 'Pending')
                return (
                  <tr key={adv.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600 }}>{profile?.first_name} {profile?.last_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{profile?.role || 'Staff'}</div>
                    </td>
                    <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {formatTZS(adv.amount_requested)}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{adv.reason}</td>
                    <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{formatDate(adv.created_at)}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem', borderRadius: '1rem', fontSize: '0.8rem', fontWeight: 600,
                        backgroundColor: adv.status === 'Approved' || adv.status === 'Disbursed' ? 'rgba(16, 185, 129, 0.1)' : adv.status === 'Declined' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: adv.status === 'Approved' || adv.status === 'Disbursed' ? 'var(--color-success)' : adv.status === 'Declined' ? 'var(--color-error)' : 'var(--color-warning)'
                      }}>
                        {adv.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {canAct ? (
                        <form action={actionApplication} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <input type="hidden" name="id" value={adv.id} />
                          <input type="hidden" name="type" value="advance" />
                          <button type="submit" name="action" value="approve" className="btn btn-primary" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle size={16} /> Approve
                          </button>
                          <button type="submit" name="action" value="decline" className="btn btn-secondary" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <XCircle size={16} /> Decline
                          </button>
                        </form>
                      ) : (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                          <AlertCircle size={14} /> View Only
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {(!salaryAdvances || salaryAdvances.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No salary advances found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}
