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

  // Compare against dbUser email (source of truth for current email)
  if (newEmail === dbUser.email) {
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
  // Prisma Json fields need to be passed as objects (will be serialized to JSON)
  const pendingData = {
    newEmail,
    token,
    expiresAt: expiresAt.toISOString()
  }

  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      emailChangePending: pendingData
    }
  })

  // TODO: Send verification email
  // For now, we just store the pending change
  // In production, we would send an email with a link containing the token

  return NextResponse.json({
    success: true,
    message: 'verification email sent'
  })
})