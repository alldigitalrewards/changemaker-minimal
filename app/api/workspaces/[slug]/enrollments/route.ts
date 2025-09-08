import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceAccess, requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth"
import {
  createEnrollment,
  getUserEnrollments,
  getAllWorkspaceEnrollments,
  DatabaseError,
  WorkspaceAccessError,
  ResourceNotFoundError
} from "@/lib/db/queries"

export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await context.params
  const { challengeId, userId } = await request.json()

  // Require workspace access
  const { workspace, user } = await requireWorkspaceAccess(slug)

  // Create enrollment using standardized query (includes validation)
  try {
    const enrollment = await createEnrollment(userId, challengeId, workspace.id)
    return NextResponse.json(enrollment)
  } catch (error) {
    if (error instanceof DatabaseError) {
      if (error.message.includes('already enrolled')) {
        return NextResponse.json({ error: "Already enrolled" }, { status: 400 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (error instanceof WorkspaceAccessError) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }
    
    if (error instanceof ResourceNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    
    throw error // Let withErrorHandling handle other errors
  }
})

export const GET = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await context.params
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get("userId")

  // Get enrollments using standardized query
  let enrollments
  if (userId) {
    // Require basic workspace access for user-specific enrollments
    const { workspace, user } = await requireWorkspaceAccess(slug)
    enrollments = await getUserEnrollments(userId, workspace.id)
  } else {
    // Require admin access for all workspace enrollments
    const { workspace, user } = await requireWorkspaceAdmin(slug)
    enrollments = await getAllWorkspaceEnrollments(workspace.id)
  }

  return NextResponse.json(enrollments)
})