import { createServiceClient } from '@/utils/supabase/service'
import { ApiError } from './errors'

const memoryStore = new Map<string, { count: number; expiresAt: number }>()

export async function enforceRateLimit(
  config: { key: string; max: number; windowMs: number },
  identifier: string
): Promise<void> {
  const rateLimitKey = `${config.key}:${identifier}`
  const now = Date.now()

  // 1. Try DB-backed rate limiting if table exists
  try {
    const supabase = createServiceClient()
    const windowStart = new Date(now - (now % config.windowMs)).toISOString()
    const dbKey = `${rateLimitKey}:${windowStart}`

    const { data, error } = await supabase.rpc('increment_rate_limit', {
      p_key: dbKey,
      p_window_start: windowStart,
    })

    if (!error && typeof data === 'number') {
      if (data > config.max) {
        throw new ApiError('RATE_LIMITED', 'Rate limit exceeded. Please try again later.')
      }
      return
    }
  } catch (e) {
    if (e instanceof ApiError) throw e
    // Fall back to memoryStore
  }

  // 2. Fallback memory rate limiter
  const entry = memoryStore.get(rateLimitKey)
  if (!entry || entry.expiresAt <= now) {
    memoryStore.set(rateLimitKey, { count: 1, expiresAt: now + config.windowMs })
    return
  }

  entry.count += 1
  if (entry.count > config.max) {
    throw new ApiError('RATE_LIMITED', 'Rate limit exceeded. Please try again later.')
  }
}
