import { createClient } from '@/utils/supabase/server'
import { principalReviewPayrollAction } from '../../accountant/payroll/actions'
import Link from 'next/link'

export default async function PrincipalPayrollReviewPage({
  searchParams
}: {
  searchParams: Promise<{ payroll_id?: string }>
}) {
  const supabase = await createClient()

  // Verify Principal/Admin access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Principal') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  // Fetch submitted payroll sheets for review
  const { data: payrollSheets } = await supabase
    .from('payrolls')
    .select(`
      *,
      submittedBy:submitted_by (first_name, last_name)
    `)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  const sheets = payrollSheets || []

  // Pending for Principal are those with status "Submitted"
  const pendingSheets = sheets.filter(s => s.status === 'Submitted')
  const reviewedSheets = sheets.filter(s => s.status !== 'Draft' && s.status !== 'Submitted')

  // Selected sheet details
  const params = await searchParams
  const selectedId = params.payroll_id || (pendingSheets.length > 0 ? pendingSheets[0].id : null)

  let selectedSheet = null
  let selectedPayslips: any[] = []

  if (selectedId) {
    selectedSheet = sheets.find(s => s.id === selectedId) || null
    if (selectedSheet) {
      const { data: payslips } = await supabase
        .from('payslips')
        .select(`
          *,
          employee:employee_id (first_name, last_name, role)
        `)
        .eq('month', selectedSheet.month)
        .eq('year', selectedSheet.year)
      
      selectedPayslips = payslips || []
    }
  }

  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val)
  }

  // Action handlers
  async function handleApprove(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const notes = formData.get('notes') as string
    if (id) {
      await principalReviewPayrollAction(id, true, notes)
    }
  }

  async function handleDecline(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    const notes = formData.get('notes') as string
    if (id) {
      await principalReviewPayrollAction(id, false, notes)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Staff Payroll Sheets Review
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Pending Reviews */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(245, 158, 11, 0.05)', fontWeight: 600, color: 'var(--color-warning)' }}>
              Awaiting Principal Review ({pendingSheets.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pendingSheets.map(sheet => {
                const monthName = new Date(0, sheet.month - 1).toLocaleString('en-US', { month: 'short' })
                const isSelected = sheet.id === selectedId
                return (
                  <Link
                    key={sheet.id}
                    href={`/dashboard/principal/payrolls?payroll_id=${sheet.id}`}
                    style={{
                      display: 'block', padding: '1rem', borderBottom: '1px solid var(--color-border)', textDecoration: 'none',
                      backgroundColor: isSelected ? 'rgba(59, 179, 195, 0.05)' : 'transparent',
                      color: 'var(--color-text)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{monthName} {sheet.year}</span>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Prepared by: {sheet.submittedBy?.first_name}
                      </span>
                    </div>
                  </Link>
                )
              })}

              {pendingSheets.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                  No payroll sheets awaiting review.
                </p>
              )}
            </div>
          </div>

          {/* Reviewed Sheets */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
              Reviewed Decisions History
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {reviewedSheets.map(sheet => {
                const monthName = new Date(0, sheet.month - 1).toLocaleString('en-US', { month: 'short' })
                const isSelected = sheet.id === selectedId
                return (
                  <Link
                    key={sheet.id}
                    href={`/dashboard/principal/payrolls?payroll_id=${sheet.id}`}
                    style={{
                      display: 'block', padding: '1rem', borderBottom: '1px solid var(--color-border)', textDecoration: 'none',
                      backgroundColor: isSelected ? 'rgba(59, 179, 195, 0.05)' : 'transparent',
                      color: 'var(--color-text)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{monthName} {sheet.year}</span>
                      <span style={{
                        padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                        backgroundColor: 
                          sheet.status.startsWith('Approved') ? 'rgba(16, 185, 129, 0.1)' : 
                          sheet.status.startsWith('Declined') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.05)',
                        color:
                          sheet.status.startsWith('Approved') ? 'var(--color-success)' : 
                          sheet.status.startsWith('Declined') ? 'var(--color-error)' : 'var(--color-text-muted)'
                      }}>
                        {sheet.status.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                )
              })}

              {reviewedSheets.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                  No reviewed payroll sheets.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Review Details & Form */}
        {selectedSheet ? (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', margin: 0 }}>
                Reviewing: {new Date(0, selectedSheet.month - 1).toLocaleString('en-US', { month: 'long' })} {selectedSheet.year}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                Prepared by: {selectedSheet.submittedBy ? `${selectedSheet.submittedBy.first_name} ${selectedSheet.submittedBy.last_name}` : 'Accountant'} • Current Status: <strong>{selectedSheet.status.replace('_', ' ')}</strong>
              </p>
            </div>

            {selectedSheet.accountant_notes && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                <strong>Accountant Notes:</strong> "{selectedSheet.accountant_notes}"
              </div>
            )}

            {/* Employee Breakdown */}
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Employee Salaries Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {selectedPayslips.map((pay) => (
                <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {pay.employee?.first_name} {pay.employee?.last_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Role: {pay.employee?.role || 'Staff'}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {formatTZS(Number(pay.net_salary))}
                  </div>
                </div>
              ))}
            </div>

            {/* Principal Review Input Form */}
            {selectedSheet.status === 'Submitted' ? (
              <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                <input type="hidden" name="id" value={selectedSheet.id} />
                <div className="form-group">
                  <label className="form-label">Review Remarks / Recommendations</label>
                  <textarea name="notes" placeholder="Specify any comments, adjustments, or recommendations..." className="input-field" style={{ minHeight: '80px', resize: 'vertical' }} required />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button formAction={handleDecline} className="btn" style={{ flex: 1, backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--color-error)' }}>
                    Decline & Return
                  </button>
                  <button formAction={handleApprove} className="btn btn-primary" style={{ flex: 2 }}>
                    Approve & Forward to Director
                  </button>
                </div>
              </form>
            ) : (
              <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
                {selectedSheet.principal_notes && (
                  <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <strong>Principal Decision Remarks:</strong> "{selectedSheet.principal_notes}"
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '3rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Select a payroll sheet from the history lists to review details.
          </div>
        )}
      </div>
    </div>
  )
}
