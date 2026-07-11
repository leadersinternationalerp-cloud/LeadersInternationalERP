import { createClient } from '@/utils/supabase/server'
import { generatePayrollAction, submitPayrollAction } from './actions'
import { formatDate } from '@/utils/date'
import Link from 'next/link'

export default async function AccountantPayrollPage({
  searchParams
}: {
  searchParams: Promise<{ payroll_id?: string }>
}) {
  const supabase = await createClient()

  // Verify Accountant/Admin role
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  if (!userRoles.includes('Accountant') && !userRoles.includes('System Admin')) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  // Fetch existing payroll sheets
  const { data: payrollSheets } = await supabase
    .from('payrolls')
    .select(`
      *,
      submittedBy:submitted_by (first_name, last_name)
    `)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  const sheets = payrollSheets || []

  // Handle selected sheet details
  const params = await searchParams
  const selectedId = params.payroll_id || (sheets.length > 0 ? sheets[0].id : null)

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

  // Action wrappers
  async function handleGenerate(formData: FormData) {
    'use server'
    const month = parseInt(formData.get('month') as string)
    const year = parseInt(formData.get('year') as string)
    const notes = formData.get('notes') as string
    if (!isNaN(month) && !isNaN(year)) {
      await generatePayrollAction(month, year, notes)
    }
  }

  async function handleSubmit(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    if (id) {
      await submitPayrollAction(id)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Payroll & Salaries Management
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: List and Generation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Generate Draft Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Generate Monthly Payroll</h2>
            <form action={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Month</label>
                  <select name="month" className="input-field" required defaultValue={new Date().getMonth() + 1}>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {new Date(0, i).toLocaleString('en-US', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Year</label>
                  <select name="year" className="input-field" required defaultValue={new Date().getFullYear()}>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Accountant Notes</label>
                <input type="text" name="notes" placeholder="Remarks for this period..." className="input-field" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Generate Payroll Draft
              </button>
            </form>
          </div>

          {/* Payroll Sheets List */}
          <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
              Payroll Sheets History
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {sheets.map(sheet => {
                const monthName = new Date(0, sheet.month - 1).toLocaleString('en-US', { month: 'short' })
                const isSelected = sheet.id === selectedId
                return (
                  <Link
                    key={sheet.id}
                    href={`/dashboard/accountant/payroll?payroll_id=${sheet.id}`}
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

              {sheets.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '2rem' }}>
                  No payroll history recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Sheet Details & Individual Payslips */}
        {selectedSheet ? (
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', borderBottom: '1px solid var(--color-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.35rem', margin: 0 }}>
                  Payroll Details: {new Date(0, selectedSheet.month - 1).toLocaleString('en-US', { month: 'long' })} {selectedSheet.year}
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  Status: <strong>{selectedSheet.status.replace('_', ' ')}</strong>
                </p>
              </div>

              {selectedSheet.status === 'Draft' && (
                <form action={handleSubmit}>
                  <input type="hidden" name="id" value={selectedSheet.id} />
                  <button type="submit" className="btn btn-primary" style={{ backgroundColor: 'var(--color-secondary)' }}>
                    Submit to Principal
                  </button>
                </form>
              )}
            </div>

            {/* Notes Display */}
            {selectedSheet.accountant_notes && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                <strong>Accountant Notes:</strong> "{selectedSheet.accountant_notes}"
              </div>
            )}
            {selectedSheet.principal_notes && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(245, 158, 11, 0.05)', borderLeft: '3px solid var(--color-warning)', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                <strong>Principal Recommendations:</strong> "{selectedSheet.principal_notes}"
              </div>
            )}
            {selectedSheet.director_notes && (
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.05)', borderLeft: '3px solid var(--color-success)', borderRadius: '4px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                <strong>Director Recommendations:</strong> "{selectedSheet.director_notes}"
              </div>
            )}

            {/* Payslips breakdown */}
            <h3 style={{ fontSize: '1.05rem', marginBottom: '1rem' }}>Employee Salaries Breakdown</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {selectedPayslips.map((pay) => (
                <div key={pay.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {pay.employee?.first_name} {pay.employee?.last_name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Role: {pay.employee?.role || 'Staff'} • Status: {pay.status}
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                    {formatTZS(Number(pay.net_salary))}
                  </div>
                </div>
              ))}

              {selectedPayslips.length === 0 && (
                <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1rem' }}>
                  No payslips generated for this period.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '3rem', borderRadius: 'var(--radius-lg)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            Select a payroll sheet from the history or generate a new draft to view details.
          </div>
        )}
      </div>
    </div>
  )
}
