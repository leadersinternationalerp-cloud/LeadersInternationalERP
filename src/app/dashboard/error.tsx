'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard Error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
      <div className="glass-panel max-w-md w-full p-8 space-y-4">
        <div className="flex justify-center">
          <AlertTriangle className="w-12 h-12 text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Something went wrong</h2>
        <p className="text-sm text-slate-600">
          {error.message || 'An unexpected error occurred while loading this section.'}
        </p>
        <div className="flex justify-center gap-3 pt-4">
          <button
            onClick={() => reset()}
            className="btn btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/dashboard"
            className="btn btn-secondary flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
