import { createClient } from '@/utils/supabase/server'
import { CreateUserForm } from './CreateUserForm'

export default async function UsersPage() {
  const supabase = await createClient()
  
  // Verify if current user is an admin
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .single()
    
  const isAdmin = profile?.role === 'System Admin' || profile?.role === 'Director'
  
  // Fetch all profiles
  const { data: users, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (!isAdmin) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>User Management</h1>
        <CreateUserForm />
      </div>

      <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--color-border)' }}>
              <th style={{ padding: '1rem' }}>Name</th>
              <th style={{ padding: '1rem' }}>Email</th>
              <th style={{ padding: '1rem' }}>Role</th>
              <th style={{ padding: '1rem' }}>Status</th>
              <th style={{ padding: '1rem' }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                <td style={{ padding: '1rem' }}>{u.first_name} {u.last_name}</td>
                <td style={{ padding: '1rem' }}>{u.email}</td>
                <td style={{ padding: '1rem' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    backgroundColor: 'rgba(59, 179, 195, 0.1)',
                    color: 'var(--color-secondary)'
                  }}>
                    {u.role}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  {u.is_active ? (
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Active</span>
                  ) : (
                    <span style={{ color: 'var(--color-error)', fontWeight: 600 }}>Inactive</span>
                  )}
                </td>
                <td style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            
            {users?.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
