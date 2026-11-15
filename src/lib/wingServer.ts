import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { normalizeRoles } from '@/lib/auth/roles'
import {
  extractWingFromProfile,
  inferWing,
  isCrossWingRole,
  WING_COOKIE_NAME,
  type SchoolWing,
  type UserWingAssignment,
  type WingFilterValue,
} from './wing'

export interface WingContext {
  assignedWing: UserWingAssignment
  activeWingFilter: WingFilterValue
  canSwitchWing: boolean
}

export async function getWingContext(
  userId?: string | null,
  profileObj?: any
): Promise<WingContext> {
  const supabase = await createClient()

  let uid = userId
  let profile = profileObj

  if (!uid) {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    uid = user?.id || null
  }

  if (!uid) {
    return {
      assignedWing: 'Both',
      activeWingFilter: 'all',
      canSwitchWing: false,
    }
  }

  if (!profile) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle()
    profile = prof
  }

  const userRoles = normalizeRoles(profile)
  const crossWing = isCrossWingRole(userRoles)

  let assignedWing: UserWingAssignment = 'Both'

  if (!crossWing) {
    const profileWing = extractWingFromProfile(profile)
    if (profileWing === 'Cambridge' || profileWing === 'NECTA') {
      assignedWing = profileWing
    } else if (userRoles.includes('Student')) {
      const { data: studentRow } = await supabase
        .from('students')
        .select('*')
        .eq('id', uid)
        .maybeSingle()
      if (studentRow) {
        assignedWing = inferWing(studentRow)
      }
    } else if (userRoles.includes('Parent')) {
      const { data: links } = await supabase
        .from('student_parents')
        .select('students:student_id(*)')
        .eq('parent_id', uid)

      const wings = new Set<SchoolWing>()
      ;(links || []).forEach((l: any) => {
        const s = Array.isArray(l.students) ? l.students[0] : l.students
        if (s) wings.add(inferWing(s))
      })
      if (wings.size === 1) {
        assignedWing = Array.from(wings)[0]
      }
    } else if (userRoles.includes('Teacher')) {
      const [subjClasses, homeroomClasses] = await Promise.all([
        supabase
          .from('class_subjects')
          .select('classes:class_id(*)')
          .eq('teacher_id', uid),
        supabase
          .from('classes')
          .select('*')
          .eq('class_teacher_id', uid),
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
        assignedWing = Array.from(wings)[0]
      }
    }
  }

  // If user is restricted to a single wing, enforce that wing filter strictly
  if (assignedWing === 'Cambridge' || assignedWing === 'NECTA') {
    return {
      assignedWing,
      activeWingFilter: assignedWing,
      canSwitchWing: false,
    }
  }

  // Otherwise user can view Both wings; read their selected filter cookie
  let cookieWing: WingFilterValue = 'all'
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(WING_COOKIE_NAME)?.value
    if (raw?.toLowerCase() === 'cambridge') cookieWing = 'Cambridge'
    else if (raw?.toLowerCase() === 'necta') cookieWing = 'NECTA'
  } catch {
    // ignore outside request context
  }

  return {
    assignedWing: 'Both',
    activeWingFilter: cookieWing,
    canSwitchWing: true,
  }
}
