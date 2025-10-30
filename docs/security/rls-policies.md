# Row-Level Security (RLS) Policies

**Date**: 2025-10-27
**Author**: Claude Code
**Status**: Design Specification
**Implementation**: Tasks 30.2-30.5

## Overview

This document specifies Row-Level Security policies for the Changemaker platform. RLS provides **database-level authorization guarantees** that complement application-level middleware, ensuring defense-in-depth security.

## Architecture

### Authentication Context

Supabase provides `auth.uid()` which returns the authenticated user's Supabase UUID. This maps to `User.supabaseUserId` in our schema.

### Helper Functions

```sql
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

-- Check if current user is assigned to challenge
CREATE OR REPLACE FUNCTION is_assigned_to_challenge(challenge_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "ChallengeAssignment"
    WHERE "challengeId" = challenge_id
    AND "managerId" = current_user_id()
  )
$$ LANGUAGE SQL STABLE;

-- Get user's workspace IDs
CREATE OR REPLACE FUNCTION user_workspace_ids()
RETURNS TABLE(workspace_id UUID) AS $$
  SELECT "workspaceId" FROM "WorkspaceMembership"
  WHERE "userId" = current_user_id()
$$ LANGUAGE SQL STABLE;
```

## Core Policies - Workspace Isolation (Task 30.2)

### Workspace Model

```sql
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
USING (auth.uid() IS NULL); -- Service role only
```

### WorkspaceMembership Model

```sql
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
```

### User Model

```sql
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
```

### Challenge Model

```sql
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
```

### Activity & ActivityTemplate Models

```sql
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
```

### Enrollment Model

```sql
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
```

## Manager Policies - Assignment-Based Access (Task 30.3)

### ChallengeAssignment Model

```sql
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
```

### ActivitySubmission Model (COMPLEX - Critical for Manager Role)

```sql
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
```

## Supporting Models

### ActivityEvent Model

```sql
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
```

### RewardIssuance Model

```sql
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
```

### PointsLedger Model

```sql
ALTER TABLE "PointsLedger" ENABLE ROW LEVEL SECURITY;

-- Users can see their own points transactions
-- Admins can see all points in their workspaces
CREATE POLICY "points_ledger_select"
ON "PointsLedger"
FOR SELECT
USING (
  "userId" = current_user_id()
  OR is_workspace_admin("workspaceId")
);

-- Only system can modify points ledger
CREATE POLICY "points_ledger_modify"
ON "PointsLedger"
FOR ALL
USING (
  auth.uid() IS NULL -- Service role only
);
```

### ChallengePointsBudget Model

```sql
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
```

### Communication Models (Email, Invites)

```sql
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

-- Invite
ALTER TABLE "Invite" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invite_admin_manage"
ON "Invite"
FOR ALL
USING (is_workspace_admin("workspaceId"));
```

## Service Role Bypass

For system operations (background jobs, API routes with service role authentication), we need to bypass RLS:

```sql
-- Grant service role bypass for all tables
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
```

## Performance Considerations

### Indexes for RLS Queries

```sql
-- Speed up workspace membership lookups
CREATE INDEX IF NOT EXISTS idx_workspace_membership_user_workspace
ON "WorkspaceMembership"("userId", "workspaceId");

-- Speed up challenge assignment lookups
CREATE INDEX IF NOT EXISTS idx_challenge_assignment_manager_challenge
ON "ChallengeAssignment"("managerId", "challengeId");

-- Speed up activity challenge lookups
CREATE INDEX IF NOT EXISTS idx_activity_challenge
ON "Activity"("challengeId");

-- Speed up submission activity lookups
CREATE INDEX IF NOT EXISTS idx_submission_activity_user
ON "ActivitySubmission"("activityId", "userId");
```

### Query Plan Analysis

After implementing policies, analyze query plans:

```sql
EXPLAIN ANALYZE
SELECT * FROM "ActivitySubmission"
WHERE "activityId" = 'some-uuid';
```

Target: <100ms for typical queries with RLS enabled.

## Testing Strategy (Task 30.4)

### Test Scenarios

1. **Workspace Isolation**
   - User A in Workspace 1 cannot see Workspace 2 data
   - Cross-workspace queries return empty results

2. **Manager Assignment Access**
   - Manager can only see submissions for assigned challenges
   - Manager cannot see submissions for unassigned challenges
   - Unassigning manager immediately revokes access

3. **Role-Based Access**
   - PARTICIPANT cannot access admin/manager operations
   - MANAGER can access assigned data
   - ADMIN has full workspace access

4. **Participant Data Access**
   - Participants can only see their own submissions
   - Participants cannot see other participants' data

5. **Service Role Bypass**
   - Background jobs can access all data via service role
   - API routes with service auth bypass RLS

### Automated Tests

Create `tests/security/rls-policies.spec.ts` with:
- Connection pooling for different auth contexts
- Test data setup with multiple workspaces/users
- Assert queries return expected row counts
- Assert unauthorized queries return 0 rows

## Migration Plan

### Phase 1: Enable RLS (Task 30.2)
- Create helper functions
- Enable RLS on core models
- Deploy to staging
- Verify no breakage

### Phase 2: Manager Policies (Task 30.3)
- Add manager-specific policies
- Enable RLS on submission-related models
- Deploy to staging
- Verify manager workflow works

### Phase 3: Optimize & Test (Tasks 30.4-30.5)
- Run automated tests
- Performance benchmarks
- Query optimization
- Index tuning

## Rollback Plan

If RLS causes issues:

```sql
-- Disable RLS on a specific table
ALTER TABLE "TableName" DISABLE ROW LEVEL SECURITY;

-- Drop all policies on a table
DROP POLICY IF EXISTS policy_name ON "TableName";
```

## Security Benefits

1. **Defense in Depth**: Database enforces authorization even if application middleware fails
2. **Manager Assignment Guarantee**: Database ensures managers only access assigned challenges
3. **Workspace Isolation**: Impossible to leak cross-workspace data at database level
4. **Audit Trail**: RLS policy violations can be logged
5. **Reduced Attack Surface**: SQL injection or ORM bugs cannot bypass RLS

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Prisma with RLS Best Practices](https://www.prisma.io/docs/guides/deployment/row-level-security)
