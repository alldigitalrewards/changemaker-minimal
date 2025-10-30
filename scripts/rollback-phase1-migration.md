# Phase 1 Migration Rollback Procedure

**Last Updated**: 2025-10-23
**Status**: DOCUMENTED - Ready for Testing
**Risk Level**: LOW (All changes are additive, no data loss)

---

## Overview

This document outlines the rollback procedure for the Phase 1 Manager Role migration. The migration is designed to be **safe and non-destructive** - all changes are additive (new columns are nullable, new enum values don't affect existing data).

## Rollback Strategy

### Option 1: Feature Flag Rollback (RECOMMENDED)

**Advantages**:
- No database schema changes required
- Instant rollback via environment variable
- Can be toggled without deployment
- Zero data loss
- Safe for production

**Procedure**:
```bash
# 1. Set feature flag to disable manager functionality
# In Vercel environment variables:
ENABLE_MANAGER_WORKFLOW=false

# 2. Redeploy application (or feature flags are hot-reloaded)
vercel deploy

# 3. Verify manager UI/API endpoints return 404 or disabled message
curl https://staging.changemaker.im/api/workspaces/acme/manager/queue
# Expected: 404 or "Feature disabled"
```

**Application Code Pattern**:
```typescript
// lib/feature-flags.ts
export const ENABLE_MANAGER_WORKFLOW = process.env.ENABLE_MANAGER_WORKFLOW === 'true'

// middleware.ts or API routes
if (!ENABLE_MANAGER_WORKFLOW) {
  return NextResponse.json(
    { error: 'Manager workflow not enabled' },
    { status: 404 }
  )
}
```

---

### Option 2: Schema Rollback (NOT RECOMMENDED)

**Warning**: Only use if absolutely necessary. Feature flag rollback is safer.

**Advantages**:
- Complete removal of schema changes
- Database returns to pre-migration state

**Disadvantages**:
- Loses all ChallengeAssignment data
- Loses all manager review history
- Cannot rollback enum values safely (PostgreSQL limitation)
- Requires downtime

**Procedure**:

#### Step 1: Backup Database

```bash
# Production database backup
pg_dump $DATABASE_URL > backup_pre_rollback_$(date +%Y%m%d_%H%M%S).sql

# Verify backup file size
ls -lh backup_pre_rollback_*.sql
```

#### Step 2: Prepare Rollback SQL

```sql
-- rollback-phase1.sql
-- CAUTION: This will delete data

BEGIN;

-- 1. Drop ChallengeAssignment table (loses assignment data)
DROP TABLE IF EXISTS "ChallengeAssignment" CASCADE;

-- 2. Remove new ActivitySubmission columns
ALTER TABLE "ActivitySubmission"
  DROP COLUMN IF EXISTS "managerReviewedBy",
  DROP COLUMN IF EXISTS "managerNotes",
  DROP COLUMN IF EXISTS "managerReviewedAt";

-- 3. Remove Challenge.requireAdminReapproval column
ALTER TABLE "Challenge"
  DROP COLUMN IF EXISTS "requireAdminReapproval";

-- 4. WARNING: Cannot safely remove enum values in PostgreSQL
-- Enum values (MANAGER, MANAGER_APPROVED, NEEDS_REVISION) will remain
-- but unused. This is safe and expected.

-- 5. Reset any submissions with new statuses back to PENDING
UPDATE "ActivitySubmission"
SET status = 'PENDING'
WHERE status IN ('MANAGER_APPROVED', 'NEEDS_REVISION');

COMMIT;
```

#### Step 3: Execute Rollback (With Extreme Caution)

```bash
# 1. Stop application (prevent new writes)
vercel env rm ENABLE_MANAGER_WORKFLOW

# 2. Apply rollback SQL
psql $DATABASE_URL < scripts/rollback-phase1.sql

# 3. Verify rollback
psql $DATABASE_URL < scripts/verify-rollback-phase1.sql

# 4. Redeploy application with pre-migration code
git checkout <commit-before-migration>
vercel deploy --prod
```

---

## Rollback Verification Script

**File**: `scripts/verify-rollback-phase1.sql`

```sql
-- Verify Phase 1 rollback was successful

-- 1. ChallengeAssignment table should not exist
SELECT
  'ChallengeAssignment Removed' as test_name,
  CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = 'ChallengeAssignment'
    ) THEN 'PASS ✓'
    ELSE 'FAIL ✗ (Table still exists)'
  END as status;

-- 2. ActivitySubmission manager columns should not exist
SELECT
  'Manager Columns Removed' as test_name,
  CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'ActivitySubmission'
        AND column_name IN ('managerReviewedBy', 'managerNotes', 'managerReviewedAt')
    ) THEN 'PASS ✓'
    ELSE 'FAIL ✗ (Columns still exist)'
  END as status;

-- 3. Challenge.requireAdminReapproval should not exist
SELECT
  'Challenge Field Removed' as test_name,
  CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'Challenge'
        AND column_name = 'requireAdminReapproval'
    ) THEN 'PASS ✓'
    ELSE 'FAIL ✗ (Column still exists)'
  END as status;

-- 4. No submissions should have manager statuses
SELECT
  'Submission Statuses Reset' as test_name,
  CASE
    WHEN NOT EXISTS (
      SELECT 1
      FROM "ActivitySubmission"
      WHERE status IN ('MANAGER_APPROVED', 'NEEDS_REVISION')
    ) THEN 'PASS ✓'
    ELSE CONCAT('FAIL ✗ (', (
      SELECT COUNT(*)
      FROM "ActivitySubmission"
      WHERE status IN ('MANAGER_APPROVED', 'NEEDS_REVISION')
    ), ' submissions still have manager statuses)')
  END as status;

-- 5. Enum values will remain (expected, cannot remove safely)
SELECT
  'Enum Values (Expected to Remain)' as test_name,
  'INFO: MANAGER, MANAGER_APPROVED, NEEDS_REVISION enum values remain but unused' as status;
```

---

## Rollback Testing Procedure

### Pre-Rollback State Capture

```bash
# 1. Capture current data counts
psql $STAGING_URL -c "
  SELECT
    'Pre-Rollback State' as phase,
    (SELECT COUNT(*) FROM \"User\") as users,
    (SELECT COUNT(*) FROM \"Challenge\") as challenges,
    (SELECT COUNT(*) FROM \"ActivitySubmission\") as submissions,
    (SELECT COUNT(*) FROM \"ChallengeAssignment\") as assignments;
"

# 2. Export ChallengeAssignment data (if exists)
psql $STAGING_URL -c "
  COPY \"ChallengeAssignment\" TO STDOUT WITH CSV HEADER;
" > pre_rollback_assignments.csv
```

### Rollback Execution (Staging Environment)

```bash
# 1. Backup staging database
pg_dump $STAGING_URL > backup_staging_$(date +%Y%m%d_%H%M%S).sql

# 2. Execute rollback
psql $STAGING_URL < scripts/rollback-phase1.sql

# 3. Verify rollback
psql $STAGING_URL < scripts/verify-rollback-phase1.sql

# 4. Verify application still works
curl https://staging.changemaker.im/api/health
curl https://staging.changemaker.im/api/workspaces/acme/challenges
```

### Post-Rollback Verification

```bash
# 1. Check data integrity
psql $STAGING_URL -c "
  SELECT
    'Post-Rollback State' as phase,
    (SELECT COUNT(*) FROM \"User\") as users,
    (SELECT COUNT(*) FROM \"Challenge\") as challenges,
    (SELECT COUNT(*) FROM \"ActivitySubmission\") as submissions;
"

# 2. Verify no data loss (users, challenges, submissions should match)
# 3. Verify application functionality (smoke tests)

# 4. Test re-applying migration (if needed)
pnpm prisma migrate deploy
```

---

## Risk Assessment

### Low Risk (Feature Flag Rollback)
- ✅ No database changes
- ✅ Instant rollback
- ✅ No data loss
- ✅ Can toggle on/off
- ⚠️ Requires application code support

### Medium Risk (Schema Rollback)
- ⚠️ Loses ChallengeAssignment data
- ⚠️ Loses manager review history
- ⚠️ Cannot remove enum values (PostgreSQL limitation)
- ⚠️ Requires downtime
- ✅ Clean slate for re-migration

---

## Recommendation

**Use Option 1: Feature Flag Rollback**

Reasons:
1. Phase 1 changes are additive and safe
2. No user-facing features deployed yet (UI comes in Phase 2)
3. Zero data loss
4. Can re-enable instantly if needed
5. Database schema stays forward-compatible

**When to use Option 2: Schema Rollback**
- Critical bug in migration SQL
- Database performance degradation
- Must return to exact pre-migration state

---

## Rollback Decision Tree

```
Is there a critical blocker?
├─ Yes → Use Feature Flag Rollback (Option 1)
│   ├─ Monitor for 24 hours
│   ├─ If issue resolved → Re-enable feature flag
│   └─ If issue persists → Evaluate schema rollback
└─ No → Continue with Phase 2
```

---

## Rollback Success Criteria

After rollback (either method):

- [ ] Application builds successfully
- [ ] All existing tests pass (51/51 original tests)
- [ ] No new errors in staging logs
- [ ] API endpoints return expected responses
- [ ] Database queries perform normally
- [ ] Can re-apply migration if needed

---

## Testing Checklist

Before approving Phase 1:

- [ ] Run verification SQL on staging (`scripts/verify-phase1-migration.sql`)
- [ ] All verification checks return PASS ✓
- [ ] Test feature flag rollback on staging clone
- [ ] Verify application works with feature flag disabled
- [ ] Document rollback procedure (this file)
- [ ] Team sign-off on rollback plan

---

## Rollback Contacts

**On-Call**: Claude Code (automated testing)
**Database Admin**: Review with team lead before production rollback
**Deployment**: Vercel automated deployments

---

**Last Tested**: [Not tested - requires staging clone]
**Next Review**: Before Phase 2 deployment
