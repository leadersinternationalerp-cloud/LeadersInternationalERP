import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { normalizeRoles, type Role, hasAnyRole } from './roles'

export type ApiUser = { id: string; email: string | null; roles: Role[] }

export const getApiUser = cache(async (): Promise<ApiUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.is_active === false) return null // deactivated users lose access immediately
  return { id: user.id, email: user.email ?? null, roles: normalizeRoles(profile) }
})

export const getSessionUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return { user: null, profile: null, roles: [] as Role[], supabase }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.is_active === false) {
    return { user: null, profile: null, roles: [] as Role[], supabase }
  }

  const roles = normalizeRoles(profile)
  return { user, profile, roles, supabase }
})

export async function requireUser() {
  const session = await getSessionUser()
  if (!session.user) {
    redirect('/login')
  }
  return session
}

export async function requireRole(allowedRoles: readonly (Role | string)[]) {
  const session = await requireUser()
  if (!hasAnyRole(session.roles, allowedRoles)) {
    redirect('/dashboard?denied=1')
  }
  return session
}
