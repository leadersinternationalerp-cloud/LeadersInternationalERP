import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { normalizeRoles, type Role, hasAnyRole } from './roles'
import {
  extractWingFromProfile,
  inferWing,
  isCrossWingRole,
  type SchoolWing,
  type UserWingAssignment,
} from '@/lib/wing'
import {
  buildCacheKey,
  CACHE_TTL,
  getOrSetCache,
  invalidateCachePrefix,
} from '@/lib/cache/redisCache'

export type ApiUser = {
  id: string
  email: string | null
  roles: Role[]
  wing: UserWingAssignment
}

export interface ResolvedUserProfileWing {
  profile: any | null
  roles: Role[]
  assignedWing: UserWingAssignment
}

async function computeAssignedWing(
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
      .select('id, grade_level, section')
      .eq('id', userId)
      .maybeSingle()
    if (studentRow) {
      return inferWing(studentRow)
    }
  } else if (roles.includes('Parent')) {
    const { data: links } = await supabase
      .from('student_parents')
      .select('students:student_id(id, grade_level, section)')
      .eq('parent_id', userId)

    const wings = new Set<SchoolWing>()
    ;(links || []).forEach((l: any) => {
      const s = Array.isArray(l.students) ? l.students[0] : l.students
      if (s) wings.add(inferWing(s))
    })
    if (wings.size === 1) {
      return Array.from(wings)[0]
    }
  } else if (roles.includes('Teacher')) {
    const [subjClasses, homeroomClasses] = await Promise.all([
      supabase
        .from('class_subjects')
        .select('classes:class_id(id, name, section)')
        .eq('teacher_id', userId),
      supabase
        .from('classes')
        .select('id, name, section')
        .eq('class_teacher_id', userId),
    ])

    const wings = new Set<SchoolWing>()
    ;(subjClasses.data || []).forEach((r: any) => {
      const cls = Array.isArray(r.classes) ? r.classes[0] : r.classes
      if (cls) wings.add(inferWing(cls))
    })
    ;(homeroomClasses.data || []).forEach((cls: any) => {
      if (cls) wings.add(inferWing(cls))
    })
    if (wings.size === 1) {
      return Array.from(wings)[0]
    }
  }

  return 'Both'
}

/**
 * Resolves and caches a user's profile, roles, and assigned wing.
 * Uses both React.cache (request-scoped) and a 30-second server cache
 * so middleware, layout.tsx, and page.tsx do not repeatedly query `profiles`.
 */
export const resolveUserProfileAndWing = cache(
  async (userId: string, providedProfile?: any): Promise<ResolvedUserProfileWing> => {
    const cacheKey = buildCacheKey('auth:profile', [userId])
    return getOrSetCache(cacheKey, CACHE_TTL.AUTH_PROFILE, async () => {
      const supabase = await createClient()
      let profile = providedProfile
      if (!profile || profile.first_name === undefined) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle()
        profile = prof
      }
      const roles = normalizeRoles(profile)
      const assignedWing = await computeAssignedWing(supabase, userId, profile, roles)
      return {
        profile: profile || null,
        roles,
        assignedWing,
      }
    })
  }
)

export async function invalidateUserAuthCache(userId?: string) {
  if (userId) {
    await Promise.all([
      invalidateCachePrefix(buildCacheKey('auth:profile', [userId])),
      invalidateCachePrefix(buildCacheKey('auth:roles', [userId])),
    ])
  } else {
    await Promise.all([
      invalidateCachePrefix('auth:profile'),
      invalidateCachePrefix('auth:roles'),
    ])
  }
}

export const getApiUser = cache(async (): Promise<ApiUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { profile, roles, assignedWing } = await resolveUserProfileAndWing(user.id)

  if (profile?.is_active === false) return null // deactivated users lose access immediately

  return { id: user.id, email: user.email ?? null, roles, wing: assignedWing }
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

  const { profile, roles, assignedWing } = await resolveUserProfileAndWing(user.id)

  if (profile?.is_active === false) {
    return {
      user: null,
      profile: null,
      roles: [] as Role[],
      wing: 'Both' as UserWingAssignment,
      supabase,
    }
  }

  return { user, profile, roles, wing: assignedWing, supabase }
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
