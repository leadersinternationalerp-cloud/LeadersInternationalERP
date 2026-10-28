import Link from 'next/link'
import { FileQuestion, Home } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-slate-50">
      <div className="glass-panel max-w-md w-full p-8 space-y-4">
        <div className="flex justify-center">
          <FileQuestion className="w-16 h-16 text-slate-400" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Page Not Found</h1>
        <p className="text-sm text-slate-600">
          The page or resource you are looking for does not exist or may have been moved.
        </p>
        <div className="pt-4">
          <Link
            href="/dashboard"
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
