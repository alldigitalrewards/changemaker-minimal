import { NextRequest, NextResponse } from "next/server"
import { requireWorkspaceAccess, requireWorkspaceAdmin, withErrorHandling } from "@/lib/auth/api-auth"
import {
  createEnrollment,
  getUserEnrollments,
  getAllWorkspaceEnrollments,
  getWorkspaceUsers,
  DatabaseError,
  WorkspaceAccessError,
  ResourceNotFoundError
} from "@/lib/db/queries"

export const POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await context.params
  const action = request.headers.get('X-Action')

  // Handle activity submissions
  if (action === 'ACTIVITY_SUBMISSION') {
    const { activityId, textContent, linkUrl, fileUrls } = await request.json()
    const { workspace, user } = await requireWorkspaceAccess(slug)

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
    }

    // For now, return a simple success response - will implement full logic later
    const fakeSubmission = {
      id: 'sub-' + Date.now(),
      activityId,
      userId: user.dbUser.id,
      textContent,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    }

    return NextResponse.json({ submission: fakeSubmission })
  }

  // Handle regular enrollment
  const { challengeId } = await request.json()

  // Require workspace access
  const { workspace, user } = await requireWorkspaceAccess(slug)

  // Create enrollment using standardized query (includes validation)
  try {
    const enrollment = await createEnrollment(user.dbUser.id, challengeId, workspace.id, 'ENROLLED')
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

// Activity submissions route handler
export const ACTIVITY_SUBMISSIONS_POST = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) => {
  const { slug } = await context.params
  const { activityId, textContent, linkUrl, fileUrls } = await request.json()

  // Require workspace access
  const { workspace, user } = await requireWorkspaceAccess(slug)

  if (!activityId) {
    return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
  }

  // For now, return a simple success response - will implement full logic later
  const fakeSubmission = {
    id: 'sub-' + Date.now(),
    activityId,
    userId: user.dbUser.id,
    textContent,
    status: 'PENDING',
    submittedAt: new Date().toISOString(),
  }

  return NextResponse.json({ submission: fakeSubmission })
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

// TODO: Create activity-submissions API route separately