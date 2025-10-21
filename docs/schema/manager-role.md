# Manager Role Database Schema

**Last Updated**: October 20, 2025
**Status**: Implementation Ready
**Related Files**: `prisma/schema.prisma`, `.claude/memory/role-system-architecture.md`, `.claude/architecture/manager-assignment-strategy.md`

---

## Overview

This document describes the database schema changes required to implement the MANAGER role in the Changemaker platform. The manager role enables workspace-scoped users to review activity submissions for assigned challenges, with optional admin re-approval workflow.

## Schema Changes

### 1. Role Enum Enhancement

**File**: `prisma/schema.prisma` (lines 519-522)

**Before**:
```prisma
enum Role {
  ADMIN
  PARTICIPANT
}
```

**After**:
```prisma
enum Role {
  ADMIN
  PARTICIPANT
  MANAGER
}
```

**Impact**: Enables manager role assignment in WorkspaceMembership and User models.

---

### 2. SubmissionStatus Enum Enhancement

**File**: `prisma/schema.prisma` (lines 524-529)

**Before**:
```prisma
enum SubmissionStatus {
  PENDING
  APPROVED
  REJECTED
  DRAFT
}
```

**After**:
```prisma
enum SubmissionStatus {
  PENDING
  MANAGER_APPROVED  // Manager approved, awaiting admin re-approval
  NEEDS_REVISION    // Manager rejected, needs participant changes
  APPROVED
  REJECTED
  DRAFT
}
```

**Impact**: Supports multi-stage approval workflow.

**Status Transitions**:
```
PENDING
  ↓
MANAGER_APPROVED (if Challenge.requireAdminReapproval = true)
  OR
APPROVED (if Challenge.requireAdminReapproval = false)
  OR
NEEDS_REVISION (manager requests changes)
  OR
REJECTED (final rejection)
```

---

### 3. ActivitySubmission Model Enhancement

**File**: `prisma/schema.prisma` (lines 55-81)

**New Fields**:
```prisma
model ActivitySubmission {
  id             String           @id @default(dbgenerated("gen_random_uuid())) @db.Uuid
  activityId     String           @db.Uuid
  userId         String           @db.Uuid
  workspaceId    String           @db.Uuid
  status         SubmissionStatus @default(PENDING)
  textContent    String?
  linkUrl        String?
  fileUrls       String[]         @default([])
  submittedAt    DateTime         @default(now())

  // Manager review fields (NEW)
  managerReviewedBy  String?   @db.Uuid
  managerNotes       String?
  managerReviewedAt  DateTime?

  // Admin review fields (existing)
  reviewedBy     String?   @db.Uuid
  reviewNotes    String?
  reviewedAt     DateTime?
  pointsAwarded  Int?
  rewardIssued   Boolean   @default(false)
  rewardIssuanceId String? @db.Uuid

  // Relations
  Activity       Activity         @relation(fields: [activityId], references: [id], onDelete: Cascade)
  User           User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  Workspace      Workspace        @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  ManagerReviewer User?           @relation("ManagerReviews", fields: [managerReviewedBy], references: [id])
  AdminReviewer   User?           @relation("AdminReviews", fields: [reviewedBy], references: [id])

  @@index([activityId])
  @@index([userId, workspaceId])
  @@index([status, submittedAt])
  @@index([managerReviewedBy, managerReviewedAt]) // NEW - manager dashboard queries
}
```

**Field Descriptions**:
- `managerReviewedBy`: User ID of manager who reviewed (nullable, UUID)
- `managerNotes`: Manager's feedback text (nullable, unlimited length)
- `managerReviewedAt`: Timestamp of manager review (nullable, DateTime)

**Indexes**:
- `idx_submission_manager_review`: Optimizes manager dashboard queries filtering by managerId and review date

---

### 4. Challenge Model Enhancement

**File**: `prisma/schema.prisma` (lines 103-131)

**New Field**:
```prisma
model Challenge {
  id                  String         @id @default(dbgenerated("gen_random_uuid())) @db.Uuid
  title               String
  description         String
  startDate           DateTime
  endDate             DateTime
  enrollmentDeadline  DateTime?
  workspaceId         String         @db.Uuid
  rewardType          RewardType?
  rewardConfig        Json?
  emailEditAllowed    Boolean        @default(true)
  status              ChallengeStatus @default(DRAFT)

  // Manager workflow flag (NEW)
  requireAdminReapproval Boolean     @default(false)

  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  // Relations
  Workspace           Workspace      @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  Enrollment          Enrollment[]
  Activity            Activity[]
  ChallengeAssignments ChallengeAssignment[] // NEW

  @@index([workspaceId, status])
  @@index([startDate, endDate])
}
```

**Field Description**:
- `requireAdminReapproval`: Boolean flag (default: false)
  - `false`: Manager approval directly approves submission and issues reward
  - `true`: Manager approval sets MANAGER_APPROVED status, requires admin final approval

**Use Cases**:
- Set to `true` for high-value rewards or sensitive challenges
- Set to `false` for routine challenges where managers have full approval authority

---

### 5. ChallengeAssignment Model (NEW)

**File**: `prisma/schema.prisma` (new model)

**Complete Schema**:
```prisma
model ChallengeAssignment {
  id          String    @id @default(dbgenerated("gen_random_uuid())) @db.Uuid
  challengeId String    @db.Uuid
  managerId   String    @db.Uuid
  workspaceId String    @db.Uuid
  assignedAt  DateTime  @default(now())
  assignedBy  String    @db.Uuid

  // Relations
  Challenge   Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  Manager     User      @relation("ManagerAssignments", fields: [managerId], references: [id], onDelete: Cascade)
  AssignedBy  User      @relation("AssignmentCreator", fields: [assignedBy], references: [id])
  Workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  // Constraints
  @@unique([challengeId, managerId])
  @@index([managerId, workspaceId])
  @@index([challengeId])
}
```

**Field Descriptions**:
- `id`: Unique identifier for assignment record
- `challengeId`: Challenge being assigned (foreign key)
- `managerId`: User with MANAGER role being assigned (foreign key)
- `workspaceId`: Workspace for isolation (foreign key)
- `assignedAt`: Timestamp of assignment (audit trail)
- `assignedBy`: Admin who created assignment (foreign key)

**Constraints**:
- `@@unique([challengeId, managerId])`: Prevents duplicate assignments
- Cascade deletes: Assignment automatically deleted when challenge or manager user is deleted

**Indexes**:
- `idx_manager_workspace`: Fast lookup of all challenges assigned to a manager
- `idx_challenge`: Fast lookup of all managers assigned to a challenge

**Query Patterns**:
```typescript
// Get manager's assigned challenges
const assignments = await prisma.challengeAssignment.findMany({
  where: { managerId, workspaceId },
  include: { Challenge: true }
})

// Get managers for a challenge
const managers = await prisma.challengeAssignment.findMany({
  where: { challengeId },
  include: { Manager: true }
})

// Check if manager is assigned
const isAssigned = await prisma.challengeAssignment.findFirst({
  where: { challengeId, managerId }
})
```

---

### 6. ApprovalHistory Model (NEW)

**File**: `prisma/schema.prisma` (new model)

**Complete Schema**:
```prisma
model ApprovalHistory {
  id             String   @id @default(dbgenerated("gen_random_uuid())) @db.Uuid
  submissionId   String   @db.Uuid
  reviewerId     String   @db.Uuid
  reviewerRole   Role
  decision       String   // 'approved', 'rejected', 'needs_revision', 'override'
  notes          String?
  createdAt      DateTime @default(now())

  // Relations
  Submission     ActivitySubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  Reviewer       User               @relation(fields: [reviewerId], references: [id])

  @@index([submissionId, createdAt])
}
```

**Field Descriptions**:
- `submissionId`: Submission being reviewed (foreign key)
- `reviewerId`: User who made the decision (manager or admin)
- `reviewerRole`: Role of reviewer at time of decision (MANAGER or ADMIN)
- `decision`: Type of decision made (enum values as strings)
- `notes`: Review notes or feedback
- `createdAt`: Timestamp of decision (audit trail)

**Decision Values**:
- `'approved'`: Reviewer approved submission
- `'rejected'`: Reviewer rejected submission
- `'needs_revision'`: Manager requested changes
- `'override'`: Admin overrode previous manager decision

**Use Cases**:
- Audit trail for all approval decisions
- Admin can see full history of submission reviews
- Dispute resolution (track who approved/rejected and why)
- Compliance reporting

---

## Migration Strategy

### Step 1: Prepare Migration

```bash
# Generate migration file
pnpm prisma migrate dev --name add_manager_role --create-only

# Review generated SQL
cat prisma/migrations/XXXXXX_add_manager_role/migration.sql
```

### Step 2: Apply to Development

```bash
# Run migration
pnpm prisma migrate dev

# Regenerate Prisma Client
pnpm prisma generate

# Verify schema
pnpm prisma validate
```

### Step 3: Test Migration

```bash
# Run test suite
pnpm test

# Verify no regressions
pnpm build
```

### Step 4: Apply to Staging

```bash
# Deploy migration to staging database
pnpm prisma migrate deploy --preview-feature

# Verify staging application
curl https://staging.changemaker.im/api/health
```

### Step 5: Apply to Production

```bash
# Backup production database first
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Deploy migration
pnpm prisma migrate deploy

# Verify production health
curl https://changemaker.im/api/health
```

---

## Rollback Plan

### Safe Rollback (Within 24 Hours)

```sql
-- Rollback is safe because all changes are additive (no drops)
-- New fields are nullable or have defaults
-- Can simply not use new features

-- Optional: Remove new enum values (only if no data exists)
-- This would require custom SQL, not recommended
```

### Feature Flag Approach

Instead of database rollback, use environment variable:

```env
# .env.production
ENABLE_MANAGER_WORKFLOW=false
```

Application code checks this flag before allowing manager operations.

---

## Data Integrity Checks

### Post-Migration Validation Queries

```sql
-- Verify Role enum includes MANAGER
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'Role';
-- Expected: ADMIN, PARTICIPANT, MANAGER

-- Verify SubmissionStatus enum includes new values
SELECT enumlabel
FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'SubmissionStatus';
-- Expected: PENDING, MANAGER_APPROVED, NEEDS_REVISION, APPROVED, REJECTED, DRAFT

-- Verify new tables exist
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('ChallengeAssignment', 'ApprovalHistory');
-- Expected: 2 rows

-- Verify indexes were created
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('ActivitySubmission', 'ChallengeAssignment');
-- Expected: Multiple indexes including manager-specific ones

-- Verify new fields exist and are nullable
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'ActivitySubmission'
AND column_name IN ('managerReviewedBy', 'managerNotes', 'managerReviewedAt');
-- Expected: 3 rows, all nullable

-- Verify Challenge.requireAdminReapproval has correct default
SELECT column_name, column_default
FROM information_schema.columns
WHERE table_name = 'Challenge'
AND column_name = 'requireAdminReapproval';
-- Expected: default value 'false'
```

### Ongoing Health Checks

```sql
-- Check for orphaned assignments (manager user deleted but assignment remains)
-- Should be empty due to CASCADE delete
SELECT ca.id, ca.managerId
FROM "ChallengeAssignment" ca
LEFT JOIN "User" u ON ca.managerId = u.id
WHERE u.id IS NULL;

-- Check for assignments to non-MANAGER users
-- Should be empty (enforced by application logic)
SELECT ca.id, ca.managerId, u.role
FROM "ChallengeAssignment" ca
JOIN "User" u ON ca.managerId = u.id
WHERE u.role != 'MANAGER';

-- Check for manager-reviewed submissions where manager is not assigned
-- May have records if manager was unassigned after review (valid)
SELECT
  s.id,
  s.managerReviewedBy,
  a.challengeId,
  ca.id as assignment_id
FROM "ActivitySubmission" s
JOIN "Activity" a ON s.activityId = a.id
LEFT JOIN "ChallengeAssignment" ca ON ca.challengeId = a.challengeId AND ca.managerId = s.managerReviewedBy
WHERE s.managerReviewedBy IS NOT NULL
AND ca.id IS NULL;
```

---

## Performance Considerations

### Expected Query Volumes

- **Manager dashboard**: 10-100 requests/hour per manager (low frequency)
- **Assignment lookup**: 1-10 requests/second (moderate frequency, cached)
- **Submission review**: 1-50 requests/hour per workspace (low frequency)

### Index Usage Analysis

```sql
-- Verify index is being used for manager dashboard query
EXPLAIN ANALYZE
SELECT * FROM "ActivitySubmission"
WHERE "managerReviewedBy" = 'some-uuid'
AND "managerReviewedAt" > NOW() - INTERVAL '30 days'
ORDER BY "managerReviewedAt" DESC;
-- Should use idx_submission_manager_review

-- Verify index is being used for manager assignment lookup
EXPLAIN ANALYZE
SELECT * FROM "ChallengeAssignment"
WHERE "managerId" = 'some-uuid'
AND "workspaceId" = 'workspace-uuid';
-- Should use idx_manager_workspace
```

### Monitoring Recommendations

1. **Slow Query Log**: Monitor queries taking >100ms
2. **Index Hit Rate**: Should be >95% for manager-related queries
3. **Table Bloat**: Monitor ChallengeAssignment table growth (should be minimal)
4. **Cascade Delete Performance**: Monitor when challenges/users with many assignments are deleted

---

## Security Considerations

### Row-Level Security (Future Enhancement)

Currently, security is enforced at application layer. Future enhancement could add RLS policies:

```sql
-- Example RLS policy for ChallengeAssignment
ALTER TABLE "ChallengeAssignment" ENABLE ROW LEVEL SECURITY;

CREATE POLICY manager_view_own_assignments ON "ChallengeAssignment"
FOR SELECT
USING (
  "managerId" = current_setting('app.user_id')::uuid
  OR EXISTS (
    SELECT 1 FROM "WorkspaceMembership" wm
    WHERE wm."userId" = current_setting('app.user_id')::uuid
    AND wm."workspaceId" = "ChallengeAssignment"."workspaceId"
    AND wm.role = 'ADMIN'
  )
);
```

**Note**: RLS is not implemented in initial release. Application-layer checks in `requireManagerAccess()` are sufficient.

---

## Related Documentation

- [Manager API Endpoints](../api/manager-endpoints.md) - API routes using this schema
- [Manager Review Guide](../guides/manager-review-guide.md) - User-facing documentation
- [Manager Role Runbook](../deployment/manager-role-runbook.md) - Deployment procedures
- `.claude/memory/role-system-architecture.md` - Complete role system architecture
- `.claude/architecture/manager-assignment-strategy.md` - Assignment strategy decision rationale

---

## Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2025-10-20 | 1.0 | Initial schema design | Claude Code |

---

*This document is maintained in `docs/schema/manager-role.md` and should be updated when schema changes occur.*
