'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CoralButton } from '@/components/ui/coral-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'
import { type Role } from '@/lib/types'
import { signupAction } from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Users, CheckCircle2, Shield, Eye, EyeOff, AlertCircle } from 'lucide-react'

interface InviteData {
  email: string
  firstName?: string
  lastName?: string
  workspaceName: string
  role: Role
}

interface PasswordStrength {
  score: number
  label: string
  color: string
  feedback: string[]
}

function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0
  const feedback: string[] = []

  if (password.length >= 8) {
    score += 1
  } else {
    feedback.push('Use at least 8 characters')
  }

  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include both uppercase and lowercase letters')
  }

  if (/\d/.test(password)) {
    score += 1
  } else {
    feedback.push('Include at least one number')
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1
  } else {
    feedback.push('Include a special character (!@#$%^&*)')
  }

  if (password.length >= 12) {
    score += 1
  }

  const strength = {
    0: { label: 'Very Weak', color: 'bg-red-500' },
    1: { label: 'Weak', color: 'bg-orange-500' },
    2: { label: 'Fair', color: 'bg-yellow-500' },
    3: { label: 'Good', color: 'bg-lime-500' },
    4: { label: 'Strong', color: 'bg-green-500' },
    5: { label: 'Very Strong', color: 'bg-emerald-600' },
  }

  return {
    score,
    label: strength[score as keyof typeof strength].label,
    color: strength[score as keyof typeof strength].color,
    feedback
  }
}

function SignupPageEnhancedContent() {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [role, setRole] = useState<Role>('PARTICIPANT')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [loadingInvite, setLoadingInvite] = useState(false)
  const searchParams = useSearchParams()

  const passwordStrength = password.length > 0 ? calculatePasswordStrength(password) : null

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
      const emailParam = searchParams.get('email')
      if (emailParam) {
        setEmail(emailParam)
      }
    }
  }, [searchParams])

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!acceptedTerms) {
      setError('Please accept the Terms of Service and Privacy Policy')
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const inviteCode = searchParams.get('invite')
    const lockedRole = searchParams.get('role') as Role | null

    if (inviteCode) {
      formData.append('inviteCode', inviteCode)
    }

    if (lockedRole) {
      formData.set('role', lockedRole)
    }

    try {
      const result = await signupAction(formData)
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
    } catch (err: any) {
      if (err?.message?.includes('NEXT_REDIRECT')) {
        return
      }
      setError(err.message || 'Failed to create account')
      setLoading(false)
    }
  }

  if (loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-coral-500" />
          <p className="text-gray-600">Loading invitation details...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl">
        {/* Progress Indicator (if invite) */}
        {inviteData && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-coral-500 text-white flex items-center justify-center text-xs font-semibold">
                  1
                </div>
                <span className="hidden sm:inline">Received Invite</span>
              </div>
              <div className="w-8 sm:w-16 h-0.5 bg-coral-500"></div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-coral-500 text-white flex items-center justify-center text-xs font-semibold">
                  2
                </div>
                <span className="hidden sm:inline font-semibold text-coral-600">Create Account</span>
              </div>
              <div className="w-8 sm:w-16 h-0.5 bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gray-300 text-gray-600 flex items-center justify-center text-xs font-semibold">
                  3
                </div>
                <span className="hidden sm:inline text-gray-500">Get Started</span>
              </div>
            </div>
          </div>
        )}

        <Card className="my-8 shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-coral-100 rounded-full flex items-center justify-center mb-2">
              {inviteData ? (
                <Users className="h-6 w-6 text-coral-600" />
              ) : (
                <Shield className="h-6 w-6 text-coral-600" />
              )}
            </div>
            <CardTitle className="text-2xl sm:text-3xl">
              {inviteData ? 'Complete Your Registration' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-base">
              {inviteData ? (
                <span className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                  <span>Join</span>
                  <strong className="text-coral-600">{inviteData.workspaceName}</strong>
                </span>
              ) : (
                'Join Changemaker to start your journey'
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="pb-6">
            <form onSubmit={handleSignup} className="space-y-5">
              {inviteData && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        You've been invited to join {inviteData.workspaceName}
                      </p>
                      <p className="text-sm text-blue-700 mt-1">
                        Complete your registration below to get started. Your profile information has been pre-filled.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">
                    First Name <span className="text-red-500">*</span>
                  </Label>
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
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Pre-filled by your administrator
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="lastName">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
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
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Pre-filled by your administrator
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
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
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    This email is linked to your invitation
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {passwordStrength && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 min-w-[80px]">
                        {passwordStrength.label}
                      </span>
                    </div>
                    {passwordStrength.feedback.length > 0 && passwordStrength.score < 3 && (
                      <div className="text-xs text-gray-600 space-y-1">
                        {passwordStrength.feedback.slice(0, 2).map((tip, i) => (
                          <p key={i} className="flex items-start gap-1">
                            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{tip}</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Terms and Privacy */}
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Checkbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                  I agree to the{' '}
                  <Link href="/terms" className="text-coral-600 hover:text-coral-700 underline">
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link href="/privacy" className="text-coral-600 hover:text-coral-700 underline">
                    Privacy Policy
                  </Link>
                </label>
              </div>

              {/* Hidden role field */}
              <input type="hidden" name="role" value={role} />

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              <CoralButton
                type="submit"
                className="w-full"
                disabled={loading || !acceptedTerms}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  <>
                    {inviteData ? 'Complete Registration' : 'Create Account'}
                    {inviteData && <span className="ml-2">→</span>}
                  </>
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

        {/* Security Badge */}
        <div className="text-center">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
            <Shield className="h-3 w-3" />
            Your data is encrypted and secure
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPageEnhanced() {
  return (
    <Suspense fallback={null}>
      <SignupPageEnhancedContent />
    </Suspense>
  )
}
