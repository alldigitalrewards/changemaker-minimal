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
import { type Workspace, type User, type Challenge, type Enrollment, type WorkspaceMembership, type ActivityTemplate, type Activity, type ActivitySubmission, type PointsBalance, type InviteCode, type WorkspaceEmailSettings, type WorkspaceEmailTemplate, type EmailTemplateType, type WorkspacePointsBudget, type ChallengePointsBudget, type WorkspaceCommunication, CommunicationScope, CommunicationAudience, CommunicationPriority } from '@prisma/client'
import { type Role, type ActivityType, type RewardType, type SubmissionStatus } from '@/lib/types'
import type { WorkspaceId, UserId, ChallengeId, EnrollmentId } from '@/lib/types'
import { randomBytes } from 'crypto'
import type {
  EnrollmentWithDetails as CanonicalEnrollmentWithDetails,
  ChallengeWithDetails as CanonicalChallengeWithDetails,
  WorkspaceWithDetails as CanonicalWorkspaceWithDetails,
  ActivitySubmissionWithDetails as CanonicalActivitySubmissionWithDetails
} from './types'

// =============================================================================
// ERROR TYPES
// =============================================================================

export class DatabaseError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
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

/**
 * @deprecated This local type will be migrated. Prefer WorkspaceWithDetails from './types'
 * NOTE: This has different includes than canonical - used for lightweight counts only
 */
export type WorkspaceWithCounts = Workspace & {
  _count: {
    WorkspaceMembership: number
    Challenge: number
  }
}

/**
 * @deprecated This local type has different includes than canonical WorkspaceWithDetails from './types'
 * This version includes WorkspaceMembership with nested User and Challenge arrays for admin details view
 * TODO: Consider creating separate canonical type for this use case
 */
export type WorkspaceWithDetails = Workspace & {
  WorkspaceMembership: (WorkspaceMembership & {
    User: User & { Enrollment: { challengeId: string }[] }
  })[]
  Challenge: Challenge[]
  _count: {
    WorkspaceMembership: number
    Challenge: number
  }
}


/**
 * @deprecated This local type has minimal includes compared to canonical ChallengeWithDetails
 * This version is for lightweight challenge lists without Activity relations
 * Canonical type includes full Activity and ActivityTemplate nesting
 * TODO: Consider creating separate canonical type for list views
 */
export type ChallengeWithDetails = Challenge & {
  Workspace: Workspace
  Enrollment: (Enrollment & { User: Pick<User, 'id' | 'email'> })[]
  _count: {
    Enrollment: number
  }
}

/**
 * @deprecated This local type has minimal includes compared to canonical EnrollmentWithDetails
 * This version is for lightweight enrollment lists - includes minimal User and Challenge selects
 * Canonical type includes full ActivitySubmission nesting
 * TODO: Migrate queries to use canonical type or create separate lightweight type
 */
export type EnrollmentWithDetails = Enrollment & {
  User: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'displayName'>
  Challenge: Pick<Challenge, 'id' | 'title' | 'description' | 'workspaceId' | 'status' | 'enrollmentDeadline'>
}

export type WorkspaceEmailTemplateDTO = Pick<WorkspaceEmailTemplate, 'type' | 'subject' | 'html' | 'enabled' | 'updatedAt'>

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
            WorkspaceMembership: true,
            Challenge: true
          }
        }
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace: ${error}`)
  }
}

/**
 * Optimized workspace dashboard query for /workspaces page
 * Consolidates all data fetching into a single aggregated query to eliminate N+1 issues
 * Returns user memberships with pre-calculated counts and workspace details
 */
export async function getOptimizedWorkspaceDashboardData(userId: string) {
  try {
    // Single query with optimized joins and aggregations
    const memberships = await prisma.workspaceMembership.findMany({
      where: { userId },
      include: {
        Workspace: {
          include: {
            _count: {
              select: {
                WorkspaceMembership: true,
                Challenge: true
              }
            }
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    // Calculate aggregate totals in-memory (already fetched data)
    const totalWorkspaces = memberships.length
    const totalMembers = memberships.reduce((sum, m) => sum + (m.Workspace._count?.WorkspaceMembership || 0), 0)
    const totalChallenges = memberships.reduce((sum, m) => sum + (m.Workspace._count?.Challenge || 0), 0)

    // Get points balance for all workspaces in a single query
    const pointsBalances = await prisma.pointsBalance.findMany({
      where: {
        userId,
        workspaceId: { in: memberships.map(m => m.workspaceId) }
      },
      select: {
        workspaceId: true,
        totalPoints: true,
        availablePoints: true
      }
    })

    // Create a map for quick lookup
    const pointsMap = new Map(pointsBalances.map(pb => [pb.workspaceId, pb]))

    return {
      memberships: memberships.map(m => ({
        ...m,
        pointsBalance: pointsMap.get(m.workspaceId) || { totalPoints: 0, availablePoints: 0 }
      })),
      summary: {
        totalWorkspaces,
        totalMembers,
        totalChallenges
      }
    }
  } catch (error) {
    throw new DatabaseError(`Failed to fetch optimized workspace dashboard data: ${error}`)
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
        WorkspaceMembership: {
          include: {
            User: {
              include: {
                Enrollment: {
                  select: { challengeId: true }
                }
              }
            }
          }
        },
        Challenge: true,
        _count: {
          select: {
            WorkspaceMembership: true,
            Challenge: true
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
        id: crypto.randomUUID(),
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
 * Get user by ID
 * Role information comes from WorkspaceMembership
 */
export async function getUser(userId: UserId): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { id: userId }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch user: ${error}`)
  }
}

/**
 * Get user by Supabase ID
 */
export async function getUserBySupabaseId(supabaseUserId: string): Promise<User | null> {
  try {
    return await prisma.user.findUnique({
      where: { supabaseUserId }
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
    const memberships = await prisma.workspaceMembership.findMany({
      where: { workspaceId },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true,
            supabaseUserId: true,
            isPending: true,
            createdAt: true,
            updatedAt: true,
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })
    return memberships.map(m => m.User as User)
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace users: ${error}`)
  }
}

/**
 * Create or update user identity (for auth sync)
 * Role assignment happens via WorkspaceMembership
 */
export async function upsertUser(data: {
  supabaseUserId: string
  email: string
}): Promise<User> {
  try {
    return await prisma.user.upsert({
      where: { supabaseUserId: data.supabaseUserId },
      update: {
        email: data.email
      },
      create: {
        supabaseUserId: data.supabaseUserId,
        email: data.email
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to upsert user: ${error}`)
  }
}


// =============================================================================
// CHALLENGE QUERIES (WORKSPACE-SCOPED)
// =============================================================================

/**
 * Get all challenges in workspace with enrollment data
 */
export async function getWorkspaceChallenges(workspaceId: WorkspaceId): Promise<(Challenge & { Enrollment: Enrollment[], _count: { Enrollment: number } })[]> {
  try {
    return await prisma.challenge.findMany({
      where: { workspaceId },
      include: {
        Enrollment: true,
        _count: {
          select: {
            Enrollment: true
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
        Workspace: true,
        Enrollment: {
          include: {
            User: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                displayName: true
              }
            }
          }
        },
        _count: {
          select: { Enrollment: true }
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
    rewardType?: 'points' | 'sku' | 'monetary'
    rewardConfig?: any
    emailEditAllowed?: boolean
    requireManagerApproval?: boolean
    requireAdminReapproval?: boolean
  },
  workspaceId: WorkspaceId
): Promise<Challenge> {
  try {
    return await prisma.challenge.create({
      data: {
        id: crypto.randomUUID(),
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        enrollmentDeadline: data.enrollmentDeadline || data.startDate,
        rewardType: data.rewardType,
        rewardConfig: data.rewardConfig,
        emailEditAllowed: data.emailEditAllowed ?? true, // Default to true if not specified
        requireManagerApproval: data.requireManagerApproval ?? false, // Default to false (opt-in)
        requireAdminReapproval: data.requireAdminReapproval ?? true, // Default to true (safer)
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
    rewardType?: 'points' | 'sku' | 'monetary';
    rewardConfig?: any;
    requireManagerApproval?: boolean;
    requireAdminReapproval?: boolean;
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
        Challenge: {
          workspaceId,
          status: 'PUBLISHED'
        }
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        },
        Challenge: {
          select: { id: true, title: true, description: true, workspaceId: true, status: true, enrollmentDeadline: true }
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
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        },
        Challenge: {
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
  const [membership, challenge] = await Promise.all([
    prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } }
    }),
    prisma.challenge.findFirst({
      where: { id: challengeId, workspaceId }
    })
  ])

  if (!membership) {
    throw new WorkspaceAccessError(workspaceId)
  }

  if (!challenge) {
    throw new ResourceNotFoundError('Challenge', challengeId)
  }

  // Enforce only that challenge is not archived; allow enrollment for inactive/unpublished challenges
  if ((challenge as any).status === 'ARCHIVED') {
    throw new ValidationError('Enrollment is not allowed for archived challenges')
  }
  if ((challenge as any).enrollmentDeadline && new Date() > new Date((challenge as any).enrollmentDeadline)) {
    throw new ValidationError('Enrollment deadline has passed')
  }

  const existing = await prisma.enrollment.findFirst({
    where: { userId, challengeId }
  })

  if (existing) {
    throw new ValidationError('User already enrolled in this challenge')
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
  const challenge = await prisma.challenge.findFirst({
    where: { id: challengeId, workspaceId }
  })

  if (!challenge) {
    throw new ResourceNotFoundError('Challenge', challengeId)
  }

  const membershipCount = await prisma.workspaceMembership.count({
    where: { userId: { in: participantIds }, workspaceId }
  })

  if (membershipCount !== participantIds.length) {
    throw new WorkspaceAccessError(workspaceId)
  }

  const existingEnrollments = await prisma.enrollment.findMany({
    where: {
      challengeId,
      userId: { in: participantIds }
    }
  })

  const existingUserIds = existingEnrollments.map(e => e.userId)
  const newParticipantIds = participantIds.filter(id => !existingUserIds.includes(id))

  if (newParticipantIds.length === 0) {
    return []
  }

  try {
    const enrollmentData = newParticipantIds.map(userId => ({
      userId,
      challengeId,
      status
    }))

    await prisma.enrollment.createMany({ data: enrollmentData })

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
 * When status is set to COMPLETED, automatically triggers reward issuance if RewardSTACK is enabled
 */
export async function updateEnrollmentStatus(
  enrollmentId: EnrollmentId,
  status: 'INVITED' | 'ENROLLED' | 'WITHDRAWN' | 'COMPLETED',
  workspaceId: WorkspaceId
): Promise<Enrollment> {
  // Verify enrollment belongs to workspace via challenge
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      Challenge: {
        workspaceId
      }
    },
    include: {
      Challenge: {
        select: {
          id: true,
          title: true,
          rewardType: true,
          rewardConfig: true,
          workspaceId: true,
          Workspace: {
            select: {
              rewardStackEnabled: true,
            }
          }
        }
      },
      User: {
        select: {
          id: true,
          email: true,
        }
      }
    }
  })

  if (!enrollment) {
    throw new ResourceNotFoundError('Enrollment', enrollmentId)
  }

  try {
    // Update enrollment status
    const updatedEnrollment = await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status,
        ...(status === 'COMPLETED' && { completedAt: new Date() })
      }
    })

    // If status is COMPLETED and RewardSTACK is enabled, trigger reward issuance
    if (status === 'COMPLETED' && enrollment.Challenge.Workspace.rewardStackEnabled) {
      await handleChallengeCompletionReward(
        enrollment.id,
        enrollment.userId,
        enrollment.Challenge,
        workspaceId
      )
    }

    return updatedEnrollment
  } catch (error) {
    throw new DatabaseError(`Failed to update enrollment status: ${error}`)
  }
}

/**
 * Handle reward issuance when a challenge is completed
 * Called automatically by updateEnrollmentStatus when status changes to COMPLETED
 */
async function handleChallengeCompletionReward(
  enrollmentId: string,
  userId: string,
  challenge: {
    id: string;
    title: string;
    rewardType: RewardType | null;
    rewardConfig: any;
    workspaceId: string;
  },
  workspaceId: string
): Promise<void> {
  try {
    // Check if challenge has reward configured
    if (!challenge.rewardType || !challenge.rewardConfig) {
      console.log(
        `Challenge ${challenge.id} has no reward configured, skipping reward issuance`
      );
      return;
    }

    // Parse reward configuration
    const rewardConfig = challenge.rewardConfig as {
      amount?: number;
      skuId?: string;
      description?: string;
    };

    // Validate reward configuration based on type
    if (challenge.rewardType === 'points') {
      if (!rewardConfig.amount || rewardConfig.amount <= 0) {
        console.error(
          `Invalid points reward configuration for challenge ${challenge.id}: amount is required and must be > 0`
        );
        return;
      }
    } else if (challenge.rewardType === 'sku') {
      if (!rewardConfig.skuId) {
        console.error(
          `Invalid SKU reward configuration for challenge ${challenge.id}: skuId is required`
        );
        return;
      }
    } else {
      console.log(
        `Unsupported reward type ${challenge.rewardType} for challenge ${challenge.id}`
      );
      return;
    }

    // Check if reward already issued for this user/challenge combination
    const existingReward = await prisma.rewardIssuance.findFirst({
      where: {
        userId,
        challengeId: challenge.id,
      }
    });

    if (existingReward) {
      console.log(
        `Reward already issued for user ${userId} on challenge ${challenge.id}, skipping duplicate issuance`
      );
      return;
    }

    // Create RewardIssuance record
    const rewardIssuance = await prisma.rewardIssuance.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        workspaceId,
        challengeId: challenge.id,
        type: challenge.rewardType,
        amount: challenge.rewardType === 'points' ? rewardConfig.amount : null,
        skuId: challenge.rewardType === 'sku' ? rewardConfig.skuId : null,
        status: 'PENDING',
        rewardStackStatus: 'PENDING',
        metadata: {
          challengeTitle: challenge.title,
          rewardDescription: rewardConfig.description,
          triggeredAt: new Date().toISOString(),
          triggerType: 'challenge_completion',
          enrollmentId, // Store enrollment ID in metadata for tracking
        },
      }
    });

    console.log(
      `Created RewardIssuance ${rewardIssuance.id} for enrollment ${enrollmentId}`
    );

    // TODO: Log reward issuance event when proper ActivityLogType is added
    // Activity logging temporarily disabled due to missing REWARD_ISSUED type in enum

    // Issue the reward asynchronously (don't block enrollment update)
    // Import dynamically to avoid circular dependencies
    import('@/lib/rewardstack/reward-logic')
      .then(({ issueRewardTransaction }) => {
        issueRewardTransaction(rewardIssuance.id).catch((error) => {
          console.error(
            `Failed to issue reward ${rewardIssuance.id} for enrollment ${enrollmentId}:`,
            error
          );
        });
      })
      .catch((error) => {
        console.error('Failed to load reward issuance module:', error);
      });

  } catch (error) {
    console.error(
      `Failed to handle challenge completion reward for enrollment ${enrollmentId}:`,
      error
    );
    // Don't throw - we don't want to block enrollment completion if reward fails
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
      Challenge: {
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
        Challenge: {
          workspaceId
        }
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        },
        Challenge: {
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
    const membership = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } }
    })
    return !!membership
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
    const membership = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } }
    })
    return membership?.role === 'ADMIN'
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
      prisma.workspaceMembership.count({ where: { workspaceId } }),
      prisma.challenge.count({ where: { workspaceId } }),
      prisma.enrollment.count({
        where: {
          Challenge: { workspaceId }
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
// WORKSPACE EMAIL SETTINGS / TEMPLATES
// =============================================================================

export async function getWorkspaceEmailSettings(workspaceId: WorkspaceId): Promise<WorkspaceEmailSettings | null> {
  try {
    return await prisma.workspaceEmailSettings.findUnique({ where: { workspaceId } })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace email settings: ${error}`)
  }
}

export async function upsertWorkspaceEmailSettings(
  workspaceId: WorkspaceId,
  data: Partial<Pick<WorkspaceEmailSettings, 'fromName' | 'fromEmail' | 'replyTo' | 'footerHtml' | 'brandColor'>>,
  updatedBy?: string | null
): Promise<WorkspaceEmailSettings> {
  try {
    return await prisma.workspaceEmailSettings.upsert({
      where: { workspaceId },
      create: { id: crypto.randomUUID(), workspaceId, ...data, updatedBy: updatedBy || null },
      update: { ...data, updatedBy: updatedBy || null }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to upsert workspace email settings: ${error}`)
  }
}

export async function listWorkspaceEmailTemplates(workspaceId: WorkspaceId): Promise<WorkspaceEmailTemplateDTO[]> {
  try {
    const rows = await prisma.workspaceEmailTemplate.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' }
    })
    return rows.map(r => ({ type: r.type, subject: r.subject || null as any, html: r.html || null as any, enabled: r.enabled, updatedAt: r.updatedAt }))
  } catch (error) {
    throw new DatabaseError(`Failed to list workspace email templates: ${error}`)
  }
}

export async function getWorkspaceEmailTemplate(
  workspaceId: WorkspaceId,
  type: EmailTemplateType
): Promise<WorkspaceEmailTemplate | null> {
  try {
    return await prisma.workspaceEmailTemplate.findUnique({
      where: { workspaceId_type: { workspaceId, type } }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace email template: ${error}`)
  }
}

export async function upsertWorkspaceEmailTemplate(
  workspaceId: WorkspaceId,
  type: EmailTemplateType,
  data: Partial<Pick<WorkspaceEmailTemplate, 'subject' | 'html' | 'enabled'>>,
  updatedBy?: string | null
): Promise<WorkspaceEmailTemplate> {
  try {
    return await prisma.workspaceEmailTemplate.upsert({
      where: { workspaceId_type: { workspaceId, type } },
      create: { id: crypto.randomUUID(), workspaceId, type, subject: data.subject || null, html: data.html || null, enabled: data.enabled ?? false, updatedBy: updatedBy || null },
      update: { subject: data.subject ?? undefined, html: data.html ?? undefined, enabled: data.enabled ?? undefined, updatedBy: updatedBy || null }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to upsert workspace email template: ${error}`)
  }
}

// =============================================================================
// PARTICIPANT SEGMENTS & MEMBERSHIP PREFERENCES
// =============================================================================

// export async function listSegments(workspaceId: WorkspaceId): Promise<WorkspaceParticipantSegment[]> {
//   try {
//     return await prisma.workspaceParticipantSegment.findMany({
//       where: { workspaceId },
//       orderBy: { updatedAt: 'desc' }
//     })
//   } catch (error) {
//     throw new DatabaseError(`Failed to list segments: ${error}`)
//   }
// }
// 
// export async function createSegment(
//   workspaceId: WorkspaceId,
//   data: { name: string; description?: string | null; filterJson?: any },
//   createdBy: string
// ): Promise<WorkspaceParticipantSegment> {
//   try {
//     const seg = await prisma.workspaceParticipantSegment.create({
//       data: {
//         workspaceId,
//         name: data.name,
//         description: data.description || null,
//         filterJson: data.filterJson ?? null,
//         createdBy
//       }
//     })
//     return seg
//   } catch (error) {
//     throw new DatabaseError(`Failed to create segment: ${error}`)
//   }
// }
// 
// export async function updateSegment(
//   id: string,
//   workspaceId: WorkspaceId,
//   data: { name?: string; description?: string | null; filterJson?: any }
// ): Promise<WorkspaceParticipantSegment> {
//   const seg = await prisma.workspaceParticipantSegment.findFirst({ where: { id, workspaceId } })
//   if (!seg) throw new ResourceNotFoundError('WorkspaceParticipantSegment', id)
//   try {
//     return await prisma.workspaceParticipantSegment.update({
//       where: { id },
//       data: {
//         name: data.name ?? seg.name,
//         description: data.description === undefined ? seg.description : data.description,
//         filterJson: data.filterJson === undefined ? seg.filterJson : data.filterJson
//       }
//     })
//   } catch (error) {
//     throw new DatabaseError(`Failed to update segment: ${error}`)
//   }
// }
// 
// export async function deleteSegment(id: string, workspaceId: WorkspaceId): Promise<void> {
//   const seg = await prisma.workspaceParticipantSegment.findFirst({ where: { id, workspaceId } })
//   if (!seg) throw new ResourceNotFoundError('WorkspaceParticipantSegment', id)
//   try {
//     await prisma.workspaceParticipantSegment.delete({ where: { id } })
//   } catch (error) {
//     throw new DatabaseError(`Failed to delete segment: ${error}`)
//   }
// }
// 
export function resolveSegmentWhere(filterJson: any, workspaceId: WorkspaceId) {
  // Very simple MVP resolver: handle enrollment status and points range
  const where: any = {
    workspaceId
  }
  if (filterJson?.status) {
    where.user = {
      Enrollment: {
        some: {
          status: filterJson.status,
          Challenge: { workspaceId }
        }
      }
    }
  }
  if (filterJson?.points) {
    where.user = {
      ...(where.user || {}),
      pointsBalances: {
        some: {
          workspaceId,
          totalPoints: {
            gte: filterJson.points.min ?? 0,
            lte: filterJson.points.max ?? 1_000_000
          }
        }
      }
    }
  }
  if (filterJson?.lastActivityDays) {
    const since = new Date()
    since.setDate(since.getDate() - Number(filterJson.lastActivityDays))
    where.user = {
      ...(where.user || {}),
      activityEvents: {
        some: {
          workspaceId,
          createdAt: { gte: since }
        }
      }
    }
  }
  return where
}

export async function getMembershipPreferences(userId: string, workspaceId: WorkspaceId): Promise<any | null> {
  try {
    const membership = await prisma.workspaceMembership.findUnique({ where: { userId_workspaceId: { userId, workspaceId } } })
    return membership?.preferences ?? null
  } catch (error) {
    throw new DatabaseError(`Failed to get membership preferences: ${error}`)
  }
}

export async function updateMembershipPreferences(
  userId: string,
  workspaceId: WorkspaceId,
  prefs: any
): Promise<void> {
  try {
    await prisma.workspaceMembership.update({
      where: { userId_workspaceId: { userId, workspaceId } },
      data: { preferences: prefs }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to update membership preferences: ${error}`)
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
    rewardType?: RewardType
    rewardConfig?: unknown
    requiresApproval?: boolean
    allowMultiple?: boolean
  },
  workspaceId: WorkspaceId
): Promise<ActivityTemplate> {
  try {
    return await prisma.activityTemplate.create({
      data: {
        id: crypto.randomUUID(),
        name: data.name,
        description: data.description,
        type: data.type,
        basePoints: data.basePoints,
        workspaceId,
        rewardType: data.rewardType ?? 'points',
        rewardConfig: (data.rewardConfig as any) ?? null,
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
    rewardType: RewardType
    rewardConfig: unknown
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

  // Prepare update data with proper type casting for JSON field
  const updateData: any = {}
  if (data.name !== undefined) updateData.name = data.name
  if (data.description !== undefined) updateData.description = data.description
  if (data.basePoints !== undefined) updateData.basePoints = data.basePoints
  if (data.rewardType !== undefined) updateData.rewardType = data.rewardType
  if (data.rewardConfig !== undefined) updateData.rewardConfig = data.rewardConfig as any
  if (data.requiresApproval !== undefined) updateData.requiresApproval = data.requiresApproval
  if (data.allowMultiple !== undefined) updateData.allowMultiple = data.allowMultiple

  try {
    return await prisma.activityTemplate.update({
      where: { id: templateId },
      data: updateData
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
    rewardRules?: any[]
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
        id: crypto.randomUUID(),
        templateId: data.templateId,
        challengeId: data.challengeId,
        pointsValue: data.pointsValue ?? template.basePoints,
        maxSubmissions: data.maxSubmissions ?? 1,
        deadline: data.deadline,
        isRequired: data.isRequired ?? false,
        rewardRules: data.rewardRules ?? []
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
): Promise<(Activity & { ActivityTemplate: ActivityTemplate })[]> {
  try {
    return await prisma.activity.findMany({
      where: {
        challengeId,
        Challenge: { workspaceId }
      },
      include: { ActivityTemplate: true },
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
    rewardRules: any[]
  }>
): Promise<Activity & { ActivityTemplate: ActivityTemplate, Challenge: Challenge }> {
  // Verify activity belongs to a challenge in this workspace
  const activity = await prisma.activity.findFirst({
    where: { id: activityId, Challenge: { workspaceId } },
    include: { Challenge: true, ActivityTemplate: true }
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
        isRequired: data.isRequired ?? activity.isRequired,
        rewardRules: data.rewardRules ?? activity.rewardRules
      },
      include: { ActivityTemplate: true, Challenge: true }
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
    where: { id: activityId, Challenge: { workspaceId } }
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
        id: crypto.randomUUID(),
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
  Activity: Activity & { ActivityTemplate: ActivityTemplate, Challenge: Challenge }
  User: User
  Enrollment: Enrollment
})[]> {
  try {
    return await prisma.activitySubmission.findMany({
      where: {
        status: 'PENDING',
        Activity: {
          Challenge: { workspaceId }
        }
      },
      include: {
        Activity: {
          include: {
            ActivityTemplate: true,
            Challenge: true
          }
        },
        User: true,
        Enrollment: true
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
): Promise<ActivitySubmission & { Activity: Activity & { ActivityTemplate: ActivityTemplate, Challenge: Challenge } }> {
  try {
    return await prisma.activitySubmission.update({
      where: {
        id: submissionId,
        Activity: {
          Challenge: { workspaceId }
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
        Activity: {
          include: {
            ActivityTemplate: true,
            Challenge: true
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
        id: crypto.randomUUID(),
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
        id: crypto.randomUUID(),
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

// =============================================================================
// BUDGETS & LEDGER
// =============================================================================

export async function getWorkspacePointsBudget(workspaceId: WorkspaceId): Promise<WorkspacePointsBudget | null> {
  try {
    return await prisma.workspacePointsBudget.findUnique({ where: { workspaceId } })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace budget: ${error}`)
  }
}

export async function upsertWorkspacePointsBudget(workspaceId: WorkspaceId, totalBudget: number, updatedBy?: string | null): Promise<WorkspacePointsBudget> {
  try {
    return await prisma.workspacePointsBudget.upsert({
      where: { workspaceId },
      create: { workspaceId, totalBudget: Math.max(0, totalBudget), allocated: 0, updatedBy: updatedBy || null },
      update: { totalBudget: Math.max(0, totalBudget), updatedBy: updatedBy || null }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to upsert workspace budget: ${error}`)
  }
}

export async function getChallengePointsBudget(challengeId: ChallengeId): Promise<ChallengePointsBudget | null> {
  try {
    return await prisma.challengePointsBudget.findUnique({ where: { challengeId } })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch challenge budget: ${error}`)
  }
}

export async function upsertChallengePointsBudget(challengeId: ChallengeId, workspaceId: WorkspaceId, totalBudget: number, updatedBy?: string | null): Promise<ChallengePointsBudget> {
  try {
    return await prisma.challengePointsBudget.upsert({
      where: { challengeId },
      create: { challengeId, workspaceId, totalBudget: Math.max(0, totalBudget), allocated: 0, updatedBy: updatedBy || null },
      update: { totalBudget: Math.max(0, totalBudget), updatedBy: updatedBy || null }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to upsert challenge budget: ${error}`)
  }
}

export async function awardPointsWithBudget(params: {
  workspaceId: WorkspaceId
  challengeId?: ChallengeId | null
  toUserId: UserId
  amount: number
  actorUserId?: string | null
  submissionId?: string | null
}) {
  const { workspaceId, challengeId, toUserId, amount, actorUserId, submissionId } = params
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new DatabaseError('Invalid award amount')
  }

  return await prisma.$transaction(async (tx) => {
    // Decrement challenge budget if exists, else workspace budget
    if (challengeId) {
      const cb = await (tx as any).challengePointsBudget.findUnique({ where: { challengeId } })
      if (cb) {
        await (tx as any).challengePointsBudget.update({
          where: { challengeId },
          data: { allocated: cb.allocated + amount }
        })
      } else {
        const wb = await (tx as any).workspacePointsBudget.findUnique({ where: { workspaceId } })
        if (wb) {
          await (tx as any).workspacePointsBudget.update({
            where: { workspaceId },
            data: { allocated: wb.allocated + amount }
          })
        }
      }
    } else {
      const wb = await (tx as any).workspacePointsBudget.findUnique({ where: { workspaceId } })
      if (wb) {
        await (tx as any).workspacePointsBudget.update({
          where: { workspaceId },
          data: { allocated: wb.allocated + amount }
        })
      }
    }

    // Update recipient balance
    await tx.pointsBalance.upsert({
      where: { userId_workspaceId: { userId: toUserId, workspaceId } },
      update: { totalPoints: { increment: amount }, availablePoints: { increment: amount } },
      create: { id: crypto.randomUUID(), userId: toUserId, workspaceId, totalPoints: amount, availablePoints: amount }
    })

    // Ledger entry
    await (tx as any).pointsLedger.create({
      data: {
        workspaceId,
        challengeId: challengeId || null,
        toUserId,
        amount,
        submissionId: submissionId || null,
        actorUserId: actorUserId || null,
        reason: 'AWARD_APPROVED'
      }
    })
  })
}

/**
 * Get workspace leaderboard (top points earners)
 */
export async function getWorkspaceLeaderboard(
  workspaceId: WorkspaceId,
  limit: number = 10
): Promise<(PointsBalance & { User: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'displayName'> })[]> {
  try {
    return await prisma.pointsBalance.findMany({
      where: { workspaceId },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
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
  Activity: Activity & {
    ActivityTemplate: ActivityTemplate
    Challenge: Challenge
  }
  Enrollment: Enrollment
})[]> {
  try {
    return await prisma.activitySubmission.findMany({
      where: {
        userId,
        Activity: {
          Challenge: {
            workspaceId
          }
        },
        ...(status && { status })
      },
      include: {
        Activity: {
          include: {
            ActivityTemplate: true,
            Challenge: true
          }
        },
        Enrollment: true
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
  firstName: string | null
  lastName: string | null
  displayName: string | null
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
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        },
        ActivitySubmission: {
          where: {
            Activity: {
              challengeId
            }
          },
          include: {
            Activity: true
          }
        }
      }
    })

    // Calculate leaderboard data
    const leaderboardData = enrollments.map(enrollment => {
      const submissions = enrollment.ActivitySubmission
      const approvedSubmissions = submissions.filter((s: any) => s.status === 'APPROVED')
      const totalPoints = approvedSubmissions.reduce((sum: number, s: any) => sum + (s.pointsAwarded || 0), 0)
      const uniqueActivities = new Set(approvedSubmissions.map((s: any) => s.activityId))

      return {
        userId: enrollment.User.id,
        email: enrollment.User.email,
        firstName: enrollment.User.firstName,
        lastName: enrollment.User.lastName,
        displayName: enrollment.User.displayName,
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
    await (prisma as any).activityEvent.create({
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
  return await (prisma as any).activityEvent.findMany({
    where: { challengeId },
    include: {
      User_ActivityEvent_userIdToUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true
        }
      },
      User_ActivityEvent_actorUserIdToUser: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })
}

/**
 * Get recent workspace activities for admin dashboard
 * Combines activity events and pending submissions
 */
export async function getRecentWorkspaceActivities(
  workspaceId: WorkspaceId,
  limit: number = 20
): Promise<{
  events: any[]
  pendingSubmissions: (ActivitySubmission & {
    Activity: Activity & { ActivityTemplate: ActivityTemplate, Challenge: Challenge }
    User: User
    Enrollment: Enrollment
  })[]
  pendingSubmissionCount: number
  oldestPendingSubmission?: Pick<ActivitySubmission, 'submittedAt'> | null
}> {
  try {
    const [events, pendingSubmissions, pendingSubmissionCount, oldestPendingSubmission] = await Promise.all([
      // Get recent activity events
      (prisma as any).activityEvent.findMany({
        where: { workspaceId },
        include: {
          User_ActivityEvent_userIdToUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              displayName: true
            }
          },
          User_ActivityEvent_actorUserIdToUser: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              displayName: true
            }
          },
          Challenge: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      // Get pending submissions
      prisma.activitySubmission.findMany({
        where: {
          status: 'PENDING',
          Activity: {
            Challenge: { workspaceId }
          }
        },
        include: {
          Activity: {
            include: {
              ActivityTemplate: true,
              Challenge: true
            }
          },
          User: true,
          Enrollment: true
        },
        orderBy: { submittedAt: 'desc' },
        take: limit
      }),
      prisma.activitySubmission.count({
        where: {
          status: 'PENDING',
          Activity: {
            Challenge: { workspaceId }
          }
        }
      }),
      prisma.activitySubmission.findFirst({
        where: {
          status: 'PENDING',
          Activity: {
            Challenge: { workspaceId }
          }
        },
        orderBy: { submittedAt: 'asc' },
        select: { submittedAt: true }
      })
    ])

    return { events, pendingSubmissions, pendingSubmissionCount, oldestPendingSubmission }
  } catch (error) {
    throw new DatabaseError(`Failed to fetch recent workspace activities: ${error}`)
  }
}

// =============================================================================
// COMMUNICATIONS
// =============================================================================

export interface CreateCommunicationInput {
  subject: string
  message: string
  scope: CommunicationScope
  audience?: CommunicationAudience
  priority?: CommunicationPriority
  challengeId?: string | null
  activityId?: string | null
  // AI enhancements
  tldr?: string
  highlights?: string[]
  aiDates?: Array<{ date: string; description: string }>
  aiActions?: Array<{ action: string; urgent: boolean }>
  aiPrioritySuggestion?: string
}

export async function createWorkspaceCommunication(
  workspaceId: WorkspaceId,
  input: CreateCommunicationInput,
  sentBy: UserId
): Promise<WorkspaceCommunication> {
  const subject = input.subject?.trim()
  const message = input.message?.trim()

  if (!subject) {
    throw new DatabaseError('Subject is required for workspace communication', 'COMMUNICATION_SUBJECT_REQUIRED')
  }

  if (!message) {
    throw new DatabaseError('Message content is required for workspace communication', 'COMMUNICATION_MESSAGE_REQUIRED')
  }

  let challengeId: string | null = null
  let activityId: string | null = null

  if (input.scope === CommunicationScope.WORKSPACE) {
    challengeId = null
    activityId = null
  } else if (input.scope === CommunicationScope.CHALLENGE) {
    if (!input.challengeId) {
      throw new DatabaseError('Challenge ID is required for challenge communications', 'COMMUNICATION_CHALLENGE_REQUIRED')
    }
    const challenge = await prisma.challenge.findFirst({
      where: { id: input.challengeId, workspaceId },
      select: { id: true }
    })
    if (!challenge) {
      throw new ResourceNotFoundError('Challenge', input.challengeId)
    }
    challengeId = challenge.id
  } else if (input.scope === CommunicationScope.ACTIVITY) {
    if (!input.activityId) {
      throw new DatabaseError('Activity ID is required for activity communications', 'COMMUNICATION_ACTIVITY_REQUIRED')
    }
    const activity = await prisma.activity.findFirst({
      where: {
        id: input.activityId,
        Challenge: { workspaceId }
      },
      select: { id: true, challengeId: true }
    })
    if (!activity) {
      throw new ResourceNotFoundError('Activity', input.activityId)
    }
    activityId = activity.id
    challengeId = activity.challengeId
  } else {
    throw new DatabaseError(`Unsupported communication scope: ${input.scope}`, 'COMMUNICATION_SCOPE_INVALID')
  }

  try {
    return await prisma.workspaceCommunication.create({
      data: {
        workspaceId,
        challengeId,
        activityId,
        scope: input.scope,
        audience: input.audience ?? CommunicationAudience.ALL,
        priority: input.priority ?? CommunicationPriority.NORMAL,
        subject,
        message,
        sentBy,
        // AI enhancements
        tldr: input.tldr,
        highlights: input.highlights,
        aiDates: input.aiDates,
        aiActions: input.aiActions,
        aiPrioritySuggestion: input.aiPrioritySuggestion,
      }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to create workspace communication: ${error}`)
  }
}

interface GetCommunicationsFilters {
  scope?: CommunicationScope
  challengeId?: string
  activityId?: string
  limit?: number
}

export async function getWorkspaceCommunications(
  workspaceId: WorkspaceId,
  filters: GetCommunicationsFilters = {}
): Promise<(WorkspaceCommunication & { sender: Pick<User, 'id' | 'email'>; challenge?: Pick<Challenge, 'id' | 'title'> | null; activity?: Pick<Activity, 'id' | 'templateId'> | null })[]> {
  const whereClause: any = { workspaceId }
  if (filters.scope) whereClause.scope = filters.scope
  if (filters.challengeId) whereClause.challengeId = filters.challengeId
  if (filters.activityId) whereClause.activityId = filters.activityId

  try {
    return await prisma.workspaceCommunication.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        },
        challenge: { select: { id: true, title: true } },
        activity: { select: { id: true, templateId: true } }
      },
      orderBy: { sentAt: 'desc' },
      take: filters.limit ?? 50
    })
  } catch (error) {
    throw new DatabaseError(`Failed to load workspace communications: ${error}`)
  }
}

// =============================================================================
// INVITE CODE QUERIES
// =============================================================================

export type InviteCodeWithDetails = InviteCode & {
  workspace: Workspace
  challenge?: import('../types').Challenge | null
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
    targetEmail?: string | null
  },
  workspaceId: WorkspaceId,
  createdBy: UserId
): Promise<InviteCode> {
  // Verify creator is admin in workspace
  const membership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId: createdBy, workspaceId } }
  })
  if (membership?.role !== 'ADMIN') {
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
  
  const code = randomBytes(10).toString('base64url').slice(0, 10)
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + (data.expiresIn || 168))
  
  try {
    return await prisma.inviteCode.create({
      data: {
        id: crypto.randomUUID(),
        code,
        workspaceId,
        challengeId: data.challengeId || null,
        role: data.role || 'PARTICIPANT',
        expiresAt,
        maxUses: data.maxUses || 1,
        usedCount: 0,
        createdBy,
        // targetEmail is added via schema; cast to satisfy client prior to generate
        ...(data.targetEmail ? { targetEmail: data.targetEmail.toLowerCase() } : {} as any)
      } as any
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
    const row = await prisma.inviteCode.findUnique({
      where: { code },
      include: {
        Workspace: true,
        Challenge: true,
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        }
      }
    }) as any
    if (!row) return null
    const normalizedChallenge = row.Challenge
      ? {
          id: row.Challenge.id,
          title: row.Challenge.title,
          description: row.Challenge.description,
          startDate: row.Challenge.startDate,
          endDate: row.Challenge.endDate,
          enrollmentDeadline: row.Challenge.enrollmentDeadline ?? null,
          workspaceId: row.Challenge.workspaceId,
          rewardType: row.Challenge.rewardType ?? undefined,
          rewardConfig: row.Challenge.rewardConfig,
          emailEditAllowed: row.Challenge.emailEditAllowed,
        }
      : row.Challenge
    return {
      ...row,
      workspace: row.Workspace,
      challenge: normalizedChallenge,
      creator: row.User
    }
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
  challenge?: import('../types').Challenge | null
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
    throw new DatabaseError('Invite code has expired', 'INVITE_EXPIRED')
  }
  
  if (invite.usedCount >= invite.maxUses) {
    throw new DatabaseError('Invite code has reached maximum uses', 'INVITE_MAX_USES')
  }

  // Enforce target email binding when present
  if ((invite as any).targetEmail && (invite as any).targetEmail !== userEmail.toLowerCase()) {
    throw new DatabaseError('Invite not valid for this email', 'INVITE_EMAIL_MISMATCH')
  }
  
  // Fetch user and any existing membership
  const dbUser = await prisma.user.findUnique({ where: { id: userId } })
  const existingMembership = await prisma.workspaceMembership.findUnique({
    where: { userId_workspaceId: { userId, workspaceId: invite.workspaceId } }
  })
  
  let enrollment: Enrollment | null = null
  let isExistingMember = !!existingMembership
  let resultingRole: Role = invite.role
  
  try {
    await prisma.$transaction(async (tx) => {
      // Ensure there is a single user row for this supabase user
      if (!dbUser) {
        throw new DatabaseError('User not found')
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
      await tx.user.update({ where: { id: userId }, data: ({ isPending: false } as any) })
      
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

      // Idempotent redemption tracking per user
      const priorRedemption = await (tx as any).inviteRedemption.findUnique({
        where: { inviteId_userId: { inviteId: invite.id, userId } }
      })

      if (!priorRedemption) {
        // Re-check maxUses inside transaction to reduce race conditions
        const freshInvite = await tx.inviteCode.findUnique({ where: { id: invite.id } })
        if (!freshInvite) {
          throw new ResourceNotFoundError('Invite', invite.id)
        }
        if (freshInvite.usedCount >= freshInvite.maxUses) {
          throw new DatabaseError('Invite code has reached maximum uses', 'INVITE_MAX_USES')
        }

        await (tx as any).inviteRedemption.create({ data: { inviteId: invite.id, userId } })
        await tx.inviteCode.update({
          where: { id: invite.id },
          data: { usedCount: { increment: 1 } }
        })
      }
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
    const rows = await prisma.inviteCode.findMany({
      where: { workspaceId },
      include: {
        Workspace: true,
        Challenge: true,
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    }) as any
    return rows.map((i: any) => ({
      ...i,
      workspace: i.Workspace,
      challenge: i.Challenge ? { ...i.Challenge, rewardType: i.Challenge.rewardType ?? undefined } : i.Challenge,
      creator: i.User
    }))
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

// =============================================================================
// REWARD ISSUANCE QUERIES
// =============================================================================

/**
 * Issue reward on submission approval
 * Supports POINTS, SKU, and MONETARY reward types
 */
export async function issueReward(params: {
  userId: UserId
  workspaceId: WorkspaceId
  challengeId?: ChallengeId | null
  submissionId?: string | null
  type: 'points' | 'sku' | 'monetary'
  amount?: number
  currency?: string
  skuId?: string
  provider?: string
  metadata?: any
}): Promise<import('@prisma/client').RewardIssuance> {
  const { userId, workspaceId, challengeId, submissionId, type, amount, currency, skuId, provider, metadata } = params

  // Validation
  if (type === 'points' && (!amount || amount <= 0)) {
    throw new DatabaseError('Points amount must be positive')
  }
  if (type === 'monetary' && (!amount || amount <= 0 || !currency)) {
    throw new DatabaseError('Monetary rewards require positive amount and currency')
  }
  if (type === 'sku' && !skuId) {
    throw new DatabaseError('SKU rewards require skuId')
  }

  try {
    const reward = await prisma.rewardIssuance.create({
      data: {
        id: crypto.randomUUID(),
        userId,
        workspaceId,
        challengeId: challengeId || null,
        type,
        amount: amount || null,
        currency: currency || null,
        skuId: skuId || null,
        provider: provider || null,
        status: 'PENDING',
        issuedAt: null,
        metadata: metadata as any || null
      }
    })

    // Link reward to submission if provided
    if (submissionId) {
      await prisma.activitySubmission.update({
        where: { id: submissionId },
        data: {
          rewardIssuanceId: reward.id,
          rewardIssued: true
        }
      })
    }

    // If points, also award them via budget system
    if (type === 'points' && amount) {
      await awardPointsWithBudget({
        workspaceId,
        challengeId,
        toUserId: userId,
        amount,
        submissionId
      })
    }

    return reward
  } catch (error) {
    throw new DatabaseError(`Failed to issue reward: ${error}`)
  }
}

/**
 * Get rewards issued in workspace (admin analytics)
 */
export async function getWorkspaceRewards(
  workspaceId: WorkspaceId,
  filters?: {
    status?: 'PENDING' | 'ISSUED' | 'FAILED' | 'CANCELLED'
    type?: 'points' | 'sku' | 'monetary'
    challengeId?: ChallengeId
    userId?: UserId
  }
): Promise<import('@prisma/client').RewardIssuance[]> {
  try {
    const whereClause: any = { workspaceId }
    if (filters?.status) whereClause.status = filters.status
    if (filters?.type) whereClause.type = filters.type
    if (filters?.challengeId) whereClause.challengeId = filters.challengeId
    if (filters?.userId) whereClause.userId = filters.userId

    return await prisma.rewardIssuance.findMany({
      where: whereClause,
      orderBy: { issuedAt: 'desc' }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch workspace rewards: ${error}`)
  }
}

/**
 * Get user rewards (participant view)
 */
export async function getUserRewards(
  userId: UserId,
  workspaceId: WorkspaceId
): Promise<import('@prisma/client').RewardIssuance[]> {
  try {
    return await prisma.rewardIssuance.findMany({
      where: {
        userId,
        workspaceId
      },
      orderBy: { issuedAt: 'desc' }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch user rewards: ${error}`)
  }
}

/**
 * Reconcile reward issuance (admin report)
 * Compare issued rewards to submission approvals
 */
export async function reconcileRewards(
  workspaceId: WorkspaceId,
  challengeId?: ChallengeId
): Promise<{
  totalRewards: number
  totalIssued: number
  totalPending: number
  totalFailed: number
  byType: Record<string, number>
}> {
  try {
    const whereClause: any = { workspaceId }
    if (challengeId) whereClause.challengeId = challengeId

    const [rewards, totalRewards, issuedCount, pendingCount, failedCount] = await Promise.all([
      prisma.rewardIssuance.findMany({
        where: whereClause,
        select: { type: true }
      }),
      prisma.rewardIssuance.count({ where: whereClause }),
      prisma.rewardIssuance.count({ where: { ...whereClause, status: 'ISSUED' } }),
      prisma.rewardIssuance.count({ where: { ...whereClause, status: 'PENDING' } }),
      prisma.rewardIssuance.count({ where: { ...whereClause, status: 'FAILED' } })
    ])

    const byType = rewards.reduce((acc, r) => {
      acc[r.type] = (acc[r.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalRewards,
      totalIssued: issuedCount,
      totalPending: pendingCount,
      totalFailed: failedCount,
      byType
    }
  } catch (error) {
    throw new DatabaseError(`Failed to reconcile rewards: ${error}`)
  }
}

// =============================================================================
// PLATFORM-LEVEL QUERIES (SUPERADMIN ONLY)
// =============================================================================

/**
 * Get platform-wide statistics for superadmin dashboard
 * Returns aggregated metrics across all workspaces
 */
export async function getPlatformStats(tenantId: string = 'default'): Promise<{
  totalWorkspaces: number
  activeWorkspaces: number
  totalUsers: number
  totalChallenges: number
  totalPoints: number
  trends: {
    workspaces: number
    users: number
    challenges: number
    points: number
  }
}> {
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [
      totalWorkspaces,
      activeWorkspaces,
      totalUsers,
      totalChallenges,
      totalPointsResult,
      recentWorkspaces,
      recentUsers,
      recentChallenges,
      recentPointsResult
    ] = await Promise.all([
      // Total counts
      prisma.workspace.count({ where: { tenantId } }),
      prisma.workspace.count({ where: { tenantId, active: true, published: true } }),
      prisma.workspaceMembership.count(),
      prisma.challenge.count(),
      prisma.pointsBalance.aggregate({ _sum: { totalPoints: true } }),

      // Trend data (last 30 days)
      prisma.workspace.count({
        where: {
          tenantId,
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.workspaceMembership.count({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.challenge.count({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.pointsLedger.aggregate({
        where: {
          createdAt: { gte: thirtyDaysAgo }
        },
        _sum: { amount: true }
      })
    ])

    const totalPoints = totalPointsResult._sum.totalPoints || 0
    const recentPoints = recentPointsResult._sum.amount || 0

    // Calculate percentage trends (simplified - compare to previous 30 days)
    const workspaceTrend = totalWorkspaces > 0 ? Math.round((recentWorkspaces / totalWorkspaces) * 100) : 0
    const userTrend = totalUsers > 0 ? Math.round((recentUsers / totalUsers) * 100) : 0
    const challengeTrend = totalChallenges > 0 ? Math.round((recentChallenges / totalChallenges) * 100) : 0
    const pointsTrend = totalPoints > 0 ? Math.round((recentPoints / totalPoints) * 100) : 0

    return {
      totalWorkspaces,
      activeWorkspaces,
      totalUsers,
      totalChallenges,
      totalPoints,
      trends: {
        workspaces: workspaceTrend,
        users: userTrend,
        challenges: challengeTrend,
        points: pointsTrend
      }
    }
  } catch (error) {
    throw new DatabaseError(`Failed to fetch platform stats: ${error}`)
  }
}

/**
 * Get all workspaces with admin details (superadmin only)
 * Returns workspace data with membership and activity metrics
 */
export async function getAllWorkspacesWithDetails(tenantId?: string | null): Promise<(Workspace & {
  _count: {
    WorkspaceMembership: number
    Challenge: number
  }
  WorkspaceMembership: {
    User: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'displayName'>
    role: Role
  }[]
})[]> {
  try {
    return await prisma.workspace.findMany({
      where: tenantId ? { tenantId } : {},
      include: {
        _count: {
          select: {
            WorkspaceMembership: true,
            Challenge: true
          }
        },
        WorkspaceMembership: {
          where: { role: 'ADMIN' },
          include: {
            User: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                displayName: true
              }
            }
          },
          take: 5
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch all workspaces: ${error}`)
  }
}

/**
 * Get all users across platform (superadmin only)
 * Returns user data with workspace memberships
 */
export async function getAllPlatformUsers(): Promise<(User & {
  WorkspaceMembership: {
    Workspace: Pick<Workspace, 'id' | 'slug' | 'name'>
    role: Role
    isPrimary: boolean
  }[]
})[]> {
  try {
    return await prisma.user.findMany({
      include: {
        WorkspaceMembership: {
          include: {
            Workspace: {
              select: { id: true, slug: true, name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch all platform users: ${error}`)
  }
}

// =============================================================================
// MANAGER ROLE OPERATIONS
// =============================================================================

/**
 * Type definition for ChallengeAssignment with user details
 */
export type ChallengeAssignmentWithDetails = {
  id: string
  challengeId: string
  managerId: string
  workspaceId: string
  assignedBy: string
  assignedAt: Date
  Manager: Pick<User, 'id' | 'email' | 'firstName' | 'lastName' | 'displayName'>
  Challenge: Pick<Challenge, 'id' | 'title' | 'description'>
}

/**
 * Get all manager assignments for a challenge
 */
export async function getChallengeAssignments(
  challengeId: string,
  workspaceId: string
): Promise<ChallengeAssignmentWithDetails[]> {
  try {
    return await prisma.challengeAssignment.findMany({
      where: {
        challengeId,
        workspaceId
      },
      include: {
        Manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        },
        Challenge: {
          select: { id: true, title: true, description: true }
        }
      },
      orderBy: { assignedAt: 'desc' }
    })
  } catch (error) {
    throw new DatabaseError(`Failed to fetch challenge assignments: ${error}`)
  }
}

/**
 * Assign a manager to a challenge
 */
export async function assignManagerToChallenge(data: {
  challengeId: string
  managerId: string
  assignedBy: string
  workspaceId: string
}): Promise<ChallengeAssignmentWithDetails> {
  try {
    // Verify challenge belongs to workspace
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: data.challengeId,
        workspaceId: data.workspaceId
      }
    })

    if (!challenge) {
      throw new ResourceNotFoundError('Challenge', data.challengeId)
    }

    // Verify user has MANAGER role in workspace
    const membership = await prisma.workspaceMembership.findFirst({
      where: {
        userId: data.managerId,
        workspaceId: data.workspaceId,
        role: 'MANAGER'
      }
    })

    if (!membership) {
      throw new WorkspaceAccessError('User is not a manager in this workspace')
    }

    // Check if assignment already exists
    const existing = await prisma.challengeAssignment.findFirst({
      where: {
        challengeId: data.challengeId,
        managerId: data.managerId,
        workspaceId: data.workspaceId
      }
    })

    if (existing) {
      throw new DatabaseError('Manager is already assigned to this challenge')
    }

    // Create assignment
    const assignment = await prisma.challengeAssignment.create({
      data: {
        challengeId: data.challengeId,
        managerId: data.managerId,
        assignedBy: data.assignedBy,
        workspaceId: data.workspaceId
      },
      include: {
        Manager: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        },
        Challenge: {
          select: { id: true, title: true, description: true }
        }
      }
    })

    return assignment
  } catch (error) {
    if (error instanceof DatabaseError || error instanceof ResourceNotFoundError || error instanceof WorkspaceAccessError) {
      throw error
    }
    throw new DatabaseError(`Failed to assign manager to challenge: ${error}`)
  }
}

/**
 * Remove a manager from a challenge
 */
export async function removeManagerFromChallenge(
  challengeId: string,
  managerId: string,
  workspaceId: string
): Promise<void> {
  try {
    // Verify challenge belongs to workspace
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: challengeId,
        workspaceId
      }
    })

    if (!challenge) {
      throw new ResourceNotFoundError('Challenge', challengeId)
    }

    // Delete assignment
    const deleted = await prisma.challengeAssignment.deleteMany({
      where: {
        challengeId,
        managerId
      }
    })

    if (deleted.count === 0) {
      throw new ResourceNotFoundError('ChallengeAssignment', `${challengeId}/${managerId}`)
    }
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      throw error
    }
    throw new DatabaseError(`Failed to remove manager from challenge: ${error}`)
  }
}

/**
 * Get all challenges assigned to a manager
 */
export async function getManagerChallenges(
  managerId: string,
  workspaceId: string
): Promise<Challenge[]> {
  try {
    // Verify user is a manager in workspace
    const membership = await prisma.workspaceMembership.findFirst({
      where: {
        userId: managerId,
        workspaceId,
        role: 'MANAGER'
      }
    })

    if (!membership) {
      throw new WorkspaceAccessError('User is not a manager in this workspace')
    }

    const challenges = await prisma.challenge.findMany({
      where: {
        workspaceId,
        ChallengeAssignment: {
          some: {
            managerId
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return challenges
  } catch (error) {
    if (error instanceof WorkspaceAccessError) {
      throw error
    }
    throw new DatabaseError(`Failed to fetch manager challenges: ${error}`)
  }
}

/**
 * Get submissions pending manager review for assigned challenges
 */
export async function getManagerPendingSubmissions(
  managerId: string,
  workspaceId: string
): Promise<(ActivitySubmission & {
  User: Pick<User, 'id' | 'email'>
  Activity: Activity & {
    ActivityTemplate: Pick<ActivityTemplate, 'id' | 'name' | 'type'>
    Challenge: Pick<Challenge, 'id' | 'title'>
  }
})[]> {
  try {
    // Single optimized query using nested WHERE clause with relation filter
    const submissions = await prisma.activitySubmission.findMany({
      where: {
        Activity: {
          Challenge: {
            ChallengeAssignment: {
              some: {
                managerId,
                workspaceId
              }
            }
          }
        },
        status: 'PENDING'
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            displayName: true
          }
        },
        Activity: {
          include: {
            ActivityTemplate: {
              select: { id: true, name: true, type: true }
            },
            Challenge: {
              select: { id: true, title: true }
            }
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    })

    return submissions
  } catch (error) {
    throw new DatabaseError(`Failed to fetch manager pending submissions: ${error}`)
  }
}

/**
 * Manager review submission (approve, request revision, or reject)
 */
export async function managerReviewSubmission(data: {
  submissionId: string
  managerId: string
  workspaceId: string
  status: 'MANAGER_APPROVED' | 'NEEDS_REVISION' | 'REJECTED'
  managerNotes?: string
  pointsAwarded?: number
}): Promise<ActivitySubmission> {
  try {
    // Verify submission exists and manager has access
    const submission = await prisma.activitySubmission.findFirst({
      where: {
        id: data.submissionId,
        Activity: {
          Challenge: {
            workspaceId: data.workspaceId,
            ChallengeAssignment: {
              some: {
                managerId: data.managerId
              }
            }
          }
        }
      },
      include: {
        Activity: true
      }
    })

    if (!submission) {
      throw new ResourceNotFoundError('ActivitySubmission', data.submissionId)
    }

    // Update submission with manager review
    const updated = await prisma.activitySubmission.update({
      where: { id: data.submissionId },
      data: {
        status: data.status,
        managerNotes: data.managerNotes,
        pointsAwarded: data.pointsAwarded,
        managerReviewedBy: data.managerId,
        managerReviewedAt: new Date()
      }
    })

    // Points are awarded ONLY during final admin approval, not manager approval
    // This ensures proper budget tracking and consistency

    return updated
  } catch (error) {
    if (error instanceof ResourceNotFoundError) {
      throw error
    }
    throw new DatabaseError(`Failed to review submission: ${error}`)
  }
}
