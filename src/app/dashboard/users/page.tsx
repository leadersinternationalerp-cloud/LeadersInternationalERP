import { createClient } from '@/utils/supabase/server'
import { CreateUserForm } from './CreateUserForm'
import { UserTable } from './UserTable'
import { type User } from './types'

export default async function UsersPage() {
  const supabase = await createClient()
  
  // Verify if current user is an admin
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', user?.id)
    .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])
    
  const isAdmin = userRoles.includes('System Admin') || userRoles.includes('Director')
  
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

  const typedUsers: User[] = (users || []).map((u) => ({
    id: u.id,
    first_name: u.first_name || '',
    last_name: u.last_name || '',
    email: u.email || '',
    username: u.username || '',
    role: u.role || '',
    is_active: u.is_active ?? true,
    created_at: u.created_at
  }))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>User Management</h1>
        <CreateUserForm />
      </div>

      <UserTable users={typedUsers} currentUserId={user?.id} />
    </div>
  )
}
