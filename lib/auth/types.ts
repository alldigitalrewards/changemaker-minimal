import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { User as PrismaUser, Workspace } from '@prisma/client'
import type { Role } from '@/lib/types'

export interface AuthenticatedUser {
  supabaseUser: SupabaseUser
  dbUser: PrismaUser
}

export interface WorkspaceContext {
  workspace: Workspace
  user: AuthenticatedUser
  role?: Role
}

// UI (server components) convenience type where we only need Prisma user fields
export interface UiWorkspaceContext {
  workspace: Workspace
  user: PrismaUser
  role?: Role
}

// Use Prisma's enum as single source of truth
export type ChallengeStatus = import('@prisma/client').ChallengeStatus

// Minimal UI-safe user shape for consumers that should not access DB internals
export type UserSummary = {
  id: string
  email: string
}

// Canonical access payload shape to unify API/UI helpers
export interface CanonicalWorkspaceAccess {
  workspace: Workspace
  user: UserSummary
  role?: Role
}

// (no duplicate export)


