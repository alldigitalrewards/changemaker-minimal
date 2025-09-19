import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = url.searchParams.get('next') || '/workspaces'

  if (!code) {
    return NextResponse.redirect(new URL(next, url.origin))
  }

  const supabase = await createClient()

  // Exchange the code for a session and set auth cookies
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    // On failure, redirect to login with a message
    const loginUrl = new URL('/auth/login', url.origin)
    loginUrl.searchParams.set('message', 'Authentication failed, please sign in.')
    if (next) loginUrl.searchParams.set('redirectTo', next)
    return NextResponse.redirect(loginUrl)
  }

  // Best-effort: sync user record into Prisma
  try {
    await fetch(new URL('/api/auth/sync-user', url.origin), { method: 'POST' })
  } catch (_) {
    // no-op: do not block redirect
  }

  return NextResponse.redirect(new URL(next, url.origin))
}


