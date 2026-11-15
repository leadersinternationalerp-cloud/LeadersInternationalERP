import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { normalizeRoles, type Role, hasAnyRole } from './roles'
import {
  extractWingFromProfile,
  inferWing,
  isCrossWingRole,
  type UserWingAssignment,
} from '@/lib/wing'

export type ApiUser = {
  id: string
  email: string | null
  roles: Role[]
  wing: UserWingAssignment
}

async function resolveAssignedWing(
  supabase: any,
  userId: string,
  profile: any,
  roles: Role[]
): Promise<UserWingAssignment> {
  if (isCrossWingRole(roles)) return 'Both'

  const profWing = extractWingFromProfile(profile)
  if (profWing === 'Cambridge' || profWing === 'NECTA') {
    return profWing
  }

  if (roles.includes('Student')) {
    const { data: studentRow } = await supabase
      .from('students')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (studentRow) {
      return inferWing(studentRow)
    }
  }

  return 'Both'
}

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
  const roles = normalizeRoles(profile)
  const wing = await resolveAssignedWing(supabase, user.id, profile, roles)

  return { id: user.id, email: user.email ?? null, roles, wing }
})

export const getSessionUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return {
      user: null,
      profile: null,
      roles: [] as Role[],
      wing: 'Both' as UserWingAssignment,
      supabase,
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.is_active === false) {
    return {
      user: null,
      profile: null,
      roles: [] as Role[],
      wing: 'Both' as UserWingAssignment,
      supabase,
    }
  }

  const roles = normalizeRoles(profile)
  const wing = await resolveAssignedWing(supabase, user.id, profile, roles)
  return { user, profile, roles, wing, supabase }
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
