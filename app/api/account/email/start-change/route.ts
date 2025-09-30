import { NextResponse } from 'next/server'
import { requireAuth, withErrorHandling } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/prisma'

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { dbUser, supabaseUser } = await requireAuth()
  const body = await request.json()
  const { newEmail } = body

  if (!newEmail || !newEmail.includes('@')) {
    return NextResponse.json(
      { error: 'Valid email address is required' },
      { status: 400 }
    )
  }

  if (newEmail === supabaseUser.email) {
    return NextResponse.json(
      { error: 'New email must be different from current email' },
      { status: 400 }
    )
  }

  // Check if email is already in use
  const existingUser = await prisma.user.findFirst({
    where: { email: newEmail }
  })

  if (existingUser) {
    return NextResponse.json(
      { error: 'Email address is already in use' },
      { status: 409 }
    )
  }

  // Generate verification token
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  // Store pending email change in database
  await (prisma as any).user.update({
    where: { id: dbUser.id },
    data: {
      emailChangePending: {
        newEmail,
        token,
        expiresAt: expiresAt.toISOString()
      }
    }
  })

  // Send verification email via Supabase
  const supabase = await createClient()
  const origin = new URL(request.url).origin
  const confirmUrl = `${origin}/api/account/email/confirm?token=${token}`

  // Use Supabase's email change flow
  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    { emailRedirectTo: confirmUrl }
  )

  if (error) {
    console.error('Email change initiation error:', error)

    // Clean up pending state on error
    await (prisma as any).user.update({
      where: { id: dbUser.id },
      data: { emailChangePending: null }
    })

    return NextResponse.json(
      { error: error.message || 'Failed to send verification email' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: 'Verification email sent'
  })
})