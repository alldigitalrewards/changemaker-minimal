import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, withErrorHandling } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/prisma'

export const POST = withErrorHandling(async (request: Request) => {
  const { dbUser } = await requireAuth()
  const body = await request.json().catch(() => ({})) as { token?: string }
  const token = body?.token

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const fresh = await prisma.user.findUnique({ where: { id: dbUser.id } })
  const pending = fresh?.emailChangePending as any

  if (!pending || pending.token !== token) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  if (new Date(pending.expiresAt) < new Date()) {
    return NextResponse.json({ error: 'Token expired' }, { status: 400 })
  }

  const newEmail = pending.newEmail as string

  // Check if email is already in use by another user
  const existingUser = await prisma.user.findFirst({
    where: {
      email: newEmail,
      id: { not: dbUser.id }
    }
  })

  if (existingUser) {
    return NextResponse.json(
      { error: 'Email address is already in use' },
      { status: 400 }
    )
  }

  // Update Prisma user and clear pending
  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      email: newEmail,
      emailChangePending: null as any
    }
  })

  // Update Supabase auth email
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ email: newEmail })
  if (error) {
    console.error('Failed to update Supabase email (continuing anyway):', error)
    // Continue even if Supabase update fails - database is source of truth
  }

  // Supabase session cookies will reflect new email; returning success
  return NextResponse.json({
    success: true,
    message: 'Email successfully updated'
  })
})

import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/account?error=invalid-token', url.origin))
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.redirect(new URL('/auth/login?redirectTo=/account', url.origin))
    }

    // Find user with matching pending email change token
    const dbUser = await prisma.user.findFirst({
      where: {
        supabaseUserId: user.id,
        emailChangePending: {
          path: ['token'],
          equals: token
        }
      }
    })

    if (!dbUser || !dbUser.emailChangePending) {
      return NextResponse.redirect(new URL('/account?error=invalid-token', url.origin))
    }

    const pending = dbUser.emailChangePending as any

    // Check if token has expired
    if (new Date(pending.expiresAt) < new Date()) {
      // Clean up expired token
      await (prisma as any).user.update({
        where: { id: dbUser.id },
        data: { emailChangePending: null }
      })

      return NextResponse.redirect(new URL('/account?error=token-expired', url.origin))
    }

    // Update email in database
    await (prisma as any).user.update({
      where: { id: dbUser.id },
      data: {
        email: pending.newEmail,
        emailChangePending: null
      }
    })

    // Refresh session with new email
    await supabase.auth.refreshSession()

    return NextResponse.redirect(new URL('/account?success=email-changed', url.origin))
  } catch (error) {
    console.error('Email confirmation error:', error)
    return NextResponse.redirect(new URL('/account?error=confirmation-failed', url.origin))
  }
}