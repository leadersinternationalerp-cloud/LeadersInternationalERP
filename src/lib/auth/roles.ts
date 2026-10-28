export const ROLES = [
  'System Admin',
  'Director',
  'Principal',
  'Dean',
  'HOS',
  'Head of Section',
  'Accountant',
  'Teacher',
  'Student',
  'Parent'
] as const

export type Role = (typeof ROLES)[number]

export function normalizeRoles(profile: { role?: string | null; roles?: string[] | null } | null): Role[] {
  if (!profile) return []
  if (Array.isArray(profile.roles) && profile.roles.length) {
    return profile.roles.filter(r => (ROLES as readonly string[]).includes(r)) as Role[]
  }
  if (!profile.role) return []
  return profile.role
    .split(',')
    .map(r => r.trim())
    .filter(r => (ROLES as readonly string[]).includes(r)) as Role[]
}

export function hasAnyRole(userRoles: Role[], allowedRoles: readonly (Role | string)[]): boolean {
  if (userRoles.includes('System Admin')) return true
  return userRoles.some(r => allowedRoles.includes(r))
}
