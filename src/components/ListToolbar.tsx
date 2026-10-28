'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition, useEffect } from 'react'
import { PAGE_SIZES, DEFAULT_PAGE_SIZE } from '@/lib/pagination'

export function ListToolbar({
  searchPlaceholder = 'Search records...',
  initialSearch = '',
  initialPerPage = DEFAULT_PAGE_SIZE,
}: {
  searchPlaceholder?: string
  initialSearch?: string
  initialPerPage?: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [searchTerm, setSearchTerm] = useState(initialSearch)

  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams?.get('q') || ''
      if (searchTerm !== currentQ) {
        const nextParams = new URLSearchParams(searchParams?.toString() || '')
        if (searchTerm) {
          nextParams.set('q', searchTerm)
        } else {
          nextParams.delete('q')
        }
        nextParams.set('page', '1') // reset to page 1 on new search
        startTransition(() => {
          router.replace(`${pathname}?${nextParams.toString()}`)
        })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, pathname, router, searchParams])

  const handlePerPageChange = (newPerPage: string) => {
    const nextParams = new URLSearchParams(searchParams?.toString() || '')
    nextParams.set('perPage', newPerPage)
    nextParams.set('page', '1')
    startTransition(() => {
      router.replace(`${pathname}?${nextParams.toString()}`)
    })
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between my-4">
      <div className="relative w-full sm:w-80">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={searchPlaceholder}
          className="input w-full"
        />
        {isPending && (
          <span className="absolute right-3 top-2.5 text-xs text-slate-400 animate-pulse">
            Searching...
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-500 self-end sm:self-auto">
        <label htmlFor="perPageSelect">Per page:</label>
        <select
          id="perPageSelect"
          value={searchParams?.get('perPage') || String(initialPerPage)}
          onChange={(e) => handlePerPageChange(e.target.value)}
          className="input py-1 px-2 text-sm"
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
