/**
 * CHALLENGE METRICS CALCULATION
 * ==============================
 *
 * Centralized metric calculations for challenge analytics.
 * Extracts complex inline calculations into testable functions.
 * Uses React cache for memoization to avoid redundant calculations.
 */

import { cache } from 'react'
import type { Activity, ActivitySubmission, Enrollment } from '@prisma/client'

interface ActivityWithSubmissions {
  id: string
  pointsValue: number
  ActivitySubmission?: ActivitySubmissionWithUser[]
  ActivityTemplate?: { name: string } | null
}

interface ActivitySubmissionWithUser {
  id: string
  status: string
  pointsAwarded: number | null
  submittedAt: Date
  User: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    displayName: string | null
  }
}

interface EnrollmentWithUser extends Enrollment {
  User?: {
    id: string
    email: string
    firstName: string | null
    lastName: string | null
    displayName: string | null
  }
}

export interface ChallengeMetrics {
  invitedCount: number
  enrolledCount: number
  totalSubmissions: number
  approvedSubmissions: number
  completionPct: number
  avgScore: number
  lastActivityAt: Date | null
  anySubmissions: boolean
  pendingSubmissionCount: number
  stalledInvitesCount: number
}

/**
 * Calculate comprehensive challenge metrics from raw data
 * Note: For best performance in server components, wrap this with React.cache()
 * at the call site if metrics are calculated multiple times for the same data.
 */
export function calculateChallengeMetrics(params: {
  enrollments: EnrollmentWithUser[]
  activities: ActivityWithSubmissions[]
  sevenDaysMs?: number
}): ChallengeMetrics {
  const { enrollments, activities, sevenDaysMs = 7 * 24 * 60 * 60 * 1000 } = params
  const now = new Date()

  // Enrollment metrics
  const invitedCount = enrollments.filter(e => e.status === 'INVITED').length
  const enrolledCount = enrollments.filter(e => e.status === 'ENROLLED').length

  // Submission metrics
  const totalSubmissions = activities.reduce(
    (sum, a) => sum + (a.ActivitySubmission?.length || 0),
    0
  )

  const approvedSubmissions = activities.reduce(
    (sum, a) => sum + (a.ActivitySubmission?.filter(s => s.status === 'APPROVED').length || 0),
    0
  )

  const pendingSubmissionCount = activities.reduce(
    (sum, a) => sum + (a.ActivitySubmission?.filter(s => s.status === 'PENDING').length || 0),
    0
  )

  // Completion percentage
  const completionPct = enrolledCount > 0
    ? Math.round((approvedSubmissions / Math.max(enrolledCount, 1)) * 100)
    : 0

  // Average score calculation
  const avgScore = calculateAverageScore(activities)

  // Last activity timestamp
  const lastActivityAt = getLastActivityTimestamp(activities)

  // Check if any submissions exist
  const anySubmissions = activities.some(a => (a.ActivitySubmission || []).length > 0)

  // Stalled invites (invited for 7+ days)
  const stalledInvitesCount = enrollments.filter(e =>
    e.status === 'INVITED' &&
    (now.getTime() - new Date(e.createdAt).getTime()) > sevenDaysMs
  ).length

  return {
    invitedCount,
    enrolledCount,
    totalSubmissions,
    approvedSubmissions,
    completionPct,
    avgScore,
    lastActivityAt,
    anySubmissions,
    pendingSubmissionCount,
    stalledInvitesCount,
  }
}

/**
 * Calculate average score across approved submissions
 */
function calculateAverageScore(activities: ActivityWithSubmissions[]): number {
  const approved = activities.flatMap(a =>
    (a.ActivitySubmission || []).filter(s => s.status === 'APPROVED')
  )

  const points = approved.map(s => s.pointsAwarded || 0)

  if (points.length === 0) return 0

  return Math.round(points.reduce((a, b) => a + b, 0) / points.length)
}

/**
 * Get timestamp of most recent submission
 */
function getLastActivityTimestamp(activities: ActivityWithSubmissions[]): Date | null {
  const allSubmissions = activities.flatMap(a => a.ActivitySubmission || [])

  if (allSubmissions.length === 0) return null

  const latest = allSubmissions.reduce((acc, s) =>
    acc && acc.submittedAt > s.submittedAt ? acc : s
  )

  return latest.submittedAt
}

/**
 * Calculate leaderboard for top participants
 */
export function calculateLeaderboard(
  activities: ActivityWithSubmissions[],
  limit: number = 5
): Array<{
  userId: string
  email: string
  displayName: string | null
  points: number
}> {
  const byUser: Record<string, {
    email: string
    displayName: string | null
    points: number
  }> = {}

  activities.forEach(activity => {
    (activity.ActivitySubmission || [])
      .filter(s => s.status === 'APPROVED')
      .forEach(submission => {
        const userId = submission.User.id
        const points = submission.pointsAwarded || activity.pointsValue || 0

        if (!byUser[userId]) {
          byUser[userId] = {
            email: submission.User.email,
            displayName: submission.User.displayName,
            points: 0,
          }
        }

        byUser[userId].points += points
      })
  })

  return Object.entries(byUser)
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit)
}
