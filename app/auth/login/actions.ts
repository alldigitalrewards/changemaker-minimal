'use server'

import { createClient } from '@/lib/supabase/server'
import { syncSupabaseUser } from '@/lib/auth/sync-user'
import { redirect } from 'next/navigation'

export async function loginAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirectTo') as string | null

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: error.message }
    }

    // Sync user to Prisma - cookies are properly set server-side
    if (data.user) {
      try {
        await syncSupabaseUser(data.user)
      } catch (syncError) {
        console.error('Failed to sync user:', syncError)
        // Don't fail login if sync fails - user can still access app
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    return { error: 'An unexpected error occurred during login' }
  }

  // Redirect throws to perform navigation - don't catch it
  redirect(redirectTo || '/workspaces')
}
