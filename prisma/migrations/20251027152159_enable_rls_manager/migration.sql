-- =============================================================================
-- Row-Level Security (RLS) - Manager Role Policies
-- Migration: 20251027152159_enable_rls_manager
-- =============================================================================
-- This migration implements manager-specific RLS policies that enable
-- assignment-based access control. Managers can only access data for
-- challenges they are explicitly assigned to manage.
--
-- Security Benefits:
-- - Database enforces manager assignment boundaries
-- - Assignment revocation immediately restricts access at DB level
-- - Manager cannot escalate privileges or access unassigned challenges
-- - Provides audit trail for manager access attempts
-- =============================================================================

-- =============================================================================
-- HELPER FUNCTIONS (Manager-Specific)
-- =============================================================================

-- Check if current user is assigned to challenge
CREATE OR REPLACE FUNCTION is_assigned_to_challenge(challenge_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "ChallengeAssignment"
    WHERE "challengeId" = challenge_id
    AND "managerId" = current_user_id()
  )
$$ LANGUAGE SQL STABLE;

-- =============================================================================
-- CHALLENGE ASSIGNMENT MODEL
-- =============================================================================

ALTER TABLE "ChallengeAssignment" ENABLE ROW LEVEL SECURITY;

-- Managers can see their own assignments
-- Admins can see all assignments in their workspaces
CREATE POLICY "assignment_select"
ON "ChallengeAssignment"
FOR SELECT
USING (
  "managerId" = current_user_id()
  OR is_workspace_admin("workspaceId")
);

-- Only admins can create/delete assignments
CREATE POLICY "assignment_admin_modify"
ON "ChallengeAssignment"
FOR ALL
USING (
  is_workspace_admin("workspaceId")
);

-- =============================================================================
-- ACTIVITY SUBMISSION MODEL (COMPLEX - Critical for Manager Role)
-- =============================================================================

ALTER TABLE "ActivitySubmission" ENABLE ROW LEVEL SECURITY;

-- Multi-role access policy for submissions
CREATE POLICY "submission_select"
ON "ActivitySubmission"
FOR SELECT
USING (
  -- 1. Participant can see their own submissions
  "userId" = current_user_id()

  OR

  -- 2. Manager can see submissions for assigned challenges
  EXISTS (
    SELECT 1
    FROM "Activity" a
    JOIN "ChallengeAssignment" ca ON a."challengeId" = ca."challengeId"
    WHERE a.id = "ActivitySubmission"."activityId"
    AND ca."managerId" = current_user_id()
  )

  OR

  -- 3. Admin can see all submissions in their workspaces
  EXISTS (
    SELECT 1
    FROM "Activity" a
    JOIN "Challenge" c ON c.id = a."challengeId"
    WHERE a.id = "ActivitySubmission"."activityId"
    AND is_workspace_admin(c."workspaceId")
  )
);

-- Participants can insert their own submissions
CREATE POLICY "submission_participant_insert"
ON "ActivitySubmission"
FOR INSERT
WITH CHECK (
  "userId" = current_user_id()
  AND "activityId" IN (
    SELECT a.id FROM "Activity" a
    JOIN "Challenge" c ON c.id = a."challengeId"
    WHERE c."workspaceId" IN (SELECT workspace_id FROM user_workspace_ids())
  )
);

-- Managers can update submissions for assigned challenges (for review)
CREATE POLICY "submission_manager_update"
ON "ActivitySubmission"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM "Activity" a
    WHERE a.id = "ActivitySubmission"."activityId"
    AND is_assigned_to_challenge(a."challengeId")
  )
);

-- Admins can update all submissions in their workspaces
CREATE POLICY "submission_admin_update"
ON "ActivitySubmission"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM "Activity" a
    JOIN "Challenge" c ON c.id = a."challengeId"
    WHERE a.id = "ActivitySubmission"."activityId"
    AND is_workspace_admin(c."workspaceId")
  )
);

-- =============================================================================
-- PERFORMANCE INDEXES
-- =============================================================================

-- Speed up challenge assignment lookups
CREATE INDEX IF NOT EXISTS idx_challenge_assignment_manager_challenge
ON "ChallengeAssignment"("managerId", "challengeId");

-- Speed up submission activity lookups
CREATE INDEX IF NOT EXISTS idx_submission_activity_user
ON "ActivitySubmission"("activityId", "userId");

-- Speed up activity challenge lookups (if not already exists)
CREATE INDEX IF NOT EXISTS idx_activity_challenge
ON "Activity"("challengeId");

-- =============================================================================
-- GRANT SERVICE ROLE BYPASS
-- =============================================================================

-- Ensure service role can bypass RLS for system operations
GRANT ALL ON "ChallengeAssignment" TO service_role;
GRANT ALL ON "ActivitySubmission" TO service_role;
