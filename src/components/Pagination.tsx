import Link from 'next/link'

export function Pagination({
  page,
  perPage,
  total,
  pathname,
  params,
}: {
  page: number
  perPage: number
  total: number
  pathname: string
  params?: Record<string, string | undefined>
}) {
  const pages = Math.max(1, Math.ceil(total / perPage))
  const href = (p: number) => {
    const qs = new URLSearchParams(
      Object.entries({ ...params, page: String(p), perPage: String(perPage) }).filter(
        ([, v]) => v != null && v !== ''
      ) as [string, string][]
    )
    return `${pathname}?${qs.toString()}`
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between border-t border-slate-200/20 px-4 py-3 sm:px-6 my-4 text-sm"
    >
      <div className="flex flex-1 justify-between sm:hidden">
        <Link
          aria-disabled={page <= 1}
          href={href(Math.max(1, page - 1))}
          className={`btn btn-secondary ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
        >
          Previous
        </Link>
        <Link
          aria-disabled={page >= pages}
          href={href(Math.min(pages, page + 1))}
          className={`btn btn-secondary ${page >= pages ? 'pointer-events-none opacity-50' : ''}`}
        >
          Next
        </Link>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-slate-500">
            Showing <span className="font-medium">{total === 0 ? 0 : Math.min(total, (page - 1) * perPage + 1)}</span> to{' '}
            <span className="font-medium">{Math.min(total, page * perPage)}</span> of{' '}
            <span className="font-medium">{total.toLocaleString()}</span> records
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Link
            aria-disabled={page <= 1}
            href={href(Math.max(1, page - 1))}
            className={`btn btn-secondary ${page <= 1 ? 'pointer-events-none opacity-50' : ''}`}
          >
            Previous
          </Link>
          <span className="flex items-center px-3 font-medium">
            Page {page} of {pages}
          </span>
          <Link
            aria-disabled={page >= pages}
            href={href(Math.min(pages, page + 1))}
            className={`btn btn-secondary ${page >= pages ? 'pointer-events-none opacity-50' : ''}`}
          >
            Next
          </Link>
        </div>
      </div>
    </nav>
  )
}
