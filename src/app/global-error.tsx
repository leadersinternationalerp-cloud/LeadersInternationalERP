'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global Application Error:', error)
  }, [error])

  return (
    <html lang="en">
      <body className="flex items-center justify-center min-h-screen bg-slate-100 p-4 font-sans">
        <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6 text-center space-y-4 border border-slate-200">
          <h2 className="text-2xl font-bold text-red-600">Application Error</h2>
          <p className="text-sm text-slate-600">
            A critical error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Refresh
          </button>
        </div>
      </body>
    </html>
  )
}
