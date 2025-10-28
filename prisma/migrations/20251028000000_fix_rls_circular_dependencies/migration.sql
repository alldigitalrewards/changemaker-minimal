-- =============================================================================
-- Row-Level Security (RLS) - Fix Circular Dependencies
-- Migration: 20251028000000_fix_rls_circular_dependencies
-- =============================================================================
-- This migration fixes PostgreSQL stack overflow errors (code 54001) caused by
-- circular dependencies in RLS policy evaluation. The solution uses SECURITY
-- DEFINER functions to break recursion chains while maintaining authorization
-- guarantees.
--
-- Problem: Helper functions query tables with RLS, which trigger policies that
-- call the same functions, creating infinite recursion.
--
-- Solution: SECURITY DEFINER functions bypass RLS during evaluation, breaking
-- the recursion chain. Functions still validate auth context via auth.uid().
-- =============================================================================

-- =============================================================================
-- STEP 1: Drop all existing policies first (they depend on functions)
-- =============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- =============================================================================
-- STEP 2: Drop existing problematic functions
-- =============================================================================

DROP FUNCTION IF EXISTS current_user_id();
DROP FUNCTION IF EXISTS is_workspace_admin(UUID);
DROP FUNCTION IF EXISTS is_workspace_manager(UUID);
DROP FUNCTION IF EXISTS is_assigned_to_challenge(UUID);
DROP FUNCTION IF EXISTS user_workspace_ids();

-- =============================================================================
-- STEP 3: Create SECURITY DEFINER functions (bypass RLS, prevent recursion)
-- =============================================================================

-- Get current user's database ID from Supabase auth
-- SECURITY DEFINER: Bypasses User table RLS to get current user
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION current_user_id() TO authenticated;

-- Check if current user is workspace admin
-- SECURITY DEFINER: Bypasses WorkspaceMembership RLS to check admin status
CREATE OR REPLACE FUNCTION is_workspace_admin(workspace_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "WorkspaceMembership"
    WHERE "userId" = (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid())
    AND "workspaceId" = workspace_id
    AND role = 'ADMIN'
  )
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION is_workspace_admin(UUID) TO authenticated;

-- Check if current user is workspace manager
-- SECURITY DEFINER: Bypasses WorkspaceMembership RLS to check manager status
CREATE OR REPLACE FUNCTION is_workspace_manager(workspace_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "WorkspaceMembership"
    WHERE "userId" = (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid())
    AND "workspaceId" = workspace_id
    AND role = 'MANAGER'
  )
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION is_workspace_manager(UUID) TO authenticated;

-- Check if current user can access workspace (member, admin, or manager)
-- SECURITY DEFINER: Bypasses WorkspaceMembership RLS for access checks
CREATE OR REPLACE FUNCTION user_can_access_workspace(workspace_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "WorkspaceMembership"
    WHERE "workspaceId" = workspace_id
    AND "userId" = (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid())
  )
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION user_can_access_workspace(UUID) TO authenticated;

-- Check if current user is assigned to challenge (manager assignment)
-- SECURITY DEFINER: Bypasses ChallengeAssignment RLS to check assignment
CREATE OR REPLACE FUNCTION is_assigned_to_challenge(challenge_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "ChallengeAssignment"
    WHERE "challengeId" = challenge_id
    AND "managerId" = (SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid())
  )
$$ LANGUAGE SQL STABLE;

GRANT EXECUTE ON FUNCTION is_assigned_to_challenge(UUID) TO authenticated;

-- Check if current user can access submission (complex multi-role check)
-- SECURITY DEFINER: Bypasses RLS for ActivitySubmission, Activity, Challenge
-- Returns TRUE if user is:
-- 1. Submission owner (participant)
-- 2. Assigned manager for the challenge
-- 3. Workspace admin
CREATE OR REPLACE FUNCTION can_access_submission(submission_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_submission_user_id UUID;
  v_workspace_id UUID;
  v_challenge_id UUID;
BEGIN
  -- Get current user ID
  SELECT id INTO v_user_id FROM "User" WHERE "supabaseUserId" = auth.uid();

  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Get submission details (bypasses RLS)
  SELECT
    sub."userId",
    a."challengeId",
    c."workspaceId"
  INTO v_submission_user_id, v_challenge_id, v_workspace_id
  FROM "ActivitySubmission" sub
  JOIN "Activity" a ON a.id = sub."activityId"
  JOIN "Challenge" c ON c.id = a."challengeId"
  WHERE sub.id = submission_id;

  IF v_challenge_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check access conditions
  RETURN (
    -- 1. Own submission
    v_submission_user_id = v_user_id
    OR
    -- 2. Assigned manager
    EXISTS (
      SELECT 1 FROM "ChallengeAssignment"
      WHERE "challengeId" = v_challenge_id
      AND "managerId" = v_user_id
    )
    OR
    -- 3. Workspace admin
    EXISTS (
      SELECT 1 FROM "WorkspaceMembership"
      WHERE "workspaceId" = v_workspace_id
      AND "userId" = v_user_id
      AND role = 'ADMIN'
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION can_access_submission(UUID) TO authenticated;

-- =============================================================================
-- STEP 4: Recreate all RLS policies using SECURITY DEFINER functions
-- =============================================================================

-- =============================================================================
-- WORKSPACE MODEL
-- =============================================================================

-- Users can see workspaces they belong to
CREATE POLICY "workspace_select_member"
ON "Workspace"
FOR SELECT
USING (user_can_access_workspace(id));

-- Only service role can insert/update/delete workspaces
CREATE POLICY "workspace_modify_service"
ON "Workspace"
FOR ALL
USING (auth.uid() IS NULL);

-- =============================================================================
-- WORKSPACE MEMBERSHIP MODEL
-- =============================================================================

-- Users can see their own memberships
CREATE POLICY "membership_select"
ON "WorkspaceMembership"
FOR SELECT
USING ("userId" = current_user_id());

-- Admins can insert/update/delete memberships in their workspaces
CREATE POLICY "membership_admin_modify"
ON "WorkspaceMembership"
FOR ALL
USING (is_workspace_admin("workspaceId"));

-- =============================================================================
-- USER MODEL
-- =============================================================================

-- Users can see other users in same workspace
CREATE POLICY "user_select_workspace"
ON "User"
FOR SELECT
USING (
  id = current_user_id() -- Always see self
  OR EXISTS (
    SELECT 1 FROM "WorkspaceMembership" wm1
    JOIN "WorkspaceMembership" wm2 ON wm1."workspaceId" = wm2."workspaceId"
    WHERE wm1."userId" = current_user_id()
    AND wm2."userId" = "User".id
  )
);

-- Users can update their own profile
CREATE POLICY "user_update_self"
ON "User"
FOR UPDATE
USING (id = current_user_id());

-- =============================================================================
-- CHALLENGE MODEL
-- =============================================================================

-- Users can see challenges in their workspaces
CREATE POLICY "challenge_select"
ON "Challenge"
FOR SELECT
USING (user_can_access_workspace("workspaceId"));

-- Admins can create/update/delete challenges in their workspaces
CREATE POLICY "challenge_admin_modify"
ON "Challenge"
FOR ALL
USING (is_workspace_admin("workspaceId"));

-- =============================================================================
-- ACTIVITY & ACTIVITY TEMPLATE MODELS
-- =============================================================================

-- Users can see activities for challenges in their workspaces
CREATE POLICY "activity_select"
ON "Activity"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Challenge"
    WHERE id = "Activity"."challengeId"
    AND user_can_access_workspace("workspaceId")
  )
);

-- Admins can modify activities in their workspaces
CREATE POLICY "activity_admin_modify"
ON "Activity"
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM "Challenge"
    WHERE id = "Activity"."challengeId"
    AND is_workspace_admin("workspaceId")
  )
);

-- ActivityTemplate policies
CREATE POLICY "activity_template_select"
ON "ActivityTemplate"
FOR SELECT
USING (user_can_access_workspace("workspaceId"));

CREATE POLICY "activity_template_admin_modify"
ON "ActivityTemplate"
FOR ALL
USING (is_workspace_admin("workspaceId"));

-- =============================================================================
-- ENROLLMENT MODEL
-- =============================================================================

-- Users can see enrollments for challenges in their workspaces
CREATE POLICY "enrollment_select"
ON "Enrollment"
FOR SELECT
USING (
  "userId" = current_user_id() -- Own enrollments
  OR EXISTS (
    SELECT 1 FROM "Challenge"
    WHERE id = "Enrollment"."challengeId"
    AND user_can_access_workspace("workspaceId")
  )
);

-- Participants can create their own enrollments
CREATE POLICY "enrollment_participant_insert"
ON "Enrollment"
FOR INSERT
WITH CHECK (
  "userId" = current_user_id()
  AND EXISTS (
    SELECT 1 FROM "Challenge"
    WHERE id = "Enrollment"."challengeId"
    AND user_can_access_workspace("workspaceId")
  )
);

-- Admins can modify enrollments in their workspaces
CREATE POLICY "enrollment_admin_modify"
ON "Enrollment"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "Challenge"
    WHERE id = "Enrollment"."challengeId"
    AND is_workspace_admin("workspaceId")
  )
);

-- =============================================================================
-- CHALLENGE ASSIGNMENT MODEL
-- =============================================================================

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
USING (is_workspace_admin("workspaceId"));

-- =============================================================================
-- ACTIVITY SUBMISSION MODEL (CRITICAL for Manager Role)
-- =============================================================================

-- Multi-role access policy using SECURITY DEFINER function
CREATE POLICY "submission_select"
ON "ActivitySubmission"
FOR SELECT
USING (can_access_submission(id));

-- Participants can insert their own submissions
CREATE POLICY "submission_participant_insert"
ON "ActivitySubmission"
FOR INSERT
WITH CHECK (
  "userId" = current_user_id()
  AND EXISTS (
    SELECT 1 FROM "Activity" a
    JOIN "Challenge" c ON c.id = a."challengeId"
    WHERE a.id = "ActivitySubmission"."activityId"
    AND user_can_access_workspace(c."workspaceId")
  )
);

-- Managers can update submissions for assigned challenges
CREATE POLICY "submission_manager_update"
ON "ActivitySubmission"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "Activity"
    WHERE id = "ActivitySubmission"."activityId"
    AND is_assigned_to_challenge("challengeId")
  )
);

-- Admins can update all submissions in their workspaces
CREATE POLICY "submission_admin_update"
ON "ActivitySubmission"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "Activity" a
    JOIN "Challenge" c ON c.id = a."challengeId"
    WHERE a.id = "ActivitySubmission"."activityId"
    AND is_workspace_admin(c."workspaceId")
  )
);

-- =============================================================================
-- ACTIVITY EVENT MODEL
-- =============================================================================

-- Users can see events for challenges in their workspaces
CREATE POLICY "activity_event_select"
ON "ActivityEvent"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "Challenge"
    WHERE id = "ActivityEvent"."challengeId"
    AND user_can_access_workspace("workspaceId")
  )
);

-- System/service can insert events
CREATE POLICY "activity_event_insert"
ON "ActivityEvent"
FOR INSERT
WITH CHECK (true);

-- =============================================================================
-- REWARD ISSUANCE MODEL
-- =============================================================================

-- Users can see their own rewards
-- Admins can see all rewards in their workspaces
CREATE POLICY "reward_select"
ON "RewardIssuance"
FOR SELECT
USING (
  "userId" = current_user_id()
  OR is_workspace_admin("workspaceId")
);

-- Only admins and system can create rewards
CREATE POLICY "reward_insert"
ON "RewardIssuance"
FOR INSERT
WITH CHECK (
  is_workspace_admin("workspaceId")
  OR auth.uid() IS NULL
);

-- =============================================================================
-- POINTS LEDGER MODEL
-- =============================================================================

-- Users can see their own points transactions
-- Admins can see all points in their workspaces
CREATE POLICY "points_ledger_select"
ON "PointsLedger"
FOR SELECT
USING (
  "toUserId" = current_user_id()
  OR is_workspace_admin("workspaceId")
);

-- Only system can modify points ledger
CREATE POLICY "points_ledger_modify"
ON "PointsLedger"
FOR ALL
USING (auth.uid() IS NULL);

-- =============================================================================
-- CHALLENGE POINTS BUDGET MODEL
-- =============================================================================

-- Admins can see budgets for their workspace challenges
CREATE POLICY "budget_select"
ON "ChallengePointsBudget"
FOR SELECT
USING (is_workspace_admin("workspaceId"));

-- Only admins can modify budgets
CREATE POLICY "budget_modify"
ON "ChallengePointsBudget"
FOR ALL
USING (is_workspace_admin("workspaceId"));

-- =============================================================================
-- COMMUNICATION MODELS
-- =============================================================================

-- WorkspaceEmailSettings
CREATE POLICY "email_settings_admin"
ON "WorkspaceEmailSettings"
FOR ALL
USING (is_workspace_admin("workspaceId"));

-- WorkspaceEmailTemplate
CREATE POLICY "email_template_admin"
ON "WorkspaceEmailTemplate"
FOR ALL
USING (is_workspace_admin("workspaceId"));

-- WorkspaceCommunication
CREATE POLICY "communication_workspace_access"
ON "WorkspaceCommunication"
FOR SELECT
USING (user_can_access_workspace("workspaceId"));

-- InviteCode
CREATE POLICY "invite_code_admin_manage"
ON "InviteCode"
FOR ALL
USING (is_workspace_admin("workspaceId"));

-- InviteRedemption
CREATE POLICY "invite_redemption_admin_view"
ON "InviteRedemption"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "InviteCode"
    WHERE "InviteCode".id = "InviteRedemption"."inviteId"
    AND is_workspace_admin("InviteCode"."workspaceId")
  )
);

CREATE POLICY "invite_redemption_user_view"
ON "InviteRedemption"
FOR SELECT
USING ("userId" = current_user_id());

CREATE POLICY "invite_redemption_insert"
ON "InviteRedemption"
FOR INSERT
WITH CHECK (
  "userId" = current_user_id()
  AND EXISTS (
    SELECT 1 FROM "InviteCode"
    WHERE "InviteCode".id = "InviteRedemption"."inviteId"
    AND "InviteCode"."expiresAt" > NOW()
    AND "InviteCode"."usedCount" < "InviteCode"."maxUses"
  )
);

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- Grant service role bypass for all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;

-- Verify all functions created successfully
DO $$
DECLARE
  v_function_count INT;
BEGIN
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  AND p.proname IN (
    'current_user_id',
    'is_workspace_admin',
    'is_workspace_manager',
    'user_can_access_workspace',
    'is_assigned_to_challenge',
    'can_access_submission'
  );

  IF v_function_count < 6 THEN
    RAISE EXCEPTION 'Missing SECURITY DEFINER functions! Expected 6, found %', v_function_count;
  END IF;

  RAISE NOTICE 'RLS circular dependency fix migration complete. Created % SECURITY DEFINER functions.', v_function_count;
END $$;
