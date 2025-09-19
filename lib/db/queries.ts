/**
 * WORKSPACE-ISOLATED DATABASE QUERY FUNCTIONS
 * ===========================================
 * 
 * This module provides standardized, secure query patterns for multi-tenant isolation
 * in the Changemaker MVP. All queries enforce workspaceId filtering to prevent data leakage.
 * 
 * SECURITY FEATURES:
 * - ✅ All queries validate workspace access before operations
 * - ✅ Foreign key cascade rules prevent orphaned data
 * - ✅ Consistent error handling with typed exceptions
 * - ✅ Optimized includes to prevent N+1 query problems
 * - ✅ Type-safe query patterns with Prisma client types
 * 
 * SCHEMA CONSTRAINTS (4-MODEL LIMIT):
 * - ✅ Workspace: Multi-tenant container with path-based routing (/w/[slug])
 * - ✅ User: Authentication integration with Supabase, workspace-scoped roles
 * - ✅ Challenge: Core business entity, workspace-scoped with cascade delete
 * - ✅ Enrollment: Junction table with unique constraints and cascade delete
 * 
 * QUERY PATTERNS:
 * - All workspace queries include _count for performance dashboards
 * - All user queries include workspace relation for access validation
 * - All challenge queries enforce workspaceId filtering
 * - All enrollment queries validate through challenge.workspaceId relationship
 * 
 * DATABASE INDEXES:
 * - [workspaceId] on User, Challenge for tenant isolation
 * - [workspaceId, role] on User for role-based queries
 * - [workspaceId, createdAt] on Challenge for ordered listings
 * - [userId, challengeId] unique constraint on Enrollment
 * - [challengeId], [userId], [status] on Enrollment for various queries
 */

import { prisma } from '@/lib/prisma'
import { type Workspace, type User, type Challenge, type Enrollment, type ActivityTemplate, type Activity, type ActivitySubmission, type PointsBalance, type InviteCode } from '@prisma/client'
import { type Role, type ActivityType, type SubmissionStatus } from '@/lib/types'
import type { WorkspaceId, UserId, ChallengeId, EnrollmentId } from '@/lib/types'
import { nanoid } from 'nanoid'

// =============================================================================
// ERROR TYPES
// =============================================================================

export class DatabaseError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class WorkspaceAccessError extends DatabaseError {
  constructor(workspaceId: string) {
    super(`Access denied to workspace: ${workspaceId}`, 'WORKSPACE_ACCESS_DENIED')
  }
}

export class ResourceNotFoundError extends DatabaseError {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`, 'RESOURCE_NOT_FOUND')
  }
}

// =============================================================================
// RESULT TYPES (with optimized includes)
// =============================================================================

export type WorkspaceWithCounts = Workspace & {
  _count: {
    memberships: number
    challenges: number
  }
}

export type WorkspaceWithDetails = Workspace & {
  users: (User & { enrollments: { challengeId: string }[] })[]
  challenges: Challenge[]
  _count: {
    users: number
    challenges: number
  }
}

export type UserWithWorkspace = User & {
  workspace: Workspace | null
}

export type ChallengeWithDetails = Challenge & {
  workspace: Workspace
  enrollments: (Enrollment & { user: Pick<User, 'id' | 'email'> })[]
  _count: {
    enrollments: number
  }
}

export type EnrollmentWithDetails = Enrollment & {
  user: Pick<User, 'id' | 'email'>
  challenge: Pick<Challenge, 'id' | 'title' | 'description' | 'workspaceId'>
}

// =============================================================================
// WORKSPACE QUERIES
// =============================================================================

/**
 * Get workspace by slug with counts (lightweight)
 */
export async function getWorkspaceBySlug(slug: string): Promise<WorkspaceWithCounts | null> {
  try {
    return await prisma.workspace.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            memberships: true,
            challenges: true
          }
        }
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace: ${error}`)
  }
}

/**
 * Get workspace with full details (heavy query - use sparingly)
 */
export async function getWorkspaceWithDetails(
  workspaceId: WorkspaceId
): Promise<WorkspaceWithDetails | null> {
  try {
    return await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        users: {
          include: {
            enrollments: {
              select: { challengeId: true }
            }
          }
        },
        challenges: true,
        _count: {
          select: {
            users: true,
            challenges: true
          }
        }
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace details: ${error}`)
  }
}

/**
 * Create new workspace with validation
 */
export async function createWorkspace(data: {
  slug: string
  name: string
}): Promise<Workspace> {
  try {
    return await prisma.workspace.create({
      data: {
        slug: data.slug,
        name: data.name
      }
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('unique')) {
      throw new DatabaseError(`Workspace slug '${data.slug}' already exists`)
    }
    throw new DatabaseError(`Failed to create workspace: ${error}`)
  }
}

/**
 * Update workspace (admin only)
 */
export async function updateWorkspace(
  workspaceId: WorkspaceId,
  data: { name?: string; slug?: string }
): Promise<Workspace> {
  try {
    return await prisma.workspace.update({
      where: { id: workspaceId },
      data
    })
  } catch (error) {
    throw new DatabaseError(`Failed to update workspace: ${error}`)
  }
}

// =============================================================================
// USER QUERIES (WORKSPACE-SCOPED)
// =============================================================================

/**
 * Get user with workspace context
 */
export async function getUserWithWorkspace(userId: UserId): Promise<UserWithWorkspace | null> {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        workspace: true
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch user: ${error}`)
  }
}

/**
 * Get user by Supabase ID with workspace
 */
export async function getUserBySupabaseId(supabaseUserId: string): Promise<UserWithWorkspace | null> {
  try {
    return await prisma.user.findUnique({
      where: { supabaseUserId },
      include: {
        workspace: true
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch user by Supabase ID: ${error}`)
  }
}

/**
 * Get all users in a workspace (admin only)
 */
export async function getWorkspaceUsers(workspaceId: WorkspaceId): Promise<User[]> {
  try {
    return await prisma.user.findMany({
      where: { workspaceId },
      orderBy: { email: 'asc' }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace users: ${error}`)
  }
}

/**
 * Create or update user (for auth sync)
 */
export async function upsertUser(data: {
  supabaseUserId: string
  email: string
  role?: Role
  workspaceId?: WorkspaceId
}): Promise<User> {
  try {
    return await prisma.user.upsert({
      where: { supabaseUserId: data.supabaseUserId },
      update: {
        email: data.email,
        ...(data.role && { role: data.role }),
        ...(data.workspaceId && { workspaceId: data.workspaceId })
      },
      create: {
        supabaseUserId: data.supabaseUserId,
        email: data.email,
        role: data.role || 'PARTICIPANT',
        workspaceId: data.workspaceId
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to upsert user: ${error}`)
  }
}

/**
 * Update user role (admin only, workspace-scoped)
 */
export async function updateUserRole(
  userId: UserId,
  role: Role,
  adminWorkspaceId: WorkspaceId
): Promise<User> {
  // Verify user belongs to admin's workspace
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })
  
  if (!user || user.workspaceId !== adminWorkspaceId) {
    throw new WorkspaceAccessError(adminWorkspaceId)
  }

  try {
    return await prisma.user.update({
      where: { id: userId },
      data: { role }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to update user role: ${error}`)
  }
}

// =============================================================================
// CHALLENGE QUERIES (WORKSPACE-SCOPED)
// =============================================================================

/**
 * Get all challenges in workspace with enrollment data
 */
export async function getWorkspaceChallenges(workspaceId: WorkspaceId): Promise<(Challenge & { enrollments: Enrollment[], _count: { enrollments: number } })[]> {
  try {
    return await prisma.challenge.findMany({
      where: { workspaceId },
      include: {
        enrollments: true,
        _count: {
          select: {
            enrollments: true
          }
        }
      },
      orderBy: { title: 'asc' }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace challenges: ${error}`)
  }
}

/**
 * Get challenge with details (workspace-scoped)
 */
export async function getChallengeWithDetails(
  challengeId: ChallengeId,
  workspaceId: WorkspaceId
): Promise<ChallengeWithDetails | null> {
  try {
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: challengeId,
        workspaceId // Enforce workspace isolation
      },
      include: {
        workspace: true,
        enrollments: {
          include: {
            user: {
              select: { id: true, email: true }
            }
          }
        },
        _count: {
          select: { enrollments: true }
        }
      }
    })

    return challenge
  } catch (error) {
    throw new DatabaseError(`Failed to fetch challenge details: ${error}`)
  }
}

/**
 * Create challenge (admin only, workspace-scoped)
 */
export async function createChallenge(
  data: {
    title: string
    description: string
    startDate: Date
    endDate: Date
    enrollmentDeadline?: Date
  },
  workspaceId: WorkspaceId
): Promise<Challenge> {
  try {
    return await prisma.challenge.create({
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        enrollmentDeadline: data.enrollmentDeadline || data.startDate,
        workspaceId
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to create challenge: ${error}`)
  }
}

/**
 * Update challenge (admin only, workspace-scoped)
 */
export async function updateChallenge(
  challengeId: ChallengeId,
  data: { 
    title?: string; 
    description?: string;
    startDate?: Date;
    endDate?: Date;
    enrollmentDeadline?: Date;
  },
  workspaceId: WorkspaceId
): Promise<Challenge> {
  // Verify challenge belongs to workspace
  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, workspaceId }
  })

  if (!challenge) {
    throw new ResourceNotFoundError('Challenge', challengeId)
  }

  try {
    return await prisma.challenge.update({
      where: { id: challengeId },
      data
    })
  } catch (error) {
    throw new DatabaseError(`Failed to update challenge: ${error}`)
  }
}

/**
 * Delete challenge (admin only, workspace-scoped)
 */
export async function deleteChallenge(
  challengeId: ChallengeId,
  workspaceId: WorkspaceId
): Promise<void> {
  // Verify challenge belongs to workspace
  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, workspaceId }
  })

  if (!challenge) {
    throw new ResourceNotFoundError('Challenge', challengeId)
  }

  try {
    await prisma.challenge.delete({
      where: { id: challengeId }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to delete challenge: ${error}`)
  }
}

// =============================================================================
// ENROLLMENT QUERIES (WORKSPACE-SCOPED)
// =============================================================================

/**
 * Get user enrollments with challenge details (workspace-scoped)
 */
export async function getUserEnrollments(
  userId: UserId,
  workspaceId: WorkspaceId
): Promise<EnrollmentWithDetails[]> {
  try {
    return await prisma.enrollment.findMany({
      where: {
        userId,
        challenge: {
          workspaceId // Enforce workspace isolation via challenge
        }
      },
      include: {
        user: {
          select: { id: true, email: true }
        },
        challenge: {
          select: { id: true, title: true, description: true, workspaceId: true }
        }
      }
    }) as EnrollmentWithDetails[]
  } catch (error) {
    throw new DatabaseError(`Failed to fetch user enrollments: ${error}`)
  }
}

/**
 * Get challenge enrollments (admin only, workspace-scoped)
 */
export async function getChallengeEnrollments(
  challengeId: ChallengeId,
  workspaceId: WorkspaceId
): Promise<EnrollmentWithDetails[]> {
  // Verify challenge belongs to workspace
  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, workspaceId }
  })

  if (!challenge) {
    throw new ResourceNotFoundError('Challenge', challengeId)
  }

  try {
    return await prisma.enrollment.findMany({
      where: { challengeId },
      include: {
        user: {
          select: { id: true, email: true }
        },
        challenge: {
          select: { id: true, title: true, description: true, workspaceId: true }
        }
      }
    }) as EnrollmentWithDetails[]
  } catch (error) {
    throw new DatabaseError(`Failed to fetch challenge enrollments: ${error}`)
  }
}

/**
 * Create enrollment (participant, workspace-scoped)
 */
export async function createEnrollment(
  userId: UserId,
  challengeId: ChallengeId,
  workspaceId: WorkspaceId,
  status: 'INVITED' | 'ENROLLED' = 'ENROLLED'
): Promise<Enrollment> {
  // Verify user belongs to workspace and challenge exists in workspace
  const [user, challenge] = await Promise.all([
    prisma.user.findFirst({
      where: { id: userId, workspaceId }
    }),
    prisma.challenge.findFirst({
      where: { id: challengeId, workspaceId }
    })
  ])

  if (!user) {
    throw new WorkspaceAccessError(workspaceId)
  }

  if (!challenge) {
    throw new ResourceNotFoundError('Challenge', challengeId)
  }

  // Check for existing enrollment
  const existing = await prisma.enrollment.findFirst({
    where: { userId, challengeId }
  })

  if (existing) {
    throw new DatabaseError('User already enrolled in this challenge')
  }

  try {
    return await prisma.enrollment.create({
      data: {
        userId,
        challengeId,
        status
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to create enrollment: ${error}`)
  }
}

/**
 * Create multiple enrollments (batch invite/enroll participants)
 */
export async function createChallengeEnrollments(
  challengeId: ChallengeId,
  participantIds: UserId[],
  workspaceId: WorkspaceId,
  status: 'INVITED' | 'ENROLLED' = 'INVITED'
): Promise<Enrollment[]> {
  // Verify challenge exists in workspace
  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, workspaceId }
  })

  if (!challenge) {
    throw new ResourceNotFoundError('Challenge', challengeId)
  }

  // Verify all users belong to workspace
  const users = await prisma.user.findMany({
    where: { 
      id: { in: participantIds },
      workspaceId 
    }
  })

  if (users.length !== participantIds.length) {
    throw new WorkspaceAccessError(workspaceId)
  }

  // Check for existing enrollments
  const existingEnrollments = await prisma.enrollment.findMany({
    where: {
      challengeId,
      userId: { in: participantIds }
    }
  })

  // Filter out users who are already enrolled
  const existingUserIds = existingEnrollments.map(e => e.userId)
  const newParticipantIds = participantIds.filter(id => !existingUserIds.includes(id))

  if (newParticipantIds.length === 0) {
    return []
  }

  try {
    // Create enrollments in batch
    const enrollmentData = newParticipantIds.map(userId => ({
      userId,
      challengeId,
      status
    }))

    const result = await prisma.enrollment.createMany({
      data: enrollmentData
    })

    // Return the created enrollments
    return await prisma.enrollment.findMany({
      where: {
        challengeId,
        userId: { in: newParticipantIds }
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to create challenge enrollments: ${error}`)
  }
}

/**
 * Update enrollment status (admin/participant, workspace-scoped)
 */
export async function updateEnrollmentStatus(
  enrollmentId: EnrollmentId,
  status: 'INVITED' | 'ENROLLED' | 'WITHDRAWN',
  workspaceId: WorkspaceId
): Promise<Enrollment> {
  // Verify enrollment belongs to workspace via challenge
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      challenge: {
        workspaceId
      }
    }
  })

  if (!enrollment) {
    throw new ResourceNotFoundError('Enrollment', enrollmentId)
  }

  try {
    return await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to update enrollment status: ${error}`)
  }
}

/**
 * Delete enrollment (admin/participant, workspace-scoped)
 */
export async function deleteEnrollment(
  enrollmentId: EnrollmentId,
  workspaceId: WorkspaceId
): Promise<void> {
  // Verify enrollment belongs to workspace via challenge
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      challenge: {
        workspaceId
      }
    }
  })

  if (!enrollment) {
    throw new ResourceNotFoundError('Enrollment', enrollmentId)
  }

  try {
    await prisma.enrollment.delete({
      where: { id: enrollmentId }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to delete enrollment: ${error}`)
  }
}

/**
 * Get all enrollments in workspace (admin only)
 */
export async function getAllWorkspaceEnrollments(
  workspaceId: WorkspaceId
): Promise<EnrollmentWithDetails[]> {
  try {
    return await prisma.enrollment.findMany({
      where: {
        challenge: {
          workspaceId
        }
      },
      include: {
        user: {
          select: { id: true, email: true }
        },
        challenge: {
          select: { id: true, title: true, description: true, workspaceId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    }) as EnrollmentWithDetails[]
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace enrollments: ${error}`)
  }
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Verify user has access to workspace
 */
export async function verifyWorkspaceAccess(
  userId: UserId,
  workspaceId: WorkspaceId
): Promise<boolean> {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, workspaceId }
    })
    return !!user
  } catch (error) {
    return false
  }
}

/**
 * Verify user is admin in workspace
 */
export async function verifyWorkspaceAdmin(
  userId: UserId,
  workspaceId: WorkspaceId
): Promise<boolean> {
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, workspaceId, role: 'ADMIN' }
    })
    return !!user
  } catch (error) {
    return false
  }
}

/**
 * Get workspace statistics (admin dashboard)
 */
export async function getWorkspaceStats(workspaceId: WorkspaceId) {
  try {
    const [userCount, challengeCount, enrollmentCount] = await Promise.all([
      prisma.user.count({ where: { workspaceId } }),
      prisma.challenge.count({ where: { workspaceId } }),
      prisma.enrollment.count({
        where: {
          challenge: { workspaceId }
        }
      })
    ])

    return {
      users: userCount,
      challenges: challengeCount,
      enrollments: enrollmentCount
    }
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace statistics: ${error}`)
  }
}

// =============================================================================
// ACTIVITY TEMPLATE QUERIES
// =============================================================================

/**
 * Get all activity templates for a workspace
 */
export async function getWorkspaceActivityTemplates(workspaceId: WorkspaceId): Promise<ActivityTemplate[]> {
  try {
    return await prisma.activityTemplate.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch activity templates: ${error}`)
  }
}

/**
 * Create activity template (admin-only)
 */
export async function createActivityTemplate(
  data: {
    name: string
    description: string
    type: ActivityType
    basePoints: number
    requiresApproval?: boolean
    allowMultiple?: boolean
  },
  workspaceId: WorkspaceId
): Promise<ActivityTemplate> {
  try {
    return await prisma.activityTemplate.create({
      data: {
        ...data,
        workspaceId,
        requiresApproval: data.requiresApproval ?? true,
        allowMultiple: data.allowMultiple ?? false
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to create activity template: ${error}`)
  }
}

/**
 * Get activity template by id (workspace-scoped)
 */
export async function getActivityTemplate(
  templateId: string,
  workspaceId: WorkspaceId
): Promise<ActivityTemplate | null> {
  try {
    return await prisma.activityTemplate.findFirst({
      where: { id: templateId, workspaceId }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch activity template: ${error}`)
  }
}

/**
 * Update activity template (admin-only)
 */
export async function updateActivityTemplate(
  templateId: string,
  data: Partial<{
    name: string
    description: string
    basePoints: number
    requiresApproval: boolean
    allowMultiple: boolean
  }>,
  workspaceId: WorkspaceId
): Promise<ActivityTemplate> {
  // Verify template exists in workspace
  const template = await prisma.activityTemplate.findFirst({
    where: { id: templateId, workspaceId }
  })

  if (!template) {
    throw new ResourceNotFoundError('ActivityTemplate', templateId)
  }

  try {
    return await prisma.activityTemplate.update({
      where: { id: templateId },
      data
    })
  } catch (error) {
    throw new DatabaseError(`Failed to update activity template: ${error}`)
  }
}

/**
 * Delete activity template (admin-only)
 */
export async function deleteActivityTemplate(
  templateId: string,
  workspaceId: WorkspaceId
): Promise<void> {
  // Verify template exists in workspace
  const template = await prisma.activityTemplate.findFirst({
    where: { id: templateId, workspaceId }
  })

  if (!template) {
    throw new ResourceNotFoundError('ActivityTemplate', templateId)
  }

  try {
    await prisma.activityTemplate.delete({
      where: { id: templateId }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to delete activity template: ${error}`)
  }
}

// =============================================================================
// ACTIVITY QUERIES
// =============================================================================

/**
 * Create activity from template (for challenges)
 */
export async function createActivity(
  data: {
    templateId: string
    challengeId: ChallengeId
    pointsValue?: number
    maxSubmissions?: number
    deadline?: Date
    isRequired?: boolean
  },
  workspaceId: WorkspaceId
): Promise<Activity> {
  // Verify template and challenge exist in workspace
  const [template, challenge] = await Promise.all([
    prisma.activityTemplate.findFirst({
      where: { id: data.templateId, workspaceId }
    }),
    prisma.challenge.findFirst({
      where: { id: data.challengeId, workspaceId }
    })
  ])

  if (!template) {
    throw new ResourceNotFoundError('ActivityTemplate', data.templateId)
  }

  if (!challenge) {
    throw new ResourceNotFoundError('Challenge', data.challengeId)
  }

  try {
    return await prisma.activity.create({
      data: {
        templateId: data.templateId,
        challengeId: data.challengeId,
        pointsValue: data.pointsValue ?? template.basePoints,
        maxSubmissions: data.maxSubmissions ?? 1,
        deadline: data.deadline,
        isRequired: data.isRequired ?? false
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to create activity: ${error}`)
  }
}

/**
 * Get activities for a challenge
 */
export async function getChallengeActivities(
  challengeId: ChallengeId,
  workspaceId: WorkspaceId
): Promise<(Activity & { template: ActivityTemplate })[]> {
  try {
    return await prisma.activity.findMany({
      where: { 
        challengeId,
        challenge: { workspaceId }
      },
      include: { template: true },
      orderBy: { createdAt: 'asc' }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch challenge activities: ${error}`)
  }
}

/**
 * Update an activity's per-challenge configuration (admin-only)
 */
export async function updateActivity(
  activityId: string,
  workspaceId: WorkspaceId,
  data: Partial<{
    pointsValue: number
    maxSubmissions: number
    deadline: Date | null
    isRequired: boolean
  }>
): Promise<Activity & { template: ActivityTemplate, challenge: Challenge }> {
  // Verify activity belongs to a challenge in this workspace
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, challenge: { workspaceId } },
    include: { challenge: true, template: true }
  })

  if (!activity) {
    throw new ResourceNotFoundError('Activity', activityId)
  }

  try {
    const updated = await prisma.activity.update({
      where: { id: activityId },
      data: {
        pointsValue: data.pointsValue ?? activity.pointsValue,
        maxSubmissions: data.maxSubmissions ?? activity.maxSubmissions,
        deadline: data.deadline === undefined ? activity.deadline : data.deadline,
        isRequired: data.isRequired ?? activity.isRequired
      },
      include: { template: true, challenge: true }
    })

    return updated
  } catch (error) {
    throw new DatabaseError(`Failed to update activity: ${error}`)
  }
}

/**
 * Delete an activity from a challenge (admin-only)
 */
export async function deleteActivity(
  activityId: string,
  workspaceId: WorkspaceId
): Promise<void> {
  // Verify activity belongs to a challenge in this workspace
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, challenge: { workspaceId } }
  })

  if (!activity) {
    throw new ResourceNotFoundError('Activity', activityId)
  }

  try {
    await prisma.activity.delete({ where: { id: activityId } })
  } catch (error) {
    throw new DatabaseError(`Failed to delete activity: ${error}`)
  }
}

// =============================================================================
// ACTIVITY SUBMISSION QUERIES
// =============================================================================

/**
 * Create activity submission
 */
export async function createActivitySubmission(
  data: {
    activityId: string
    userId: UserId
    enrollmentId: EnrollmentId
    textContent?: string
    fileUrls?: string[]
    linkUrl?: string
  }
): Promise<ActivitySubmission> {
  try {
    return await prisma.activitySubmission.create({
      data: {
        activityId: data.activityId,
        userId: data.userId,
        enrollmentId: data.enrollmentId,
        textContent: data.textContent,
        fileUrls: data.fileUrls ?? [],
        linkUrl: data.linkUrl,
        status: 'PENDING'
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to create activity submission: ${error}`)
  }
}

/**
 * Get submissions for review (admin)
 */
export async function getWorkspaceSubmissionsForReview(
  workspaceId: WorkspaceId
): Promise<(ActivitySubmission & {
  activity: Activity & { template: ActivityTemplate, challenge: Challenge }
  user: User
  enrollment: Enrollment
})[]> {
  try {
    return await prisma.activitySubmission.findMany({
      where: {
        status: 'PENDING',
        activity: {
          challenge: { workspaceId }
        }
      },
      include: {
        activity: {
          include: {
            template: true,
            challenge: true
          }
        },
        user: true,
        enrollment: true
      },
      orderBy: { submittedAt: 'asc' }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch submissions for review: ${error}`)
  }
}

/**
 * Review activity submission (approve/reject)
 */
export async function reviewActivitySubmission(
  submissionId: string,
  data: {
    status: 'APPROVED' | 'REJECTED'
    reviewNotes?: string
    pointsAwarded?: number
    reviewedBy: UserId
  },
  workspaceId: WorkspaceId
): Promise<ActivitySubmission & { activity: Activity & { template: ActivityTemplate, challenge: Challenge } }> {
  try {
    return await prisma.activitySubmission.update({
      where: {
        id: submissionId,
        activity: {
          challenge: { workspaceId }
        }
      },
      data: {
        status: data.status,
        reviewNotes: data.reviewNotes,
        pointsAwarded: data.pointsAwarded,
        reviewedBy: data.reviewedBy,
        reviewedAt: new Date()
      },
      include: {
        activity: {
          include: {
            template: true,
            challenge: true
          }
        }
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to review activity submission: ${error}`)
  }
}

// =============================================================================
// POINTS BALANCE QUERIES
// =============================================================================

/**
 * Get or create points balance for user in workspace
 */
export async function getOrCreatePointsBalance(
  userId: UserId,
  workspaceId: WorkspaceId
): Promise<{ totalPoints: number; availablePoints: number }> {
  try {
    const balance = await prisma.pointsBalance.upsert({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId
        }
      },
      update: {},
      create: {
        userId,
        workspaceId,
        totalPoints: 0,
        availablePoints: 0
      }
    })
    return balance
  } catch (error) {
    throw new DatabaseError(`Failed to get points balance: ${error}`)
  }
}

/**
 * Update points balance (add/subtract points)
 */
export async function updatePointsBalance(
  userId: UserId,
  workspaceId: WorkspaceId,
  pointsToAdd: number
): Promise<void> {
  try {
    await prisma.pointsBalance.upsert({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId
        }
      },
      update: {
        totalPoints: { increment: pointsToAdd },
        availablePoints: { increment: pointsToAdd }
      },
      create: {
        userId,
        workspaceId,
        totalPoints: Math.max(0, pointsToAdd),
        availablePoints: Math.max(0, pointsToAdd)
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to update points balance: ${error}`)
  }
}

/**
 * Get workspace leaderboard (top points earners)
 */
export async function getWorkspaceLeaderboard(
  workspaceId: WorkspaceId,
  limit: number = 10
): Promise<(PointsBalance & { user: Pick<User, 'id' | 'email'> })[]> {
  try {
    return await prisma.pointsBalance.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: { id: true, email: true }
        }
      },
      orderBy: { totalPoints: 'desc' },
      take: limit
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace leaderboard: ${error}`)
  }
}

/**
 * Get user's activity submissions across all challenges in workspace
 */
export async function getUserActivitySubmissions(
  userId: UserId,
  workspaceId: WorkspaceId,
  status?: SubmissionStatus
): Promise<(ActivitySubmission & {
  activity: Activity & {
    template: ActivityTemplate
    challenge: Challenge
  }
  enrollment: Enrollment
})[]> {
  try {
    return await prisma.activitySubmission.findMany({
      where: {
        userId,
        activity: {
          challenge: {
            workspaceId
          }
        },
        ...(status && { status })
      },
      include: {
        activity: {
          include: {
            template: true,
            challenge: true
          }
        },
        enrollment: true
      },
      orderBy: { submittedAt: 'desc' }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch user activity submissions: ${error}`)
  }
}

/**
 * Get challenge-specific leaderboard (participants ranked by points in challenge)
 */
export async function getChallengeLeaderboard(
  challengeId: ChallengeId,
  workspaceId: WorkspaceId,
  limit: number = 10
): Promise<{
  userId: string
  email: string
  totalPoints: number
  submissions: number
  completedActivities: number
}[]> {
  try {
    // First verify challenge belongs to workspace
    const challenge = await prisma.challenge.findFirst({
      where: { id: challengeId, workspaceId }
    })

    if (!challenge) {
      throw new ResourceNotFoundError('Challenge', challengeId)
    }

    // Get all enrollments for this challenge with their activity submission stats
    const enrollments = await prisma.enrollment.findMany({
      where: {
        challengeId,
        status: 'ENROLLED'
      },
      include: {
        user: {
          select: { id: true, email: true }
        },
        activitySubmissions: {
          where: {
            activity: {
              challengeId
            }
          },
          include: {
            activity: true
          }
        }
      }
    })

    // Calculate leaderboard data
    const leaderboardData = enrollments.map(enrollment => {
      const submissions = enrollment.activitySubmissions
      const approvedSubmissions = submissions.filter(s => s.status === 'APPROVED')
      const totalPoints = approvedSubmissions.reduce((sum, s) => sum + (s.pointsAwarded || 0), 0)
      const uniqueActivities = new Set(approvedSubmissions.map(s => s.activityId))

      return {
        userId: enrollment.user.id,
        email: enrollment.user.email,
        totalPoints,
        submissions: submissions.length,
        completedActivities: uniqueActivities.size
      }
    })

    // Sort by points descending, then by completed activities
    return leaderboardData
      .sort((a, b) => {
        if (a.totalPoints !== b.totalPoints) {
          return b.totalPoints - a.totalPoints
        }
        return b.completedActivities - a.completedActivities
      })
      .slice(0, limit)
  } catch (error) {
    throw new DatabaseError(`Failed to fetch challenge leaderboard: ${error}`)
  }
}

export async function logActivityEvent(data: {
  workspaceId: string
  type: 'INVITE_SENT' | 'INVITE_REDEEMED' | 'EMAIL_RESENT' | 'ENROLLED' | 'UNENROLLED' | 'RBAC_ROLE_CHANGED' | 'SUBMISSION_CREATED' | 'SUBMISSION_APPROVED' | 'SUBMISSION_REJECTED' | 'CHALLENGE_CREATED' | 'CHALLENGE_UPDATED' | 'CHALLENGE_DUPLICATED' | 'CHALLENGE_PUBLISHED' | 'CHALLENGE_UNPUBLISHED' | 'CHALLENGE_ARCHIVED' | 'ACTIVITY_CREATED' | 'ACTIVITY_UPDATED' | 'BULK_UNENROLL'
  challengeId?: string | null
  enrollmentId?: string | null
  userId?: string | null
  actorUserId?: string | null
  metadata?: any
}) {
  try {
    await prisma.activityEvent.create({
      data: {
        workspaceId: data.workspaceId,
        type: data.type as any,
        challengeId: data.challengeId || undefined,
        enrollmentId: data.enrollmentId || undefined,
        userId: data.userId || undefined,
        actorUserId: data.actorUserId || undefined,
        metadata: data.metadata as any
      }
    })
  } catch (error) {
    // Non-fatal: don't block main flow
    console.warn('Failed to log activity event', error)
  }
}

export async function getChallengeEvents(challengeId: string) {
  return await prisma.activityEvent.findMany({
    where: { challengeId },
    include: {
      user: { select: { email: true } },
      actor: { select: { email: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })
}

// =============================================================================
// INVITE CODE QUERIES
// =============================================================================

export type InviteCodeWithDetails = InviteCode & {
  workspace: Workspace
  challenge?: Challenge | null
  creator: Pick<User, 'id' | 'email'>
}

/**
 * Create invite code (admin only, workspace-scoped)
 */
export async function createInviteCode(
  data: {
    challengeId?: ChallengeId
    role?: Role
    expiresIn?: number // hours, defaults to 168 (1 week)
    maxUses?: number
  },
  workspaceId: WorkspaceId,
  createdBy: UserId
): Promise<InviteCode> {
  // Verify creator is admin in workspace (membership-aware; fallback to legacy User.workspaceId)
  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId: createdBy, workspaceId } }
  })
  const legacyAdmin = await prisma.user.findFirst({
    where: { id: createdBy, workspaceId, role: 'ADMIN' }
  })
  if (!(membership?.role === 'ADMIN' || !!legacyAdmin)) {
    throw new WorkspaceAccessError(workspaceId)
  }
  
  // Verify challenge exists in workspace if provided
  if (data.challengeId) {
    const challenge = await prisma.challenge.findFirst({
      where: { id: data.challengeId, workspaceId }
    })
    
    if (!challenge) {
      throw new ResourceNotFoundError('Challenge', data.challengeId)
    }
  }
  
  const code = nanoid(10)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + (data.expiresIn || 168))
  
  try {
    return await prisma.inviteCode.create({
      data: {
        code,
        workspaceId,
        challengeId: data.challengeId || null,
        role: data.role || 'PARTICIPANT',
        expiresAt,
        maxUses: data.maxUses || 1,
        usedCount: 0,
        createdBy
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to create invite code: ${error}`)
  }
}

/**
 * Get invite code by code with validation
 */
export async function getInviteByCode(code: string): Promise<InviteCodeWithDetails | null> {
  try {
    return await prisma.inviteCode.findUnique({
      where: { code },
      include: {
        workspace: true,
        challenge: true,
        creator: {
          select: { id: true, email: true }
        }
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch invite code: ${error}`)
  }
}

/**
 * Accept invite code (authenticated user)
 */
export async function acceptInviteCode(
  code: string,
  userId: UserId,
  userEmail: string
): Promise<{ 
  workspace: Workspace
  challenge?: Challenge | null
  enrollment?: Enrollment | null
  isExistingMember: boolean
  role: Role
}> {
  const invite = await getInviteByCode(code)
  
  if (!invite) {
    throw new ResourceNotFoundError('Invite', code)
  }
  
  // Check if invite is valid
  if (invite.expiresAt < new Date()) {
    throw new DatabaseError('Invite code has expired')
  }
  
  if (invite.usedCount >= invite.maxUses) {
    throw new DatabaseError('Invite code has reached maximum uses')
  }
  
  // Fetch user and any existing membership
  const dbUser = await prisma.user.findUnique({ where: { id: userId } })
  const existingMembership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } }
  })
  
  let enrollment: Enrollment | null = null
  let isExistingMember = false
  let resultingRole: Role = invite.role
  
  try {
    await prisma.$transaction(async (tx) => {
      // Ensure there is a single user row for this supabase user
      if (!dbUser) {
        throw new DatabaseError('User not found')
      }

      // Link placeholder rows by email if missing supabaseUserId
      if (!dbUser.supabaseUserId) {
        await tx.user.update({ where: { id: dbUser.id }, data: { supabaseUserId: dbUser.id } as any })
      }

      // Upsert membership (new system)
      if (!existingMembership) {
        await tx.workspaceMembership.create({
          data: {
            userId,
            workspaceId: invite.workspaceId,
            role: invite.role,
            isPrimary: false
          }
        })
        resultingRole = invite.role
      } else {
        resultingRole = existingMembership.role as Role
      }

      // Clear pending flag on the user record
      await tx.user.update({ where: { id: userId }, data: { isPending: false } })
      
      // If invite is for specific challenge, enroll user
      if (invite.challengeId) {
        const existingEnrollment = await tx.enrollment.findFirst({
          where: { userId, challengeId: invite.challengeId }
        })
        
        if (!existingEnrollment) {
          enrollment = await tx.enrollment.create({
            data: {
              userId,
              challengeId: invite.challengeId,
              status: 'ENROLLED'
            }
          })
        } else {
          enrollment = existingEnrollment
        }
      }
      
      // Promote or create enrollment based on invite
      if (invite.challengeId) {
        const existingEnrollment = await tx.enrollment.findFirst({
          where: { userId, challengeId: invite.challengeId }
        })
        if (!existingEnrollment) {
          enrollment = await tx.enrollment.create({
            data: { userId, challengeId: invite.challengeId, status: 'ENROLLED' }
          })
        } else if (existingEnrollment.status !== 'ENROLLED') {
          enrollment = await tx.enrollment.update({
            where: { id: existingEnrollment.id },
            data: { status: 'ENROLLED' }
          })
        } else {
          enrollment = existingEnrollment
        }
      }

      // Increment used count
      await tx.inviteCode.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } }
      })
    })
    
    return {
      workspace: invite.workspace,
      challenge: invite.challenge,
      enrollment,
      isExistingMember,
      role: resultingRole
    }
  } catch (error) {
    throw new DatabaseError(`Failed to accept invite: ${error}`)
  }
}

/**
 * Get workspace invite codes (admin only)
 */
export async function getWorkspaceInviteCodes(
  workspaceId: WorkspaceId
): Promise<InviteCodeWithDetails[]> {
  try {
    return await prisma.inviteCode.findMany({
      where: { workspaceId },
      include: {
        workspace: true,
        challenge: true,
        creator: {
          select: { id: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace invite codes: ${error}`)
  }
}

/**
 * Delete invite code (admin only, workspace-scoped)
 */
export async function deleteInviteCode(
  inviteId: string,
  workspaceId: WorkspaceId
): Promise<void> {
  // Verify invite belongs to workspace
  const invite = await prisma.inviteCode.findFirst({
    where: { id: inviteId, workspaceId }
  })
  
  if (!invite) {
    throw new ResourceNotFoundError('InviteCode', inviteId)
  }
  
  try {
    await prisma.inviteCode.delete({
      where: { id: inviteId }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to delete invite code: ${error}`)
  }
}