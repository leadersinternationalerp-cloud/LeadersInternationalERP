import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export default async function SalarySetupPage() {
  const supabase = await createClient()

  // Verify Accountant/Admin access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()

  if (profile?.role !== 'Accountant' && profile?.role !== 'System Admin') {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  // Fetch all staff profiles and their salary settings
  const { data: staffList } = await supabase
    .from('staff')
    .select(`
      *,
      profiles(id, first_name, last_name, role)
    `)

  const { data: salarySettings } = await supabase
    .from('salary_settings')
    .select('*')

  const settingsMap = new Map((salarySettings || []).map(s => [s.employee_id, s]))

  const staffSalaries = (staffList || []).map(s => {
    const setting = settingsMap.get(s.id)
    return {
      employeeId: s.id,
      employeeNumber: s.employee_id,
      name: `${s.profiles?.first_name} ${s.profiles?.last_name}`,
      role: s.profiles?.role || 'Staff',
      basicSalary: setting ? setting.basic_salary : 1500000, // fallback default
      allowances: setting ? setting.allowances : 0,
      deductions: setting ? setting.deductions : 0
    }
  })

  // Format currency
  const formatTZS = (val: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val)
  }

  // Server Action to update salary settings
  async function handleSaveSalarySettings(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const employeeId = formData.get('employeeId') as string
    const basicSalary = parseFloat(formData.get('basicSalary') as string)
    const allowances = parseFloat(formData.get('allowances') as string)
    const deductions = parseFloat(formData.get('deductions') as string)

    if (!employeeId || isNaN(basicSalary)) return

    const { error } = await supabase
      .from('salary_settings')
      .upsert({
        employee_id: employeeId,
        basic_salary: basicSalary,
        allowances: isNaN(allowances) ? 0 : allowances,
        deductions: isNaN(deductions) ? 0 : deductions,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error saving salary settings:', error.message)
    }

    revalidatePath('/dashboard/accountant/payroll/salary-setup')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--color-primary)' }}>Salary Settings (Setup)</h1>
        <Link href="/dashboard/accountant/payroll" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to Payrolls
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Setup form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>Configure Employee Salary</h2>
          <form action={handleSaveSalarySettings} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Employee</label>
              <select name="employeeId" className="input-field" required>
                <option value="">-- Choose Employee --</option>
                {staffSalaries.map(emp => (
                  <option key={emp.employeeId} value={emp.employeeId}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Basic Salary (TZS)</label>
              <input type="number" name="basicSalary" defaultValue="1500000" className="input-field" required min={0} />
            </div>

            <div className="form-group">
              <label className="form-label">Monthly Allowances (TZS)</label>
              <input type="number" name="allowances" defaultValue="0" className="input-field" required min={0} />
            </div>

            <div className="form-group">
              <label className="form-label">Monthly Deductions (TZS)</label>
              <input type="number" name="deductions" defaultValue="0" className="input-field" required min={0} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Save Salary Setup
            </button>
          </form>
        </div>

        {/* Salary List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Employee Salary Configurations
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.01)', borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '1rem' }}>ID & Name</th>
                  <th style={{ padding: '1rem' }}>Basic Salary</th>
                  <th style={{ padding: '1rem' }}>Allowances</th>
                  <th style={{ padding: '1rem' }}>Deductions</th>
                  <th style={{ padding: '1rem' }}>Net Pay</th>
                </tr>
              </thead>
              <tbody>
                {staffSalaries.map((emp) => {
                  const netPay = emp.basicSalary + emp.allowances - emp.deductions
                  return (
                    <tr key={emp.employeeId} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{emp.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                          {emp.employeeNumber} • {emp.role}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }}>{formatTZS(emp.basicSalary)}</td>
                      <td style={{ padding: '1rem', color: 'var(--color-success)' }}>+{formatTZS(emp.allowances)}</td>
                      <td style={{ padding: '1rem', color: 'var(--color-error)' }}>-{formatTZS(emp.deductions)}</td>
                      <td style={{ padding: '1rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        {formatTZS(netPay)}
                      </td>
                    </tr>
                  )}
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
