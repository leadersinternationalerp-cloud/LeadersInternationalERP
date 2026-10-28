import type { PostgrestError } from '@supabase/supabase-js'

export class DbError extends Error {
  code: string
  details: string
  hint: string

  constructor(error: PostgrestError) {
    super(error.message)
    this.name = 'DbError'
    this.code = error.code
    this.details = error.details
    this.hint = error.hint
  }
}

export function unwrap<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) {
    throw new DbError(res.error)
  }
  return res.data
}
