import { createClient } from '@/utils/supabase/server'

export default async function StaffPage() {
  const supabase = await createClient()

  // Verify Admin access
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
  const role = profile?.role
  
  if (role !== 'System Admin' && role !== 'Director' && role !== 'Principal') {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
      </div>
    )
  }

  // Fetch staff joining with profiles
  const { data: staff, error } = await supabase
    .from('staff')
    .select(`
      *,
      profiles(first_name, last_name, email, role)
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Staff Directory</h1>
        <button className="btn btn-primary">+ Assign Staff Record</button>
      </div>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Employee ID</th>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>Role & Title</th>
              <th style={{ padding: '1rem' }}>Department</th>
            </tr>
          </thead>
          <tbody>
            {staff?.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem', fontWeight: 600 }}>{s.employee_id}</td>
                <td style={{ padding: '1rem' }}>{s.profiles?.first_name} {s.profiles?.last_name}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ fontWeight: 500 }}>{s.profiles?.role}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.job_title}</div>
                </td>
                <td style={{ padding: '1rem' }}>{s.department || 'N/A'}</td>
              </tr>
            ))}
            
            {(!staff || staff.length === 0) && (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No staff records found. (Create a User with a staff role first, then assign them).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
