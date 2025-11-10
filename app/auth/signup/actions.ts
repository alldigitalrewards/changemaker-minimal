'use server'

import { createClient } from '@/lib/supabase/server'
import { syncSupabaseUser } from '@/lib/auth/sync-user'
import { redirect } from 'next/navigation'
import { type Role } from '@/lib/types'

export async function signupAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const role = (formData.get('role') as Role) || 'PARTICIPANT'
  const redirectTo = formData.get('redirectTo') as string | null

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  try {
    const supabase = await createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const callbackUrl = `${appUrl}/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ''}`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role },
        emailRedirectTo: callbackUrl
      }
    })

    if (error) {
      return { error: error.message }
    }

    // If email is not confirmed, user needs to check their email
    if (data.user && !data.user.email_confirmed_at) {
      redirect('/auth/login?message=Please check your email to confirm your account')
    }

    // If email is auto-confirmed (dev mode), sync user and redirect
    if (data.user) {
      try {
        await syncSupabaseUser(data.user)
      } catch (syncError) {
        console.error('Failed to sync user during signup:', syncError)
        // Continue - user can still login
      }
      redirect('/auth/login?message=Account created successfully! Please sign in.')
    }

    return { error: 'Signup failed - no user data returned' }
  } catch (error) {
    console.error('Signup error:', error)
    return { error: 'An unexpected error occurred during signup' }
  }
}
