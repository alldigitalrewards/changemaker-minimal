'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { type Role } from '@/lib/types'
import { signupAction } from './actions'

function SignupPageContent() {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('PARTICIPANT')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()

  // Prefill email from invite link if present
  useEffect(() => {
    const inviteEmail = searchParams.get('email')
    if (inviteEmail) {
      setEmail(inviteEmail)
    }
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const redirectTo = searchParams.get('redirectTo')
    const lockedRole = searchParams.get('role') as Role | null

    if (redirectTo) {
      formData.append('redirectTo', redirectTo)
    }
    // Use locked role from query params if present, otherwise use form value
    if (lockedRole) {
      formData.set('role', lockedRole)
    }

    try {
      const result = await signupAction(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
      // If no error, signupAction will redirect (throws NEXT_REDIRECT)
    } catch (err: any) {
      // Next.js redirect() throws an error - check if it's a redirect
      if (err?.message?.includes('NEXT_REDIRECT')) {
        // This is expected, don't treat as error
        return
      }
      setError(err.message || 'Failed to create account')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Create Account</h2>
          <p className="mt-2 text-gray-600">Join Changemaker</p>
        </div>
        
        <form onSubmit={handleSignup} className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            {searchParams.get('role') ? (
              <input type="hidden" name="role" value={searchParams.get('role')!} />
            ) : (
              <div>
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PARTICIPANT">Participant</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            )}
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create account'}
          </Button>

          <div className="text-center text-sm">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupPageContent />
    </Suspense>
  )
}