'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { logAuditAction } from '@/utils/audit'
import { type FormState } from './CreateUserForm'

export async function createUserAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    return { error: 'Service role key not configured. Cannot create users.' }
  }

  // Create an admin client bypassing RLS to create Auth users
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const first_name = formData.get('first_name') as string
  const last_name = formData.get('last_name') as string
  const role = formData.get('role') as string

  if (!email || !password || !first_name || !last_name || !role) {
    return { error: 'All fields are required' }
  }

  try {
    // Verify if caller is authorized
    const supabase = await createServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      throw new Error('Unauthorized')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', currentUser.id)
      .single()
  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

    const isAdmin = userRoles.includes('System Admin') || userRoles.includes('Director')
    if (!isAdmin) {
      throw new Error('Access denied: Insufficient permissions')
    }

    // 1. Create the user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto confirm for internal systems
      user_metadata: {
        first_name,
        last_name,
        role
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    // 2. Insert into the public.profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        first_name,
        last_name,
        email,
        role,
        roles: role.split(',').map((r: string) => r.trim()),
        is_active: true
      })

    if (profileError) {
      // Rollback auth user creation if profile insert fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    // 3. Log Audit
    await logAuditAction(
      currentUser.id,
      'CREATE_USER',
      'profiles',
      { targetUserId: authData.user.id, email, first_name, last_name, role }
    )

    revalidatePath('/dashboard/users')
    return { success: true, error: null }
  } catch (error: any) {
    return { error: error.message || 'An error occurred during user creation' }
  }
}

export async function updateUserAction(
  userId: string,
  first_name: string,
  last_name: string,
  role: string,
  email: string
): Promise<{ success: boolean; error: string | null }> {
  // 1. Authorize: Check if the caller is an Admin or Director
  const supabase = await createServerClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, error: 'Unauthorized' }
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', currentUser.id)
    .single()

  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  const isAdmin = userRoles.includes('System Admin') || userRoles.includes('Director')
  if (!isAdmin) {
    return { success: false, error: 'Access denied: Insufficient permissions' }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { success: false, error: 'Service role key not configured. Cannot update users.' }
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // 2. Update user in Supabase Auth (role / email changes need admin bypass)
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email,
      user_metadata: {
        first_name,
        last_name,
        role
      },
      email_confirm: true
    })

    if (authError) throw authError

    // 3. Update profiles table
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        first_name,
        last_name,
        role,
        roles: role.split(',').map((r: string) => r.trim()),
        email
      })
      .eq('id', userId)

    if (profileError) throw profileError

    // 4. Log Audit
    await logAuditAction(
      currentUser.id,
      'UPDATE_USER',
      'profiles',
      { targetUserId: userId, first_name, last_name, role, email }
    )

    revalidatePath('/dashboard/users')
    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: error.message || 'An error occurred during user update' }
  }
}

export async function toggleUserStatusAction(
  userId: string,
  active: boolean
): Promise<{ success: boolean; error: string | null }> {
  // 1. Authorize: Check if the caller is an Admin or Director
  const supabase = await createServerClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, error: 'Unauthorized' }
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', currentUser.id)
    .single()

  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  const isAdmin = userRoles.includes('System Admin') || userRoles.includes('Director')
  if (!isAdmin) {
    return { success: false, error: 'Access denied: Insufficient permissions' }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { success: false, error: 'Service role key not configured. Cannot toggle user status.' }
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // 2. Update profiles table is_active column
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: active })
      .eq('id', userId)

    if (profileError) throw profileError

    // 3. Ban/unban in auth admin API
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: active ? 'none' : '87600h'
    })

    if (authError) throw authError

    // 4. Log Audit
    await logAuditAction(
      currentUser.id,
      active ? 'ACTIVATE_USER' : 'SUSPEND_USER',
      'profiles',
      { targetUserId: userId, is_active: active }
    )

    revalidatePath('/dashboard/users')
    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: error.message || 'An error occurred during status toggle' }
  }
}

export async function resetUserPasswordAction(
  userId: string,
  password: string
): Promise<{ success: boolean; error: string | null }> {
  // 1. Authorize: Check if the caller is an Admin or Director
  const supabase = await createServerClient()
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, error: 'Unauthorized' }
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', currentUser.id)
    .single()

  const userRoles = profile?.roles && Array.isArray(profile.roles) && profile.roles.length > 0
    ? profile.roles
    : (profile?.role ? profile.role.split(',').map((r: string) => r.trim()) : [])

  const isAdmin = userRoles.includes('System Admin') || userRoles.includes('Director')
  if (!isAdmin) {
    return { success: false, error: 'Access denied: Insufficient permissions' }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return { success: false, error: 'Service role key not configured. Cannot reset user password.' }
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    // 2. Reset user password directly
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password
    })

    if (authError) throw authError

    // 3. Log Audit
    await logAuditAction(
      currentUser.id,
      'RESET_USER_PASSWORD',
      'profiles',
      { targetUserId: userId }
    )

    revalidatePath('/dashboard/users')
    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: error.message || 'An error occurred during password reset' }
  }
}
