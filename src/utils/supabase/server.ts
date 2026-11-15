import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Request-scoped memoized Supabase Server Client (Workstream A).
 *
 * Ensures that within a single React Server Component render pass:
 * 1. `createClient()` reuses the same underlying client instance.
 * 2. Multiple calls to `supabase.auth.getUser()` (across layout.tsx, page.tsx,
 *    session.ts, and wingServer.ts) share a single in-flight/resolved promise,
 *    eliminating redundant GoTrue network round trips while preserving full
 *    JWT verification and request isolation between different users.
 */
const getMemoizedRequestClient = cache(async () => {
  const cookieStore = await cookies()

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://zqcjnfcwxkeapwzhifsy.supabase.co'
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder'

  const client = createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
        }
      },
    },
  })

  // Memoize `auth.getUser()` when called with no token argument within this request
  const originalGetUser = client.auth.getUser.bind(client.auth)
  let cachedUserPromise: ReturnType<typeof originalGetUser> | null = null

  client.auth.getUser = ((jwt?: string) => {
    if (jwt) {
      return originalGetUser(jwt)
    }
    if (!cachedUserPromise) {
      cachedUserPromise = originalGetUser()
    }
    return cachedUserPromise
  }) as typeof client.auth.getUser

  return client
})

export async function createClient() {
  return getMemoizedRequestClient()
}
