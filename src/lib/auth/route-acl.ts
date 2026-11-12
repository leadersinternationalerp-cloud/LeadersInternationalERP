import type { Role } from './roles'

export const ROUTE_ACL: Record<string, readonly Role[]> = {
  '/dashboard/admin': ['System Admin'],
  '/dashboard/director': ['System Admin', 'Director'],
  '/dashboard/principal/admissions': ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'Sales', 'Receptionist'],
  '/dashboard/principal': ['System Admin', 'Director', 'Principal'],
  '/dashboard/accountant/invoices': ['System Admin', 'Director', 'Principal', 'Head of Section', 'Accountant', 'Receptionist'],
  '/dashboard/accountant': ['System Admin', 'Accountant'],
  '/dashboard/dean': ['System Admin', 'Director', 'Principal', 'Dean'],
  '/dashboard/hos': ['System Admin', 'Director', 'Principal', 'Head of Section'],
  '/dashboard/teacher': ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'Teacher'],
  '/dashboard/student': ['System Admin', 'Student'],
  '/dashboard/parent': ['System Admin', 'Parent'],
  '/dashboard/staff': ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'Accountant', 'Teacher'],
  '/dashboard/students/enroll': ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'Receptionist'],
  '/dashboard/students': ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'Teacher', 'Receptionist'],
  '/dashboard/users': ['System Admin', 'Director'],
  '/dashboard/calendar': ['System Admin', 'Director', 'Principal', 'Dean', 'Head of Section', 'Accountant', 'Teacher', 'Student', 'Parent'],
}

export function getAllowedRolesForPath(pathname: string): readonly Role[] | null {
  for (const [prefix, roles] of Object.entries(ROUTE_ACL)) {
    if (pathname === prefix || pathname.startsWith(prefix + '/')) {
      return roles
    }
  }
  return null
}
