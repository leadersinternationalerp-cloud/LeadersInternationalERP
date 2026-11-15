import { cache } from 'react'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { resolveUserProfileAndWing } from '@/lib/auth/session'
import {
  WING_COOKIE_NAME,
  type UserWingAssignment,
  type WingFilterValue,
} from './wing'

export interface WingContext {
  assignedWing: UserWingAssignment
  activeWingFilter: WingFilterValue
  canSwitchWing: boolean
}

const getMemoizedWingContextForUser = cache(
  async (uid: string, cookieWing: WingFilterValue): Promise<WingContext> => {
    const { assignedWing } = await resolveUserProfileAndWing(uid)

    if (assignedWing === 'Cambridge' || assignedWing === 'NECTA') {
      return {
        assignedWing,
        activeWingFilter: assignedWing,
        canSwitchWing: false,
      }
    }

    return {
      assignedWing: 'Both',
      activeWingFilter: cookieWing,
      canSwitchWing: true,
    }
  }
)

export async function getWingContext(
  userId?: string | null,
  _profileObj?: any
): Promise<WingContext> {
  let uid = userId
  if (!uid) {
    const supabase = await createClient()
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

  let cookieWing: WingFilterValue = 'all'
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get(WING_COOKIE_NAME)?.value
    if (raw?.toLowerCase() === 'cambridge') cookieWing = 'Cambridge'
    else if (raw?.toLowerCase() === 'necta') cookieWing = 'NECTA'
  } catch {
    // ignore outside request context
  }

  return getMemoizedWingContextForUser(uid, cookieWing)
}
