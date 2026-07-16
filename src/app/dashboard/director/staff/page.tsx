import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'

export default async function DirectorStaffPage() {
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

  // Fetch all profiles that are staff but don't have a record in staff table yet
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role')
    .neq('role', 'Student')
    .neq('role', 'Parent')

  // Fetch existing staff
  const { data: staffList } = await supabase
    .from('staff')
    .select(`
      *,
      profiles(first_name, last_name, email, role)
    `)
    .order('created_at', { ascending: false })

  const assignedIds = new Set((staffList || []).map(s => s.id))
  const unassignedProfiles = (allProfiles || []).filter(p => !assignedIds.has(p.id))

  // Server Action to create staff record
  async function handleCreateStaffRecord(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const profileId = formData.get('profileId') as string
    const employeeId = formData.get('employeeId') as string
    const jobTitle = formData.get('jobTitle') as string
    const department = formData.get('department') as string
    const employmentStatus = formData.get('employmentStatus') as string
    const salaryVal = parseFloat(formData.get('basicSalary') as string)

    if (!profileId || !employeeId) return

    // 1. Insert into staff table
    const { error: staffError } = await supabase
      .from('staff')
      .insert({
        id: profileId,
        employee_id: employeeId,
        job_title: jobTitle,
        department,
        employment_status: employmentStatus || 'Full-Time'
      })

    if (staffError) {
      console.error('Error inserting staff:', staffError.message)
      return
    }

    // 2. Insert into salary_settings table
    if (!isNaN(salaryVal)) {
      const { error: salaryError } = await supabase
        .from('salary_settings')
        .insert({
          employee_id: profileId,
          basic_salary: salaryVal,
          allowances: 0,
          deductions: 0
        })
      if (salaryError) {
        console.error('Error setting salary:', salaryError.message)
      }
    }

    revalidatePath('/dashboard/director/staff')
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
        Staff Records Setup
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left column: Assign Form */}
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-lg)' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Assign New Staff Record</h2>
          
          {unassignedProfiles.length > 0 ? (
            <form action={handleCreateStaffRecord} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Select Staff Member</label>
                <select name="profileId" className="input-field" required>
                  <option value="">-- Choose Profile --</option>
                  {unassignedProfiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} ({p.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <input type="text" name="employeeId" placeholder="e.g. EMP-1092" className="input-field" required />
              </div>

              <div className="form-group">
                <label className="form-label">Job Title</label>
                <input type="text" name="jobTitle" placeholder="e.g. History Teacher" className="input-field" required />
              </div>

              <div className="form-group">
                <label className="form-label">Department</label>
                <select name="department" className="input-field" required>
                  <option value="Academics">Academics</option>
                  <option value="Finance">Finance</option>
                  <option value="Administration">Administration</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Employment Status</label>
                <select name="employmentStatus" className="input-field" required>
                  <option value="Full-Time">Full-Time</option>
                  <option value="Part-Time">Part-Time</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Starting Basic Salary (TZS)</label>
                <input type="number" name="basicSalary" defaultValue="1500000" className="input-field" required />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                Assign & Setup Staff
              </button>
            </form>
          ) : (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
              All school profiles with staff roles have already been assigned records. Create a new user first.
            </p>
          )}
        </div>

        {/* Right column: Assigned List */}
        <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(0,0,0,0.02)', fontWeight: 600 }}>
            Assigned School Staff ({staffList?.length || 0})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgba(0,0,0,0.01)', borderBottom: '2px solid var(--color-border)' }}>
                  <th style={{ padding: '1rem' }}>Emp ID</th>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>Department & Role</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {staffList?.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{s.employee_id}</td>
                    <td style={{ padding: '1rem', fontWeight: 500 }}>
                      {s.profiles?.first_name} {s.profiles?.last_name}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-primary)' }}>
                        {s.department}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {s.job_title} ({s.profiles?.role})
                      </div>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600,
                        backgroundColor: s.employment_status === 'Full-Time' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: s.employment_status === 'Full-Time' ? 'var(--color-success)' : 'var(--color-warning)'
                      }}>
                        {s.employment_status}
                      </span>
                    </td>
                  </tr>
                ))}

                {(!staffList || staffList.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No staff records setup yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
