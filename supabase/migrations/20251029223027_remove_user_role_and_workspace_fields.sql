-- Migration: Remove User.role, User.primaryWorkspaceId, User.lastWorkspaceId
-- Pure multi-tenant architecture - roles exist ONLY in WorkspaceMembership

-- Drop columns from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS "role";
ALTER TABLE "User" DROP COLUMN IF EXISTS "primaryWorkspaceId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lastWorkspaceId";
