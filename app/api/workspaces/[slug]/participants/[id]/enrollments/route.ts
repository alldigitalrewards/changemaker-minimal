import { NextRequest, NextResponse } from "next/server"
import { withErrorHandling, requireWorkspaceAdmin, requireWorkspaceAccess } from "@/lib/auth/api-auth"
import { prisma } from "@/lib/prisma"
import { createEnrollment, getUserEnrollments, DatabaseError, ResourceNotFoundError, logActivityEvent } from "@/lib/db/queries"

export const GET = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id: participantId } = await context.params
  const { workspace } = await requireWorkspaceAccess(slug)

  // Verify participant belongs to this workspace
  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId: participantId, workspaceId: workspace.id } }
  })
  if (!membership) {
    return NextResponse.json({ error: "Participant not found in this workspace" }, { status: 404 })
  }

  try {
    const enrollments = await getUserEnrollments(participantId, workspace.id)
    // Transform Challenge (Prisma relation) to challenge (API field) for consistency
    const transformedEnrollments = enrollments.map(enrollment => ({
      ...enrollment,
      challenge: enrollment.Challenge,
      Challenge: undefined
    }))
    return NextResponse.json({ enrollments: transformedEnrollments })
  } catch (error) {
    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    throw error
  }
})

export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string; id: string }> }
) => {
  const { slug, id: participantId } = await context.params
  const { workspace, user } = await requireWorkspaceAdmin(slug)

  const { challengeId, status } = await request.json()

  if (!challengeId) {
    return NextResponse.json({ error: "challengeId is required" }, { status: 400 })
  }

  // Verify participant belongs to this workspace
  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId: participantId, workspaceId: workspace.id } }
  })
  if (!membership) {
    return NextResponse.json({ error: "Participant not found in this workspace" }, { status: 404 })
  }

  try {
    const enrollment = await createEnrollment(participantId, challengeId, workspace.id, status === 'INVITED' ? 'INVITED' : 'ENROLLED')

    await logActivityEvent({
      workspaceId: workspace.id,
      challengeId,
      enrollmentId: enrollment.id,
      userId: participantId,
      actorUserId: user.dbUser.id,
      type: 'ENROLLED',
      metadata: { method: 'admin_enroll' }
    })

    return NextResponse.json({ enrollment }, { status: 201 })
  } catch (error) {
    if (error instanceof DatabaseError) {
      if (error.message.toLowerCase().includes('already enrolled')) {
        return NextResponse.json({ error: 'User already enrolled in this challenge' }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    throw error
  }
})


