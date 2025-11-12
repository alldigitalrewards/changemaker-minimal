# Session: Task 30.3 RLS Circular Dependency Fix

**Date**: 2025-10-27
**Task ID**: Task 30.3 (Revisit) - Fix RLS Policy Circular Dependencies
**Status**: CRITICAL BLOCKER
**Estimated Time**: 3 hours

## Critical Issue Discovered

### Stack Overflow Error
**PostgreSQL Error**: `{"code": "54001", "message": "stack depth limit exceeded"}`

**Impact**: All RLS-protected queries fail with stack overflow, blocking Phase 2 merge.

**Root Cause**: Circular dependencies in RLS policy design causing infinite recursion during policy evaluation.

## Analysis of RLS Policy Structure

### Migration Files
1. `20251027214059_enable_rls_core/migration.sql` (395 lines, 30 policies)
2. `20251027220000_enable_rls_manager/migration.sql` (165 lines, 6 policies)

### Problematic Patterns Identified

#### 1. Recursive Subqueries on Same Table
```sql
-- Challenge.activity_admin_modify (lines 163-172)
CREATE POLICY "activity_admin_modify" ON "Activity" FOR ALL
USING (
  "challengeId" IN (
    SELECT id FROM "Challenge"  -- References Challenge
    WHERE "workspaceId" IN (SELECT workspace_id FROM user_workspace_ids())
    AND is_workspace_admin("Challenge"."workspaceId")  -- References Challenge again!
  )
);
```
**Problem**: Policy queries `Challenge` table while evaluating policy for `Activity` table, and the subquery itself triggers `Challenge` policies.

#### 2. Circular Function Dependencies
```sql
-- is_workspace_admin() function (lines 28-36)
CREATE OR REPLACE FUNCTION is_workspace_admin(workspace_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM "WorkspaceMembership"  -- Triggers WorkspaceMembership RLS
    WHERE "userId" = current_user_id()   -- Triggers User RLS
    AND "workspaceId" = workspace_id
    AND role = 'ADMIN'
  )
$$ LANGUAGE SQL STABLE;

-- WorkspaceMembership.membership_admin_modify (lines 92-96)
CREATE POLICY "membership_admin_modify" ON "WorkspaceMembership" FOR ALL
USING (
  is_workspace_admin("workspaceId")  -- Calls function that queries this table!
);
```
**Problem**: Function queries table with policy that calls the function → infinite recursion.

#### 3. user_workspace_ids() Creates Deep Recursion
```sql
-- user_workspace_ids() function (lines 50-54)
CREATE OR REPLACE FUNCTION user_workspace_ids()
RETURNS TABLE(workspace_id UUID) AS $$
  SELECT "workspaceId" FROM "WorkspaceMembership"  -- Triggers RLS
  WHERE "userId" = current_user_id()               -- Triggers User RLS
$$ LANGUAGE SQL STABLE;
```
Used in **16 different policies**, each call triggers `WorkspaceMembership` and `User` RLS evaluation.

#### 4. Nested EXISTS with Multiple Table Joins
```sql
-- ActivitySubmission.submission_select (manager migration, lines 63-91)
CREATE POLICY "submission_select" ON "ActivitySubmission" FOR SELECT
USING (
  "userId" = current_user_id()
  OR EXISTS (
    SELECT 1 FROM "Activity" a              -- Triggers Activity RLS
    JOIN "ChallengeAssignment" ca           -- Triggers ChallengeAssignment RLS
      ON a."challengeId" = ca."challengeId"
    WHERE a.id = "ActivitySubmission"."activityId"
    AND ca."managerId" = current_user_id()  -- Triggers User RLS
  )
  OR EXISTS (
    SELECT 1 FROM "Activity" a              -- Triggers Activity RLS
    JOIN "Challenge" c                      -- Triggers Challenge RLS
      ON c.id = a."challengeId"
    WHERE a.id = "ActivitySubmission"."activityId"
    AND is_workspace_admin(c."workspaceId") -- Triggers WorkspaceMembership RLS
  )
);
```
**Problem**: Single query triggers 5+ table RLS evaluations, each with their own subqueries.

## PostgreSQL RLS Recursion Limits

PostgreSQL stack depth limit (typically 2MB) can be exceeded when:
- Policies reference other tables with policies
- Helper functions query tables with policies
- Deeply nested EXISTS/IN subqueries
- Circular function → table → policy → function chains

**Common Stack Depth**: ~100-200 recursive calls before overflow.

## Solution Strategy

### Approach 1: Security Definer Functions (RECOMMENDED)
Create helper functions with `SECURITY DEFINER` to bypass RLS during evaluation:

```sql
CREATE OR REPLACE FUNCTION is_workspace_admin(workspace_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER  -- Run with elevated privileges, bypass RLS
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM "WorkspaceMembership"
    WHERE "userId" = current_user_id()
    AND "workspaceId" = workspace_id
    AND role = 'ADMIN'
  )
$$ LANGUAGE SQL STABLE;
```

**Benefits**:
- Breaks recursion chain
- Functions bypass RLS, preventing stack overflow
- Maintains security guarantees (functions still check auth context)

**Risks**:
- Must carefully validate function logic (no RLS safety net)
- Requires `GRANT EXECUTE` to appropriate roles

### Approach 2: Materialized Session Context (ALTERNATIVE)
Use session variables to cache user context:

```sql
-- Set on authentication
SET LOCAL app.user_id = '<uuid>';
SET LOCAL app.workspace_ids = '{uuid1,uuid2}';

-- Policies read from session
USING ("workspaceId" = ANY(current_setting('app.workspace_ids')::uuid[]))
```

**Benefits**:
- No subqueries, no recursion
- Fast (session variable read is O(1))

**Risks**:
- Must set session variables on every request
- Application layer responsible for correct values
- Bypasses database-level validation

### Approach 3: Simplified Policies Without Subqueries
Rewrite policies to avoid EXISTS/IN with other RLS-protected tables:

```sql
-- Instead of:
USING ("challengeId" IN (SELECT id FROM "Challenge" WHERE ...))

-- Use direct column checks:
USING (EXISTS (
  SELECT 1 FROM "Challenge" c
  WHERE c.id = "Activity"."challengeId"
  AND c."workspaceId" = ANY(current_setting('app.workspace_ids')::uuid[])
))
```

**Benefits**:
- Simplifies policy evaluation
- Reduces recursion depth

**Risks**:
- Requires session variable management
- Less flexible for complex authorization

## Recommended Fix: Hybrid Approach

1. **SECURITY DEFINER functions** for core auth checks:
   - `current_user_id()` - unchanged (simple query)
   - `is_workspace_admin(workspace_id)` - add SECURITY DEFINER
   - `is_workspace_manager(workspace_id)` - add SECURITY DEFINER
   - `is_assigned_to_challenge(challenge_id)` - add SECURITY DEFINER

2. **Remove `user_workspace_ids()` function** - causes most recursion:
   - Replace with direct `WorkspaceMembership` checks in policies
   - Add SECURITY DEFINER wrapper if needed

3. **Simplify nested EXISTS** in multi-table policies:
   - ActivitySubmission policies use direct joins, not nested EXISTS
   - Avoid querying tables with complex RLS in subqueries

## Implementation Plan

### Step 1: Create SECURITY DEFINER Wrappers
```sql
-- Drop existing functions
DROP FUNCTION IF EXISTS is_workspace_admin(UUID);
DROP FUNCTION IF EXISTS is_workspace_manager(UUID);
DROP FUNCTION IF EXISTS is_assigned_to_challenge(UUID);
DROP FUNCTION IF EXISTS user_workspace_ids();

-- Recreate with SECURITY DEFINER
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_workspace_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_workspace_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_assigned_to_challenge(UUID) TO authenticated;
```

### Step 2: Simplify Workspace Membership Policies
```sql
-- Remove user_workspace_ids() usage, use direct checks
ALTER TABLE "WorkspaceMembership" DISABLE ROW LEVEL SECURITY;

-- Recreate without recursion
ALTER TABLE "WorkspaceMembership" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "membership_select" ON "WorkspaceMembership" FOR SELECT
USING (
  "userId" = current_user_id()  -- Users see their own memberships
  OR EXISTS (
    SELECT 1 FROM "WorkspaceMembership" wm
    WHERE wm."workspaceId" = "WorkspaceMembership"."workspaceId"
    AND wm."userId" = current_user_id()
    AND wm.role = 'ADMIN'
  )
);
```
**Problem**: Still recursive! Need SECURITY DEFINER.

**Better approach**:
```sql
CREATE POLICY "membership_select" ON "WorkspaceMembership" FOR SELECT
USING ("userId" = current_user_id());  -- Only see own memberships
```

### Step 3: Rewrite Challenge Policies Without Subqueries
```sql
-- Instead of:
CREATE POLICY "challenge_select" ON "Challenge" FOR SELECT
USING ("workspaceId" IN (SELECT workspace_id FROM user_workspace_ids()));

-- Use:
CREATE POLICY "challenge_select" ON "Challenge" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMembership"
    WHERE "workspaceId" = "Challenge"."workspaceId"
    AND "userId" = current_user_id()
  )
);
```
**Still recursive!** WorkspaceMembership has RLS.

**Solution: SECURITY DEFINER function**:
```sql
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

-- Use in policies
CREATE POLICY "challenge_select" ON "Challenge" FOR SELECT
USING (user_can_access_workspace("workspaceId"));
```

### Step 4: Fix ActivitySubmission Multi-Role Policy
```sql
-- Simplified version without nested EXISTS
CREATE POLICY "submission_select" ON "ActivitySubmission" FOR SELECT
USING (
  "userId" = current_user_id()  -- Own submissions
  OR is_assigned_to_challenge((
    SELECT "challengeId" FROM "Activity" WHERE id = "activityId"
  ))  -- Assigned manager (SECURITY DEFINER)
  OR is_workspace_admin((
    SELECT c."workspaceId" FROM "Activity" a
    JOIN "Challenge" c ON c.id = a."challengeId"
    WHERE a.id = "activityId"
  ))  -- Workspace admin (SECURITY DEFINER)
);
```
**Problem**: Still queries Activity/Challenge with RLS.

**Solution: SECURITY DEFINER for entire check**:
```sql
CREATE OR REPLACE FUNCTION can_access_submission(submission_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_workspace_id UUID;
  v_challenge_id UUID;
BEGIN
  -- Get current user ID
  SELECT id INTO v_user_id FROM "User" WHERE "supabaseUserId" = auth.uid();

  -- Get submission details
  SELECT
    a."challengeId",
    c."workspaceId"
  INTO v_challenge_id, v_workspace_id
  FROM "ActivitySubmission" sub
  JOIN "Activity" a ON a.id = sub."activityId"
  JOIN "Challenge" c ON c.id = a."challengeId"
  WHERE sub.id = submission_id;

  -- Check access: own submission, assigned manager, or workspace admin
  RETURN (
    (SELECT "userId" FROM "ActivitySubmission" WHERE id = submission_id) = v_user_id
    OR EXISTS (
      SELECT 1 FROM "ChallengeAssignment"
      WHERE "challengeId" = v_challenge_id
      AND "managerId" = v_user_id
    )
    OR EXISTS (
      SELECT 1 FROM "WorkspaceMembership"
      WHERE "workspaceId" = v_workspace_id
      AND "userId" = v_user_id
      AND role = 'ADMIN'
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION can_access_submission(UUID) TO authenticated;

-- Simple policy
CREATE POLICY "submission_select" ON "ActivitySubmission" FOR SELECT
USING (can_access_submission(id));
```

## Files to Modify

1. **Create new migration**: `prisma/migrations/YYYYMMDDHHMMSS_fix_rls_circular_dependencies/migration.sql`
2. **Update documentation**: `docs/security/rls-policies.md`
3. **Update session file**: `.claude/sessions/session-20251027-task-30.3-rls-manager.md`

## Testing Strategy

1. Apply migration to local database
2. Run RLS test suite: `npx playwright test tests/security/rls-policies.spec.ts`
3. Verify 22/22 tests pass (not 1/22)
4. Check stack depth: Should complete without overflow errors
5. Performance check: Queries should complete in <100ms

## Success Criteria

- [ ] Zero stack overflow errors
- [ ] All 22 RLS tests passing
- [ ] Query performance <100ms per query
- [ ] SECURITY DEFINER functions properly secured
- [ ] Documentation updated with new approach

## Next Steps

1. Create migration with SECURITY DEFINER functions
2. Rewrite all policies to use helper functions
3. Test thoroughly with full RLS test suite
4. Update Task 30.4 to "READY" once policies fixed
5. Complete Phase 2 pre-merge verification (Task 30.6)

## References

- PostgreSQL RLS Documentation: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Stack Depth Configuration: https://www.postgresql.org/docs/current/runtime-config-resource.html#GUC-MAX-STACK-DEPTH
- SECURITY DEFINER: https://www.postgresql.org/docs/current/sql-createfunction.html

---

**Priority**: P0 - CRITICAL BLOCKER
**Estimate**: 3 hours (2h implementation, 1h testing)
**Assignee**: Claude Code
**Status**: Ready to implement
