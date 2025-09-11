-- Migration: Add WorkspaceMembership model and primaryWorkspaceId
-- This migration adds the WorkspaceMembership table for multi-workspace support
-- while maintaining backward compatibility with User.workspaceId

-- Add primaryWorkspaceId to User table (may already exist)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "primaryWorkspaceId" UUID;

-- Create WorkspaceMembership table
CREATE TABLE IF NOT EXISTS "WorkspaceMembership" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "role" "Role" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint and indexes
CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceMembership_userId_workspaceId_key" ON "WorkspaceMembership"("userId", "workspaceId");
CREATE INDEX IF NOT EXISTS "WorkspaceMembership_userId_idx" ON "WorkspaceMembership"("userId");
CREATE INDEX IF NOT EXISTS "WorkspaceMembership_workspaceId_idx" ON "WorkspaceMembership"("workspaceId");
CREATE INDEX IF NOT EXISTS "WorkspaceMembership_userId_isPrimary_idx" ON "WorkspaceMembership"("userId", "isPrimary");

-- Add foreign key constraints
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;