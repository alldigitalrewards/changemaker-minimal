/**
 * TypeScript Type Definitions for Changemaker MVP
 * 
 * Strict type enforcement for core MVP features:
 * - Workspace routing and access control
 * - Authentication and user roles  
 * - Challenge and enrollment management
 * - API request/response types
 */

import { type User } from '@supabase/supabase-js'

// Role type matching Prisma schema
export type Role = 'ADMIN' | 'PARTICIPANT'

// Role constants for runtime usage
export const ROLE_ADMIN = 'ADMIN' as const
export const ROLE_PARTICIPANT = 'PARTICIPANT' as const

// =============================================================================
// TYPE ALIASES FOR CLARITY (can be upgraded to branded types later)
// =============================================================================

export type WorkspaceSlug = string
export type UserId = string
export type WorkspaceId = string
export type ChallengeId = string
export type EnrollmentId = string

// Validation functions for type safety
export const isWorkspaceSlug = (slug: string): slug is WorkspaceSlug => {
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 2 && slug.length <= 50
}

export const isUserId = (id: string): id is UserId => {
  return /^[a-f0-9-]{36}$/.test(id) // UUID format
}

// =============================================================================
// CORE ENTITY TYPES
// =============================================================================

/**
 * User with role information
 */
export interface AppUser {
  readonly id: UserId
  readonly email: string
  readonly supabaseUserId: string | null
  readonly role: Role
  readonly workspaceId: WorkspaceId | null
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Workspace profile for MVP
 */
export interface Workspace {
  readonly id: WorkspaceId
  readonly slug: WorkspaceSlug
  readonly name: string
  readonly ownerId: UserId | null
  readonly userCount?: number
  readonly challengeCount?: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

/**
 * Challenge profile for MVP (matches Prisma schema)
 */
export interface Challenge {
  readonly id: ChallengeId
  readonly title: string
  readonly description: string
  readonly startDate: Date
  readonly endDate: Date
  readonly enrollmentDeadline: Date | null
  readonly workspaceId: WorkspaceId
}

/**
 * Enrollment (user participation in challenges)
 */
export interface Enrollment {
  readonly id: EnrollmentId
  readonly userId: UserId
  readonly challengeId: ChallengeId
  readonly status: EnrollmentStatus
  readonly createdAt: Date
  readonly updatedAt: Date
}

export type EnrollmentStatus = 'INVITED' | 'ENROLLED' | 'WITHDRAWN'

// Activity types
export type ActivityType = 'TEXT_SUBMISSION' | 'FILE_UPLOAD' | 'PHOTO_UPLOAD' | 'LINK_SUBMISSION' | 'MULTIPLE_CHOICE' | 'VIDEO_SUBMISSION'
export type SubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'DRAFT'

export interface ActivityTemplate {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly type: ActivityType
  readonly basePoints: number
  readonly workspaceId: string
  readonly requiresApproval: boolean
  readonly allowMultiple: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface Activity {
  readonly id: string
  readonly templateId: string
  readonly challengeId: string
  readonly pointsValue: number
  readonly maxSubmissions: number
  readonly deadline: Date | null
  readonly isRequired: boolean
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface ActivitySubmission {
  readonly id: string
  readonly activityId: string
  readonly userId: string
  readonly enrollmentId: string
  readonly textContent: string | null
  readonly fileUrls: string[]
  readonly linkUrl: string | null
  readonly status: SubmissionStatus
  readonly pointsAwarded: number | null
  readonly reviewNotes: string | null
  readonly reviewedBy: string | null
  readonly reviewedAt: Date | null
  readonly submittedAt: Date
  readonly updatedAt: Date
}

export interface PointsBalance {
  readonly id: string
  readonly userId: string
  readonly workspaceId: string
  readonly totalPoints: number
  readonly availablePoints: number
  readonly createdAt: Date
  readonly updatedAt: Date
}

export interface InviteCode {
  readonly id: string
  readonly code: string
  readonly workspaceId: WorkspaceId
  readonly challengeId: ChallengeId | null
  readonly role: Role
  readonly expiresAt: Date
  readonly maxUses: number
  readonly usedCount: number
  readonly createdBy: UserId
  readonly createdAt: Date
}

/**
 * WorkspaceMembership for multi-tenant access control
 */
export interface WorkspaceMembership {
  readonly id: string
  readonly userId: UserId
  readonly workspaceId: WorkspaceId
  readonly role: Role
  readonly isPrimary: boolean
  readonly joinedAt: Date
  readonly createdAt: Date
  readonly updatedAt: Date
}

// =============================================================================
// AUTHENTICATION & AUTHORIZATION
// =============================================================================

/**
 * Authenticated session context
 */
export interface AuthSession {
  readonly user: AppUser
  readonly supabaseUser: User
  readonly workspace?: Workspace
  readonly userRole: Role
}

/**
 * Authorization context for workspace routes
 */
export interface WorkspaceAuthContext {
  readonly workspaceSlug: WorkspaceSlug
  readonly workspaceId: WorkspaceId
  readonly userId: UserId
  readonly userRole: Role
  readonly hasAdminAccess: boolean
  readonly hasParticipantAccess: boolean
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Standard API error response
 */
export interface ApiError {
  readonly error: string
  readonly details?: string
  readonly code?: string
}

/**
 * Standard API success response
 */
export interface ApiSuccess<T = unknown> {
  readonly success: true
  readonly data: T
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

/**
 * Paginated API response
 */
export interface PaginatedResponse<T> {
  readonly items: T[]
  readonly pagination: {
    readonly page: number
    readonly limit: number
    readonly total: number
    readonly totalPages: number
  }
}

// Challenge API Types
export interface ChallengeCreateRequest {
  readonly title: string
  readonly description: string
  readonly startDate: string // ISO string format for API
  readonly endDate: string   // ISO string format for API
  readonly enrollmentDeadline?: string // Optional ISO string format for API
  readonly participantIds?: UserId[] // Optional participant IDs for batch enrollment (legacy)
  readonly invitedParticipantIds?: UserId[] // Optional participant IDs to invite
  readonly enrolledParticipantIds?: UserId[] // Optional participant IDs to enroll automatically
}

export interface ChallengeCreateResponse {
  readonly challenge: Challenge
}

export interface ChallengeListResponse {
  readonly challenges: Challenge[]
}

// Enrollment API Types
export interface EnrollmentCreateRequest {
  readonly challengeId: ChallengeId
}

export interface EnrollmentCreateResponse {
  readonly enrollment: Enrollment
}

export interface EnrollmentListResponse {
  readonly enrollments: Enrollment[]
}

// Participant API Types
export interface WorkspaceParticipant {
  readonly id: UserId
  readonly email: string
  readonly role: Role
}

export interface ParticipantsListResponse {
  readonly participants: WorkspaceParticipant[]
}

// =============================================================================
// FORM TYPES
// =============================================================================

/**
 * Server action form state
 */
export interface FormState<T = unknown> {
  readonly success?: boolean | string
  readonly error?: string
  readonly data?: T
}

/**
 * Challenge creation form data
 */
export interface ChallengeFormData {
  readonly title: string
  readonly description: string
  readonly startDate: string // ISO date string
  readonly endDate: string   // ISO date string
  readonly enrollmentDeadline?: string // Optional ISO date string
  readonly participantIds?: UserId[] // Optional participant IDs for batch enrollment (legacy)
  readonly invitedParticipantIds?: UserId[] // Optional participant IDs to invite
  readonly enrolledParticipantIds?: UserId[] // Optional participant IDs to enroll automatically
}

// =============================================================================
// ROUTE PARAMETER TYPES
// =============================================================================

/**
 * Dynamic route parameters for workspace routes
 */
export interface WorkspaceParams {
  readonly slug: WorkspaceSlug
}

/**
 * Dynamic route parameters for challenge routes
 */
export interface ChallengeParams extends WorkspaceParams {
  readonly challengeId: ChallengeId
}

// =============================================================================
// REACT COMPONENT PROP TYPES
// =============================================================================

/**
 * Props for Next.js pages with workspace context
 */
export interface WorkspacePageProps {
  readonly params: Promise<WorkspaceParams>
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Props for Next.js pages with challenge context
 */
export interface ChallengePageProps {
  readonly params: Promise<ChallengeParams>
  readonly searchParams?: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Props for Next.js API routes with workspace context
 */
export interface WorkspaceApiProps {
  readonly params: Promise<WorkspaceParams>
}

/**
 * Props for Next.js API routes with challenge context
 */
export interface ChallengeApiProps {
  readonly params: Promise<ChallengeParams>
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Make specific properties required
 */
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>

/**
 * Deep readonly type
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? DeepReadonlyArray<U>
    : T[P] extends Record<string, unknown>
    ? DeepReadonly<T[P]>
    : T[P]
}

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

/**
 * Extract the value type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T

// =============================================================================
// TYPE GUARDS
// =============================================================================

/**
 * Type guard to check if response is an error
 */
export function isApiError(response: ApiResponse): response is ApiError {
  return 'error' in response
}

/**
 * Type guard to check if response is successful
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccess<T> {
  return 'success' in response && response.success === true
}

/**
 * Type guard to check if user has admin role
 */
export function isAdmin(role: Role): boolean {
  return role === 'ADMIN'
}

/**
 * Type guard to check if user has participant role
 */
export function isParticipant(role: Role): boolean {
  return role === 'PARTICIPANT'
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const ENROLLMENT_STATUSES = ['INVITED', 'ENROLLED', 'WITHDRAWN'] as const
export const USER_ROLES = ['ADMIN', 'PARTICIPANT'] as const
export const ACTIVITY_TYPES = ['TEXT_SUBMISSION', 'FILE_UPLOAD', 'PHOTO_UPLOAD', 'LINK_SUBMISSION', 'MULTIPLE_CHOICE', 'VIDEO_SUBMISSION'] as const
export const SUBMISSION_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'DRAFT'] as const

// =============================================================================
// DETAILED ENTITY TYPES WITH RELATIONS
// =============================================================================

export interface ChallengeWithDetails extends Challenge {
  workspace: Workspace;
  enrollments: (Enrollment & {
    user: AppUser;
  })[];
  activities?: (Activity & {
    template: ActivityTemplate;
    submissions: ActivitySubmission[];
  })[];
}

export interface EnrollmentWithDetails extends Enrollment {
  user: AppUser;
  challenge: ChallengeWithDetails;
  activitySubmissions?: (ActivitySubmission & {
    activity: Activity & {
      template: ActivityTemplate;
    };
  })[];
}

export interface ActivityTemplateWithDetails extends ActivityTemplate {
  workspace: Workspace;
  activities: Activity[];
}

export interface ActivityWithDetails extends Activity {
  template: ActivityTemplate;
  challenge: Challenge;
  submissions: (ActivitySubmission & {
    user: AppUser;
    enrollment: Enrollment;
  })[];
}

export interface ActivitySubmissionWithDetails extends ActivitySubmission {
  activity: Activity & {
    template: ActivityTemplate;
    challenge: Challenge;
  };
  user: AppUser;
  enrollment: Enrollment;
}

// =============================================================================
// ACTIVITY API TYPES
// =============================================================================

export interface ActivityTemplateCreateRequest {
  readonly name: string
  readonly description: string
  readonly type: ActivityType
  readonly basePoints: number
  readonly requiresApproval?: boolean
  readonly allowMultiple?: boolean
}

export interface ActivityTemplateCreateResponse {
  readonly template: ActivityTemplate
}

export interface ActivityTemplateListResponse {
  readonly templates: ActivityTemplate[]
}

export interface ActivityCreateRequest {
  readonly templateId: string
  readonly pointsValue?: number
  readonly maxSubmissions?: number
  readonly deadline?: string
  readonly isRequired?: boolean
}

export interface ActivityCreateResponse {
  readonly activity: Activity
}

export interface ActivitySubmissionCreateRequest {
  readonly activityId: string
  readonly textContent?: string
  readonly fileUrls?: string[]
  readonly linkUrl?: string
}

export interface ActivitySubmissionCreateResponse {
  readonly submission: ActivitySubmission
}

export interface ActivitySubmissionReviewRequest {
  readonly status: 'APPROVED' | 'REJECTED'
  readonly reviewNotes?: string
  readonly pointsAwarded?: number
}

// =============================================================================
// INVITE API TYPES
// =============================================================================

export interface InviteCodeCreateRequest {
  readonly challengeId?: ChallengeId
  readonly role?: Role
  readonly expiresIn?: number // hours
  readonly maxUses?: number
}

export interface InviteCodeCreateResponse {
  readonly inviteCode: InviteCode
}

export interface InviteCodeAcceptRequest {
  readonly code: string
}

export interface InviteCodeAcceptResponse {
  readonly success: boolean
  readonly message: string
  readonly workspace?: Workspace
  readonly challenge?: Challenge
}

export interface InviteCodeWithDetails extends InviteCode {
  workspace: Workspace
  challenge?: Challenge | null
  creator: Pick<AppUser, 'id' | 'email'>
}

export interface WorkspaceMembershipWithDetails extends WorkspaceMembership {
  user: AppUser
  workspace: Workspace & {
    _count?: {
      memberships: number
      challenges: number
    }
  }
}

// =============================================================================
// VALIDATION SCHEMAS (for runtime type checking)
// =============================================================================

/**
 * Validation helper for challenge creation
 */
export function validateChallengeData(data: unknown): data is ChallengeCreateRequest {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('title' in data) ||
    !('description' in data) ||
    !('startDate' in data) ||
    !('endDate' in data) ||
    typeof (data as any).title !== 'string' ||
    typeof (data as any).description !== 'string' ||
    typeof (data as any).startDate !== 'string' ||
    typeof (data as any).endDate !== 'string' ||
    (data as any).title.trim().length === 0 ||
    (data as any).description.trim().length === 0
  ) {
    return false
  }

  // Validate date formats
  const startDate = new Date((data as any).startDate)
  const endDate = new Date((data as any).endDate)
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return false
  }

  // Validate date logic
  if (endDate <= startDate) {
    return false
  }

  // Validate enrollment deadline if provided
  if ('enrollmentDeadline' in data && (data as any).enrollmentDeadline) {
    const enrollmentDeadline = new Date((data as any).enrollmentDeadline)
    if (isNaN(enrollmentDeadline.getTime()) || enrollmentDeadline > startDate) {
      return false
    }
  }

  return true
}

/**
 * Validation helper for activity template creation
 */
export function validateActivityTemplateData(data: unknown): data is ActivityTemplateCreateRequest {
  return (
    typeof data === 'object' &&
    data !== null &&
    'name' in data &&
    'description' in data &&
    'type' in data &&
    'basePoints' in data &&
    typeof (data as any).name === 'string' &&
    typeof (data as any).description === 'string' &&
    typeof (data as any).type === 'string' &&
    typeof (data as any).basePoints === 'number' &&
    (data as any).name.trim().length > 0 &&
    (data as any).description.trim().length > 0 &&
    ACTIVITY_TYPES.includes((data as any).type) &&
    (data as any).basePoints > 0
  )
}

/**
 * Validation helper for activity submission creation
 */
export function validateActivitySubmissionData(data: unknown): data is ActivitySubmissionCreateRequest {
  if (
    typeof data !== 'object' ||
    data === null ||
    !('activityId' in data) ||
    typeof (data as any).activityId !== 'string' ||
    (data as any).activityId.trim().length === 0
  ) {
    return false
  }

  // At least one content field must be provided
  const hasTextContent = 'textContent' in data && typeof (data as any).textContent === 'string' && (data as any).textContent.trim().length > 0
  const hasFileUrls = 'fileUrls' in data && Array.isArray((data as any).fileUrls) && (data as any).fileUrls.length > 0
  const hasLinkUrl = 'linkUrl' in data && typeof (data as any).linkUrl === 'string' && (data as any).linkUrl.trim().length > 0

  return hasTextContent || hasFileUrls || hasLinkUrl
}

/**
 * Validation helper for enrollment creation
 */
export function validateEnrollmentData(data: unknown): data is EnrollmentCreateRequest {
  return (
    typeof data === 'object' &&
    data !== null &&
    'challengeId' in data &&
    typeof (data as any).challengeId === 'string' &&
    (data as any).challengeId.trim().length > 0
  )
}

/**
 * Validation helper for invite code creation
 */
export function validateInviteCodeData(data: unknown): data is InviteCodeCreateRequest {
  if (typeof data !== 'object' || data === null) {
    return false
  }

  const d = data as any

  // Optional fields validation
  if ('role' in d && d.role !== undefined && !USER_ROLES.includes(d.role)) {
    return false
  }

  if ('expiresIn' in d && d.expiresIn !== undefined && (typeof d.expiresIn !== 'number' || d.expiresIn < 1)) {
    return false
  }

  if ('maxUses' in d && d.maxUses !== undefined && (typeof d.maxUses !== 'number' || d.maxUses < 1)) {
    return false
  }

  if ('challengeId' in d && d.challengeId !== undefined && typeof d.challengeId !== 'string') {
    return false
  }

  return true
}