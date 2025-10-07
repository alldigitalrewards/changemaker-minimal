-- Preview Deployment Database Verification Queries
-- Execute these queries against the Supabase production database
-- to verify the state after testing preview.changemaker.im
--
-- Database: Shared production Supabase instance (same as changemaker.im)
-- Date: 2025-10-07
-- Purpose: Verify multi-reward system, email changes, and test data

-- ============================================================================
-- Query 1: Recent Reward Issuances
-- ============================================================================
-- Check RewardIssuance records created today
-- Expected: Records from test cases with correct types and statuses

SELECT
  type,
  status,
  COUNT(*) as count,
  SUM(CASE WHEN type = 'MONETARY' THEN amount ELSE 0 END) as total_monetary_amount,
  MIN("createdAt") as first_created,
  MAX("createdAt") as last_created
FROM "RewardIssuance"
WHERE "createdAt" >= CURRENT_DATE
GROUP BY type, status
ORDER BY type, status;

-- Expected Results:
-- - type: POINTS, SKU, MONETARY
-- - status: PENDING, ISSUED, FAILED
-- - Counts should match test submissions approved today


-- ============================================================================
-- Query 2: Test Challenges Created Today
-- ============================================================================
-- Find challenges created during preview testing
-- Expected: Test challenges from Test Cases 4-6

SELECT
  id,
  title,
  "rewardType",
  "rewardConfig",
  "workspaceId",
  "createdAt",
  "updatedAt"
FROM "Challenge"
WHERE title LIKE '%Test [2025-10-07%'
   OR "createdAt" >= CURRENT_DATE
ORDER BY "createdAt" DESC
LIMIT 10;

-- Expected Results:
-- - "Points Test [2025-10-07-1615]" with rewardType = POINTS
-- - "SKU Test [2025-10-07-1615]" with rewardType = SKU
-- - "Monetary Test [2025-10-07-1615]" with rewardType = MONETARY
-- - rewardConfig JSON contains correct configuration for each type


-- ============================================================================
-- Query 3: Tenant Distribution and User Counts
-- ============================================================================
-- Verify multi-tenancy structure and user distribution
-- Expected: Users properly distributed across tenants

SELECT
  t.id as tenant_id,
  t.name as tenant_name,
  COUNT(u.id) as total_users,
  COUNT(CASE WHEN u.role = 'ADMIN' THEN 1 END) as admin_count,
  COUNT(CASE WHEN u.role = 'PARTICIPANT' THEN 1 END) as participant_count,
  MIN(u."createdAt") as first_user_created,
  MAX(u."createdAt") as last_user_created
FROM "Tenant" t
LEFT JOIN "User" u ON u."tenantId" = t.id
GROUP BY t.id, t.name
ORDER BY total_users DESC;

-- Expected Results:
-- - At least 2 tenants (alldigitalrewards, acme)
-- - Each tenant has both admins and participants
-- - No users with NULL tenantId


-- ============================================================================
-- Query 4: Email Change Pending States
-- ============================================================================
-- Check for users with pending email change requests
-- Expected: Only test email changes, or empty if cancelled

SELECT
  email,
  "emailChangePending",
  "updatedAt",
  "createdAt"
FROM "User"
WHERE "emailChangePending" IS NOT NULL
ORDER BY "updatedAt" DESC;

-- Expected Results:
-- - If Test Case 7 run without Test Case 8: One record with jfelke@alldigitalrewards.com
-- - emailChangePending JSON contains: {"newEmail": "test-preview-20251007@example.com", "token": "...", "expiresAt": "..."}
-- - If Test Case 8 completed: Empty result set (email change cancelled)


-- ============================================================================
-- Query 5: Test User Accounts Verification
-- ============================================================================
-- Verify test user accounts exist and are configured correctly
-- Expected: Both test users with correct roles and tenant assignments

SELECT
  u.id,
  u.email,
  u.role,
  u."tenantId",
  t.name as tenant_name,
  u."supabaseUserId",
  u."createdAt",
  u."updatedAt",
  u."emailChangePending" IS NOT NULL as has_pending_email_change
FROM "User" u
LEFT JOIN "Tenant" t ON u."tenantId" = t.id
WHERE u.email IN ('jfelke@alldigitalrewards.com', 'john.doe@acme.com')
ORDER BY u.email;

-- Expected Results:
-- jfelke@alldigitalrewards.com:
--   - role: ADMIN
--   - tenantId: alldigitalrewards tenant ID
--   - supabaseUserId: valid UUID
--
-- john.doe@acme.com:
--   - role: PARTICIPANT
--   - tenantId: acme tenant ID
--   - supabaseUserId: valid UUID


-- ============================================================================
-- Query 6: Recent Enrollments and Activities (Last 7 Days)
-- ============================================================================
-- Check recent challenge enrollments and activity submissions
-- Expected: Test enrollments from Test Case 14 with activities

SELECT
  e.id as enrollment_id,
  u.email as user_email,
  c.title as challenge_title,
  c."rewardType",
  e.status as enrollment_status,
  COUNT(DISTINCT a.id) as activity_count,
  COUNT(CASE WHEN a.status = 'APPROVED' THEN 1 END) as approved_activities,
  COUNT(CASE WHEN a.status = 'PENDING' THEN 1 END) as pending_activities,
  e."createdAt" as enrolled_at,
  MAX(a."submittedAt") as last_activity_at
FROM "Enrollment" e
JOIN "User" u ON e."userId" = u.id
JOIN "Challenge" c ON e."challengeId" = c.id
LEFT JOIN "ActivitySubmission" a ON a."enrollmentId" = e.id
WHERE e."createdAt" >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY e.id, u.email, c.title, c."rewardType", e.status, e."createdAt"
ORDER BY e."createdAt" DESC
LIMIT 20;

-- Expected Results:
-- - Recent enrollments from test cases
-- - Activity submissions linked to enrollments
-- - Approved activities should have corresponding RewardIssuance records


-- ============================================================================
-- Query 7: Workspace Membership Verification
-- ============================================================================
-- Verify workspace memberships and access control
-- Expected: Users correctly assigned to workspaces with proper roles

SELECT
  w.id as workspace_id,
  w.slug as workspace_slug,
  w.name as workspace_name,
  COUNT(DISTINCT wm."userId") as member_count,
  COUNT(DISTINCT c.id) as challenge_count,
  COUNT(DISTINCT e.id) as enrollment_count,
  MIN(wm."joinedAt") as first_member_joined,
  MAX(wm."joinedAt") as last_member_joined
FROM "Workspace" w
LEFT JOIN "WorkspaceMember" wm ON wm."workspaceId" = w.id
LEFT JOIN "Challenge" c ON c."workspaceId" = w.id
LEFT JOIN "Enrollment" e ON e."challengeId" = c.id
GROUP BY w.id, w.slug, w.name
ORDER BY member_count DESC;

-- Expected Results:
-- - Workspaces have members
-- - Workspaces have challenges
-- - Enrollments linked to workspace challenges


-- ============================================================================
-- Query 8: Reward Issuance Details (Last 7 Days)
-- ============================================================================
-- Detailed view of reward issuances with related data
-- Expected: Correct reward types, amounts, and statuses

SELECT
  ri.id,
  ri.type as reward_type,
  ri.status,
  ri.amount,
  ri.currency,
  ri."skuCode",
  ri."pointsAwarded",
  u.email as user_email,
  c.title as challenge_title,
  e.id as enrollment_id,
  ri."issuedAt",
  ri."createdAt"
FROM "RewardIssuance" ri
JOIN "User" u ON ri."userId" = u.id
JOIN "Enrollment" e ON ri."enrollmentId" = e.id
JOIN "Challenge" c ON e."challengeId" = c.id
WHERE ri."createdAt" >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY ri."createdAt" DESC
LIMIT 20;

-- Expected Results:
-- POINTS rewards:
--   - type: 'POINTS'
--   - pointsAwarded: value from challenge config
--   - amount, currency, skuCode: NULL
--
-- SKU rewards:
--   - type: 'SKU'
--   - skuCode: value from challenge config
--   - amount, currency, pointsAwarded: NULL
--
-- MONETARY rewards:
--   - type: 'MONETARY'
--   - amount: value from challenge config
--   - currency: 'USD' or other
--   - skuCode, pointsAwarded: NULL


-- ============================================================================
-- Query 9: Data Integrity Checks
-- ============================================================================
-- Verify referential integrity and data consistency
-- Expected: No orphaned records or integrity violations

-- Check for users without tenants (should be 0)
SELECT COUNT(*) as users_without_tenant
FROM "User"
WHERE "tenantId" IS NULL;

-- Check for challenges without workspaces (should be 0)
SELECT COUNT(*) as challenges_without_workspace
FROM "Challenge"
WHERE "workspaceId" IS NULL;

-- Check for enrollments with invalid user references (should be 0)
SELECT COUNT(*) as orphaned_enrollments
FROM "Enrollment" e
LEFT JOIN "User" u ON e."userId" = u.id
WHERE u.id IS NULL;

-- Check for enrollments with invalid challenge references (should be 0)
SELECT COUNT(*) as invalid_enrollments
FROM "Enrollment" e
LEFT JOIN "Challenge" c ON e."challengeId" = c.id
WHERE c.id IS NULL;

-- Check for reward issuances without valid user (should be 0)
SELECT COUNT(*) as orphaned_rewards
FROM "RewardIssuance" ri
LEFT JOIN "User" u ON ri."userId" = u.id
WHERE u.id IS NULL;

-- Expected Results:
-- All counts should be 0 (perfect referential integrity)


-- ============================================================================
-- Query 10: Performance and Activity Summary
-- ============================================================================
-- Overall system activity summary
-- Expected: Reasonable activity levels, no anomalies

SELECT
  'Users' as entity,
  COUNT(*) as total_count,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE THEN 1 END) as created_today,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as created_last_7_days
FROM "User"

UNION ALL

SELECT
  'Workspaces' as entity,
  COUNT(*) as total_count,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE THEN 1 END) as created_today,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as created_last_7_days
FROM "Workspace"

UNION ALL

SELECT
  'Challenges' as entity,
  COUNT(*) as total_count,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE THEN 1 END) as created_today,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as created_last_7_days
FROM "Challenge"

UNION ALL

SELECT
  'Enrollments' as entity,
  COUNT(*) as total_count,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE THEN 1 END) as created_today,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as created_last_7_days
FROM "Enrollment"

UNION ALL

SELECT
  'ActivitySubmissions' as entity,
  COUNT(*) as total_count,
  COUNT(CASE WHEN "submittedAt" >= CURRENT_DATE THEN 1 END) as created_today,
  COUNT(CASE WHEN "submittedAt" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as created_last_7_days
FROM "ActivitySubmission"

UNION ALL

SELECT
  'RewardIssuances' as entity,
  COUNT(*) as total_count,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE THEN 1 END) as created_today,
  COUNT(CASE WHEN "createdAt" >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as created_last_7_days
FROM "RewardIssuance"

ORDER BY entity;

-- Expected Results:
-- - Baseline activity levels
-- - Recent activity from testing
-- - No unexpected spikes or drops


-- ============================================================================
-- Execution Instructions
-- ============================================================================
--
-- 1. Connect to Supabase production database:
--    - Via Supabase Dashboard: https://supabase.com/dashboard/project/[project-id]/sql-editor
--    - Or via psql: psql "postgresql://..."
--
-- 2. Execute queries one by one or all at once
--
-- 3. Document results in PREVIEW_DEPLOYMENT_TEST_REPORT.md
--
-- 4. Compare actual results vs. expected results (documented in comments above)
--
-- 5. Flag any discrepancies or unexpected results
--
-- 6. Save results for audit trail
--
-- ============================================================================
-- End of Verification Queries
-- ============================================================================
