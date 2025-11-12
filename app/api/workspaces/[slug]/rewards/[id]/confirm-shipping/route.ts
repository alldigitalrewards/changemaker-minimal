import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWorkspace } from '@/lib/workspace-context'
import { verifyConfirmationToken } from '@/lib/auth/tokens'
import { RateLimiters } from '@/lib/rate-limit'
import { AuditLogger } from '@/lib/audit-log'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: rewardIssuanceId } = await params

    // Rate limit by reward ID to prevent abuse (3 attempts per 5 minutes)
    const rateLimitKey = `confirm-shipping:${rewardIssuanceId}`
    const rateLimitResult = RateLimiters.critical(rateLimitKey)

    if (!rateLimitResult.allowed) {
      // Audit log rate limit exceeded (security event)
      const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      await AuditLogger.rateLimitExceeded({
        ip,
        endpoint: '/api/workspaces/[slug]/rewards/[id]/confirm-shipping',
        identifier: rateLimitKey,
      })

      return NextResponse.json(
        {
          error: 'Too many confirmation attempts. Please try again later.',
          retryAfter: rateLimitResult.retryAfter
            ? Math.ceil(rateLimitResult.retryAfter / 1000)
            : 300,
        },
        { status: 429 }
      )
    }

    // Extract and verify token from URL
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Missing confirmation token' },
        { status: 400 }
      )
    }

    // Verify token and extract payload
    const payload = await verifyConfirmationToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired confirmation token' },
        { status: 401 }
      )
    }

    // Validate token payload matches URL parameters
    if (payload.rewardIssuanceId !== rewardIssuanceId) {
      return NextResponse.json(
        { error: 'Token does not match reward issuance' },
        { status: 403 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const workspace = await getCurrentWorkspace(slug)
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    // Verify workspace from token matches URL
    if (payload.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: 'Token workspace mismatch' },
        { status: 403 }
      )
    }

    // Find reward issuance
    const rewardIssuance = await prisma.rewardIssuance.findUnique({
      where: { id: rewardIssuanceId },
      include: {
        User: {
          select: {
            id: true,
            supabaseUserId: true,
            email: true,
          },
        },
      },
    })

    if (!rewardIssuance) {
      return NextResponse.json({ error: 'Reward not found' }, { status: 404 })
    }

    // Verify user from token matches reward owner
    if (payload.userId !== rewardIssuance.User.id) {
      return NextResponse.json(
        { error: 'Token user mismatch' },
        { status: 403 }
      )
    }

    // Verify this reward belongs to the authenticated user
    if (rewardIssuance.User.supabaseUserId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Verify workspace matches
    if (rewardIssuance.workspaceId !== workspace.id) {
      return NextResponse.json({ error: 'Workspace mismatch' }, { status: 400 })
    }

    // Check if already confirmed
    if (rewardIssuance.shippingAddressConfirmed) {
      // Redirect to success page
      return NextResponse.redirect(
        new URL(`/w/${slug}/participant/rewards?confirmed=already`, request.url)
      )
    }

    // Confirm shipping address
    await prisma.rewardIssuance.update({
      where: { id: rewardIssuanceId },
      data: {
        shippingAddressConfirmed: true,
        shippingAddressConfirmedAt: new Date(),
      },
    })

    // Audit log successful confirmation
    await AuditLogger.shippingConfirmed({
      userId: payload.userId,
      workspaceId: payload.workspaceId,
      rewardIssuanceId: rewardIssuanceId,
    })

    // Redirect to success page
    return NextResponse.redirect(
      new URL(`/w/${slug}/participant/rewards?confirmed=success`, request.url)
    )
  } catch (error) {
    console.error('Error confirming shipping address:', error)
    return NextResponse.json(
      { error: 'Failed to confirm shipping address' },
      { status: 500 }
    )
  }
}
