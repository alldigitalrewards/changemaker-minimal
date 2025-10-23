# Submission Approval Flow (Current & Proposed)

## Current Approval Flow

### Step 1: Participant Submits Activity
**Endpoint**: POST `/api/workspaces/[slug]/submissions`
**Function**: `createActivitySubmission()` (lib/db/queries.ts:1388-1467)

```typescript
const submission = await prisma.activitySubmission.create({
  data: {
    id: crypto.randomUUID(),
    activityId,
    userId,
    workspaceId,
    status: 'PENDING',  // ← Always starts here
    textContent,
    linkUrl,
    fileUrls,
    submittedAt: new Date()
  }
})
```

**ActivityEvent Logged**: `SUBMISSION_CREATED`

### Step 2: Admin Reviews Submission
**UI**: app/w/[slug]/admin/challenges/[id]/submissions/page.tsx
**Component**: SubmissionReviewButton (lines 19-194)

**Endpoint**: POST `/api/workspaces/[slug]/submissions/[id]/review`
**Handler**: app/api/workspaces/[slug]/submissions/[id]/review/route.ts

**Auth**: `requireWorkspaceAdmin(slug)` - ADMIN role required

**Payload**:
```typescript
{
  status: 'APPROVED' | 'REJECTED',
  reviewNotes?: string,
  pointsAwarded: number,
  reward?: {
    type: 'points' | 'sku' | 'monetary',
    amount?: number,
    currency?: string,
    skuId?: string
  }
}
```

### Step 3: reviewActivitySubmission()
**Function**: lib/db/queries.ts:1468-1505

```typescript
export async function reviewActivitySubmission(
  submissionId: string,
  reviewData: {
    status: 'APPROVED' | 'REJECTED' | 'PENDING' | 'DRAFT'
    pointsAwarded?: number | null
    reviewedBy: string
    reviewNotes?: string | null
  },
  workspaceId: string
) {
  // Update submission status + review fields
  const submission = await prisma.activitySubmission.update({
    where: { id: submissionId },
    data: {
      status: reviewData.status,
      pointsAwarded: reviewData.pointsAwarded ?? null,
      reviewedBy: reviewData.reviewedBy,
      reviewNotes: reviewData.reviewNotes ?? null,
      reviewedAt: new Date()
    },
    include: {
      Activity: {
        include: {
          Challenge: true,
          ActivityTemplate: true
        }
      },
      User: true
    }
  })

  return submission
}
```

**Note**: Does NOT issue rewards directly, just updates status

### Step 4: issueReward() (If Approved)
**Function**: lib/db/queries.ts:2351-2420

**Called By**: Review endpoint (app/api/workspaces/[slug]/submissions/[id]/review/route.ts:90)

```typescript
if (status === 'APPROVED' && reward) {
  await issueReward({
    userId: submission.userId,
    workspaceId,
    challengeId: submission.Activity.challengeId,
    submissionId: submission.id,
    type: reward.type,
    amount: reward.amount,
    currency: reward.currency,
    skuId: reward.skuId
  })
}
```

**Reward Behavior**:
- **Points**: Synchronous via `awardPointsWithBudget()` (atomic transaction)
- **SKU/Monetary**: Creates `PENDING` RewardIssuance record (no fulfillment logic exists)

**ActivityEvent Logged**: `SUBMISSION_APPROVED` or `SUBMISSION_REJECTED`

## Current Status Transitions

```
DRAFT (not used)
  ↓
PENDING (initial)
  ↓
APPROVED ──→ issueReward() ──→ Points awarded immediately
  OR
REJECTED (final)
```

**Enum** (prisma/schema.prisma:524-529):
```prisma
enum SubmissionStatus {
  PENDING
  APPROVED
  REJECTED
  DRAFT
}
```

## Current Database Schema

### ActivitySubmission Model (prisma/schema.prisma:55-81)
```prisma
model ActivitySubmission {
  id             String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  activityId     String           @db.Uuid
  userId         String           @db.Uuid
  workspaceId    String           @db.Uuid
  status         SubmissionStatus @default(PENDING)
  textContent    String?
  linkUrl        String?
  fileUrls       String[]         @default([])
  submittedAt    DateTime         @default(now())

  // Review fields (ADMIN-level)
  reviewedBy     String?          @db.Uuid
  reviewNotes    String?
  reviewedAt     DateTime?
  pointsAwarded  Int?
  rewardIssued   Boolean          @default(false)
  rewardIssuanceId String?        @db.Uuid

  // Relations
  Activity       Activity         @relation(...)
  User           User             @relation(...)
  Workspace      Workspace        @relation(...)

  @@index([activityId])
  @@index([userId, workspaceId])
  @@index([status, submittedAt])
}
```

**Missing Manager Fields**:
- No `managerReviewedBy`
- No `managerNotes`
- No `managerReviewedAt`
- No `MANAGER_APPROVED` or `NEEDS_REVISION` status

### Challenge Model (prisma/schema.prisma:103-131)
```prisma
model Challenge {
  id                  String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
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
  createdAt           DateTime       @default(now())
  updatedAt           DateTime       @updatedAt

  // Relations
  Workspace           Workspace      @relation(...)
  Enrollment          Enrollment[]
  Activity            Activity[]

  @@index([workspaceId, status])
  @@index([startDate, endDate])
}
```

**Missing Manager Field**:
- No `requireAdminReapproval` boolean flag
- No manager assignment tracking (see architecture/manager-assignment-strategy.md)

## Proposed Manager Approval Flow

### New Status Enum
```prisma
enum SubmissionStatus {
  PENDING          // Initial state
  MANAGER_APPROVED // Manager approved, awaiting admin (if required)
  NEEDS_REVISION   // Manager rejected, needs participant fix
  APPROVED         // Final approval (admin or manager)
  REJECTED         // Final rejection (admin only)
  DRAFT
}
```

### Flow Diagram

```
Participant submits
       ↓
   PENDING
       ↓
   [Manager assigned to challenge?]
       ↓           ↓
      YES          NO
       ↓           ↓
  Manager Review   Admin Review
       ↓               ↓
  ┌────┴────┬─────────┴─────────┐
  ↓         ↓                    ↓
Approve   Reject             Approve/Reject
  ↓         ↓                    ↓
[requireAdminReapproval?]   APPROVED/REJECTED
  ↓         ↓                    ↓
 YES       NO                Issue Reward
  ↓         ↓
MANAGER_   APPROVED
APPROVED    ↓
  ↓      Issue Reward
Admin Review
  ↓
Approve/Reject
  ↓
APPROVED/REJECTED
  ↓
Issue Reward
```

### Detailed Steps

#### 1. Submission Created
```typescript
const submission = await prisma.activitySubmission.create({
  data: {
    status: 'PENDING',
    // ... other fields
  }
})

// Check if manager assigned
const assignment = await prisma.challengeAssignment.findFirst({
  where: { challengeId: submission.Activity.challengeId }
})

// Send notification
if (assignment) {
  await sendManagerNotification(assignment.managerId, submission)
} else {
  await sendAdminNotification(submission)
}
```

#### 2. Manager Reviews (If Assigned)
**New Endpoint**: POST `/api/workspaces/[slug]/submissions/[id]/manager-review`
**Auth**: `requireWorkspaceManager(slug)` - MANAGER or ADMIN role

**Payload**:
```typescript
{
  action: 'approve' | 'reject' | 'needs_revision',
  managerNotes: string,
  pointsRecommendation?: number  // Optional suggestion for admin
}
```

**Logic**:
```typescript
export async function managerReviewSubmission(
  submissionId: string,
  managerData: {
    action: 'approve' | 'reject' | 'needs_revision'
    managerNotes: string
    managerId: string
  },
  workspaceId: string
) {
  const submission = await prisma.activitySubmission.findFirst({
    where: { id: submissionId, workspaceId },
    include: { Activity: { include: { Challenge: true } } }
  })

  // Verify manager is assigned to this challenge
  const isAssigned = await prisma.challengeAssignment.findFirst({
    where: {
      challengeId: submission.Activity.challengeId,
      managerId: managerData.managerId
    }
  })

  if (!isAssigned) {
    throw new Error('Manager not assigned to this challenge')
  }

  // Update submission
  const updated = await prisma.activitySubmission.update({
    where: { id: submissionId },
    data: {
      managerReviewedBy: managerData.managerId,
      managerNotes: managerData.managerNotes,
      managerReviewedAt: new Date(),
      status: managerData.action === 'approve'
        ? (submission.Activity.Challenge.requireAdminReapproval
            ? 'MANAGER_APPROVED'  // ← Admin will review
            : 'APPROVED')         // ← Final approval
        : managerData.action === 'needs_revision'
        ? 'NEEDS_REVISION'
        : 'REJECTED'
    }
  })

  // If direct approval (no admin required), issue reward
  if (updated.status === 'APPROVED') {
    await issueReward({ ... })
  }

  // If needs admin review, notify admin
  if (updated.status === 'MANAGER_APPROVED') {
    await sendAdminReapprovalNotification(updated)
  }

  // If needs revision, notify participant
  if (updated.status === 'NEEDS_REVISION') {
    await sendParticipantRevisionNotification(updated)
  }

  return updated
}
```

**ActivityEvent Logged**:
- `SUBMISSION_MANAGER_APPROVED`
- `SUBMISSION_MANAGER_REJECTED`
- `SUBMISSION_NEEDS_REVISION`

#### 3. Admin Reviews (If Required)
**Endpoint**: POST `/api/workspaces/[slug]/submissions/[id]/review` (existing, enhanced)

**New Logic**:
```typescript
// Admin can review PENDING or MANAGER_APPROVED submissions
if (submission.status === 'MANAGER_APPROVED') {
  // Admin is doing final review
  // Can override manager decision
  await logActivityEvent({
    type: 'ADMIN_OVERRIDE_MANAGER',
    metadata: {
      managerDecision: submission.managerNotes,
      adminDecision: reviewData.reviewNotes
    }
  })
}

// Update to final status
await reviewActivitySubmission(submissionId, {
  status: 'APPROVED' | 'REJECTED',
  reviewedBy: adminUserId,
  reviewNotes
})

if (status === 'APPROVED') {
  await issueReward({ ... })
}
```

**Admin Override**: Admin can always change status, even after manager approval

## New Database Fields Required

### ActivitySubmission Additions
```prisma
model ActivitySubmission {
  // ... existing fields ...

  // Manager review fields
  managerReviewedBy  String?   @db.Uuid
  managerNotes       String?
  managerReviewedAt  DateTime?

  // Admin review fields (existing, keep for final review)
  reviewedBy     String?   @db.Uuid
  reviewNotes    String?
  reviewedAt     DateTime?
  pointsAwarded  Int?
}
```

### Challenge Additions
```prisma
model Challenge {
  // ... existing fields ...

  // Manager workflow flag
  requireAdminReapproval Boolean @default(false)
}
```

### ApprovalHistory Table (Audit Trail)
```prisma
model ApprovalHistory {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  submissionId   String   @db.Uuid
  reviewerId     String   @db.Uuid
  reviewerRole   Role
  decision       String   // 'approved', 'rejected', 'needs_revision', 'override'
  notes          String?
  createdAt      DateTime @default(now())

  Submission     ActivitySubmission @relation(...)
  Reviewer       User               @relation(...)

  @@index([submissionId, createdAt])
}
```

## Notification Triggers

### Email Notifications Required

1. **Manager Assigned to Challenge**
   - Template: `lib/email/templates/manager-assigned.ts`
   - Trigger: ChallengeAssignment created
   - Recipient: Manager
   - Content: "You've been assigned as manager for [Challenge]"

2. **Submission Received (Notify Manager)**
   - Template: `lib/email/templates/submission-received.ts`
   - Trigger: ActivitySubmission created (status=PENDING)
   - Recipient: Assigned managers
   - Content: "[Participant] submitted [Activity] for review"

3. **Manager Approved (Notify Participant)**
   - Template: `lib/email/templates/submission-approved.ts`
   - Trigger: Status → APPROVED (via manager)
   - Recipient: Participant
   - Content: "Your submission was approved! Points awarded: X"

4. **Manager Rejected (Notify Participant)**
   - Template: `lib/email/templates/submission-rejected.ts`
   - Trigger: Status → NEEDS_REVISION or REJECTED
   - Recipient: Participant
   - Content: "Your submission needs revision. Feedback: [notes]"

5. **Manager Approved - Pending Admin (Notify Admin)**
   - Template: `lib/email/templates/admin-reapproval-needed.ts`
   - Trigger: Status → MANAGER_APPROVED
   - Recipient: Workspace admins
   - Content: "[Manager] approved submission, awaiting your final review"

6. **Admin Override (Notify Manager)**
   - Template: `lib/email/templates/admin-override.ts`
   - Trigger: Admin changes MANAGER_APPROVED → REJECTED
   - Recipient: Manager
   - Content: "Admin overrode your approval decision"

## Testing Scenarios

### Scenario 1: Direct Manager Approval (No Admin Required)
1. Challenge created with `requireAdminReapproval=false`
2. Manager assigned
3. Participant submits
4. Manager approves → Status=APPROVED, reward issued immediately
5. No admin involvement

### Scenario 2: Two-Stage Approval (Admin Required)
1. Challenge created with `requireAdminReapproval=true`
2. Manager assigned
3. Participant submits
4. Manager approves → Status=MANAGER_APPROVED
5. Admin receives notification
6. Admin approves → Status=APPROVED, reward issued
7. Participant receives notification

### Scenario 3: Manager Rejection
1. Manager assigned
2. Participant submits
3. Manager marks "Needs Revision" → Status=NEEDS_REVISION
4. Participant receives notification with feedback
5. Participant resubmits (new submission) → Status=PENDING
6. Cycle repeats

### Scenario 4: Admin Override
1. Manager approves → Status=MANAGER_APPROVED
2. Admin reviews and rejects → Status=REJECTED
3. Manager receives override notification
4. Audit trail records both decisions

### Scenario 5: No Manager (Admin Only)
1. Challenge has no assigned manager
2. Participant submits → Status=PENDING
3. Admin reviews directly → Status=APPROVED/REJECTED
4. Standard flow (no manager involvement)

## Performance Considerations

1. **Index Requirements**
   ```sql
   CREATE INDEX idx_submission_status_submitted
   ON "ActivitySubmission"(status, "submittedAt");

   CREATE INDEX idx_submission_manager_review
   ON "ActivitySubmission"("managerReviewedBy", "managerReviewedAt");
   ```

2. **Query Optimization**
   - Manager dashboard: Filter by assigned challengeIds (via join)
   - Admin dashboard: Show MANAGER_APPROVED items separately
   - Avoid N+1 queries: Use `include` for nested data

3. **Notification Batching**
   - Queue email sends (Inngest/BullMQ)
   - Don't block submission update on email delivery
   - Retry failed emails (3 attempts)

## Migration Path

### Phase 1: Add Fields (Non-Breaking)
- Add new SubmissionStatus values
- Add manager review fields to ActivitySubmission
- Add ApprovalHistory table
- Deploy schema changes

### Phase 2: Update Code (Backward Compatible)
- Implement managerReviewSubmission()
- Update review endpoint to handle new statuses
- Add manager queue UI
- Deploy code changes

### Phase 3: Enable Feature (Gradual Rollout)
- Start with single test challenge
- Enable manager assignment
- Monitor for issues
- Roll out to all challenges

### Phase 4: Clean Up
- Remove obsolete code paths
- Update documentation
- Train managers

## References

**Code Files**:
- lib/db/queries.ts (lines 1388-1505) - Submission CRUD
- app/api/workspaces/[slug]/submissions/[id]/review/route.ts - Review endpoint
- app/w/[slug]/admin/challenges/[id]/submissions/page.tsx - Review UI
- app/w/[slug]/admin/challenges/[id]/submission-review-button.tsx - Review component

**Related Documents**:
- .claude/architecture/manager-assignment-strategy.md
- .claude/memory/notification-infrastructure.md
- .claude/memory/reward-issuance-flow.md
