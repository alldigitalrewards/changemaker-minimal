import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWorkspace } from '@/lib/workspace-context'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id: rewardIssuanceId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    const workspace = await getCurrentWorkspace(slug)
    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
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
