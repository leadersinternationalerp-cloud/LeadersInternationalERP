export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'BAD_REQUEST'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PROVIDER_ERROR'
  | 'INTERNAL'

export const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 422,
  BAD_REQUEST: 400,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PROVIDER_ERROR: 502,
  INTERNAL: 500,
}

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
  }

  static internal(message = 'Internal server error', details?: Record<string, unknown>) {
    return new ApiError('INTERNAL', message, details)
  }

  static badRequest(message = 'Bad request', details?: Record<string, unknown>) {
    return new ApiError('BAD_REQUEST', message, details)
  }

  static forbidden(message = 'You do not have access to this resource') {
    return new ApiError('FORBIDDEN', message)
  }

  static notFound(message = 'Resource not found') {
    return new ApiError('NOT_FOUND', message)
  }
}

export const badRequest = (
  dOrMsg?: Record<string, unknown> | string,
  message?: string
) => {
  if (typeof dOrMsg === 'string') {
    return new ApiError('BAD_REQUEST', dOrMsg)
  }
  return new ApiError('VALIDATION_FAILED', message || 'Request validation failed', dOrMsg)
}
