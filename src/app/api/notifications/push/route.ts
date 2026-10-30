import { route, ok, parseJson } from '@/lib/api/handler'
import { MANAGEMENT_ROLES } from '@/lib/auth/roles'
import { badRequest } from '@/lib/api/errors'
import { createClient } from '@/utils/supabase/server'
import {
  sendPushToUsers,
  sendPushToRoles,
  type PushPayload,
} from '@/lib/notifications/webPushServer'

interface PushRequestBody {
  targetUserIds?: string[]
  targetRoles?: string[]
  title: string
  body: string
  url?: string
  icon?: string
  tag?: string
  data?: Record<string, unknown>
}

export const POST = route(
  async ({ req, requestId }) => {
    const supabase = await createClient()
    const json = await parseJson<PushRequestBody>(req)
    const { targetUserIds, targetRoles, title, body, url, icon, tag, data } = json

    if (!title || !body) {
      throw badRequest('Missing required title or body in push request')
    }

    if (
      (!targetUserIds || targetUserIds.length === 0) &&
      (!targetRoles || targetRoles.length === 0)
    ) {
      throw badRequest('Must specify either targetUserIds or targetRoles')
    }

    const payload: PushPayload = {
      title,
      body,
      url: url || '/dashboard',
      icon,
      tag,
      data,
    }

    let result = { sent: 0, failed: 0, cleanedUp: 0 }

    if (targetUserIds && targetUserIds.length > 0) {
      const userRes = await sendPushToUsers(supabase, targetUserIds, payload)
      result.sent += userRes.sent
      result.failed += userRes.failed
      result.cleanedUp += userRes.cleanedUp
    }

    if (targetRoles && targetRoles.length > 0) {
      const roleRes = await sendPushToRoles(supabase, targetRoles, payload)
      result.sent += roleRes.sent
      result.failed += roleRes.failed
      result.cleanedUp += roleRes.cleanedUp
    }

    return ok(result, { requestId })
  },
  {
    roles: MANAGEMENT_ROLES,
    rateLimit: { key: 'push-notifications', max: 30, windowMs: 60_000 },
  }
)
