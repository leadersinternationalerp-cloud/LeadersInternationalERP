import webpush from 'web-push'
import type { SupabaseClient } from '@supabase/supabase-js'

export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  process.env.VAPID_PUBLIC_KEY ||
  'BIdY_x0ofg0Ani-vbOnuuIcd4Y88gTLynWJoUZzqq-ftqRCGv8Y-EkmgGHLaSiPsC5f_0X91eWfBKeg-0imMIlo'

export const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY ||
  '-ftJPnNMuKix3fP-ugq4kQm2HdZqYigsDp9hBJpne8g'

export const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:admin@leaders.ac.tz'

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
} catch (e: unknown) {
  const msg = e instanceof Error ? e.message : String(e)
  console.warn('[WebPush] VAPID initialization warning:', msg)
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  icon?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
}

export interface SendPushResult {
  sent: number
  failed: number
  cleanedUp: number
}

/**
 * Send Web Push notifications to targeted user IDs, automatically pruning expired subscriptions.
 */
export async function sendPushToUsers(
  supabase: SupabaseClient,
  userIds: string[],
  payload: PushPayload
): Promise<SendPushResult> {
  if (!userIds || userIds.length === 0) {
    return { sent: 0, failed: 0, cleanedUp: 0 }
  }

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, user_id')
    .in('user_id', userIds)

  if (error || !subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, cleanedUp: 0 }
  }

  const messagePayload = JSON.stringify({
    title: payload.title || 'Leaders International School',
    body: payload.body || 'You have a new update.',
    icon: payload.icon || '/icon-192x192.png',
    badge: payload.badge || '/icon-192x192.png',
    tag: payload.tag || 'lis-notification',
    data: {
      url: payload.url || '/dashboard',
      ...payload.data,
    },
  })

  let sent = 0
  let failed = 0
  let cleanedUp = 0

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const pushSub = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      }

      try {
        await webpush.sendNotification(pushSub, messagePayload)
        sent++
      } catch (err: unknown) {
        failed++
        const statusCode = (err as { statusCode?: number })?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          // Subscription has expired or user revoked permission — prune from database
          try {
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', sub.endpoint)
          } catch {
            // Ignore deletion errors
          }
          cleanedUp++
        }
      }
    })
  )

  return { sent, failed, cleanedUp }
}

/**
 * Send Web Push notifications to all users holding any of the specified roles.
 */
export async function sendPushToRoles(
  supabase: SupabaseClient,
  roles: string[],
  payload: PushPayload
): Promise<SendPushResult> {
  if (!roles || roles.length === 0) {
    return { sent: 0, failed: 0, cleanedUp: 0 }
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, roles, role')

  if (error || !profiles) {
    return { sent: 0, failed: 0, cleanedUp: 0 }
  }

  const targetUserIds = profiles
    .filter((p) => {
      const userRoles = Array.isArray(p.roles)
        ? p.roles
        : typeof p.role === 'string'
          ? p.role.split(',').map((r: string) => r.trim())
          : []
      return userRoles.some((r: string) => roles.includes(r))
    })
    .map((p) => p.id)

  return sendPushToUsers(supabase, targetUserIds, payload)
}
