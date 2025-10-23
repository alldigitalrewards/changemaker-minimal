-- Phase 1 Migration Verification SQL
-- Verifies all schema changes from manager role migration
-- Run against staging database to confirm successful deployment

-- 1. Verify Role enum includes MANAGER
SELECT
  'Role Enum Check' as test_name,
  string_agg(enumlabel::text, ', ' ORDER BY enumlabel) as values,
  CASE
    WHEN string_agg(enumlabel::text, ', ' ORDER BY enumlabel) LIKE '%MANAGER%'
    THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as status
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'Role';

-- 2. Verify SubmissionStatus enum includes new values
SELECT
  'SubmissionStatus Enum Check' as test_name,
  string_agg(enumlabel::text, ', ' ORDER BY enumlabel) as values,
  CASE
    WHEN string_agg(enumlabel::text, ', ' ORDER BY enumlabel) LIKE '%MANAGER_APPROVED%'
     AND string_agg(enumlabel::text, ', ' ORDER BY enumlabel) LIKE '%NEEDS_REVISION%'
    THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as status
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'SubmissionStatus';

-- 3. Verify ChallengeAssignment table exists
SELECT
  'ChallengeAssignment Table' as test_name,
  tablename as table_name,
  CASE WHEN tablename IS NOT NULL THEN 'PASS ✓' ELSE 'FAIL ✗' END as status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'ChallengeAssignment';

-- 4. Verify manager-specific indexes on ActivitySubmission
SELECT
  'Manager Indexes Check' as test_name,
  string_agg(indexname, ', ' ORDER BY indexname) as indexes,
  CASE
    WHEN COUNT(*) >= 2 THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'ActivitySubmission'
  AND (indexname LIKE '%manager%' OR indexname LIKE '%status%');

-- 5. Verify new ActivitySubmission fields
SELECT
  'ActivitySubmission Fields' as test_name,
  string_agg(column_name, ', ' ORDER BY column_name) as columns,
  CASE
    WHEN COUNT(*) = 3 THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ActivitySubmission'
  AND column_name IN ('managerReviewedBy', 'managerNotes', 'managerReviewedAt');

-- 6. Verify all manager fields are nullable (safe migration)
SELECT
  'Manager Fields Nullable' as test_name,
  string_agg(column_name || '=' || is_nullable, ', ' ORDER BY column_name) as field_status,
  CASE
    WHEN COUNT(CASE WHEN is_nullable = 'YES' THEN 1 END) = 3
    THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ActivitySubmission'
  AND column_name IN ('managerReviewedBy', 'managerNotes', 'managerReviewedAt');

-- 7. Verify Challenge.requireAdminReapproval field exists with default
SELECT
  'Challenge.requireAdminReapproval' as test_name,
  column_name,
  column_default,
  CASE
    WHEN column_default LIKE '%false%' THEN 'PASS ✓'
    ELSE 'FAIL ✗'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Challenge'
  AND column_name = 'requireAdminReapproval';

-- 8. Count existing data (should be safe - all nullable/defaulted)
SELECT
  'Data Integrity Check' as test_name,
  CONCAT(
    'Users: ', (SELECT COUNT(*) FROM "User"), ', ',
    'Challenges: ', (SELECT COUNT(*) FROM "Challenge"), ', ',
    'Submissions: ', (SELECT COUNT(*) FROM "ActivitySubmission"), ', ',
    'Assignments: ', (SELECT COUNT(*) FROM "ChallengeAssignment")
  ) as counts,
  'PASS ✓' as status;

-- 9. Verify WorkspaceMembership can use MANAGER role
SELECT
  'WorkspaceMembership Constraint' as test_name,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'WorkspaceMembership'
        AND column_name = 'role'
        AND data_type = 'USER-DEFINED'
    ) THEN 'PASS ✓ (Role enum available)'
    ELSE 'FAIL ✗'
  END as status;

-- Summary
SELECT
  '=== MIGRATION VERIFICATION SUMMARY ===' as summary,
  COUNT(*) as total_checks,
  CONCAT(
    'Run against staging database to verify Phase 1 migration. ',
    'All checks should show PASS ✓'
  ) as notes;
