import { normalizeRoles, type Role } from '@/lib/auth/roles'

export type SchoolWing = 'Cambridge' | 'NECTA'
export type UserWingAssignment = 'Cambridge' | 'NECTA' | 'Both'
export type WingFilterValue = 'all' | 'Cambridge' | 'NECTA'

export const WING_COOKIE_NAME = 'lis_wing_filter'

export const CROSS_WING_ROLES: readonly Role[] = [
  'System Admin',
  'Director',
  'Principal',
  'Accountant',
  'Receptionist',
] as const

export function isCrossWingRole(roles: readonly (Role | string)[]): boolean {
  return roles.some((r) => (CROSS_WING_ROLES as readonly string[]).includes(r))
}

/**
 * Infers whether a class, student, fee item, or application belongs to the
 * 'Cambridge' or 'NECTA' wing.
 */
export function inferWing(
  input:
    | {
        wing?: string | null
        curriculum?: string | null
        grade_level?: string | null
        class_name?: string | null
        name?: string | null
        class_applied_for?: string | null
      }
    | string
    | null
    | undefined
): SchoolWing {
  if (!input) return 'Cambridge'

  if (typeof input === 'string') {
    const lower = input.toLowerCase().trim()
    if (lower.includes('necta')) return 'NECTA'
    if (lower.includes('cambridge') || lower.includes('igcse') || lower.includes('stage')) {
      return 'Cambridge'
    }
    if (
      lower.includes('standard') ||
      lower.includes('primary') ||
      lower.includes('grade') ||
      lower.includes('baby') ||
      lower.includes('nursery')
    ) {
      return 'NECTA'
    }
    if (lower.includes('year')) return 'Cambridge'
    return 'NECTA'
  }

  // Check explicit wing / curriculum fields first
  const explicit = (input.wing || input.curriculum || '').toLowerCase().trim()
  if (explicit === 'cambridge' || explicit.includes('cambridge')) return 'Cambridge'
  if (explicit === 'necta' || explicit.includes('necta')) return 'NECTA'

  // Fallback to grade_level / class_name / name / class_applied_for
  const label = (
    input.grade_level ||
    input.class_name ||
    input.class_applied_for ||
    input.name ||
    ''
  )
    .toLowerCase()
    .trim()

  if (!label) return 'Cambridge'
  if (label.includes('necta')) return 'NECTA'
  if (label.includes('cambridge') || label.includes('igcse') || label.includes('stage')) {
    return 'Cambridge'
  }
  if (
    label.includes('standard') ||
    label.includes('primary') ||
    label.includes('grade') ||
    label.includes('baby') ||
    label.includes('nursery')
  ) {
    return 'NECTA'
  }
  if (label.includes('year')) return 'Cambridge'
  return 'NECTA'
}

export function matchesWingFilter(
  item: Parameters<typeof inferWing>[0],
  wingFilter: WingFilterValue | UserWingAssignment | string | null | undefined
): boolean {
  if (!wingFilter || wingFilter === 'all' || wingFilter === 'Both') return true
  const itemWing = inferWing(item)
  return itemWing.toLowerCase() === wingFilter.toLowerCase()
}

/**
 * Extracts a user's assigned wing from their profile row (checks both
 * `profile.wing` and `Wing:*` tags inside `profile.roles`).
 */
export function extractWingFromProfile(
  profile:
    | {
        wing?: string | null
        role?: string | null
        roles?: string[] | null
      }
    | null
    | undefined
): UserWingAssignment {
  if (!profile) return 'Both'

  const rawWing = (profile.wing || '').trim()
  if (rawWing.toLowerCase() === 'cambridge') return 'Cambridge'
  if (rawWing.toLowerCase() === 'necta') return 'NECTA'

  if (Array.isArray(profile.roles)) {
    for (const r of profile.roles) {
      if (typeof r !== 'string') continue
      const lower = r.toLowerCase().trim()
      if (lower === 'wing:cambridge') return 'Cambridge'
      if (lower === 'wing:necta') return 'NECTA'
      if (lower === 'wing:both') return 'Both'
    }
  }

  return 'Both'
}

/**
 * Encodes normalized roles + optional Wing tag into the `profiles.roles` text[] array
 * so wing assignments persist even before `profiles.wing` migration is applied.
 */
export function encodeRolesWithWing(
  roleInput: { role?: string | null; roles?: string[] | null },
  wing?: UserWingAssignment | string | null
): string[] {
  const baseRoles = normalizeRoles(roleInput)
  const cleanWing =
    wing?.toLowerCase() === 'cambridge'
      ? 'Cambridge'
      : wing?.toLowerCase() === 'necta'
        ? 'NECTA'
        : 'Both'

  if (cleanWing === 'Cambridge' || cleanWing === 'NECTA') {
    return [...baseRoles, `Wing:${cleanWing}`]
  }
  return [...baseRoles]
}
