import { createClient } from '@/utils/supabase/client'
import { VAPID_PUBLIC_KEY } from './webPushServer'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function isNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator
  )
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied'
  return Notification.requestPermission()
}

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

/**
 * Register device push subscription with browser PushManager and store in Supabase.
 */
export async function registerDevicePushSubscription(userId: string): Promise<boolean> {
  if (!isNotificationSupported()) return false
  const reg = await getServiceWorkerRegistration()
  if (!reg || !('pushManager' in reg)) return false

  try {
    const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    let sub = await reg.pushManager.getSubscription()

    // If an existing subscription has an outdated/mismatched key, unsubscribe first
    if (sub) {
      try {
        const rawAppKey = sub.options.applicationServerKey
        const existingKeyBytes = rawAppKey ? new Uint8Array(rawAppKey) : null
        let keysMatch = false
        if (
          existingKeyBytes &&
          existingKeyBytes.length === convertedVapidKey.length
        ) {
          keysMatch = existingKeyBytes.every(
            (val, i) => val === convertedVapidKey[i]
          )
        }
        if (!keysMatch) {
          await sub.unsubscribe()
          sub = null
        }
      } catch {
        if (sub) {
          await sub.unsubscribe().catch(() => {})
        }
        sub = null
      }
    }

    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as unknown as BufferSource,
      })
    }

    if (!sub) return false

    const subJson = sub.toJSON()
    const endpoint = subJson.endpoint ?? sub.endpoint
    const p256dh = subJson.keys?.p256dh ?? ''
    const auth = subJson.keys?.auth ?? ''

    if (!endpoint || !p256dh || !auth) {
      console.warn('[WebPush] Incomplete push keys from browser PushManager')
      return false
    }

    const supabase = createClient()
    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

    if (error) {
      console.warn('[WebPush] Failed to save push subscription to DB:', error.message)
      return false
    }

    return true
  } catch (err) {
    console.error('[WebPush] Push subscription registration failed:', err)
    return false
  }
}

/**
 * Unregister device push subscription.
 */
export async function unregisterDevicePushSubscription(userId: string): Promise<void> {
  const reg = await getServiceWorkerRegistration()
  if (!reg || !('pushManager' in reg)) return

  try {
    const sub = await reg.pushManager.getSubscription()
    if (sub) {
      await sub.unsubscribe()
      const supabase = createClient()
      await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', sub.endpoint)
    }
  } catch (err) {
    console.warn('[WebPush] Unsubscribe error:', err)
  }
}

/**
 * Display a client-side system notification.
 */
export async function showSystemNotification(
  title: string,
  options?: NotificationOptions & { url?: string }
): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return

  const defaultOptions = {
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    vibrate: [200, 100, 200],
    ...options,
  }

  const reg = await getServiceWorkerRegistration()
  if (reg && 'showNotification' in reg) {
    await reg.showNotification(title, defaultOptions)
  } else {
    new Notification(title, defaultOptions)
  }
}

// ============================================================================
// Repetitive Attendance Reminder Watcher for Homeroom Teachers
// ============================================================================

let watcherInterval: number | null = null

export function startAttendanceReminderWatcher(classId: string | null | undefined): void {
  if (watcherInterval) clearInterval(watcherInterval)
  if (!classId) return

  const checkAndRemind = async () => {
    const now = new Date()
    const dayOfWeek = now.getDay() // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    const hour = now.getHours()

    // Run only Monday to Friday between 08:00 AM and 17:00 PM
    if (dayOfWeek === 0 || dayOfWeek === 6) return
    if (hour < 8 || hour >= 17) return

    const todayStr = now.toISOString().slice(0, 10)

    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('attendance')
        .select('id')
        .eq('class_id', classId)
        .eq('date', todayStr)
        .limit(1)

      if (error) return

      // If no attendance records exist for today, trigger reminder
      if (!data || data.length === 0) {
        showSystemNotification('⏰ Homeroom Attendance Reminder', {
          body: 'Good morning! Please remember to mark attendance for your homeroom class today. (Reminders repeat until marked)',
          tag: `attendance-reminder-${todayStr}`,
          data: { url: '/dashboard/teacher/attendance' },
        })
      }
    } catch {
      // Non-blocking
    }
  }

  // Check immediately, then check every 30 minutes
  checkAndRemind()
  watcherInterval = window.setInterval(checkAndRemind, 30 * 60 * 1000)
}

export function stopAttendanceReminderWatcher(): void {
  if (watcherInterval) {
    clearInterval(watcherInterval)
    watcherInterval = null
  }
}
