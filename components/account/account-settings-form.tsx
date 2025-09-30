'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, Lock, CheckCircle, AlertCircle } from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User as PrismaUser } from '@prisma/client'

interface AccountSettingsFormProps {
  user: SupabaseUser
  dbUser: PrismaUser
}

export function AccountSettingsForm({ user, dbUser }: AccountSettingsFormProps) {
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  // Email change state
  const [newEmail, setNewEmail] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [pendingEmail, setPendingEmail] = useState<string | null>(
    (dbUser.emailChangePending as any)?.newEmail || null
  )

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return
    }

    setPasswordLoading(true)

    try {
      const response = await fetch('/api/account/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password')
      }

      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      setTimeout(() => setPasswordSuccess(false), 5000)
    } catch (error: any) {
      setPasswordError(error.message)
    } finally {
      setPasswordLoading(false)
    }
  }

  const handleEmailChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    setEmailSuccess(false)

    if (!newEmail || !newEmail.includes('@')) {
      setEmailError('Please enter a valid email address')
      return
    }

    if (newEmail === user.email) {
      setEmailError('New email must be different from current email')
      return
    }

    setEmailLoading(true)

    try {
      const response = await fetch('/api/account/email/start-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate email change')
      }

      setEmailSuccess(true)
      setPendingEmail(newEmail)
      setNewEmail('')

      setTimeout(() => setEmailSuccess(false), 10000)
    } catch (error: any) {
      setEmailError(error.message)
    } finally {
      setEmailLoading(false)
    }
  }

  const handleCancelEmailChange = async () => {
    try {
      const response = await fetch('/api/account/email/cancel', {
        method: 'POST'
      })

      if (response.ok) {
        setPendingEmail(null)
      }
    } catch (error) {
      console.error('Failed to cancel email change:', error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Account Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            View your account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email Address</Label>
            <p className="mt-1 text-sm text-gray-900">{user.email}</p>
            {pendingEmail && (
              <Alert className="mt-2">
                <Mail className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>
                    Pending email change to <strong>{pendingEmail}</strong>. Check your inbox to confirm.
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEmailChange}
                    className="ml-2"
                  >
                    Cancel
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div>
            <Label>Account ID</Label>
            <p className="mt-1 text-xs text-gray-600 font-mono">{dbUser.id}</p>
          </div>

          <div>
            <Label>Member Since</Label>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(dbUser.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordSuccess && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Password changed successfully
                </AlertDescription>
              </Alert>
            )}

            {passwordError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={passwordLoading}
              />
            </div>

            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={passwordLoading}
                minLength={8}
              />
              <p className="mt-1 text-xs text-gray-500">
                Must be at least 8 characters
              </p>
            </div>

            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={passwordLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={passwordLoading || !currentPassword || !newPassword || !confirmPassword}
              className="bg-coral-500 hover:bg-coral-600"
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing Password...
                </>
              ) : (
                'Change Password'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Change Email Address
          </CardTitle>
          <CardDescription>
            Update your email address (requires verification)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmailChange} className="space-y-4">
            {emailSuccess && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Verification email sent! Please check your inbox and click the confirmation link.
                </AlertDescription>
              </Alert>
            )}

            {emailError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{emailError}</AlertDescription>
              </Alert>
            )}

            <div>
              <Label htmlFor="new-email">New Email Address</Label>
              <Input
                id="new-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder={user.email || ''}
                required
                disabled={emailLoading || !!pendingEmail}
              />
              {pendingEmail && (
                <p className="mt-1 text-xs text-amber-600">
                  You have a pending email change. Complete or cancel it first.
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={emailLoading || !newEmail || !!pendingEmail}
              className="bg-coral-500 hover:bg-coral-600"
            >
              {emailLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Verification...
                </>
              ) : (
                'Send Verification Email'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}