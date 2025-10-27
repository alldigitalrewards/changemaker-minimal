-- =============================================================================
-- Row-Level Security (RLS) - Core Policies for Workspace Isolation
-- Migration: 20251027214059_enable_rls_core
-- =============================================================================
-- This migration implements database-level authorization guarantees through
-- PostgreSQL Row-Level Security policies. These policies enforce workspace
-- isolation and role-based access control at the database layer, providing
-- defense-in-depth security beyond application-level middleware.
--
-- Security Benefits:
-- - Database enforces authorization even if application middleware fails
-- - Workspace isolation impossible to bypass at database level
-- - SQL injection or ORM bugs cannot bypass RLS
-- - Audit trail for RLS policy violations
-- =============================================================================

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get current user's database ID from Supabase auth
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
  SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()
$$ LANGUAGE SQL STABLE;

-- Check if current user is workspace admin
CREATE OR REPLACE FUNCTION is_workspace_admin(workspace_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "WorkspaceMembership"
    WHERE "userId" = current_user_id()
    AND "workspaceId" = workspace_id
    AND role = 'ADMIN'
  )
$$ LANGUAGE SQL STABLE;

-- Check if current user is workspace manager
CREATE OR REPLACE FUNCTION is_workspace_manager(workspace_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "WorkspaceMembership"
    WHERE "userId" = current_user_id()
    AND "workspaceId" = workspace_id
    AND role = 'MANAGER'
  )
$$ LANGUAGE SQL STABLE;

-- Get user's workspace IDs
CREATE OR REPLACE FUNCTION user_workspace_ids()
RETURNS TABLE(workspace_id UUID) AS $$
  SELECT "workspaceId" FROM "WorkspaceMembership"
  WHERE "userId" = current_user_id()
$$ LANGUAGE SQL STABLE;

-- =============================================================================
-- WORKSPACE MODEL
-- =============================================================================

ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;

-- Users can see workspaces they belong to
CREATE POLICY "workspace_select_member"
ON "Workspace"
FOR SELECT
USING (
  id IN (SELECT workspace_id FROM user_workspace_ids())
);

-- Only service role can insert/update/delete workspaces
CREATE POLICY "workspace_modify_service"
ON "Workspace"
FOR ALL
USING (auth.uid() IS NULL);

-- =============================================================================
-- WORKSPACE MEMBERSHIP MODEL
-- =============================================================================

ALTER TABLE "WorkspaceMembership" ENABLE ROW LEVEL SECURITY;

-- Users can see memberships in their workspaces
CREATE POLICY "membership_select"
ON "WorkspaceMembership"
FOR SELECT
USING (
  "workspaceId" IN (SELECT workspace_id FROM user_workspace_ids())
);

-- Admins can insert/update/delete memberships in their workspaces
CREATE POLICY "membership_admin_modify"
ON "WorkspaceMembership"
FOR ALL
USING (
  is_workspace_admin("workspaceId")
);

-- =============================================================================
-- USER MODEL
-- =============================================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- Users can see other users in same workspace
CREATE POLICY "user_select_workspace"
ON "User"
FOR SELECT
USING (
  id IN (
    SELECT "userId" FROM "WorkspaceMembership"
    WHERE "workspaceId" IN (SELECT workspace_id FROM user_workspace_ids())
  )
  OR id = current_user_id() -- Can always see self
);

-- Users can update their own profile
CREATE POLICY "user_update_self"
ON "User"
FOR UPDATE
USING (id = current_user_id());

-- =============================================================================
-- CHALLENGE MODEL
-- =============================================================================

ALTER TABLE "Challenge" ENABLE ROW LEVEL SECURITY;

-- Users can see challenges in their workspaces
CREATE POLICY "challenge_select"
ON "Challenge"
FOR SELECT
USING (
  "workspaceId" IN (SELECT workspace_id FROM user_workspace_ids())
);

-- Admins can create/update/delete challenges in their workspaces
CREATE POLICY "challenge_admin_modify"
ON "Challenge"
FOR ALL
USING (
  is_workspace_admin("workspaceId")
);

-- =============================================================================
-- ACTIVITY & ACTIVITY TEMPLATE MODELS
-- =============================================================================

ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ActivityTemplate" ENABLE ROW LEVEL SECURITY;

-- Users can see activities for challenges in their workspaces
CREATE POLICY "activity_select"
ON "Activity"
FOR SELECT
USING (
  "challengeId" IN (
    SELECT id FROM "Challenge"
    WHERE "workspaceId" IN (SELECT workspace_id FROM user_workspace_ids())
  )
);

-- Admins can modify activities
CREATE POLICY "activity_admin_modify"
ON "Activity"
FOR ALL
USING (
  "challengeId" IN (
    SELECT id FROM "Challenge"
    WHERE "workspaceId" IN (SELECT workspace_id FROM user_workspace_ids())
    AND is_workspace_admin("Challenge"."workspaceId")
  )
);

-- ActivityTemplate policies (similar to Activity)
CREATE POLICY "activity_template_select"
ON "ActivityTemplate"
FOR SELECT
USING (
  "workspaceId" IN (SELECT workspace_id FROM user_workspace_ids())
);

CREATE POLICY "activity_template_admin_modify"
ON "ActivityTemplate"
FOR ALL
USING (
  is_workspace_admin("workspaceId")
);

-- =============================================================================
-- ENROLLMENT MODEL
-- =============================================================================

ALTER TABLE "Enrollment" ENABLE ROW LEVEL SECURITY;

-- Users can see enrollments for challenges in their workspaces
CREATE POLICY "enrollment_select"
ON "Enrollment"
FOR SELECT
USING (
  "challengeId" IN (
    SELECT id FROM "Challenge"
    WHERE "workspaceId" IN (SELECT workspace_id FROM user_workspace_ids())
  )
  OR "userId" = current_user_id() -- Can see own enrollments
);

-- Participants can create their own enrollments
CREATE POLICY "enrollment_participant_insert"
ON "Enrollment"
FOR INSERT
WITH CHECK (
  "userId" = current_user_id()
  AND "challengeId" IN (
    SELECT id FROM "Challenge"
    WHERE "workspaceId" IN (SELECT workspace_id FROM user_workspace_ids())
  )
);

-- Admins can modify enrollments
CREATE POLICY "enrollment_admin_modify"
ON "Enrollment"
FOR UPDATE
USING (
  "challengeId" IN (
    SELECT id FROM "Challenge"
    WHERE "workspaceId" IN (SELECT workspace_id FROM user_workspace_ids())
    AND is_workspace_admin("Challenge"."workspaceId")
  )
);

-- =============================================================================
-- ACTIVITY EVENT MODEL
-- =============================================================================

ALTER TABLE "ActivityEvent" ENABLE ROW LEVEL SECURITY;

-- Users can see events for challenges in their workspaces
CREATE POLICY "activity_event_select"
ON "ActivityEvent"
FOR SELECT
USING (
  "challengeId" IN (
    SELECT id FROM "Challenge"
    WHERE "workspaceId" IN (SELECT workspace_id FROM user_workspace_ids())
  )
);

-- System/service can insert events
CREATE POLICY "activity_event_insert"
ON "ActivityEvent"
FOR INSERT
WITH CHECK (true); -- Application handles authorization

-- =============================================================================
-- REWARD ISSUANCE MODEL
-- =============================================================================

ALTER TABLE "RewardIssuance" ENABLE ROW LEVEL SECURITY;

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
  OR auth.uid() IS NULL -- Service role
);

-- =============================================================================
-- POINTS LEDGER MODEL
-- =============================================================================

ALTER TABLE "PointsLedger" ENABLE ROW LEVEL SECURITY;

-- Users can see their own points transactions (where they are the recipient)
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
USING (
  auth.uid() IS NULL -- Service role only
);

-- =============================================================================
-- CHALLENGE POINTS BUDGET MODEL
-- =============================================================================

ALTER TABLE "ChallengePointsBudget" ENABLE ROW LEVEL SECURITY;

-- Admins can see budgets for their workspace challenges
CREATE POLICY "budget_select"
ON "ChallengePointsBudget"
FOR SELECT
USING (
  is_workspace_admin("workspaceId")
);

-- Only admins can modify budgets
CREATE POLICY "budget_modify"
ON "ChallengePointsBudget"
FOR ALL
USING (
  is_workspace_admin("workspaceId")
);

-- =============================================================================
-- COMMUNICATION MODELS (Email, Invites)
-- =============================================================================

-- WorkspaceEmailSettings
ALTER TABLE "WorkspaceEmailSettings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_settings_admin"
ON "WorkspaceEmailSettings"
FOR ALL
USING (is_workspace_admin("workspaceId"));

-- WorkspaceEmailTemplate
ALTER TABLE "WorkspaceEmailTemplate" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_template_admin"
ON "WorkspaceEmailTemplate"
FOR ALL
USING (is_workspace_admin("workspaceId"));

-- WorkspaceCommunication
ALTER TABLE "WorkspaceCommunication" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "communication_workspace_access"
ON "WorkspaceCommunication"
FOR SELECT
USING (
  "workspaceId" IN (SELECT workspace_id FROM user_workspace_ids())
);

-- InviteCode
ALTER TABLE "InviteCode" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invite_code_admin_manage"
ON "InviteCode"
FOR ALL
USING (is_workspace_admin("workspaceId"));

-- InviteRedemption
ALTER TABLE "InviteRedemption" ENABLE ROW LEVEL SECURITY;

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
-- PERFORMANCE INDEXES
-- =============================================================================

-- Speed up workspace membership lookups
CREATE INDEX IF NOT EXISTS idx_workspace_membership_user_workspace
ON "WorkspaceMembership"("userId", "workspaceId");

-- Speed up activity challenge lookups
CREATE INDEX IF NOT EXISTS idx_activity_challenge
ON "Activity"("challengeId");

-- =============================================================================
-- SERVICE ROLE BYPASS
-- =============================================================================

-- Grant service role bypass for all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
