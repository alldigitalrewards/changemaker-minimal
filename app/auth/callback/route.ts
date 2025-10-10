import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const explicitNext = url.searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(new URL(explicitNext || '/workspaces', url.origin))
  }

  const supabase = await createClient()

  // Exchange the code for a session and set auth cookies
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    // On failure, redirect to login with a message
    const loginUrl = new URL('/auth/login', url.origin)
    loginUrl.searchParams.set('message', 'Authentication failed, please sign in.')
    if (explicitNext) loginUrl.searchParams.set('redirectTo', explicitNext)
    return NextResponse.redirect(loginUrl)
  }

  // Best-effort: sync user record into Prisma
  try {
    await fetch(new URL('/api/auth/sync-user', url.origin), { method: 'POST' })
  } catch (_) {
    // no-op: do not block redirect
  }

  // Smart redirect logic:
  // 1. Use explicit 'next' param if provided
  // 2. Redirect to user's lastWorkspaceId if accessible
  // 3. Fall back to first active/published workspace where user has membership
  // 4. Fall back to /workspaces with sidebar open
  if (explicitNext) {
    return NextResponse.redirect(new URL(explicitNext, url.origin))
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.redirect(new URL('/workspaces', url.origin))
    }

    // Fetch user's workspaces using tenant-aware logic
    const { getUserBySupabaseId } = await import('@/lib/db/queries')
    const { getUserWorkspaces } = await import('@/lib/db/workspace-compatibility')

    const dbUser = await getUserBySupabaseId(user.id)
    if (!dbUser) {
      return NextResponse.redirect(new URL('/workspaces', url.origin))
    }

    // Try lastWorkspaceId first
    if (dbUser.lastWorkspaceId) {
      const workspaces = await getUserWorkspaces(user.id)
      const lastWorkspace = workspaces.find(w => w.id === dbUser.lastWorkspaceId)
      if (lastWorkspace) {
        return NextResponse.redirect(new URL(`/w/${lastWorkspace.slug}/admin/dashboard`, url.origin))
      }
    }

    // Fall back to first accessible workspace
    const workspaces = await getUserWorkspaces(user.id)
    if (workspaces.length > 0) {
      const firstWorkspace = workspaces[0]
      const route = dbUser.role === 'ADMIN' ? 'admin/dashboard' : 'participant/dashboard'
      return NextResponse.redirect(new URL(`/w/${firstWorkspace.slug}/${route}`, url.origin))
    }

    // No workspaces: redirect to /workspaces with empty state
    return NextResponse.redirect(new URL('/workspaces', url.origin))
  } catch (redirectError) {
    console.error('Smart redirect failed:', redirectError)
    // Graceful fallback
    return NextResponse.redirect(new URL('/workspaces', url.origin))
  }
}


