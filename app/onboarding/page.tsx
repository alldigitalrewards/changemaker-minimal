'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

function OnboardingForm() {
  const router = useRouter()
  const search = useSearchParams()
  const supabase = createClient()
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const next = search.get('next') || '/workspaces'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // Update password if provided
      if (password.trim().length >= 6) {
        const { error: pwErr } = await supabase.auth.updateUser({ password })
        if (pwErr) {
          // Non-blocking: continue onboarding even if password update requires reauth
          console.warn('Password update failed during onboarding:', pwErr)
        }
      }

      // Update profile metadata
      const { error: mdErr } = await supabase.auth.updateUser({
        data: { full_name: fullName, profileComplete: true }
      })
      if (mdErr) {
        console.warn('Profile metadata update failed during onboarding:', mdErr)
      }

      toast.success('Profile updated')
      router.replace(next)
    } catch (err: any) {
      // As a fallback, still move the user forward to their next destination
      toast.message('Continuing to your workspace...')
      router.replace(next)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Finish setting up your account</h1>
          <p className="text-sm text-gray-600 mt-1">Add your name and set a password.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
          </div>
          <div>
            <Label htmlFor="password">Password (min 6)</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Loading...</h1>
          </div>
        </div>
      </div>
    }>
      <OnboardingForm />
    </Suspense>
  )
}


