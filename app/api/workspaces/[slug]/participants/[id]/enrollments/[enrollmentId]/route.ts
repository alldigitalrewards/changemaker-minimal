import { NextResponse } from "next/server"
import { withErrorHandling, requireWorkspaceAdmin } from "@/lib/auth/api-auth"
import { prisma } from "@/lib/prisma"
import { deleteEnrollment, ResourceNotFoundError, DatabaseError, logActivityEvent } from "@/lib/db/queries"

export const DELETE = withErrorHandling(async (
  _request: Request,
  context: { params: Promise<{ slug: string; id: string; enrollmentId: string }> }
) => {
  const { slug, id: participantId, enrollmentId } = await context.params
  const { workspace, user } = await requireWorkspaceAdmin(slug)

  // Verify enrollment belongs to this workspace and participant
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      userId: participantId,
      Challenge: { workspaceId: workspace.id }
    }
  })
  if (!enrollment) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  }

  try {
    await deleteEnrollment(enrollmentId, workspace.id)
    await logActivityEvent({
      workspaceId: workspace.id,
      challengeId: enrollment.challengeId,
      enrollmentId: enrollment.id,
      userId: participantId,
      actorUserId: user.dbUser.id,
      type: 'UNENROLLED',
      metadata: { method: 'admin_remove' }
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    throw error
  }
})


