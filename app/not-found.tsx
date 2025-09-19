'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Page not found</h1>
        <p className="mt-3 text-lg text-gray-600">The page you’re looking for doesn’t exist or has moved.</p>
        <div className="mt-6 flex gap-3 justify-center">
          <Link href="/" className="rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">
            Go home
          </Link>
          <Link href="/w" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black/80">
            View workspaces
          </Link>
        </div>
      </div>
    </div>
  )
}
