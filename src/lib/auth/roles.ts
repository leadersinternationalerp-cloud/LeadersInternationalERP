export const ROLES = [
  'System Admin',
  'Director',
  'Principal',
  'Dean',
  'Head of Section',
  'Accountant',
  'Teacher',
  'Student',
  'Parent',
] as const

export type Role = (typeof ROLES)[number]

const ALIASES: Record<string, Role> = {
  HOS: 'Head of Section',
  'head of section': 'Head of Section',
  hos: 'Head of Section',
  admin: 'System Admin',
  sysadmin: 'System Admin',
}

export function coerceRole(value: string | null | undefined): Role | null {
  if (!value) return null
  const trimmed = value.trim()
  if ((ROLES as readonly string[]).includes(trimmed)) return trimmed as Role
  const alias = ALIASES[trimmed] ?? ALIASES[trimmed.toLowerCase()]
  return alias ?? null
}

/** Single source of truth: accepts both the legacy comma string and the array. */
export function normalizeRoles(
  profile: { role?: string | null; roles?: string[] | null } | null | undefined
): Role[] {
  if (!profile) return []
  const fromArray = Array.isArray(profile.roles)
    ? profile.roles.map(coerceRole).filter((r): r is Role => r !== null)
    : []
  if (fromArray.length) return [...new Set(fromArray)]
  const fromLegacy = (profile.role ?? '')
    .split(',')
    .map((r) => coerceRole(r))
    .filter((r): r is Role => r !== null)
  return [...new Set(fromLegacy)]
}

export const STAFF_ROLES: Role[] = [
  'System Admin',
  'Director',
  'Principal',
  'Dean',
  'Head of Section',
  'Accountant',
  'Teacher',
]

export const MANAGEMENT_ROLES: Role[] = [
  'System Admin',
  'Director',
  'Principal',
  'Dean',
  'Head of Section',
]

export const ADMIN_ROLES: Role[] = ['System Admin', 'Director']
export const FINANCE_ROLES: Role[] = ['System Admin', 'Director', 'Principal', 'Accountant']

export const hasAny = (held: Role[], allowed: readonly Role[]): boolean => {
  if (held.includes('System Admin')) return true
  return held.some((r) => allowed.includes(r))
}

export const hasAnyRole = (userRoles: Role[], allowedRoles: readonly (Role | string)[]): boolean => {
  if (userRoles.includes('System Admin')) return true
  const coercedAllowed = allowedRoles.map((r) => coerceRole(r)).filter((r): r is Role => r !== null)
  return userRoles.some((r) => coercedAllowed.includes(r))
}
