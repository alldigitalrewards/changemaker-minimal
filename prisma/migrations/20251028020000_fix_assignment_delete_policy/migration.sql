-- =============================================================================
-- Fix ChallengeAssignment DELETE Policy
-- Migration: 20251028020000_fix_assignment_delete_policy
-- =============================================================================
-- Issue: Test #13 "only admin can delete challenge assignments" fails because
-- manager can delete when shouldn't be allowed.
--
-- Root Cause: The assignment_admin_modify policy uses FOR ALL with only USING
-- clause. PostgreSQL RLS FOR ALL policies need explicit handling for DELETE.
--
-- Solution: Replace FOR ALL policy with separate INSERT/UPDATE/DELETE policies
-- for clarity and proper enforcement.
-- =============================================================================

-- Drop the ambiguous FOR ALL policy
DROP POLICY IF EXISTS "assignment_admin_modify" ON "ChallengeAssignment";

-- Create explicit INSERT policy - only admins can create assignments
CREATE POLICY "assignment_insert"
ON "ChallengeAssignment"
FOR INSERT
WITH CHECK (is_workspace_admin("workspaceId"));

-- Create explicit UPDATE policy - only admins can update assignments
CREATE POLICY "assignment_update"
ON "ChallengeAssignment"
FOR UPDATE
USING (is_workspace_admin("workspaceId"))
WITH CHECK (is_workspace_admin("workspaceId"));

-- Create explicit DELETE policy - only admins can delete assignments
CREATE POLICY "assignment_delete"
ON "ChallengeAssignment"
FOR DELETE
USING (is_workspace_admin("workspaceId"));

-- Verify policies are created correctly
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'ChallengeAssignment'
    AND policyname = 'assignment_delete'
  ) THEN
    RAISE EXCEPTION 'Failed to create assignment_delete policy';
  END IF;

  RAISE NOTICE 'ChallengeAssignment DELETE policy fix complete';
END $$;
