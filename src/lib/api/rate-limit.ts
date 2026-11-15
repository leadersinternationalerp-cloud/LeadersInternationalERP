import { ApiError } from './errors'

export type RateLimitConfig = {
  key: string
  max: number
  windowMs: number
}

interface RateLimitBucket {
  count: number
  resetAt: number
}

const MAX_RATE_LIMIT_BUCKETS = 5000
const rateLimitStore = new Map<string, RateLimitBucket>()

function pruneExpiredBuckets(now: number) {
  if (rateLimitStore.size < MAX_RATE_LIMIT_BUCKETS) return
  for (const [k, bucket] of rateLimitStore.entries()) {
    if (bucket.resetAt <= now) {
      rateLimitStore.delete(k)
    }
  }
  while (rateLimitStore.size >= MAX_RATE_LIMIT_BUCKETS) {
    const oldestKey = rateLimitStore.keys().next().value
    if (!oldestKey) break
    rateLimitStore.delete(oldestKey)
  }
}

/**
 * High-performance in-memory sliding/fixed-window rate limiter (<1ms overhead).
 * Eliminates the blocking HTTPS round trip to Supabase RPC on every API call.
 * Supports both (cfg, identifier) and (key, max, windowMs) signatures.
 */
export async function enforceRateLimit(
  cfgOrKey: RateLimitConfig | string,
  identifierOrMax: string | number,
  maybeWindowMs?: number
) {
  let bucketKey: string
  let max: number
  let windowMs: number

  if (typeof cfgOrKey === 'string') {
    bucketKey = cfgOrKey
    max = Number(identifierOrMax)
    windowMs = Number(maybeWindowMs || 60_000)
  } else {
    bucketKey = `${cfgOrKey.key}:${identifierOrMax}`
    max = cfgOrKey.max
    windowMs = cfgOrKey.windowMs
  }

  const now = Date.now()
  pruneExpiredBuckets(now)

  const windowBucket = Math.floor(now / windowMs)
  const compositeKey = `${bucketKey}:${windowBucket}`

  const existing = rateLimitStore.get(compositeKey)
  if (!existing || existing.resetAt <= now) {
    rateLimitStore.set(compositeKey, {
      count: 1,
      resetAt: (windowBucket + 1) * windowMs,
    })
    return
  }

  existing.count += 1
  if (existing.count > max) {
    throw new ApiError('RATE_LIMITED', 'Too many requests, please try again later')
  }
}

export function resetRateLimitForTests() {
  rateLimitStore.clear()
}
