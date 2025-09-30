import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/db/prisma'

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
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { emailChangePending: null }
      })

      return NextResponse.redirect(new URL('/account?error=token-expired', url.origin))
    }

    // Update email in database
    await prisma.user.update({
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