'use server'

import { getSessionUser } from '@/lib/auth/session'
import { hasAnyRole } from '@/lib/auth/roles'
import { createServiceClient } from '@/utils/supabase/service'
import { revalidatePath } from 'next/cache'

const ALLOWED_STAFF_ROLES = [
  'System Admin',
  'Director',
  'Principal',
  'Dean',
  'Head of Section',
  'Accountant',
] as const

const VALID_STATUSES = [
  'submitted',
  'under_review',
  'interview_scheduled',
  'accepted',
  'rejected',
  'enrolled',
  'cancelled',
] as const

export async function updateApplicationStatusAction(
  id: string,
  newStatus: string,
  notes?: string
) {
  const session = await getSessionUser()
  if (!session.user || !hasAnyRole(session.roles, ALLOWED_STAFF_ROLES)) {
    return { error: 'Unauthorized to update admission applications' }
  }

  if (!VALID_STATUSES.includes(newStatus as (typeof VALID_STATUSES)[number])) {
    return { error: `Invalid status: ${newStatus}` }
  }

  const supabase = createServiceClient()
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
    reviewed_by: session.user.id,
  }

  if (notes !== undefined) {
    updateData.notes = notes
  }

  const { error } = await supabase
    .from('admission_applications')
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error('[admissions/actions] update failed:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/principal/admissions')
  revalidatePath('/dashboard/director/applications')
  return { ok: true, status: newStatus }
}
