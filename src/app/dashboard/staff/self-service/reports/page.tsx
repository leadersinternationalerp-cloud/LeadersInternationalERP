import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ReportForm from './ReportForm'

function formatTZS(amount: number) {
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function parseAndFormatFinancials(text: string) {
  // Format instances of raw numbers followed by TZS like "1000000 TZS" or "1000000TZS"
  return text.replace(/\b(\d+)\s*TZS\b/gi, (match, numStr) => {
    const val = parseInt(numStr, 10)
    return isNaN(val) ? match : formatTZS(val)
  })
}

export default async function ReportsPage() {
  const supabase = await createClient()

  // Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch report submissions history for this employee
  const { data: reports, error } = await supabase
    .from('submitted_reports')
    .select(`
      *,
      reviewer:reviewed_by (first_name, last_name, role)
    `)
    .eq('submitted_by', user.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Self-Service Reports
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'start' }}>
        {/* Submit Form */}
        <div>
          <ReportForm />
        </div>

        {/* History & Remarks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
              Submission History & Remarks
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
              {reports?.map((report) => (
                <div 
                  key={report.id} 
                  style={{ 
                    border: '1px solid var(--color-border)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '1.25rem',
                    backgroundColor: 'var(--color-surface)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--color-primary)', margin: 0 }}>
                        {report.title}
                      </h3>
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        <span>Type: <strong>{report.report_type}</strong></span>
                        <span>•</span>
                        <span>Submit to: <strong>{report.submit_to}</strong></span>
                        <span>•</span>
                        <span>Date: {new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <span style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: 
                        report.status === 'Approved' ? 'rgba(16, 185, 129, 0.1)' : 
                        report.status === 'Reviewed' ? 'rgba(59, 179, 195, 0.1)' : 
                        report.status === 'Pending' ? 'rgba(247, 178, 57, 0.1)' : 
                        'rgba(239, 68, 68, 0.1)',
                      color: 
                        report.status === 'Approved' ? 'var(--color-success)' : 
                        report.status === 'Reviewed' ? 'var(--color-secondary)' : 
                        report.status === 'Pending' ? 'var(--color-accent)' : 
                        'var(--color-error)'
                    }}>
                      {report.status}
                    </span>
                  </div>

                  <div style={{ 
                    fontSize: '0.9rem', 
                    color: 'var(--color-text)', 
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap', 
                    backgroundColor: 'rgba(0,0,0,0.01)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(0,0,0,0.03)',
                    marginBottom: '0.75rem'
                  }}>
                    {parseAndFormatFinancials(report.content)}
                  </div>

                  {report.attachment_url && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <a 
                        href={report.attachment_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        style={{ fontSize: '0.8rem', color: 'var(--color-secondary)', textDecoration: 'none', fontWeight: 500 }}
                      >
                        📎 View Attachment
                      </a>
                    </div>
                  )}

                  {/* Reviewer Section */}
                  {(report.reviewer_notes || report.reviewed_by) && (
                    <div style={{ 
                      marginTop: '0.75rem', 
                      paddingTop: '0.75rem', 
                      borderTop: '1px dashed var(--color-border)',
                      fontSize: '0.825rem'
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                        Reviewer Remarks:
                      </div>
                      <div style={{ color: 'var(--color-text)', fontStyle: 'italic', marginBottom: '0.25rem' }}>
                        "{report.reviewer_notes || 'No remarks provided.'}"
                      </div>
                      {report.reviewer && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'right' }}>
                          — Reviewed by {report.reviewer.first_name} {report.reviewer.last_name} ({report.reviewer.role})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {(!reports || reports.length === 0) && (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No reports submitted yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
