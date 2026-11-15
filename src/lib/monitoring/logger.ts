const SENSITIVE_FIELD_PATTERNS = [
  /password/i,
  /pin/i,
  /secret/i,
  /token/i,
  /authorization/i,
  /cookie/i,
  /service_role/i,
  /api_key/i,
  /apikey/i,
  /signature/i,
]

export function redactSensitiveData(value: any, depth = 0): any {
  if (depth > 5 || value === null || value === undefined) return value
  if (typeof value === 'string') {
    if (value.length > 20 && /^eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/.test(value)) {
      return '[REDACTED_JWT]'
    }
    return value
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item, depth + 1))
  }
  if (typeof value === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_FIELD_PATTERNS.some((rx) => rx.test(k))) {
        out[k] = '[REDACTED]'
      } else {
        out[k] = redactSensitiveData(v, depth + 1)
      }
    }
    return out
  }
  return value
}

export interface StructuredLogContext {
  requestId?: string
  route?: string
  method?: string
  userId?: string | null
  wing?: string | null
  durationMs?: number
  statusCode?: number
  metadata?: Record<string, any>
}

export function logStructuredError(
  event: string,
  err: unknown,
  context: StructuredLogContext = {}
) {
  const errorObj =
    err instanceof Error
      ? {
          name: err.name,
          message: err.message,
          stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
        }
      : { message: String(err) }

  const entry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    event,
    requestId: context.requestId || null,
    route: context.route || null,
    method: context.method || null,
    userId: context.userId || null,
    wing: context.wing || null,
    durationMs: context.durationMs,
    statusCode: context.statusCode,
    error: redactSensitiveData(errorObj),
    metadata: context.metadata ? redactSensitiveData(context.metadata) : undefined,
  }

  console.error(JSON.stringify(entry))
  return entry
}

export function logStructuredSecurityEvent(
  event: string,
  context: StructuredLogContext = {}
) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'SECURITY_WARN',
    event,
    requestId: context.requestId || null,
    route: context.route || null,
    method: context.method || null,
    userId: context.userId || null,
    wing: context.wing || null,
    statusCode: context.statusCode,
    metadata: context.metadata ? redactSensitiveData(context.metadata) : undefined,
  }

  console.warn(JSON.stringify(entry))
  return entry
}

export function logSlowRequest(context: StructuredLogContext) {
  const thresholdMs = Number(process.env.SLOW_REQUEST_THRESHOLD_MS || 750)
  if ((context.durationMs || 0) < thresholdMs) return null

  const entry = {
    timestamp: new Date().toISOString(),
    level: 'PERF_WARN',
    event: 'SLOW_API_REQUEST',
    requestId: context.requestId || null,
    route: context.route || null,
    method: context.method || null,
    userId: context.userId || null,
    wing: context.wing || null,
    durationMs: context.durationMs,
    statusCode: context.statusCode,
  }

  console.warn(JSON.stringify(entry))
  return entry
}
