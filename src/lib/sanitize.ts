/**
 * PostgREST filter values must not contain , ( ) " \
 */
export function sanitizePostgrestValue(val: string | undefined, max = 120): string {
  if (!val) return ''
  return val.trim().slice(0, max).replace(/[,()"\\%]/g, ' ').replace(/\s+/g, ' ')
}

export function escapeLike(val: string): string {
  return val.replace(/[%_\\]/g, '')
}
