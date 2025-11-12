'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CoralButton } from '@/components/ui/coral-button'
import { Mail, CheckCircle2, Loader2, AlertCircle, Send } from 'lucide-react'
import Link from 'next/link'

function VerifyEmailContent() {
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(0)
  const searchParams = useSearchParams()
  const email = searchParams.get('email')

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResendEmail = async () => {
    if (!email || countdown > 0) return

    setIsResending(true)
    setResendError(null)
    setResendSuccess(false)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to resend verification email')
      }

      setResendSuccess(true)
      setCountdown(60) // 60 second cooldown
    } catch (error: any) {
      setResendError(error.message || 'Failed to resend verification email')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            {/* Animated Email Icon */}
            <div className="mx-auto w-20 h-20 bg-coral-100 rounded-full flex items-center justify-center mb-4 relative">
              <Mail className="h-10 w-10 text-coral-600" />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center animate-bounce">
                <span className="text-white text-xs font-bold">1</span>
              </div>
            </div>

            <CardTitle className="text-2xl sm:text-3xl">Check Your Email</CardTitle>
            <CardDescription className="text-base mt-2">
              We've sent a verification link to{' '}
              {email ? (
                <strong className="text-gray-900 block mt-1">{email}</strong>
              ) : (
                <strong className="text-gray-900">your email address</strong>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Instructions */}
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm text-gray-700">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p>Click the verification link in the email to activate your account</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-700">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p>The link will expire in 24 hours for security reasons</p>
              </div>
              <div className="flex items-start gap-3 text-sm text-gray-700">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p>After verification, you can sign in to your account</p>
              </div>
            </div>

            {/* Spam Folder Reminder */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">
                  Don't see the email?
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Check your spam or junk folder. Sometimes emails end up there by mistake.
                </p>
              </div>
            </div>

            {/* Success Message */}
            {resendSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Email sent successfully!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Check your inbox for the verification link.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {resendError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{resendError}</p>
              </div>
            )}

            {/* Resend Button */}
            <div className="space-y-3">
              <Button
                onClick={handleResendEmail}
                disabled={isResending || countdown > 0 || !email}
                variant="outline"
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : countdown > 0 ? (
                  <>Resend available in {countdown}s</>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Resend Verification Email
                  </>
                )}
              </Button>

              <div className="text-center text-sm text-gray-600">
                Already verified?{' '}
                <Link href="/auth/login" className="text-coral-600 hover:text-coral-700 font-medium">
                  Sign in
                </Link>
              </div>
            </div>

            {/* Support Link */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 text-center">
                Still need help?{' '}
                <Link href="/support" className="text-coral-600 hover:text-coral-700 font-medium">
                  Contact support
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Return to Login Link */}
        <div className="text-center mt-6">
          <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-coral-500" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
