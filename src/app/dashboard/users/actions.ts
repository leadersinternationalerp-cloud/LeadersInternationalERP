'use server'
import { normalizeRoles } from '@/lib/auth/roles'
import { encodeRolesWithWing, isCrossWingRole, type UserWingAssignment } from '@/lib/wing'

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

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )

  const email = formData.get('email') as string
  const username = formData.get('username') as string
  const password = formData.get('password') as string
  const first_name = formData.get('first_name') as string
  const last_name = formData.get('last_name') as string
  const role = formData.get('role') as string
  const rawWing = (formData.get('wing') as string) || 'Both'
  const wing: UserWingAssignment = isCrossWingRole([role])
    ? 'Both'
    : rawWing === 'Cambridge'
      ? 'Cambridge'
      : rawWing === 'NECTA'
        ? 'NECTA'
        : 'Both'

  if (!email || !username || !password || !first_name || !last_name || !role) {
    return { error: 'All fields are required' }
  }

  try {
    const supabase = await createServerClient()
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser()
    if (!currentUser) {
      throw new Error('Unauthorized')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, roles')
      .eq('id', currentUser.id)
      .single()
    const userRoles = normalizeRoles(profile)

    const isAdmin = userRoles.includes('System Admin') || userRoles.includes('Director')
    if (!isAdmin) {
      throw new Error('Access denied: Insufficient permissions')
    }

    if (role !== 'System Admin') {
      const pinRegex = /^\d{6,10}$/
      if (!pinRegex.test(password)) {
        throw new Error('PIN must be a numeric code between 6 and 10 digits')
      }
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        role,
        wing,
        username,
      },
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('User creation failed')

    const encodedRoles = encodeRolesWithWing({ role }, wing)
    const profilePayload: Record<string, any> = {
      id: authData.user.id,
      first_name,
      last_name,
      email,
      username,
      role,
      roles: encodedRoles,
      wing,
      is_active: true,
    }

    let { error: profileError } = await supabaseAdmin.from('profiles').insert(profilePayload)

    // Fallback if wing column is not yet migrated on remote DB
    if (profileError && /wing/i.test(profileError.message)) {
      delete profilePayload.wing
      const retryWing = await supabaseAdmin.from('profiles').insert(profilePayload)
      profileError = retryWing.error
    }

    // Fallback if database enum user_role does not yet include the new role
    if (profileError && /invalid input value for enum user_role/i.test(profileError.message)) {
      const { role: _omittedRole, ...payloadWithoutEnumRole } = profilePayload
      const retry = await supabaseAdmin.from('profiles').insert(payloadWithoutEnumRole)
      profileError = retry.error
    }

    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      throw profileError
    }

    await logAuditAction('CREATE_USER', 'profiles', {
      targetUserId: authData.user.id,
      email,
      first_name,
      last_name,
      role,
      wing,
    })

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
  email: string,
  username?: string,
  wingInput?: UserWingAssignment
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createServerClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', currentUser.id)
    .single()

  const userRoles = normalizeRoles(profile)

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
        persistSession: false,
      },
    }
  )

  const wing: UserWingAssignment = isCrossWingRole([role])
    ? 'Both'
    : wingInput === 'Cambridge'
      ? 'Cambridge'
      : wingInput === 'NECTA'
        ? 'NECTA'
        : 'Both'

  try {
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      email,
      user_metadata: {
        first_name,
        last_name,
        role,
        wing,
        ...(username ? { username } : {}),
      },
      email_confirm: true,
    })

    if (authError) throw authError

    const encodedRoles = encodeRolesWithWing({ role }, wing)
    const updateData: any = {
      first_name,
      last_name,
      role,
      roles: encodedRoles,
      wing,
      email,
    }

    if (username) {
      updateData.username = username
    }

    let { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)

    // Fallback if wing column is not yet migrated on remote DB
    if (profileError && /wing/i.test(profileError.message)) {
      delete updateData.wing
      const retryWing = await supabaseAdmin
        .from('profiles')
        .update(updateData)
        .eq('id', userId)
      profileError = retryWing.error
    }

    if (profileError && /invalid input value for enum user_role/i.test(profileError.message)) {
      const { role: _omittedRole, ...updateWithoutEnumRole } = updateData
      const retry = await supabaseAdmin
        .from('profiles')
        .update(updateWithoutEnumRole)
        .eq('id', userId)
      profileError = retry.error
    }

    if (profileError) throw profileError

    await logAuditAction('UPDATE_USER', 'profiles', {
      targetUserId: userId,
      first_name,
      last_name,
      role,
      wing,
      email,
    })

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
  const supabase = await createServerClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', currentUser.id)
    .single()

  const userRoles = normalizeRoles(profile)

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
        persistSession: false,
      },
    }
  )

  try {
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: active })
      .eq('id', userId)

    if (profileError) throw profileError

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      ban_duration: active ? 'none' : '87600h',
    })

    if (authError) throw authError

    await logAuditAction(active ? 'ACTIVATE_USER' : 'SUSPEND_USER', 'profiles', {
      targetUserId: userId,
      is_active: active,
    })

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
  const supabase = await createServerClient()
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser()
  if (!currentUser) {
    return { success: false, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, roles')
    .eq('id', currentUser.id)
    .single()

  const userRoles = normalizeRoles(profile)

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
        persistSession: false,
      },
    }
  )

  try {
    const { data: targetProfile } = await supabaseAdmin
      .from('profiles')
      .select('roles, role')
      .eq('id', userId)
      .single()
    const targetRoles = normalizeRoles(targetProfile)

    const isTargetSystemAdmin = targetRoles.includes('System Admin')

    if (!isTargetSystemAdmin) {
      const pinRegex = /^[0-9]{6,10}$/
      if (!pinRegex.test(password)) {
        throw new Error('PIN must be a numeric code between 6 and 10 digits')
      }
    } else {
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long')
      }
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password,
    })

    if (authError) throw authError

    let pinHash = null
    if (!isTargetSystemAdmin) {
      const crypto = require('crypto')
      pinHash = crypto.createHash('sha256').update(password).digest('hex')
    }

    await supabaseAdmin.from('profiles').update({ pin_hash: pinHash }).eq('id', userId)

    await logAuditAction('RESET_USER_PASSWORD', 'profiles', { targetUserId: userId })

    revalidatePath('/dashboard/users')
    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: error.message || 'An error occurred during password reset' }
  }
}
