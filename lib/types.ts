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