import { NextRequest, NextResponse } from "next/server"
import { withErrorHandling, requireWorkspaceAccess } from "@/lib/auth/api-auth"
import { prisma } from "@/lib/prisma"
import { DatabaseError } from "@/lib/db/queries"

export const GET = withErrorHandling(async (
  request: NextRequest,
  context: { params: Promise<{ slug: string; id: string; enrollmentId: string }> }
) => {
  const { slug, id: participantId, enrollmentId } = await context.params
  const { workspace } = await requireWorkspaceAccess(slug)

  // Verify enrollment belongs to this workspace and participant
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      userId: participantId,
      Challenge: { workspaceId: workspace.id }
    },
    include: {
      Challenge: {
        include: {
          Activity: {
            where: { isRequired: true },
            include: {
              ActivitySubmission: {
                where: {
                  userId: participantId,
                  enrollmentId: enrollmentId,
                  status: 'APPROVED'
                }
              }
            }
          }
        }
      }
    }
  })

  if (!enrollment) {
    return NextResponse.json({ error: 'Enrollment not found' }, { status: 404 })
  }

  try {
    // Calculate progress metrics
    const activities = enrollment.Challenge.Activity
    const totalActivities = activities.length
    const completedActivities = activities.filter(a => a.ActivitySubmission.length > 0).length
    const pointsEarned = activities.reduce((sum, a) => {
      const submissions = a.ActivitySubmission
      return sum + submissions.reduce((subSum, s) => subSum + (s.pointsAwarded || 0), 0)
    }, 0)

    const progress = {
      completedActivities,
      totalActivities,
      pointsEarned,
      percentComplete: totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0
    }

    return NextResponse.json({ progress })
  } catch (error) {
    if (error instanceof DatabaseError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    throw error
  }
})
