export const PAGE_SIZES = [10, 25, 50, 100] as const
export const DEFAULT_PAGE_SIZE = 25

export type PageParams = { page: number; perPage: number; from: number; to: number }

export function parsePageParams(
  sp: Record<string, string | string[] | undefined> | undefined
): PageParams {
  const page = Math.max(1, Number.parseInt(String(sp?.page ?? '1'), 10) || 1)
  const raw = Number.parseInt(String(sp?.perPage ?? DEFAULT_PAGE_SIZE), 10)
  const perPage = (PAGE_SIZES as readonly number[]).includes(raw) ? raw : DEFAULT_PAGE_SIZE
  const from = (page - 1) * perPage
  return { page, perPage, from, to: from + perPage - 1 }
}

/** PostgREST filter values must not contain , ( ) " \ */
export function sanitizeSearch(q: string | undefined, max = 120): string | undefined {
  const v = (q ?? '').trim().slice(0, max)
  if (!v) return undefined
  return v.replace(/[,()"\\%]/g, ' ').replace(/\s+/g, ' ')
}
