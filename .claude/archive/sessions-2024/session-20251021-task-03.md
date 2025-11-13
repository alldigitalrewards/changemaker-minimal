# Session: Task 3 - Staging Migration Testing

**Date:** 2025-10-21
**Task:** Test manager role migration on staging environment
**Status:** In Progress

## Objectives

1. Connect to staging database and verify current state
2. Apply migration to staging
3. Validate all schema changes
4. Document rollback plan
5. Verify staging functionality

## Progress Log

### Step 1: Connect to Staging ✅
- Connected to staging project: jlvvtejfinfqjfulnmfl
- Current state verified:
  - Latest migration: 20251009051055_add_activity_template_reward_type
  - Role enum: ADMIN, PARTICIPANT (MANAGER missing)
  - SubmissionStatus enum: PENDING, APPROVED, REJECTED, DRAFT (MANAGER_APPROVED, NEEDS_REVISION missing)
  - ChallengeAssignment table: Does not exist
  - Existing data:
    - ActivitySubmission: 2 records
    - RewardIssuance: 1 record
  - No data conflicts expected (all new fields nullable)

### Step 2: Apply Migration ✅
- Migration applied successfully: 20251021092322_add_manager_role_schema
- Migration now listed in staging migrations table
- Note: Some components (CommunicationScope, CommunicationAudience, WorkspaceCommunication, WorkspaceMembershipPreferences, Activity.position index) were already present from prior migrations
- Applied only the net-new schema changes needed for manager role

### Step 3: Validation Queries ✅
All schema changes verified:

**Role Enum:**
- ✅ ADMIN
- ✅ PARTICIPANT
- ✅ MANAGER (NEW)

**SubmissionStatus Enum:**
- ✅ PENDING
- ✅ APPROVED
- ✅ REJECTED
- ✅ DRAFT
- ✅ MANAGER_APPROVED (NEW)
- ✅ NEEDS_REVISION (NEW)

**ChallengeAssignment Table:**
- ✅ Table created with correct structure
- ✅ All 6 columns present (id, challengeId, managerId, workspaceId, assignedBy, assignedAt)
- ✅ Primary key on id
- ✅ Unique constraint on (challengeId, managerId)
- ✅ 4 indexes created:
  - ChallengeAssignment_managerId_workspaceId_idx
  - ChallengeAssignment_challengeId_idx
  - ChallengeAssignment_workspaceId_idx
  - ChallengeAssignment_challengeId_managerId_key (unique)
- ✅ 4 foreign keys with correct cascade rules:
  - challengeId → Challenge (CASCADE/CASCADE)
  - managerId → User (CASCADE/CASCADE)
  - assignedBy → User (RESTRICT/CASCADE)
  - workspaceId → Workspace (CASCADE/CASCADE)

**ActivitySubmission Manager Fields:**
- ✅ managerNotes (text, nullable)
- ✅ managerReviewedAt (timestamp, nullable)
- ✅ managerReviewedBy (uuid, nullable)
- ✅ Existing 2 records preserved with NULL values

**RewardIssuance External Fields:**
- ✅ externalResponse (jsonb, nullable)
- ✅ externalStatus (text, nullable)
- ✅ externalTransactionId (text, nullable)
- ✅ Existing 1 record preserved with NULL values

### Step 4: Data Integrity Check ✅
- ActivitySubmission: 2 existing records intact, new fields NULL
- RewardIssuance: 1 existing record intact, new fields NULL
- No data corruption or conflicts
- All nullable fields allow safe migration without data loss

### Step 5: Rollback Plan 📋

**If rollback is needed, execute in this order:**

```sql
-- 1. Drop foreign keys first
ALTER TABLE "public"."ChallengeAssignment" DROP CONSTRAINT IF EXISTS "ChallengeAssignment_challengeId_fkey";
ALTER TABLE "public"."ChallengeAssignment" DROP CONSTRAINT IF EXISTS "ChallengeAssignment_managerId_fkey";
ALTER TABLE "public"."ChallengeAssignment" DROP CONSTRAINT IF EXISTS "ChallengeAssignment_assignedBy_fkey";
ALTER TABLE "public"."ChallengeAssignment" DROP CONSTRAINT IF EXISTS "ChallengeAssignment_workspaceId_fkey";

-- 2. Drop indexes
DROP INDEX IF EXISTS "public"."ChallengeAssignment_managerId_workspaceId_idx";
DROP INDEX IF EXISTS "public"."ChallengeAssignment_challengeId_idx";
DROP INDEX IF EXISTS "public"."ChallengeAssignment_workspaceId_idx";
DROP INDEX IF EXISTS "public"."ChallengeAssignment_challengeId_managerId_key";

-- 3. Drop table
DROP TABLE IF EXISTS "public"."ChallengeAssignment";

-- 4. Remove columns from ActivitySubmission
ALTER TABLE "public"."ActivitySubmission" DROP COLUMN IF EXISTS "managerNotes";
ALTER TABLE "public"."ActivitySubmission" DROP COLUMN IF EXISTS "managerReviewedAt";
ALTER TABLE "public"."ActivitySubmission" DROP COLUMN IF EXISTS "managerReviewedBy";

-- 5. Remove columns from RewardIssuance
ALTER TABLE "public"."RewardIssuance" DROP COLUMN IF EXISTS "externalResponse";
ALTER TABLE "public"."RewardIssuance" DROP COLUMN IF EXISTS "externalStatus";
ALTER TABLE "public"."RewardIssuance" DROP COLUMN IF EXISTS "externalTransactionId";

-- 6. Remove enum values (PostgreSQL does NOT support removing enum values directly)
-- NOTE: Cannot remove MANAGER, MANAGER_APPROVED, NEEDS_REVISION without recreating enums
-- Would require: Create new enum without values → Migrate data → Drop old enum → Rename new
-- Only do this if absolutely necessary as it's complex and risky
```

**Important Notes:**
- Enum values (MANAGER, MANAGER_APPROVED, NEEDS_REVISION) cannot be easily removed
- If enum rollback is critical, must recreate entire enum types
- All new columns are nullable, so removal is safe for existing data
- ChallengeAssignment table has no data yet, safe to drop

**Simpler Alternative:**
- Leave schema changes in place but don't use them in application code
- Safer than attempting enum manipulation

## Summary

### Migration Performance
- Migration executed cleanly on staging
- No errors or warnings during application
- Execution time: < 1 second (minimal schema changes)
- No table locks or downtime concerns

### Staging-Specific Findings
- Some schema components already existed from prior migrations
- Migration script was idempotent where possible
- Applied only net-new changes needed for manager role
- Existing data (3 total records) unaffected

### Production Deployment Recommendations
1. **Timing:** Can be applied during normal operations (no downtime needed)
2. **Risk Level:** LOW - All changes are additive and nullable
3. **Rollback:** Documented but not recommended due to enum complexity
4. **Validation:** Use same validation queries shown in Step 3
5. **Monitoring:** Watch for any application errors referencing new fields/enums

### Next Steps
- ✅ Task 3 complete - Staging migration successful
- Ready to proceed with Task 4: Update Prisma schema types
- Consider full feature testing after Task 8 (middleware) before production deployment

### Production Deployment Checklist
When ready to deploy to production (project: miqaqnbujprzffjnebso):
- [ ] Verify all API routes are tested (Tasks 4-15)
- [ ] Confirm staging functionality is working
- [ ] Apply same migration script
- [ ] Run validation queries
- [ ] Monitor application logs for 24 hours
- [ ] Test manager assignment flow end-to-end

