import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/db"
import { getCurrentWorkspace, getUserWorkspaceRole } from "@/lib/workspace-context"
import { Role } from "@/lib/types"
import { logActivityEvent, getUserBySupabaseId } from "@/lib/db/queries"

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

    // Get participant with enrollments
    const participant = await prisma.user.findFirst({
      where: {
        id,
        workspaceId: workspace.id
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

    // Check if participant exists and belongs to this workspace
    const participant = await prisma.user.findFirst({
      where: {
        id,
        workspaceId: workspace.id
      }
    })

    if (!participant) {
      return NextResponse.json(
        { message: "Participant not found" },
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

    // Check if participant exists and belongs to this workspace
    const participant = await prisma.user.findFirst({
      where: {
        id,
        workspaceId: workspace.id,
        role: "PARTICIPANT"
      }
    })

    if (!participant) {
      return NextResponse.json(
        { message: "Participant not found" },
        { status: 404 }
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

    // Remove participant from workspace (set workspaceId to null)
    await prisma.user.update({
      where: { id },
      data: { 
        workspaceId: null,
        role: "PARTICIPANT" 
      }
    })

    await logActivityEvent({
      workspaceId: workspace.id,
      userId: id,
      actorUserId: dbUser.id as any,
      type: 'UNENROLLED' as any,
      metadata: { reason: 'Removed from workspace' }
    })

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

    // Get participant
    const participant = await prisma.user.findFirst({
      where: {
        id,
        workspaceId: workspace.id
      }
    })

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
      // Send invite email using Resend API
      if (!process.env.RESEND_API_KEY) {
        return NextResponse.json(
          { message: "Email service not configured" },
          { status: 500 }
        )
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'team@updates.changemaker.im',
          to: [participant.email],
          subject: `Invitation to join ${workspace.name}`,
          html: `
            <div>
              <h2>You're invited to join ${workspace.name}</h2>
              <p>Hello,</p>
              <p>You've been invited to join the ${workspace.name} workspace as a ${participant.role.toLowerCase()}.</p>
              <p>Click the link below to get started:</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/w/${workspace.slug}" style="background-color: #1e7b8b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Join Workspace
              </a>
              <p>If you don't have an account yet, you'll be prompted to create one.</p>
              <p>Best regards,<br>The Changemaker Team</p>
            </div>
          `,
        }),
      })

      if (!response.ok) {
        console.error("Failed to send invite email:", await response.text())
        return NextResponse.json(
          { message: "Failed to send invite email" },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        message: "Invite email sent successfully" 
      })
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