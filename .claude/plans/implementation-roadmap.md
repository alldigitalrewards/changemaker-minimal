# Manager Role + RewardSTACK Implementation Roadmap

## Overview

This roadmap outlines the implementation of the MANAGER role and enhanced submission approval workflow for the Changemaker platform. The work is organized into four phases over approximately 4 weeks, with clear dependencies and critical path items identified.

**Total Estimated Time**: 4 weeks (assumes 1-2 developers)

**Critical Dependencies**:
1. Phase 1 (Database Schema) must complete before Phase 2 (Manager Core)
2. Phase 2 (Manager approval logic) must complete before Phase 3 (RewardSTACK)
3. Phase 4 (Polish) can partially overlap with Phase 3

## Phase 1: Foundation (Week 1)

**Goal**: Establish database schema and refactor authentication system to support MANAGER role.

### Database Schema

**Prisma Schema Changes** (prisma/schema.prisma):

- [ ] Add MANAGER to Role enum (line 519-522)
  ```prisma
  enum Role {
    ADMIN
    PARTICIPANT
    MANAGER  // ← Add this
  }
  ```

- [ ] Expand SubmissionStatus enum (line 524-529)
  ```prisma
  enum SubmissionStatus {
    PENDING
    MANAGER_APPROVED  // ← Add: Manager approved, awaiting admin
    NEEDS_REVISION    // ← Add: Manager rejected, needs participant fix
    APPROVED
    REJECTED
    DRAFT
  }
  ```

- [ ] Add manager review fields to ActivitySubmission model (line 55-81)
  ```prisma
  model ActivitySubmission {
    // ... existing fields ...

    // NEW: Manager review fields
    managerReviewedBy  String?   @db.Uuid
    managerNotes       String?
    managerReviewedAt  DateTime?

    // Existing admin review fields (keep)
    reviewedBy     String?   @db.Uuid
    reviewNotes    String?
    reviewedAt     DateTime?
    pointsAwarded  Int?
  }
  ```

- [ ] Add requireAdminReapproval flag to Challenge model (line 103-131)
  ```prisma
  model Challenge {
    // ... existing fields ...

    requireAdminReapproval Boolean @default(false)
  }
  ```

- [ ] Create ChallengeAssignment join table
  ```prisma
  model ChallengeAssignment {
    id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    challengeId String    @db.Uuid
    managerId   String    @db.Uuid
    workspaceId String    @db.Uuid
    assignedAt  DateTime  @default(now())
    assignedBy  String    @db.Uuid

    Challenge   Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
    Manager     User      @relation("ManagerAssignments", fields: [managerId], references: [id], onDelete: Cascade)
    AssignedBy  User      @relation("AssignmentCreator", fields: [assignedBy], references: [id])
    Workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

    @@unique([challengeId, managerId])
    @@index([managerId, workspaceId])
    @@index([challengeId])
  }
  ```

- [ ] Create ApprovalHistory audit table
  ```prisma
  model ApprovalHistory {
    id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    submissionId   String   @db.Uuid
    reviewerId     String   @db.Uuid
    reviewerRole   Role
    decision       String   // 'approved', 'rejected', 'needs_revision', 'override'
    notes          String?
    createdAt      DateTime @default(now())

    Submission     ActivitySubmission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
    Reviewer       User               @relation(fields: [reviewerId], references: [id])

    @@index([submissionId, createdAt])
  }
  ```

- [ ] Run migration: `pnpm prisma db push` or create migration file
- [ ] Update Prisma Client: `pnpm prisma generate`

### Auth Refactoring

**lib/auth/rbac.ts**:
- [ ] Add MANAGER permissions to ROLE_PERMISSIONS (line 34-55)
  ```typescript
  MANAGER: [
    'challenges:view_assigned',      // View only assigned challenges
    'submissions:review',            // Review submissions for assigned challenges
    'submissions:approve_first_level', // Approve (may need admin re-approval)
    'participants:invite',           // Limited to participant role only
    'comments:create'                // Add comments to submissions
  ]
  ```

**lib/auth/api-auth.ts**:
- [ ] Remove global role fallback in requireWorkspaceAccess() (line 35-36)
  ```typescript
  // BEFORE (security risk):
  role: role || user.dbUser.role

  // AFTER (strict):
  if (!role) {
    throw NextResponse.json(
      { error: 'No workspace access' },
      { status: 403 }
    )
  }
  ```

- [ ] Add requireWorkspaceManager() helper (line 50-61, pattern from requireWorkspaceAdmin)
  ```typescript
  export async function requireWorkspaceManager(slug: string) {
    const { workspace, user } = await requireWorkspaceAccess(slug)

    if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
      throw NextResponse.json(
        { error: 'Manager privileges required' },
        { status: 403 }
      )
    }

    return { workspace, user }
  }
  ```

- [ ] Add requireManagerAccess(slug, challengeId) helper
  ```typescript
  export async function requireManagerAccess(
    slug: string,
    challengeId: string
  ) {
    const { workspace, user } = await requireWorkspaceAccess(slug)

    // Admins can always access
    if (user.role === 'ADMIN') {
      return { workspace, user, challenge }
    }

    // Verify manager is assigned to this challenge
    const isAssigned = await isManagerAssignedToChallenge(
      user.dbUser.id,
      challengeId
    )

    if (!isAssigned && user.role !== 'MANAGER') {
      throw NextResponse.json(
        { error: 'Manager access required for this challenge' },
        { status: 403 }
      )
    }

    return { workspace, user, challenge }
  }
  ```

**WorkspaceMembership Migration**:
- [ ] Audit and update ~15-20 files still using User.workspaceId pattern
  - Search for: `user.workspaceId`, `dbUser.workspaceId`
  - Replace with: WorkspaceMembership queries via lib/db/workspace-membership.ts
  - Files likely affected:
    - app/w/[slug]/admin/challenges/*/page.tsx
    - app/w/[slug]/participant/*/page.tsx
    - app/api/workspaces/[slug]/*/route.ts
    - lib/db/queries.ts (submission/enrollment queries)

### Testing Checklist (Phase 1)
- [ ] Verify schema migrations applied successfully
- [ ] Test role-based access with new MANAGER role
- [ ] Verify WorkspaceMembership queries return correct roles
- [ ] Test requireManagerAccess() denies non-assigned managers
- [ ] Verify platform super admin retains bypass capability
- [ ] Run existing test suite (should pass with minimal changes)

---

## Phase 2: Manager Core (Week 2)

**Goal**: Implement manager submission review logic, dashboard UI, and challenge assignment.

### Database Query Functions

**lib/db/queries.ts** - Add new functions:

- [ ] managerReviewSubmission() (pattern from reviewActivitySubmission at line 1468-1505)
  ```typescript
  export async function managerReviewSubmission(
    submissionId: string,
    managerData: {
      action: 'approve' | 'reject' | 'needs_revision'
      managerNotes: string
      managerId: string
      pointsRecommendation?: number  // Optional suggestion for admin
    },
    workspaceId: string
  ) {
    // Verify manager is assigned to challenge
    // Update submission with manager review fields
    // Set status based on Challenge.requireAdminReapproval
    // Log to ApprovalHistory
    // Issue reward if direct approval (no admin required)
    // Return updated submission
  }
  ```

- [ ] assignChallengeManager()
  ```typescript
  export async function assignChallengeManager(
    challengeId: string,
    managerId: string,
    workspaceId: string,
    assignedByUserId: string
  ): Promise<ChallengeAssignment>
  ```

- [ ] removeChallengeManager()
  ```typescript
  export async function removeChallengeManager(
    assignmentId: string,
    workspaceId: string
  ): Promise<void>
  ```

- [ ] getManagerAssignments()
  ```typescript
  export async function getManagerAssignments(
    managerId: string,
    workspaceId: string
  ): Promise<Challenge[]>
  ```

- [ ] getChallengeManagers()
  ```typescript
  export async function getChallengeManagers(
    challengeId: string,
    workspaceId: string
  ): Promise<User[]>
  ```

- [ ] isManagerAssignedToChallenge()
  ```typescript
  export async function isManagerAssignedToChallenge(
    managerId: string,
    challengeId: string
  ): Promise<boolean>
  ```

- [ ] getManagerPendingSubmissions()
  ```typescript
  export async function getManagerPendingSubmissions(
    managerId: string,
    workspaceId: string
  ): Promise<ActivitySubmission[]>
  ```

### API Routes

**app/api/workspaces/[slug]/submissions/[id]/manager-review/route.ts** (NEW):
- [ ] POST handler for manager review
  - Auth: requireManagerAccess(slug, submission.Activity.challengeId)
  - Validate: action, managerNotes
  - Call: managerReviewSubmission()
  - Handle: MANAGER_APPROVED vs APPROVED vs NEEDS_REVISION
  - Trigger: Notification emails (Phase 4)
  - Return: Updated submission

**app/api/workspaces/[slug]/challenges/[id]/managers/route.ts** (NEW):
- [ ] POST handler - Assign manager to challenge
  - Auth: requireWorkspaceAdmin(slug)
  - Validate: managerId exists and has MANAGER role
  - Call: assignChallengeManager()
  - Trigger: Manager assignment notification (Phase 4)
  - Return: ChallengeAssignment

- [ ] GET handler - List managers for challenge
  - Auth: requireWorkspaceAccess(slug)
  - Call: getChallengeManagers()
  - Return: Array of User (manager details)

**app/api/workspaces/[slug]/challenges/[id]/managers/[managerId]/route.ts** (NEW):
- [ ] DELETE handler - Remove manager assignment
  - Auth: requireWorkspaceAdmin(slug)
  - Call: removeChallengeManager()
  - Return: Success message

**app/api/workspaces/[slug]/submissions/[id]/review/route.ts** (ENHANCE):
- [ ] Update to handle MANAGER_APPROVED status
- [ ] Add admin override logic
  - If submission.status === 'MANAGER_APPROVED', log ADMIN_OVERRIDE_MANAGER event
  - Notify manager of override (Phase 4)
- [ ] Update ApprovalHistory audit trail

### Manager Dashboard UI

**app/w/[slug]/manager/layout.tsx** (NEW):
- [ ] Create manager layout (pattern from admin/layout.tsx)
- [ ] Require MANAGER or ADMIN role
- [ ] Add ManagerSidebar navigation component

**app/w/[slug]/manager/dashboard/page.tsx** (NEW):
- [ ] Server Component fetching manager-assigned challenges
- [ ] Display stats cards:
  - Total assigned challenges
  - Pending submissions count
  - Approved this week
  - Average review time
- [ ] Pending submissions alert (if any)
- [ ] List of assigned challenges with submission counts

**app/w/[slug]/manager/challenges/page.tsx** (NEW):
- [ ] List all challenges assigned to this manager
- [ ] Show submission counts per challenge
- [ ] Link to submission review page

**app/w/[slug]/manager/challenges/[id]/submissions/page.tsx** (NEW):
- [ ] Server Component fetching submissions for this challenge
- [ ] Filter: PENDING, MANAGER_APPROVED, NEEDS_REVISION, APPROVED, REJECTED
- [ ] Card-based layout (pattern from admin submission review)
- [ ] SubmissionManagerReviewButton component

**components/manager/submission-manager-review-button.tsx** (NEW):
- [ ] Client Component with Dialog
- [ ] Three actions: Approve, Needs Revision, Reject
- [ ] Manager notes textarea (required)
- [ ] Points recommendation input (optional, for admin)
- [ ] Display Challenge.requireAdminReapproval flag
  - If true: "Your approval will require admin re-approval"
  - If false: "Your approval will directly approve this submission"
- [ ] Form submission → POST /api/.../submissions/[id]/manager-review
- [ ] Optimistic UI update

### Admin Challenge Assignment UI

**app/w/[slug]/admin/challenges/[id]/managers/page.tsx** (NEW):
- [ ] Server Component fetching current managers
- [ ] ManagerAssignmentForm component (assign new managers)
- [ ] List current assignments with remove button
- [ ] Show assignment metadata (assignedAt, assignedBy)

**components/admin/manager-assignment-form.tsx** (NEW):
- [ ] Client Component with user search/select
- [ ] Filter users by MANAGER role in workspace
- [ ] Prevent duplicate assignments (UI validation)
- [ ] Form submission → POST /api/.../challenges/[id]/managers
- [ ] Optimistic UI update

**components/navigation/admin-sidebar.tsx** (ENHANCE):
- [ ] Add "Managers" nav item (line 31-41)
  ```typescript
  {
    name: 'Managers',
    href: '/admin/managers',
    icon: UsersIcon
  }
  ```

**components/navigation/manager-sidebar.tsx** (NEW):
- [ ] Create manager-specific navigation
- [ ] Items:
  - Dashboard
  - My Challenges
  - Submissions (pending count badge)
  - Profile

### Testing Checklist (Phase 2)
- [ ] Manager can review submissions for assigned challenges only
- [ ] Manager cannot access non-assigned challenges
- [ ] Admin can assign/remove managers
- [ ] Direct approval (requireAdminReapproval=false) issues rewards immediately
- [ ] Two-stage approval (requireAdminReapproval=true) sets MANAGER_APPROVED status
- [ ] NEEDS_REVISION status allows participant resubmission
- [ ] Admin override logs to ApprovalHistory
- [ ] Manager dashboard shows correct stats

---

## Phase 3: RewardSTACK Integration (Week 3)

**Goal**: Integrate RewardSTACK API for SKU and monetary rewards, implement webhook handlers.

### RewardSTACK Configuration

**Environment Variables** (.env.local):
- [ ] Add REWARDSTACK_API_KEY
- [ ] Add REWARDSTACK_API_URL (Production: https://admin.alldigitalrewards.com | Staging: https://admin.stage.alldigitalrewards.com)
- [ ] Add REWARDSTACK_WEBHOOK_SECRET

**lib/rewardstack/client.ts** (NEW):
- [ ] Create RewardStack API client
  ```typescript
  export async function createRewardIssuance(data: {
    userId: string
    skuId?: string
    amount?: number
    currency?: string
  }): Promise<RewardStackResponse>

  export async function checkRewardStatus(
    rewardStackId: string
  ): Promise<RewardStatus>

  export async function cancelReward(
    rewardStackId: string
  ): Promise<void>
  ```

### Reward Issuance Enhancement

**lib/db/queries.ts** - Enhance issueReward() (line 2351-2420):
- [ ] For SKU rewards:
  - Call RewardStack API: createRewardIssuance()
  - Store rewardStackId in RewardIssuance
  - Set status: PENDING_FULFILLMENT
  - Create ActivityEvent: REWARD_ISSUED

- [ ] For monetary rewards:
  - Call RewardStack API: createRewardIssuance()
  - Store rewardStackId in RewardIssuance
  - Set status: PENDING_FULFILLMENT
  - Create ActivityEvent: REWARD_ISSUED

- [ ] For points (existing):
  - Keep synchronous awardPointsWithBudget() logic
  - Set status: FULFILLED immediately

- [ ] Add error handling:
  - Retry logic (3 attempts)
  - Fallback to PENDING status
  - Log to ActivityEvent: REWARD_FAILED

### Webhook Handler

**app/api/webhooks/rewardstack/route.ts** (NEW):
- [ ] POST handler for RewardStack webhooks
- [ ] Verify webhook signature using REWARDSTACK_WEBHOOK_SECRET
- [ ] Handle events:
  - `reward.fulfilled` → Update RewardIssuance status to FULFILLED
  - `reward.failed` → Update to FAILED, log error
  - `reward.cancelled` → Update to CANCELLED
- [ ] Create ActivityEvent for each status change
- [ ] Return 200 OK

### Database Schema Updates

**prisma/schema.prisma** - Enhance RewardIssuance model:
- [ ] Add rewardStackId field
  ```prisma
  model RewardIssuance {
    // ... existing fields ...

    rewardStackId String?  @unique  // RewardStack external ID
    status        String            // PENDING, PENDING_FULFILLMENT, FULFILLED, FAILED, CANCELLED
    failureReason String?           // Error message if FAILED
    fulfilledAt   DateTime?         // When RewardStack confirmed fulfillment
  }
  ```

- [ ] Run migration: `pnpm prisma db push`

### Admin Reward Management UI

**app/w/[slug]/admin/rewards/page.tsx** (NEW):
- [ ] Server Component fetching all RewardIssuances
- [ ] Filter by status: All, Pending, Fulfilled, Failed
- [ ] Display:
  - Participant name
  - Reward type (points/SKU/monetary)
  - Amount/SKU name
  - Status
  - Issued date
  - Fulfilled date
- [ ] Manual retry button for FAILED rewards
- [ ] Export to CSV

**app/api/workspaces/[slug]/rewards/[id]/retry/route.ts** (NEW):
- [ ] POST handler to retry failed reward
- [ ] Auth: requireWorkspaceAdmin(slug)
- [ ] Call: issueReward() again
- [ ] Return: Updated RewardIssuance

### Testing Checklist (Phase 3)
- [ ] SKU reward creates RewardStack issuance
- [ ] Monetary reward creates RewardStack issuance
- [ ] Points reward bypasses RewardStack (direct fulfillment)
- [ ] Webhook handler verifies signature correctly
- [ ] Webhook updates RewardIssuance status
- [ ] Failed rewards show in admin dashboard
- [ ] Manual retry succeeds for failed rewards
- [ ] ActivityEvent logs all reward status changes

---

## Phase 4: Polish & Production (Week 4)

**Goal**: Complete notification system, comprehensive testing, documentation, and production deployment.

### Email Notification Templates

**lib/email/templates/** (NEW files):

- [ ] manager-assigned.ts
  - Recipient: Manager
  - Trigger: ChallengeAssignment created
  - Content: "You've been assigned as manager for [Challenge Title]"
  - CTA: "View Challenge"

- [ ] submission-received-manager.ts
  - Recipient: Assigned managers
  - Trigger: ActivitySubmission created (status=PENDING)
  - Content: "[Participant Name] submitted [Activity Title] for review"
  - CTA: "Review Submission"

- [ ] submission-approved-participant.ts
  - Recipient: Participant
  - Trigger: Status → APPROVED
  - Content: "Your submission was approved! Points awarded: X"
  - CTA: "View Challenge"

- [ ] submission-needs-revision.ts
  - Recipient: Participant
  - Trigger: Status → NEEDS_REVISION
  - Content: "Your submission needs revision. Feedback: [manager notes]"
  - CTA: "Revise Submission"

- [ ] admin-reapproval-needed.ts
  - Recipient: Workspace admins
  - Trigger: Status → MANAGER_APPROVED
  - Content: "[Manager Name] approved submission, awaiting your final review"
  - CTA: "Review Submission"

- [ ] admin-override.ts
  - Recipient: Manager
  - Trigger: Admin changes MANAGER_APPROVED → REJECTED
  - Content: "Admin overrode your approval decision for [Submission]"
  - Show: Admin's review notes

### Email Sending Integration

**lib/email/smtp.ts** (ENHANCE):
- [ ] Add sendManagerAssignedEmail()
- [ ] Add sendSubmissionReceivedEmail() (to managers)
- [ ] Add sendSubmissionApprovedEmail() (to participant)
- [ ] Add sendSubmissionNeedsRevisionEmail() (to participant)
- [ ] Add sendAdminReapprovalEmail() (to admins)
- [ ] Add sendAdminOverrideEmail() (to manager)

**Trigger Points**:
- [ ] POST /api/.../challenges/[id]/managers → sendManagerAssignedEmail()
- [ ] createActivitySubmission() → sendSubmissionReceivedEmail()
- [ ] managerReviewSubmission() → sendApprovedEmail() OR sendNeedsRevisionEmail() OR sendAdminReapprovalEmail()
- [ ] Admin override in reviewActivitySubmission() → sendAdminOverrideEmail()

### Activity Event Logging

**lib/db/queries.ts** - Add new event types to ActivityEventType enum:
- [ ] SUBMISSION_MANAGER_APPROVED
- [ ] SUBMISSION_MANAGER_REJECTED
- [ ] SUBMISSION_NEEDS_REVISION
- [ ] ADMIN_OVERRIDE_MANAGER
- [ ] MANAGER_ASSIGNED
- [ ] MANAGER_REMOVED
- [ ] REWARD_ISSUED (already exists)
- [ ] REWARD_FULFILLED (new)
- [ ] REWARD_FAILED (new)

**Update logActivityEvent() calls**:
- [ ] managerReviewSubmission() → log appropriate event
- [ ] assignChallengeManager() → log MANAGER_ASSIGNED
- [ ] removeChallengeManager() → log MANAGER_REMOVED
- [ ] Admin override → log ADMIN_OVERRIDE_MANAGER
- [ ] Webhook handler → log REWARD_FULFILLED/REWARD_FAILED

### Comprehensive Testing

**Unit Tests** (tests/unit/):
- [ ] lib/auth/rbac.ts - hasPermission() with MANAGER role
- [ ] lib/db/queries.ts - managerReviewSubmission()
- [ ] lib/db/queries.ts - assignChallengeManager()
- [ ] lib/rewardstack/client.ts - API calls

**API Tests** (tests/api/):
- [ ] POST /api/.../submissions/[id]/manager-review
- [ ] POST /api/.../challenges/[id]/managers
- [ ] DELETE /api/.../challenges/[id]/managers/[managerId]
- [ ] POST /api/webhooks/rewardstack

**Integration Tests** (tests/integration/):
- [ ] Scenario 1: Direct manager approval (requireAdminReapproval=false)
  - Participant submits
  - Manager approves
  - Reward issued immediately
  - Participant receives email

- [ ] Scenario 2: Two-stage approval (requireAdminReapproval=true)
  - Participant submits
  - Manager approves → MANAGER_APPROVED
  - Admin receives notification
  - Admin approves → APPROVED
  - Reward issued
  - Participant receives email

- [ ] Scenario 3: Manager rejection (NEEDS_REVISION)
  - Participant submits
  - Manager marks needs revision
  - Participant receives email with feedback
  - Participant resubmits
  - Cycle repeats

- [ ] Scenario 4: Admin override
  - Manager approves → MANAGER_APPROVED
  - Admin rejects → REJECTED
  - Manager receives override notification
  - ApprovalHistory records both decisions

- [ ] Scenario 5: RewardStack integration
  - Manager approves submission with SKU reward
  - RewardStack API called
  - RewardIssuance created with PENDING_FULFILLMENT
  - Webhook received → FULFILLED
  - ActivityEvent logged

**E2E Tests** (tests/e2e/):
- [ ] Manager login → dashboard → review submission → approve
- [ ] Admin login → assign manager → verify assignment
- [ ] Participant login → submit → receive revision feedback → resubmit
- [ ] Admin login → override manager decision → verify notification

### Documentation

**docs/manager-workflow.md** (NEW):
- [ ] Manager role overview
- [ ] How to assign managers to challenges
- [ ] Manager approval workflow
- [ ] Two-stage vs direct approval
- [ ] NEEDS_REVISION flow
- [ ] Admin override process

**docs/reward-issuance.md** (ENHANCE):
- [ ] RewardSTACK (ADR Marketplace Platform) integration overview
- [ ] API authentication and configuration
- [ ] Webhook configuration
- [ ] Reward status lifecycle
- [ ] Troubleshooting failed rewards
- [ ] Manual retry process

**docs/notification-system.md** (NEW):
- [ ] Email notification triggers
- [ ] Template customization
- [ ] SMTP configuration
- [ ] Email delivery monitoring

**CHANGELOG.md** (UPDATE):
- [ ] Document all breaking changes
- [ ] Migration guide for existing workspaces
- [ ] New features summary

### Performance Optimization

**Database Indexes** (verify in Prisma schema):
- [ ] ActivitySubmission: `idx_submission_status_submitted` on (status, submittedAt)
- [ ] ActivitySubmission: `idx_submission_manager_review` on (managerReviewedBy, managerReviewedAt)
- [ ] ChallengeAssignment: `idx_manager_workspace` on (managerId, workspaceId)
- [ ] ApprovalHistory: `idx_submission_created` on (submissionId, createdAt)

**Query Optimization**:
- [ ] Audit manager dashboard queries for N+1 issues
- [ ] Add proper `include` clauses to avoid multiple round trips
- [ ] Consider caching manager assignment data (short TTL)

### Production Deployment Checklist

**Pre-Deployment**:
- [ ] Run full test suite (100% pass rate required)
- [ ] Run Prisma migration against staging DB
- [ ] Test RewardStack webhook in staging environment
- [ ] Load test manager dashboard (100+ pending submissions)
- [ ] Verify all email templates render correctly

**Deployment Steps**:
1. [ ] Deploy database migrations (Prisma)
2. [ ] Deploy backend code (Vercel/production server)
3. [ ] Configure RewardStack webhook URL in their dashboard
4. [ ] Verify webhook secret matches .env.production
5. [ ] Monitor logs for errors (first 24 hours)

**Post-Deployment**:
- [ ] Create test manager user in production
- [ ] Assign to test challenge
- [ ] Submit test activity → review → approve → verify reward
- [ ] Monitor email delivery (check Resend dashboard)
- [ ] Monitor RewardStack webhook logs
- [ ] Document any production issues in CHANGELOG.md

**Rollback Plan**:
- [ ] Database migrations are backward-compatible (add-only, no drops)
- [ ] Feature flag: ENABLE_MANAGER_WORKFLOW (default: false)
- [ ] Can revert to admin-only approval by setting flag to false

---

## Critical Path

The following tasks are **blocking** and must be completed in order:

```
Week 1 (Phase 1: Foundation)
│
├─ Add MANAGER to Role enum
├─ Add MANAGER_APPROVED, NEEDS_REVISION to SubmissionStatus
├─ Add manager review fields to ActivitySubmission
├─ Create ChallengeAssignment join table
├─ Run Prisma migrations
│
▼
Week 2 (Phase 2: Manager Core)
│
├─ Implement managerReviewSubmission() function
├─ Create POST /api/.../submissions/[id]/manager-review endpoint
├─ Create manager dashboard UI
├─ Create manager submission review UI
│
▼
Week 3 (Phase 3: RewardSTACK)
│
├─ Integrate RewardStack API client
├─ Enhance issueReward() for SKU/monetary rewards
├─ Create webhook handler
├─ Update RewardIssuance model
│
▼
Week 4 (Phase 4: Polish)
│
├─ Implement email notifications (all 6 templates)
├─ Complete integration tests
├─ Deploy to staging
├─ Deploy to production
```

**Parallelizable Work** (can be done concurrently):
- UI components can be built while API routes are in progress
- Email templates can be written during Phase 2
- Documentation can be written throughout all phases
- Unit tests can be written alongside features

---

## Risk Mitigation

### High-Risk Items

1. **RewardStack API Integration**
   - Risk: External API may have downtime or rate limits
   - Mitigation: Implement retry logic, queue failed rewards for manual retry, monitor webhook delivery

2. **Email Delivery**
   - Risk: SMTP provider (Resend) may fail or delay emails
   - Mitigation: Non-blocking email sends, queue with retry, log all send attempts

3. **WorkspaceMembership Migration**
   - Risk: Breaking changes to existing code
   - Mitigation: Thorough testing, staged rollout, backward-compatible changes first

4. **Database Schema Changes**
   - Risk: Breaking changes to production data
   - Mitigation: Add-only migrations (no drops), test on staging replica

### Medium-Risk Items

1. **Manager Assignment Logic**
   - Risk: Complex authorization checks may have edge cases
   - Mitigation: Comprehensive unit tests, integration tests for all scenarios

2. **Admin Override Flow**
   - Risk: Confusing UX, potential for accidental overrides
   - Mitigation: Confirmation dialogs, audit trail in ApprovalHistory

3. **Performance with Large Datasets**
   - Risk: Manager dashboard may be slow with 1000+ submissions
   - Mitigation: Proper indexing, pagination, query optimization

---

## Success Metrics

### Phase 1 (Foundation)
- [ ] All Prisma migrations applied without errors
- [ ] Zero regressions in existing test suite
- [ ] requireManagerAccess() correctly enforces assignment

### Phase 2 (Manager Core)
- [ ] Manager can review submissions end-to-end
- [ ] Admin can assign/remove managers
- [ ] Two-stage approval flow works correctly

### Phase 3 (RewardSTACK)
- [ ] SKU/monetary rewards create RewardStack issuances
- [ ] Webhook handler updates reward status
- [ ] Failed rewards can be retried manually

### Phase 4 (Polish)
- [ ] All 6 email notifications send correctly
- [ ] Integration tests cover all scenarios
- [ ] Production deployment succeeds without rollback
- [ ] Zero critical bugs reported in first week

### Overall Success Criteria
- [ ] 90%+ test coverage on new code
- [ ] <500ms average response time for manager dashboard
- [ ] <1% email delivery failure rate
- [ ] Zero security vulnerabilities in code review
- [ ] Manager adoption rate >50% within first month

---

## References

**Memory Files**:
- `.claude/memory/role-system-architecture.md` - Role system details
- `.claude/memory/submission-approval-flow.md` - Approval workflow
- `.claude/architecture/manager-assignment-strategy.md` - Assignment implementation

**Code Files** (Key locations):
- `prisma/schema.prisma` - Database schema
- `lib/auth/api-auth.ts` - Authorization helpers
- `lib/auth/rbac.ts` - Permission mappings
- `lib/db/queries.ts` - Database queries
- `lib/email/smtp.ts` - Email infrastructure
- `app/w/[slug]/admin/layout.tsx` - Admin layout pattern

**External Documentation**:
- RewardSTACK API Documentation: https://alldigitalrewards.com/solutions/api-integration/rewardstack-api-documentation/
- RewardSTACK API Reference (Swagger): https://app.swaggerhub.com/apis/AllDigitalRewards/Marketplace/2.2
- Prisma Migrations: https://www.prisma.io/docs/concepts/components/prisma-migrate
- Resend SMTP: https://resend.com/docs

---

*Roadmap Version 1.0 | Created: January 2025 | Estimated: 4 weeks*
