import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { normalizeRoles, type Role, hasAnyRole } from './roles'

export const getSessionUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { user: null, profile: null, roles: [] as Role[], supabase }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, roles, force_pin_change')
    .eq('id', user.id)
    .single()

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
