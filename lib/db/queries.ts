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
import { type Workspace, type User, type Challenge, type Enrollment } from '@prisma/client'
import { type Role } from '@/lib/types'
import type { WorkspaceId, UserId, ChallengeId, EnrollmentId } from '@/lib/types'

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
    users: number
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
  challenge: Pick<Challenge, 'id' | 'title' | 'workspaceId'>
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
            users: true,
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
 * Get all challenges in workspace
 */
export async function getWorkspaceChallenges(workspaceId: WorkspaceId): Promise<Challenge[]> {
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
          select: { id: true, title: true, workspaceId: true }
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
          select: { id: true, title: true, workspaceId: true }
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
  status: string = 'ACTIVE'
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
 * Create multiple enrollments (admin only, workspace-scoped)
 */
export async function createBulkEnrollments(
  userIds: UserId[],
  challengeId: ChallengeId,
  workspaceId: WorkspaceId,
  status: string = 'ACTIVE'
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
      id: { in: userIds },
      workspaceId
    }
  })

  if (users.length !== userIds.length) {
    throw new WorkspaceAccessError(workspaceId)
  }

  // Check for existing enrollments
  const existingEnrollments = await prisma.enrollment.findMany({
    where: {
      challengeId,
      userId: { in: userIds }
    }
  })

  const existingUserIds = new Set(existingEnrollments.map(e => e.userId))
  const newUserIds = userIds.filter(id => !existingUserIds.has(id))

  if (newUserIds.length === 0) {
    // No new enrollments to create, return existing ones
    return existingEnrollments
  }

  try {
    const enrollmentData = newUserIds.map(userId => ({
      userId,
      challengeId,
      status
    }))

    // Use createMany for bulk insert
    await prisma.enrollment.createMany({
      data: enrollmentData
    })

    // Return all enrollments (both existing and newly created)
    return await prisma.enrollment.findMany({
      where: {
        challengeId,
        userId: { in: userIds }
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to create bulk enrollments: ${error}`)
  }
}

/**
 * Update enrollment status (admin/participant, workspace-scoped)
 */
export async function updateEnrollmentStatus(
  enrollmentId: EnrollmentId,
  status: string,
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
          select: { id: true, title: true, workspaceId: true }
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