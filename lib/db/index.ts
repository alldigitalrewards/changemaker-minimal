/**
 * Database Module Export
 * 
 * Central export point for all database operations.
 * Enforces workspace isolation and provides type-safe queries.
 */

// Export all query functions
export * from './queries'

// Export Prisma client
export { prisma } from '@/lib/prisma'

// Export common types
export type {
  WorkspaceWithCounts,
  WorkspaceWithDetails,
  UserWithWorkspace,
  ChallengeWithDetails,
  EnrollmentWithDetails
} from './queries'

export {
  DatabaseError,
  WorkspaceAccessError,
  ResourceNotFoundError
} from './queries'