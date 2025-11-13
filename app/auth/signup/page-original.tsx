'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CoralButton } from '@/components/ui/coral-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { type Role } from '@/lib/types'
import { signupAction } from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Users } from 'lucide-react'

interface InviteData {
  email: string
  firstName?: string
  lastName?: string
  workspaceName: string
  role: Role
}

function SignupPageContent() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [role, setRole] = useState<Role>('PARTICIPANT')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(false)
  const searchParams = useSearchParams()

  // Fetch invite data if invite code is present
  useEffect(() => {
    const inviteCode = searchParams.get('invite')
    if (inviteCode) {
      setLoadingInvite(true)
      fetch(`/api/invites/${inviteCode}/details`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setError(data.error)
          } else {
            setInviteData(data)
            setEmail(data.email)
            setFirstName(data.firstName || '')
            setLastName(data.lastName || '')
            setRole(data.role)
          }
        })
        .catch(err => {
          setError('Failed to load invite details')
        })
        .finally(() => {
          setLoadingInvite(false)
        })
    } else {
      // Prefill email from query param if present
      const emailParam = searchParams.get('email')
      if (emailParam) {
        setEmail(emailParam)
      }
    }
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const inviteCode = searchParams.get('invite')
    const lockedRole = searchParams.get('role') as Role | null

    // Add invite code if present for auto-acceptance after signup
    if (inviteCode) {
      formData.append('inviteCode', inviteCode)
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

  if (loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-coral-500" />
          <p className="text-gray-600">Loading invitation details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-lg my-8">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">
            {inviteData ? 'Complete Your Registration' : 'Create Account'}
          </CardTitle>
          <CardDescription>
            {inviteData ? (
              <span className="flex items-center justify-center gap-2 mt-2">
                <Users className="h-4 w-4" />
                Join <strong className="mx-1">{inviteData.workspaceName}</strong>
              </span>
            ) : (
              'Join Changemaker'
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="pb-6">
          <form onSubmit={handleSignup} className="space-y-4">
            {inviteData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  You've been invited to join <strong>{inviteData.workspaceName}</strong>.
                  Complete your registration below to get started.
                </p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  placeholder="John"
                  readOnly={!!(inviteData && inviteData.firstName)}
                  className={inviteData && inviteData.firstName ? 'bg-gray-50' : ''}
                />
                {inviteData && inviteData.firstName && (
                  <p className="text-xs text-gray-500 mt-1">Pre-filled by your administrator</p>
                )}
              </div>

              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  placeholder="Doe"
                  readOnly={!!(inviteData && inviteData.lastName)}
                  className={inviteData && inviteData.lastName ? 'bg-gray-50' : ''}
                />
                {inviteData && inviteData.lastName && (
                  <p className="text-xs text-gray-500 mt-1">Pre-filled by your administrator</p>
                )}
              </div>

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
                  readOnly={!!inviteData}
                  className={inviteData ? 'bg-gray-50' : ''}
                />
                {inviteData && (
                  <p className="text-xs text-gray-500 mt-1">This email is linked to your invitation</p>
                )}
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
                <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              </div>

              {/* Hidden role field */}
              <input type="hidden" name="role" value={role} />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <CoralButton
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                inviteData ? 'Complete Registration' : 'Create Account'
              )}
            </CoralButton>

            <div className="text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-coral-600 hover:text-coral-700 font-medium">
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
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