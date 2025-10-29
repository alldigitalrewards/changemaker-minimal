-- AlterTable: Remove legacy workspaceId column from User table
-- This column has been replaced by the WorkspaceMembership junction table
-- for proper multi-tenant support

-- First, drop the foreign key constraint if it exists
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_workspaceId_fkey";

-- Drop the index if it exists
DROP INDEX IF EXISTS "User_workspaceId_idx";

-- Remove the workspaceId column
ALTER TABLE "User" DROP COLUMN IF EXISTS "workspaceId";
