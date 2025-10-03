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
      { status: 400 }
    )
  }

  // Generate verification token
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

  // Store pending email change in database
  // Note: Prisma Json fields need explicit casting
  const pendingData = {
    newEmail,
    token,
    expiresAt: expiresAt.toISOString()
  }

  const updated = await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      emailChangePending: pendingData as any
    }
  })

  // Verify the update succeeded
  if (!updated.emailChangePending) {
    console.error('Failed to set emailChangePending', { pendingData, updated })
    return NextResponse.json(
      { error: 'Failed to initiate email change' },
      { status: 500 }
    )
  }

  // TODO: Send verification email
  // For now, we just store the pending change
  // In production, we would send an email with a link containing the token

  return NextResponse.json({
    success: true,
    message: 'verification email sent'
  })
})