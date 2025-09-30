import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, withErrorHandling } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/prisma'

export const POST = withErrorHandling(async (request: NextRequest) => {
  const { dbUser } = await requireAuth()

  // Clear pending email change
  await (prisma as any).user.update({
    where: { id: dbUser.id },
    data: { emailChangePending: null }
  })

  return NextResponse.json({ success: true })
})