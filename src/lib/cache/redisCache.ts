/**
 * Central Caching Layer (Workstream D)
 *
 * Provides a unified, resilient caching utility that:
 * 1. Uses Redis / Upstash REST Redis if configured via environment variables.
 * 2. Automatically falls back to a bounded, request-safe in-memory TTL + LRU store
 *    when Redis is not configured or temporarily unreachable.
 * 3. Enforces consistent, wing-aware and scope-aware cache keys (`lis:v1:<namespace>:...`).
 * 4. Exposes prefix-based invalidation (`invalidateCachePrefix`) for mutations.
 */

export interface CacheStats {
  hits: number
  misses: number
  sets: number
  invalidations: number
  size: number
}

interface MemoryCacheEntry<T = unknown> {
  value: T
  expiresAt: number
}

const MAX_MEMORY_ENTRIES = 2000
const memoryCache = new Map<string, MemoryCacheEntry>()

const stats: CacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  invalidations: 0,
  size: 0,
}

export const CACHE_TTL = {
  AUTH_PROFILE: 30, // 30 seconds — short security window for role/active status
  ACTIVE_TERM: 300, // 5 minutes
  GRADING_SCALE: 300, // 5 minutes
  ASSESSMENT_WEIGHTS: 300, // 5 minutes
  CLASSES_LIST: 180, // 3 minutes
  SUBJECTS_LIST: 180, // 3 minutes
  DASHBOARD_SUMMARY: 60, // 1 minute
} as const

export function buildCacheKey(
  namespace: string,
  parts: (string | number | boolean | null | undefined)[] = [],
  wing?: string | null
): string {
  const cleanParts = parts.map((p) =>
    p === null || p === undefined || p === '' ? 'all' : String(p).trim()
  )
  const wingSuffix = wing ? `:wing:${String(wing).trim().toLowerCase()}` : ''
  return `lis:v1:${namespace}${cleanParts.length > 0 ? ':' + cleanParts.join(':') : ''}${wingSuffix}`
}

function evictExpiredOrOverflow() {
  const now = Date.now()
  if (memoryCache.size < MAX_MEMORY_ENTRIES) return
  for (const [k, v] of memoryCache.entries()) {
    if (v.expiresAt <= now) {
      memoryCache.delete(k)
    }
  }
  while (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value
    if (!oldestKey) break
    memoryCache.delete(oldestKey)
  }
}

async function redisRestCommand(command: unknown[]): Promise<any | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(command),
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.result ?? null
  } catch {
    return null
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  const now = Date.now()
  const mem = memoryCache.get(key)
  if (mem) {
    if (mem.expiresAt > now) {
      // Refresh LRU order
      memoryCache.delete(key)
      memoryCache.set(key, mem)
      stats.hits += 1
      return mem.value as T
    }
    memoryCache.delete(key)
  }

  // Optional external Redis REST check
  const remoteRaw = await redisRestCommand(['GET', key])
  if (typeof remoteRaw === 'string') {
    try {
      const parsed = JSON.parse(remoteRaw) as T
      memoryCache.set(key, { value: parsed, expiresAt: now + 15_000 })
      stats.hits += 1
      stats.size = memoryCache.size
      return parsed
    } catch {
      // ignore malformed JSON
    }
  }

  stats.misses += 1
  stats.size = memoryCache.size
  return null
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  if (ttlSeconds <= 0) return
  evictExpiredOrOverflow()
  const expiresAt = Date.now() + ttlSeconds * 1000
  memoryCache.set(key, { value, expiresAt })
  stats.sets += 1
  stats.size = memoryCache.size

  // Fire-and-forget write to external Redis if configured
  void redisRestCommand(['SET', key, JSON.stringify(value), 'EX', ttlSeconds])
}

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await getCache<T>(key)
  if (cached !== null) {
    return cached
  }
  const fresh = await fetcher()
  if (fresh !== undefined && fresh !== null) {
    await setCache(key, fresh, ttlSeconds)
  }
  return fresh
}

export async function invalidateCacheKey(key: string): Promise<void> {
  memoryCache.delete(key)
  stats.invalidations += 1
  stats.size = memoryCache.size
  void redisRestCommand(['DEL', key])
}

export async function invalidateCachePrefix(namespaceOrPrefix: string): Promise<number> {
  const fullPrefix = namespaceOrPrefix.startsWith('lis:v1:')
    ? namespaceOrPrefix
    : `lis:v1:${namespaceOrPrefix}`
  let removed = 0
  for (const key of Array.from(memoryCache.keys())) {
    if (key === fullPrefix || key.startsWith(fullPrefix + ':') || key.startsWith(fullPrefix)) {
      memoryCache.delete(key)
      removed += 1
    }
  }
  stats.invalidations += removed
  stats.size = memoryCache.size
  return removed
}

export function getCacheStats(): CacheStats {
  return { ...stats, size: memoryCache.size }
}

export function resetCacheForTests(): void {
  memoryCache.clear()
  stats.hits = 0
  stats.misses = 0
  stats.sets = 0
  stats.invalidations = 0
  stats.size = 0
}
