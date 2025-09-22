import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { Role } from "@/lib/types"
import { logActivityEvent, getUserBySupabaseId } from "@/lib/db/queries"
import { sendInviteEmail } from "@/lib/email/smtp"
import { renderInviteEmail } from "@/lib/email/templates/invite"

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check admin access
    const role = await getUserWorkspaceRole(slug)
    if (!role || role !== "ADMIN") {
      return NextResponse.json(
        { message: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const workspace = await getCurrentWorkspace(slug)
    if (!workspace) {
      return NextResponse.json(
        { message: "Workspace not found" },
        { status: 404 }
      )
    }

    // Get participant with enrollments (must be a member of this workspace to view)
    const participant = await prisma.user.findFirst({
      where: { 
        id,
        memberships: { some: { workspaceId: workspace.id } }
      },
      include: {
        enrollments: {
          where: {
            challenge: {
              workspaceId: workspace.id
            }
          },
          include: {
            challenge: {
              select: {
                id: true,
                title: true,
                description: true,
                startDate: true,
                endDate: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!participant) {
      return NextResponse.json(
        { message: "Participant not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ participant })
  } catch (error) {
    console.error("Error fetching participant:", error)
    return NextResponse.json(
      { message: "Failed to fetch participant" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check admin access
    const role = await getUserWorkspaceRole(slug)
    if (!role || role !== "ADMIN") {
      return NextResponse.json(
        { message: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const workspace = await getCurrentWorkspace(slug)
    if (!workspace) {
      return NextResponse.json(
        { message: "Workspace not found" },
        { status: 404 }
      )
    }

    const { role: newRole } = await request.json()

    if (!newRole || !['ADMIN', 'PARTICIPANT'].includes(newRole)) {
      return NextResponse.json(
        { message: "Invalid role. Must be ADMIN or PARTICIPANT" },
        { status: 400 }
      )
    }

    // Check if participant exists and belongs to this workspace (membership-aware)
    const membership = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: id, workspaceId: workspace.id } }
    })
    const participant = membership ? await prisma.user.findUnique({ where: { id } }) : null

    if (!participant || !membership) {
      return NextResponse.json(
        { message: "Participant not found" },
        { status: 404 }
      )
    }

    // Defensive check to satisfy TypeScript narrowing and ensure membership exists
    if (!membership) {
      return NextResponse.json(
        { message: "Membership not found" },
        { status: 404 }
      )
    }

    // Update participant role
    const previousRole = participant.role
    const dbUser = await getUserBySupabaseId(user.id)
    if (!dbUser) {
      return NextResponse.json(
        { message: "User record not found" },
        { status: 401 }
      )
    }
    const updatedParticipant = await prisma.user.update({
      where: { id },
      data: { role: newRole as Role }
    })

    if (previousRole !== newRole) {
      await logActivityEvent({
        workspaceId: workspace.id,
        userId: updatedParticipant.id,
        actorUserId: dbUser.id as any,
        type: 'RBAC_ROLE_CHANGED' as any,
        metadata: { oldRole: previousRole, newRole }
      })
    }

    return NextResponse.json({ 
      participant: updatedParticipant,
      message: `Participant role updated to ${newRole}` 
    })
  } catch (error) {
    console.error("Error updating participant:", error)
    return NextResponse.json(
      { message: "Failed to update participant" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }
    const dbUser = await getUserBySupabaseId(user.id)
    if (!dbUser) {
      return NextResponse.json(
        { message: "User record not found" },
        { status: 401 }
      )
    }

    // Check admin access
    const role = await getUserWorkspaceRole(slug)
    if (!role || role !== "ADMIN") {
      return NextResponse.json(
        { message: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const workspace = await getCurrentWorkspace(slug)
    if (!workspace) {
      return NextResponse.json(
        { message: "Workspace not found" },
        { status: 404 }
      )
    }

    // Check membership in this workspace (membership-aware)
    const membership = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: id, workspaceId: workspace.id } }
    })

    if (!membership) {
      return NextResponse.json(
        { message: "Participant not found" },
        { status: 404 }
      )
    }

    if (membership.role !== 'PARTICIPANT') {
      return NextResponse.json(
        { message: "Cannot remove an admin from the workspace" },
        { status: 403 }
      )
    }

    // Delete all enrollments first (due to foreign key constraints)
    await prisma.enrollment.deleteMany({
      where: {
        userId: id,
        challenge: {
          workspaceId: workspace.id
        }
      }
    })

    // Remove membership record for this workspace (new system)
    await prisma.workspaceMembership.deleteMany({
      where: { userId: id, workspaceId: workspace.id }
    })

    // Legacy cleanup removed; rely on WorkspaceMembership only

    await logActivityEvent({
      workspaceId: workspace.id,
      userId: id,
      actorUserId: dbUser.id as any,
      type: 'UNENROLLED' as any,
      metadata: { reason: 'Removed from workspace' }
    })

    // If this was a pending placeholder user with no other memberships, delete the user row
    try {
      const [userRecord, otherMemberships] = await Promise.all([
        prisma.user.findUnique({ where: { id } }),
        prisma.workspaceMembership.count({ where: { userId: id } })
      ])
      if (userRecord && userRecord.isPending && !userRecord.supabaseUserId && otherMemberships === 0) {
        await prisma.user.delete({ where: { id } })
      }
    } catch (_) {}

    return NextResponse.json({ 
      message: "Participant removed successfully" 
    })
  } catch (error) {
    console.error("Error removing participant:", error)
    return NextResponse.json(
      { message: "Failed to remove participant" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; id: string }> }
) {
  try {
    const { slug, id } = await context.params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Check admin access
    const role = await getUserWorkspaceRole(slug)
    if (!role || role !== "ADMIN") {
      return NextResponse.json(
        { message: "Forbidden: Admin access required" },
        { status: 403 }
      )
    }

    const workspace = await getCurrentWorkspace(slug)
    if (!workspace) {
      return NextResponse.json(
        { message: "Workspace not found" },
        { status: 404 }
      )
    }

    const { action } = await request.json()

    // Get participant (membership-aware)
    const membership = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId: id, workspaceId: workspace.id } }
    })
    if (!membership) {
      return NextResponse.json(
        { message: "Participant not found" },
        { status: 404 }
      )
    }
    const participant = await prisma.user.findUnique({ where: { id } })
    if (!participant) {
      return NextResponse.json(
        { message: "Participant not found" },
        { status: 404 }
      )
    }

    if (action === 'send_password_reset') {
      // Use Supabase Auth to send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(participant.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
      })

      if (error) {
        console.error("Error sending password reset:", error)
        return NextResponse.json(
          { message: "Failed to send password reset email" },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        message: "Password reset email sent successfully" 
      })
    }

    if (action === 'resend_invite') {
      // Use the canonical invite link format and send via internal sender
      const invite = await prisma.inviteCode.findFirst({
        where: { workspaceId: workspace.id },
        orderBy: { createdAt: 'desc' }
      })
      if (!invite) {
        return NextResponse.json({ message: 'No invite code available to resend' }, { status: 404 })
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const inviteUrl = `${baseUrl}/invite/${invite.code}`

      try {
        const html = renderInviteEmail({
          workspaceName: workspace.name,
          inviterEmail: user.email ?? 'no-reply@changemaker.im',
          role: membership.role,
          inviteUrl,
          expiresAt: invite.expiresAt,
          challengeTitle: null
        })
        await sendInviteEmail({
          to: participant.email,
          subject: `Invitation to join ${workspace.name}`,
          html
        })
      } catch (e) {
        return NextResponse.json({ message: 'Failed to resend invite email' }, { status: 500 })
      }

      await logActivityEvent({
        workspaceId: workspace.id,
        userId: id,
        actorUserId: (await getUserBySupabaseId(user.id))!.id as any,
        type: 'EMAIL_RESENT' as any,
        metadata: { inviteCode: invite.code }
      })

      return NextResponse.json({ message: 'Invite email sent successfully' })
    }

    return NextResponse.json(
      { message: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error processing email action:", error)
    return NextResponse.json(
      { message: "Failed to process email action" },
      { status: 500 }
    )
  }
}