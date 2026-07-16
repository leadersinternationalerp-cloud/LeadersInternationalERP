import { createClient } from '@/utils/supabase/server'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

export default async function DirectorLeaveAdvanceRecordsPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const supabase = await createClient()

  // Verify access
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
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  // Parse filters
  const params = await searchParams
  const activeTab = params.type || 'leave' // 'leave' or 'advance'

  // Fetch leave history
  const { data: leaves } = await supabase
    .from('leave_applications')
    .select(`
      *,
      employee:employee_id (first_name, last_name, role)
    `)
    .order('created_at', { ascending: false })

  // Fetch advance history
  const { data: advances } = await supabase
    .from('salary_advances')
    .select(`
      *,
      employee:employee_id (first_name, last_name, role)
    `)
    .order('created_at', { ascending: false })

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val)
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Staff Requests Archival History (Read Only)
      </h1>

      {/* Tabs */}
      <div className="glass-panel" style={{ padding: '0.75rem', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
        <Link
          href="/dashboard/director/leave-advance-records?type=leave"
          style={{
            padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
            backgroundColor: activeTab === 'leave' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'leave' ? '#ffffff' : 'var(--color-text-muted)',
          }}
        >
          Leave Applications Log
        </Link>
        <Link
          href="/dashboard/director/leave-advance-records?type=advance"
          style={{
            padding: '0.5rem 1.25rem', borderRadius: 'var(--radius-md)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600,
            backgroundColor: activeTab === 'advance' ? 'var(--color-primary)' : 'transparent',
            color: activeTab === 'advance' ? '#ffffff' : 'var(--color-text-muted)',
          }}
        >
          Salary Advances Log
        </Link>
      </div>

      {/* Main Table Panel */}
      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {activeTab === 'leave' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Staff Member</th>
                <th style={{ padding: '1rem' }}>Leave Type</th>
                <th style={{ padding: '1rem' }}>Duration</th>
                <th style={{ padding: '1rem' }}>Reason</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(leaves || []).map((l) => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{l.employee?.first_name} {l.employee?.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{l.employee?.role}</div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>{l.leave_type} ({l.days} days)</td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                    {formatDate(l.start_date)} to {formatDate(l.end_date)}
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>"{l.reason}"</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                      backgroundColor: 
                        l.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 
                        l.status === 'Declined' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.05)',
                      color:
                        l.status === 'Approved' ? 'var(--color-success)' : 
                        l.status === 'Declined' ? 'var(--color-error)' : 'var(--color-text-muted)'
                    }}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}

              {(leaves || []).length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No leave requests found in the archive.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ padding: '1rem' }}>Staff Member</th>
                <th style={{ padding: '1rem' }}>Amount Requested</th>
                <th style={{ padding: '1rem' }}>Approved Amount</th>
                <th style={{ padding: '1rem' }}>Period</th>
                <th style={{ padding: '1rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {(advances || []).map((a) => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600 }}>{a.employee?.first_name} {a.employee?.last_name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{a.employee?.role}</div>
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 600 }}>{formatTZS(a.amount_requested)}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                    {a.amount_approved ? formatTZS(a.amount_approved) : 'N/A'}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem' }}>{a.repayment_period_months} Months</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                      backgroundColor: 
                        a.status === 'Approved' || a.status === 'Disbursed' || a.status === 'Fully Repaid' ? 'rgba(16, 185, 129, 0.1)' : 
                        a.status === 'Declined' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.05)',
                      color:
                        a.status === 'Approved' || a.status === 'Disbursed' || a.status === 'Fully Repaid' ? 'var(--color-success)' : 
                        a.status === 'Declined' ? 'var(--color-error)' : 'var(--color-text-muted)'
                    }}>
                      {a.status}
                    </span>
                  </td>
                </tr>
              ))}

              {(advances || []).length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No salary advance requests found in the archive.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
