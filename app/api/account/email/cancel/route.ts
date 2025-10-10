import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, withErrorHandling } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/prisma'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { dbUser } = await requireAuth()

  // Check if there is a pending email change
  const user = await prisma.user.findUnique({
    where: { id: dbUser.id },
    select: { emailChangePending: true }
  })

  if (!user?.emailChangePending) {
    return NextResponse.json(
      { error: 'No pending email change to cancel' },
      { status: 400 }
    )
  }

  // Clear pending email change
  await prisma.user.update({
    where: { id: dbUser.id },
    data: {
      emailChangePending: null as any
    }
  })

  return NextResponse.json({
    success: true,
    message: 'Email change cancelled'
  })
})