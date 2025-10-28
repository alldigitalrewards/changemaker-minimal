-- =============================================================================
-- Add GRANT Permissions for authenticated Role
-- Migration: 20251028010000_add_authenticated_grants
-- =============================================================================
-- This migration adds missing table-level GRANT permissions for the
-- authenticated role. PostgreSQL requires both table-level grants AND
-- row-level policies for RLS to work correctly.
--
-- Error: 42501 (permission denied for table X) occurs when users lack
-- table-level permissions, preventing RLS policies from even evaluating.
--
-- Solution: Grant SELECT, INSERT, UPDATE, DELETE on all RLS-protected tables
-- to the authenticated role. Row-level policies will then filter access.
-- =============================================================================

-- Grant permissions on all RLS-protected tables to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON "Workspace" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "WorkspaceMembership" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "User" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Challenge" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Activity" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ActivityTemplate" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "Enrollment" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ChallengeAssignment" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ActivitySubmission" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ActivityEvent" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "RewardIssuance" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "PointsLedger" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ChallengePointsBudget" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "WorkspaceEmailSettings" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "WorkspaceEmailTemplate" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "WorkspaceCommunication" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "InviteCode" TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON "InviteRedemption" TO authenticated;

-- Verify RLS is enabled on all tables
DO $$
DECLARE
  r RECORD;
  v_count INT := 0;
BEGIN
  FOR r IN (
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
      'Workspace', 'WorkspaceMembership', 'User', 'Challenge',
      'Activity', 'ActivityTemplate', 'Enrollment', 'ChallengeAssignment',
      'ActivitySubmission', 'ActivityEvent', 'RewardIssuance',
      'PointsLedger', 'ChallengePointsBudget', 'WorkspaceEmailSettings',
      'WorkspaceEmailTemplate', 'WorkspaceCommunication', 'InviteCode',
      'InviteRedemption'
    )
  ) LOOP
    -- Check if RLS is enabled
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relname = r.tablename
      AND c.relrowsecurity = true
    ) THEN
      RAISE WARNING 'RLS not enabled on table: %', r.tablename;
    ELSE
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Authenticated grants migration complete. RLS enabled on % tables.', v_count;
END $$;
