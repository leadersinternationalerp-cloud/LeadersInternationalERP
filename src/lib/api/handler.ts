import { NextResponse, type NextRequest } from 'next/server'
import { getApiUser, type ApiUser } from '@/lib/auth/session'
import { hasAny, type Role } from '@/lib/auth/roles'
import { ApiError, STATUS } from './errors'
import { enforceRateLimit } from './rate-limit'

export type Ctx = {
  user: ApiUser
  req: NextRequest
  requestId: string
}

export type RouteOptions = {
  roles?: readonly Role[]
  requireAuth?: boolean
  rateLimit?: { key: string; max: number; windowMs: number }
}

export function apiHeaders(requestId: string): Record<string, string> {
  return {
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Request-Id': requestId,
  }
}

export function ok<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200,
  extraHeaders?: Record<string, string>
) {
  const requestId = (meta?.requestId as string) || crypto.randomUUID()
  return NextResponse.json(
    {
      data,
      meta: {
        requestId,
        ...meta,
      },
    },
    {
      status,
      headers: {
        ...apiHeaders(requestId),
        ...extraHeaders,
      },
    }
  )
}

export function errorResponse(err: ApiError, requestId: string) {
  const status = STATUS[err.code] || 500
  return NextResponse.json(
    {
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    },
    {
      status,
      headers: apiHeaders(requestId),
    }
  )
}

export async function parseJson<T = unknown>(
  req: NextRequest,
  validator?: (data: unknown) => T
): Promise<T> {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    throw new ApiError('BAD_REQUEST', 'Invalid JSON body')
  }

  if (validator) {
    try {
      return validator(body)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Validation failed'
      throw new ApiError('VALIDATION_FAILED', msg, { originalError: String(err) })
    }
  }

  return body as T
}

export function route(
  handler: (ctx: Ctx) => Promise<Response>,
  opts: RouteOptions = {}
) {
  return async (req: NextRequest): Promise<Response> => {
    const requestId = crypto.randomUUID()
    try {
      const user = await getApiUser()
      if ((opts.requireAuth ?? true) && !user) {
        throw new ApiError('UNAUTHENTICATED', 'Sign in required')
      }

      if (opts.roles && user && !hasAny(user.roles, opts.roles)) {
        throw new ApiError('FORBIDDEN', 'You do not have access to this resource')
      }

      if (opts.rateLimit) {
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
        const identifier = user ? user.id : `ip:${ip}`
        await enforceRateLimit(opts.rateLimit, identifier)
      }

      return await handler({ user: user as ApiUser, req, requestId })
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        return errorResponse(e, requestId)
      }
      console.error(`[api:${requestId}]`, e)
      return errorResponse(new ApiError('INTERNAL', 'Something went wrong'), requestId)
    }
  }
}
