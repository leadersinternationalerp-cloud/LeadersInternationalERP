import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { reviewReportAction } from '../../staff/self-service/reports/actions'

function formatTZS(amount: number) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function parseAndFormatFinancials(text: string) {
  return text.replace(/\b(\d+)\s*TZS\b/gi, (match, numStr) => {
    const val = parseInt(numStr, 10)
    return isNaN(val) ? match : formatTZS(val)
  })
}

export default async function DirectorReportsPage() {
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
        <p>You do not have permissions to review reports.</p>
      </div>
    )
  }

  // Fetch reports submitted to Director (or Both) that are Pending or Reviewed
  const { data: reportsToReview } = await supabase
    .from('submitted_reports')
    .select(`
      *,
      employee:submitted_by (first_name, last_name, role)
    `)
    .in('submit_to', ['Director', 'Both'])
    .in('status', ['Pending', 'Reviewed'])
    .order('created_at', { ascending: true })

  // Fetch reports that have been Approved or Returned
  const { data: reviewHistory } = await supabase
    .from('submitted_reports')
    .select(`
      *,
      employee:submitted_by (first_name, last_name, role)
    `)
    .in('submit_to', ['Director', 'Both'])
    .in('status', ['Approved', 'Returned'])
    .order('reviewed_at', { ascending: false })

  // Inline Server Actions
  async function handleApprove(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const notes = formData.get('notes') as string
    if (id) {
      await reviewReportAction(id, 'Approved', notes)
    }
  }

  async function handleReturn(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const notes = formData.get('notes') as string
    if (id) {
      await reviewReportAction(id, 'Returned', notes)
    }
  }

  async function handleMarkReviewed(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const notes = formData.get('notes') as string
    if (id) {
      await reviewReportAction(id, 'Reviewed', notes)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Director Report Reviews
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem', alignItems: 'start' }}>
        {/* Pending / Reviewed reports */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Reports Requiring Review ({reportsToReview?.length || 0})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
            {reportsToReview?.map((report: any) => (
              <div 
                key={report.id} 
                style={{ 
                  border: '1px solid var(--color-border)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '1.5rem',
                  backgroundColor: 'var(--color-surface)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--color-primary)' }}>{report.title}</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                      Submitted by: <strong>{report.employee?.first_name} {report.employee?.last_name} ({report.employee?.role})</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.1rem' }}>
                      Type: <strong>{report.report_type}</strong> • Route: <strong>{report.submit_to}</strong> • Submitted: {new Date(report.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <span style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: report.status === 'Reviewed' ? 'rgba(59, 179, 195, 0.1)' : 'rgba(247, 178, 57, 0.1)',
                    color: report.status === 'Reviewed' ? 'var(--color-secondary)' : 'var(--color-accent)'
                  }}>
                    {report.status}
                  </span>
                </div>

                <div style={{ 
                  fontSize: '0.9rem', 
                  marginBottom: '1rem', 
                  color: 'var(--color-text)',
                  whiteSpace: 'pre-wrap',
                  backgroundColor: 'rgba(0,0,0,0.01)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(0,0,0,0.02)'
                }}>
                  {parseAndFormatFinancials(report.content)}
                </div>

                {report.attachment_url && (
                  <div style={{ marginBottom: '1rem' }}>
                    <a 
                      href={report.attachment_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ fontSize: '0.825rem', color: 'var(--color-secondary)', textDecoration: 'none', fontWeight: 500 }}
                    >
                      📎 View Attached Document
                    </a>
                  </div>
                )}

                {report.reviewer_notes && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem', fontStyle: 'italic' }}>
                    Current notes: "{report.reviewer_notes}"
                  </div>
                )}

                <form style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                  <input type="hidden" name="id" value={report.id} />
                  <input type="text" name="notes" placeholder="Enter review remarks / notes..." className="input-field" required />
                  
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <button formAction={handleReturn} className="btn" style={{ flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
                      Return Report
                    </button>
                    {report.submit_to === 'Both' && report.status === 'Pending' && (
                      <button formAction={handleMarkReviewed} className="btn" style={{ flex: 1, backgroundColor: 'rgba(59, 179, 195, 0.1)', color: 'var(--color-secondary)' }}>
                        Mark Reviewed
                      </button>
                    )}
                    <button formAction={handleApprove} className="btn btn-primary" style={{ flex: 2 }}>
                      Approve Report
                    </button>
                  </div>
                </form>
              </div>
            ))}

            {(!reportsToReview || reportsToReview.length === 0) && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
                No reports requiring review at this time.
              </p>
            )}
          </div>
        </div>

        {/* Decisions History */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Recent Decisions
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
            {reviewHistory?.map((report: any) => (
              <div key={report.id} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{report.title}</span>
                  <span style={{
                    padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                    backgroundColor: report.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: report.status === 'Approved' ? 'var(--color-success)' : 'var(--color-error)'
                  }}>
                    {report.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  By: {report.employee?.first_name} {report.employee?.last_name} ({report.employee?.role})<br />
                  Reviewed on: {new Date(report.reviewed_at).toLocaleDateString()}<br />
                  {report.reviewer_notes && <span style={{ color: 'var(--color-text)' }}>Remarks: "{report.reviewer_notes}"</span>}
                </div>
              </div>
            ))}

            {(!reviewHistory || reviewHistory.length === 0) && (
              <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
                No review history available.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
