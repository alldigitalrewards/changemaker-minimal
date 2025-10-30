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

    // Fetch user's workspaces using WorkspaceMembership
    const { getUserBySupabaseId } = await import('@/lib/db/queries')
    const { listMemberships } = await import('@/lib/db/workspace-membership')

    const dbUser = await getUserBySupabaseId(user.id)
    if (!dbUser) {
      return NextResponse.redirect(new URL('/workspaces', url.origin))
    }

    // Get user's accessible workspaces via WorkspaceMembership
    const memberships = await listMemberships(dbUser.id)
    const workspaces = memberships
      .map(m => m.workspace)
      .filter((w): w is NonNullable<typeof w> => w !== null && w !== undefined)

    // Try primary workspace first (isPrimary flag in membership)
    const primaryMembership = memberships.find(m => m.isPrimary)
    if (primaryMembership && primaryMembership.workspace) {
      const route = primaryMembership.role === 'ADMIN' ? 'admin/dashboard' : 'participant/dashboard'
      return NextResponse.redirect(new URL(`/w/${primaryMembership.workspace.slug}/${route}`, url.origin))
    }

    // Fall back to first accessible workspace
    if (memberships.length > 0) {
      const firstMembership = memberships[0]
      if (firstMembership.workspace) {
        const route = firstMembership.role === 'ADMIN' ? 'admin/dashboard' : 'participant/dashboard'
        return NextResponse.redirect(new URL(`/w/${firstMembership.workspace.slug}/${route}`, url.origin))
      }
    }

    // No workspaces: redirect to /workspaces with empty state
    return NextResponse.redirect(new URL('/workspaces', url.origin))
  } catch (redirectError) {
    console.error('Smart redirect failed:', redirectError)
    // Graceful fallback
    return NextResponse.redirect(new URL('/workspaces', url.origin))
  }
}


