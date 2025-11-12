# Manager Role & RewardSTACK Integration - Complete Task List

**Total Tasks:** 60
**Phases:** 4 (15 tasks each)
**Gates:** 4 go/no-go decision points

---

## PHASE 1: Foundation (Week 1) - Tasks 1-15

### Database Schema Changes

**Task 1: Schema Design & Review (2 hours)**

- Add MANAGER to WorkspaceMembership.role enum
- Create ChallengeAssignment model with indexes
- Extend SubmissionStatus enum (MANAGER_APPROVED, NEEDS_REVISION)
- Add manager review fields to ActivitySubmission (managerReviewedBy, managerReviewedAt, managerNotes)
- Extend RewardIssuance with external tracking fields
- **File:** prisma/schema.prisma
- **Dependencies:** None (starts immediately)
- **Deliverable:** Updated schema file
- **Risk:** Breaking changes to existing enums

**Task 2: Migration Generation (30 minutes)**

- Run `pnpm prisma migrate dev --name add_manager_role_and_assignments`
- Review generated SQL for safety
- Check for unexpected ALTER statements
- **File:** prisma/migrations/XXX_*/migration.sql
- **Dependencies:** Task 1
- **Deliverable:** Migration file in prisma/migrations/
- **Risk:** Auto-generated SQL might not match expectations

**Task 3: Migration Testing - Staging Clone (2 hours) - CRITICAL**

- Clone production database to local/staging environment
- Run migration on clone: `pnpm prisma migrate deploy`
- Verify no data loss
- Test rollback SQL manually
- Document any schema discrepancies
- **Dependencies:** Task 2
- **Deliverable:** Verified migration + rollback script
- **Risk:** CRITICAL - Staging might not match production schema exactly

### Authorization & Permissions

**Task 4: Backward Compatibility Layer (3 hours)**

- Update getUserWorkspaceRole() to check WorkspaceMembership.role
- Keep User.role as legacy field (no changes to existing code)
- Add isWorkspaceManager() helper function
- Add getWorkspaceMembership() helper
- **File:** lib/workspace-context.ts
- **Dependencies:** Task 3 (schema exists)
- **Deliverable:** Updated workspace context utilities
- **Risk:** Missing role checks in existing code

**Task 5: RBAC Permission Mapping (2 hours)**

- Add ROLES.MANAGER to lib/auth/rbac.ts
- Define MANAGER permissions array (between PARTICIPANT and ADMIN)
- Update permission checks in canAccessWorkspace()
- Add hasPermission() checks for manager-specific actions
- **File:** lib/auth/rbac.ts
- **Dependencies:** Task 4
- **Deliverable:** Complete MANAGER role permissions
- **Risk:** Over-permissioning or under-permissioning managers

**Task 6: Middleware Authorization Updates (2 hours)**

- Update requireWorkspaceAdmin() to accept MANAGER for review endpoints
- Add requireManagerOrAdmin() helper function
- Update all API route protection to use new helpers
- Review existing auth middleware for gaps
- **File:** lib/auth/api-auth.ts
- **Dependencies:** Task 5
- **Deliverable:** Updated API authentication middleware
- **Risk:** Authorization bypass vulnerabilities

### Type System & Testing

**Task 7: Type Generation & Validation (1 hour)**

- Run `pnpm prisma generate`
- Update TypeScript types in lib/types.ts
- Add type guards for new enums (isManagerApproved, isNeedsRevision)
- Update Zod schemas if used
- **Dependencies:** Task 3
- **Deliverable:** Updated Prisma Client types
- **Risk:** Type mismatches in existing code

**Task 8: Existing Test Suite Verification (3 hours)**

- Run full test suite: `pnpm test`
- Fix failing tests (expect 5-10 failures)
- Update test fixtures for new schema
- Verify workspace isolation still works
- **Dependencies:** Tasks 3, 7
- **Deliverable:** 100% tests passing (51/51 → 58/58 if new tests added)
- **Risk:** Cascading test failures

### Data & Infrastructure

**Task 9: Seed Data Updates - Manager Users (2 hours)**

- Add managerUsers array to prisma/seed.ts
- Create 3 manager users (sarah.manager@acme.com, tom.manager@alldigitalrewards.com, lisa.manager@sharecare.com)
- Create WorkspaceMembership records with MANAGER role
- Keep User.role as PARTICIPANT (legacy compatibility)
- **File:** prisma/seed.ts
- **Dependencies:** Task 3
- **Deliverable:** 3 manager users (1 per workspace)
- **Risk:** Seed script conflicts with existing data

**Task 10: ChallengeAssignment Helper Functions (3 hours)**

- Create lib/db/challenge-assignments.ts
- Implement assignManagerToChallenge(challengeId, managerId, workspaceId, assignedBy)
- Implement unassignManagerFromChallenge(challengeId, managerId)
- Implement getManagerChallenges(managerId, workspaceId)
- Implement getChallengeManagers(challengeId)
- Implement isManagerAssignedToChallenge(managerId, challengeId)
- **File:** lib/db/challenge-assignments.ts (NEW)
- **Dependencies:** Task 7
- **Deliverable:** Complete assignment CRUD functions
- **Risk:** N+1 query performance issues

**Task 11: Database Indexes Review (1 hour)**

- Verify indexes on ChallengeAssignment:
  - managerId + workspaceId (composite for queue queries)
  - challengeId (for finding managers)
  - challengeId + managerId (unique constraint)
- Test query performance with EXPLAIN ANALYZE
- Add missing indexes if needed
- **Dependencies:** Task 3
- **Deliverable:** Optimized indexes, query plan analysis
- **Risk:** Slow queries at scale

### Deployment & Verification

**Task 12: Migration Deployment to Staging (1 hour)**

- Deploy schema changes to staging environment
- Run migration via `pnpm prisma migrate deploy`
- Verify application starts successfully
- Check database logs for errors
- **Dependencies:** Tasks 3, 8
- **Deliverable:** Staging environment updated
- **Risk:** Staging downtime if migration fails

**Task 13: Smoke Test - Staging (2 hours)**

- Test existing admin workflows (challenge CRUD, participant management)
- Test existing participant workflows (enrollment, submissions)
- Test points award functionality
- Verify no regressions in existing features
- **Dependencies:** Task 12
- **Deliverable:** Smoke test report
- **Risk:** Silent failures in edge cases

**Task 14: Documentation - Schema Changes (2 hours)**

- Document new ChallengeAssignment model in docs/schema/
- Update ERD diagram (if exists)
- Write migration rollback procedure
- Document new enum values and their meanings
- **File:** docs/schema/manager-role.md (NEW)
- **Dependencies:** Task 3
- **Deliverable:** Complete schema documentation
- **Risk:** Outdated docs if schema changes again

**Task 15: Phase 1 Gate Review (1 hour) - GO/NO-GO**

- Review all Phase 1 deliverables
- Verify 100% test pass rate
- Confirm rollback plan is tested
- Get sign-off from tech lead
- Decision: Proceed to Phase 2 or fix issues
- **Dependencies:** All Phase 1 tasks (1-14)
- **Deliverable:** GO/NO-GO decision
- **Risk:** Delays if gate criteria not met

---

## PHASE 2: Manager Role (Week 2) - Tasks 16-30

### Assignment API Endpoints

**Task 16: Assignment API Endpoints - Create (3 hours)**

- Create POST /api/workspaces/[slug]/challenges/[id]/managers
- Validate requester is ADMIN via requireWorkspaceAdmin()
- Create ChallengeAssignment record via helper function
- Return assignment with manager user details
- Handle errors (manager not in workspace, already assigned)
- **File:** app/api/workspaces/[slug]/challenges/[id]/managers/route.ts (NEW)
- **Dependencies:** Task 10 (helper functions exist)
- **Deliverable:** Working assignment creation endpoint
- **Risk:** Missing authorization checks

**Task 17: Assignment API Endpoints - List & Delete (2 hours)**

- Create GET /api/workspaces/[slug]/challenges/[id]/managers
- Create DELETE /api/workspaces/[slug]/challenges/[id]/managers/[managerId]
- Include manager user details (email, name) in GET response
- Handle cascade delete warnings
- **File:** Same as Task 16
- **Dependencies:** Task 16
- **Deliverable:** Complete assignment CRUD API
- **Risk:** N+1 queries for manager details

**Task 18: Manager Queue API Endpoint (3 hours)**

- Create GET /api/workspaces/[slug]/manager/queue
- Filter submissions by assigned challenges only (via ChallengeAssignment join)
- Support status filter (?status=PENDING, MANAGER_APPROVED, etc.)
- Include challenge, activity, user details in response
- Optimize query with proper includes
- **File:** app/api/workspaces/[slug]/manager/queue/route.ts (NEW)
- **Dependencies:** Task 10 (assignment queries)
- **Deliverable:** Manager queue API with filtering
- **Risk:** Slow queries with many assignments

**Task 19: Manager Review API Endpoint (4 hours) - CRITICAL**

- Create POST /api/workspaces/[slug]/submissions/[id]/manager-review
- Validate manager is assigned to challenge (isManagerAssignedToChallenge)
- Support actions: "approve" (→ MANAGER_APPROVED), "reject" (→ NEEDS_REVISION)
- Check Challenge.requireAdminReapproval flag
- If false, auto-approve to APPROVED and call issueReward()
- Save manager notes in ActivitySubmission.managerNotes
- Log ActivityEvent for audit trail
- **File:** app/api/workspaces/[slug]/submissions/[id]/manager-review/route.ts (NEW)
- **Dependencies:** Tasks 6 (middleware), 10 (assignment checks)
- **Deliverable:** Working manager review endpoint
- **Risk:** CRITICAL - Authorization bypass if assignment check missing

**Task 20: Admin Review Endpoint Updates (2 hours)**

- Modify POST /api/workspaces/[slug]/submissions/[id]/review
- Allow MANAGER_APPROVED → APPROVED transition (admin final approval)
- Allow MANAGER_APPROVED → REJECTED transition (admin override)
- Log ActivityEvent when admin overrides manager decision
- Keep existing PENDING → APPROVED/REJECTED flow
- **File:** app/api/workspaces/[slug]/submissions/[id]/review/route.ts (modified)
- **Dependencies:** Task 7 (new status enum exists)
- **Deliverable:** Updated admin review with manager status handling
- **Risk:** Breaking existing admin review workflow

### Challenge Schema Extensions

**Task 21: Challenge Schema Updates - Manager Config (1 hour)**

- Add requireManagerApproval: Boolean @default(false) to Challenge
- Add requireAdminReapproval: Boolean @default(true) to Challenge
- Generate migration: `pnpm prisma migrate dev --name challenge_manager_config`
- Test migration on staging clone
- **File:** prisma/schema.prisma (modified)
- **Dependencies:** Phase 1 complete
- **Deliverable:** Migration + updated Challenge model
- **Risk:** Forgot to update seed data for existing challenges

**Task 22: Challenge CRUD Updates - Manager Fields (2 hours)**

- Update challenge create/edit forms to include manager approval toggles
- Add UI explanation: "Require manager approval before admin review"
- Update POST /api/workspaces/[slug]/challenges API to accept new fields
- Set defaults: requireManagerApproval=false, requireAdminReapproval=true
- Update challenge detail page to show manager settings
- **Files:** app/w/[slug]/admin/challenges/[id]/page.tsx, app/api/workspaces/[slug]/challenges/route.ts
- **Dependencies:** Task 21
- **Deliverable:** UI + API support for manager challenge config
- **Risk:** UI confusion about what flags mean

### Manager Dashboard UI

**Task 23: Manager Dashboard Page (6 hours) - CORE UI**

- Create app/w/[slug]/admin/manager/queue/page.tsx
- Copy pattern from submissions page (app/w/[slug]/admin/challenges/[id]/submissions/page.tsx)
- Filter to only manager's assigned challenges
- Show stats cards: Pending count, Approved today, Avg review time, Total assigned challenges
- Implement status filter tabs (ALL/PENDING/MANAGER_APPROVED/NEEDS_REVISION)
- Card-based submission list (not data table)
- Empty state with helpful message
- **File:** app/w/[slug]/admin/manager/queue/page.tsx (NEW)
- **Dependencies:** Task 18 (API exists)
- **Deliverable:** Full manager queue dashboard UI
- **Risk:** Slow page load with many submissions (>100)

**Task 24: Manager Review Button Component (4 hours)**

- Create ManagerReviewButton client component
- Dialog with two actions: "Approve for Admin" vs "Request Changes"
- Text area for manager notes (optional for approve, required for reject)
- Call /api/.../manager-review endpoint
- Show loading state during API call
- Toast notification on success/error
- router.refresh() to reload page data
- **File:** app/w/[slug]/admin/manager/queue/manager-review-button.tsx (NEW)
- **Dependencies:** Task 19 (API exists)
- **Deliverable:** Reusable review button component
- **Risk:** Confusing UX if user doesn't understand two-step approval

**Task 25: Assignment Management UI - Admin (5 hours)**

- Add "Manage Managers" button to challenge details page
- Create ChallengeManagersDialog component
- Show current assignments in dialog (list of managers with remove buttons)
- Dropdown to add new managers (filter WorkspaceMembership where role=MANAGER)
- Remove button for each assigned manager (with confirmation)
- Call assignment API endpoints
- Show loading states and error handling
- **File:** components/admin/challenge-managers-dialog.tsx (NEW)
- **Dependencies:** Tasks 16, 17 (assignment API)
- **Deliverable:** Admin UI for managing challenge assignments
- **Risk:** Accidentally unassigning active manager with pending reviews

**Task 26: Navigation Updates - Manager Section (1 hour)**

- Add "Manager Queue" link to admin sidebar
- Only show if user has MANAGER role (check WorkspaceMembership)
- Icon: ClipboardCheck from lucide-react
- Badge showing pending count (fetch from API or pass as prop)
- Position: Between "Participants" and "Challenges"
- **File:** components/navigation/admin-sidebar.tsx (modified)
- **Dependencies:** Task 23 (page exists to link to)
- **Deliverable:** Manager Queue in navigation
- **Risk:** Navigation clutter, badge not updating

### Testing

**Task 27: Authorization Tests - Manager Endpoints (4 hours)**

- Test: Manager can only see submissions for assigned challenges
- Test: Manager cannot review submissions for unassigned challenges (403)
- Test: PARTICIPANT cannot access manager queue endpoint (403)
- Test: ADMIN can access all manager endpoints
- Test: Cross-workspace assignment attempts fail
- **File:** tests/api/manager-auth.spec.ts (NEW)
- **Dependencies:** Tasks 18, 19
- **Deliverable:** 6+ authorization test cases
- **Risk:** Missing edge cases (deleted assignments, inactive users)

**Task 28: Approval Workflow Tests (4 hours)**

- Test: PENDING → MANAGER_APPROVED transition via manager-review
- Test: MANAGER_APPROVED → APPROVED transition via admin review
- Test: Manager approval with requireAdminReapproval=false auto-approves to APPROVED
- Test: Manager notes are saved in ActivitySubmission.managerNotes
- Test: ActivityEvent logged for each status transition
- Test: Admin can override MANAGER_APPROVED → REJECTED
- **File:** tests/api/manager-workflow.spec.ts (NEW)
- **Dependencies:** Tasks 19, 20
- **Deliverable:** 6+ workflow test cases
- **Risk:** Missing state transitions or edge cases

**Task 29: Assignment Tests (2 hours)**

- Test: Admin can assign manager to challenge
- Test: Admin can unassign manager from challenge
- Test: Cannot assign non-manager user (role check)
- Test: Cannot assign manager to challenge in different workspace
- Test: Duplicate assignment returns error
- **File:** tests/api/challenge-assignments.spec.ts (NEW)
- **Dependencies:** Tasks 16, 17
- **Deliverable:** 5+ assignment test cases
- **Risk:** Cross-workspace leakage not tested

**Task 30: Manager Test Data Factory (1 hour)**

- Create tests/helpers/factories.ts
- Add createManagerWithAssignment(workspaceId, challengeId) helper
- Add createSubmissionForManager(managerId, challengeId) helper
- Export MANAGER_EMAIL constant for auth tests
- Use in all manager-related tests
- **File:** tests/helpers/factories.ts (NEW)
- **Dependencies:** Task 9 (manager seed users exist)
- **Deliverable:** Reusable test helpers
- **Risk:** Test data conflicts with seed data

---

## PHASE 2 GATE: MVP READY

**Gate Criteria:**

- Manager can review assigned submissions end-to-end
- Two-step approval workflow working (manager → admin)
- Authorization tests passing (100% coverage on new endpoints)
- Manager queue loads <2 seconds with 100 submissions
- Zero critical security issues

**DECISION POINT:** Can ship v1.0 here with points-only rewards. Phase 3 optional for v1.1.

---

## PHASE 3: RewardSTACK Integration (Week 3) - Tasks 31-45

**KEY INSIGHT:** Phase 3 is INDEPENDENT of Phase 2. Can run in parallel after Phase 1 if two developers available.

### Environment & API Client

**Task 31: Environment Setup (30 minutes)**

- Add REWARDSTACK_API_KEY to .env.local and .env.example
- Add REWARDSTACK_WEBHOOK_SECRET to .env files
- Add REWARDSTACK_API_URL (SwaggerHub https://app.swaggerhub.com/apis/AllDigitalRewards/Marketplace/2.2
  https://alldigitalrewards.com/solutions/platform/
  https://alldigitalrewards.com/solutions/api-integration/rewardstack-api-documentation/ )
- Add INNGEST_EVENT_KEY and INNGEST_SIGNING_KEY
- Document environment variables in README
- **Dependencies:** None
- **Deliverable:** Environment variables configured
- **Risk:** Credentials not ready from RewardSTACK

**Task 32: RewardSTACK API Client - Core (4 hours)**

- Create lib/integrations/rewardstack/client.ts
- Implement createOrder(params) for SKU rewards
- Implement createPayment(params) for monetary rewards
- Add error handling with typed errors
- Add automatic retry logic (3 attempts with exponential backoff)
- Type-safe request/response interfaces
- **File:** lib/integrations/rewardstack/client.ts (NEW)
- **Dependencies:** Task 31
- **Deliverable:** Complete API client with type safety
- **Risk:** API structure differs from documentation

**Task 33: RewardSTACK API Client - Testing (2 hours)**

- Create lib/integrations/rewardstack/client.test.ts
- Mock fetch calls with jest or vitest
- Test success cases (createOrder, createPayment)
- Test error cases (network failure, API errors)
- Test retry logic (succeeds on 2nd attempt, fails after 3)
- **File:** lib/integrations/rewardstack/client.test.ts (NEW)
- **Dependencies:** Task 32
- **Deliverable:** Unit tests for API client (10+ tests)
- **Risk:** Mocking doesn't match real API behavior

**Task 34: Webhook Signature Verification (2 hours)**

- Create lib/integrations/rewardstack/webhooks.ts
- Implement verifySignature(payload, signature, secret) using HMAC SHA256
- Add timing-safe comparison to prevent timing attacks
- Add signature verification unit tests
- Document webhook security in code comments
- **File:** lib/integrations/rewardstack/webhooks.ts (NEW)
- **Dependencies:** Task 31
- **Deliverable:** Webhook security layer with tests
- **Risk:** Signature algorithm mismatch with RewardSTACK

### Async Job Queue

**Task 35: Async Job Queue Setup - Inngest (3 hours)**

- Install Inngest SDK: `pnpm add inngest`
- Create lib/jobs/client.ts with Inngest app configuration
- Create /api/inngest route for job execution endpoint
- Configure event schemas
- Test local development with Inngest dev server
- **Files:** lib/jobs/client.ts (NEW), app/api/inngest/route.ts (NEW)
- **Dependencies:** Task 31
- **Deliverable:** Working job queue infrastructure
- **Risk:** Inngest compatibility issues with Next.js 15 App Router

**Task 36: Reward Fulfillment Job (4 hours) - CORE LOGIC**

- Create lib/jobs/reward-fulfillment.ts
- Implement processRewardFulfillment(rewardIssuanceId) async job
- Handle SKU rewards: Call createOrder(), update status
- Handle monetary rewards: Call createPayment(), update status
- Update RewardIssuance status on success (ISSUED)
- Update RewardIssuance status on failure (FAILED)
- Add exponential backoff retry (3 attempts: 1m, 2m, 4m)
- Save attempt count and error messages in metadata
- **File:** lib/jobs/reward-fulfillment.ts (NEW)
- **Dependencies:** Tasks 32, 35
- **Deliverable:** Complete async fulfillment job
- **Risk:** Job doesn't handle all edge cases (network timeout, partial success)

**Task 37: Update issueReward() Function (2 hours)**

- Modify lib/db/queries.ts issueReward() function
- For points: Keep existing synchronous logic (no changes)
- For SKU/monetary: Enqueue processRewardFulfillment job
- Add job ID to RewardIssuance.metadata
- Don't change RewardIssuance creation (still PENDING)
- Test that points still work after changes
- **File:** lib/db/queries.ts (modified)
- **Dependencies:** Tasks 35, 36
- **Deliverable:** Integrated reward issuance with job queue
- **Risk:** CRITICAL - Breaking points rewards (regression)

### Webhook & Admin UI

**Task 38: Webhook Handler Endpoint (4 hours)**

- Create POST /api/webhooks/rewardstack
- Verify signature from x-rewardstack-signature header
- Parse webhook event type and payload
- Handle event types:
  - order.fulfilled: Update RewardIssuance to ISSUED, save tracking URL
  - order.failed: Update RewardIssuance to FAILED, save error message
  - order.shipped: Update metadata with tracking info
- Return 200 OK for valid webhooks
- Return 401 Unauthorized for invalid signatures
- Log all webhook events for debugging
- **File:** app/api/webhooks/rewardstack/route.ts (NEW)
- **Dependencies:** Tasks 34, 36
- **Deliverable:** Working webhook endpoint
- **Risk:** Webhook replay attacks, missing event types

**Task 39: RewardIssuance Schema Extensions (1 hour)**

- Add externalTransactionId: String? to RewardIssuance
- Add fulfillmentAttempts: Int @default(0)
- Add lastAttemptAt: DateTime?
- Generate migration
- Test migration on staging clone
- **File:** prisma/schema.prisma (modified)
- **Dependencies:** Phase 1 complete
- **Deliverable:** Extended RewardIssuance model
- **Risk:** Migration conflicts with Phase 1 changes

**Task 40: Manual Fulfillment UI - Admin (4 hours)**

- Create app/w/[slug]/admin/rewards/page.tsx
- List FAILED RewardIssuance records (status=FAILED)
- Show: User, Challenge, Type, Amount, Error message, Attempts
- "Retry" button to re-queue processRewardFulfillment job
- "Mark Fulfilled" button for manual resolution (sets status=ISSUED)
- Filter by type (SKU, monetary)
- Pagination if >50 failed rewards
- **File:** app/w/[slug]/admin/rewards/page.tsx (NEW)
- **Dependencies:** Task 39
- **Deliverable:** Admin reward management page
- **Risk:** Admin accidentally duplicates rewards by retrying

### Testing & Monitoring

**Task 41: Reward Fulfillment Tests - Unit (3 hours)**

- Test: SKU reward enqueues processRewardFulfillment job
- Test: Monetary reward enqueues processRewardFulfillment job
- Test: Points reward stays synchronous (no job enqueued)
- Test: Job updates RewardIssuance to ISSUED on success
- Test: Job updates RewardIssuance to FAILED after 3 retry attempts
- Test: Job saves error message in RewardIssuance.error
- **File:** tests/lib/reward-fulfillment.test.ts (NEW)
- **Dependencies:** Tasks 36, 37
- **Deliverable:** Unit tests for fulfillment job (6+ tests)
- **Risk:** Tests don't cover real API failures (mock limitations)

**Task 42: Webhook Tests with MSW (4 hours)**

- Install MSW: `pnpm add -D msw`
- Create tests/mocks/handlers.ts with RewardSTACK mock handlers
- Mock POST https://api.rewardstack.io/v1/orders
- Mock POST /api/webhooks/rewardstack callback
- Create tests/mocks/server.ts with MSW server setup
- Test full flow: Create SKU reward → Job calls API → Webhook updates status
- Test webhook signature verification (valid and invalid)
- **Files:** tests/mocks/handlers.ts (NEW), tests/mocks/server.ts (NEW)
- **Dependencies:** Task 38
- **Deliverable:** Integration tests with mocked RewardSTACK API
- **Risk:** Mock behavior doesn't match production API

**Task 43: Reward Dashboard - Participant (3 hours)**

- Add "My Rewards" tab to participant dashboard
- Show RewardIssuance records for current user
- Display: Type, Amount/SKU, Status, Issued date, Tracking URL (if SKU)
- Filter by type (points, SKU, monetary)
- Filter by status (PENDING, ISSUED, FAILED)
- Show helpful status messages ("Your gift card is on the way!")
- **File:** app/w/[slug]/participant/rewards/page.tsx (NEW)
- **Dependencies:** Task 39
- **Deliverable:** Participant-facing reward history
- **Risk:** Exposing sensitive transaction data (tracking URLs, amounts)

**Task 44: Error Monitoring Integration (2 hours)**

- Add Sentry/logging for failed fulfillments (if Sentry configured)
- Alert on RewardIssuance status=FAILED after max retries
- Log webhook signature failures
- Add metrics: Fulfillment success rate, average fulfillment time
- Dashboard query: Count of PENDING rewards older than 1 hour
- **Dependencies:** Task 36
- **Deliverable:** Monitoring for reward failures
- **Risk:** Alert fatigue if too noisy (false positives)

**Task 45: Phase 3 Gate Review (1 hour) - GO/NO-GO**

- Test SKU reward end-to-end with RewardSTACK sandbox API
- Verify webhook handler works (use ngrok for local testing)
- Review retry logic with simulated API failures
- Confirm <5% failure rate in sandbox
- **Dependencies:** All Phase 3 tasks (31-44)
- **Deliverable:** GO/NO-GO for production RewardSTACK integration
- **Risk:** RewardSTACK sandbox behaves differently than production

---

## PHASE 4: Polish & Production Readiness (Week 4) - Tasks 46-60

### Email Notifications

**Task 46: Email Template - Manager Assigned (2 hours)**

- Create lib/email/templates/manager-assigned.ts
- Copy pattern from invite.ts
- Include: Challenge name, workspace name, assignment date, CTA to manager queue
- Use Changemaker coral color scheme
- **File:** lib/email/templates/manager-assigned.ts (NEW)
- **Dependencies:** None (can start anytime)
- **Deliverable:** Manager assignment email template
- **Risk:** Email styling breaks in some clients (Outlook, Gmail)

**Task 47: Email Template - Submission Received (2 hours)**

- Create lib/email/templates/submission-received.ts
- Include: Participant name, challenge name, activity name, submission date, link to review
- Manager-focused tone ("A new submission needs your review")
- **File:** lib/email/templates/submission-received.ts (NEW)
- **Dependencies:** None
- **Deliverable:** Manager notification template
- **Risk:** Too many emails if high submission volume (100+ per day)

**Task 48: Email Template - Submission Approved (1.5 hours)**

- Create lib/email/templates/submission-approved.ts
- Include: Points/reward earned, manager notes (if any), challenge progress, next steps
- Positive, encouraging tone
- **File:** lib/email/templates/submission-approved.ts (NEW)
- **Dependencies:** None
- **Deliverable:** Participant success notification template
- **Risk:** Exposing sensitive reward details (SKU tracking before shipped)

**Task 49: Email Template - Submission Rejected (1.5 hours)**

- Create lib/email/templates/submission-rejected.ts
- Include: Manager notes (required), link to resubmit (if challenge allows), supportive tone
- Avoid harsh language ("needs improvement" vs "rejected")
- **File:** lib/email/templates/submission-rejected.ts (NEW)
- **Dependencies:** None
- **Deliverable:** Participant feedback notification template
- **Risk:** Harsh tone if manager notes not carefully worded

**Task 50: Email Trigger - Manager Assignment (1 hour)**

- Hook into assignManagerToChallenge() in lib/db/challenge-assignments.ts
- Send manager-assigned email asynchronously
- Log ActivityEvent for audit trail (type: MANAGER_ASSIGNED)
- Handle email send failures gracefully (log, don't block)
- **File:** lib/db/challenge-assignments.ts (modified)
- **Dependencies:** Tasks 46, 16
- **Deliverable:** Automated assignment notification
- **Risk:** Email fails silently (no error surfaced to admin)

**Task 51: Email Trigger - Submission Created (1 hour)**

- Hook into ActivitySubmission.create() (find the call site)
- Find assigned managers via getChallengeManagers()
- Send submission-received email to all assigned managers
- Don't send if challenge has no assigned managers
- **Dependencies:** Tasks 47, 10
- **Deliverable:** Automated manager notification on new submission
- **Risk:** Spamming managers if many submissions (need digest option later)

**Task 52: Email Trigger - Manager Approval (1 hour)**

- Hook into POST /api/workspaces/[slug]/submissions/[id]/manager-review (status=MANAGER_APPROVED)
- Send submission-approved email to participant
- Include manager notes in email
- Send after database commit (not before)
- **File:** app/api/workspaces/[slug]/submissions/[id]/manager-review/route.ts (modified)
- **Dependencies:** Tasks 48, 19
- **Deliverable:** Automated approval notification
- **Risk:** Email sent before database commit (race condition)

**Task 53: Email Trigger - Manager Rejection (1 hour)**

- Hook into POST /api/workspaces/[slug]/submissions/[id]/manager-review (status=NEEDS_REVISION)
- Send submission-rejected email to participant
- Include feedback and resubmission instructions
- **File:** Same as Task 52
- **Dependencies:** Tasks 49, 19
- **Deliverable:** Automated rejection notification
- **Risk:** Participant doesn't understand how to fix submission

### Comprehensive Testing

**Task 54: Comprehensive Integration Tests (8 hours) - CRITICAL GATE**

- Test full manager workflow end-to-end:
  - Admin assigns manager → Manager receives email
  - Participant submits → Manager receives email
  - Manager approves → Admin sees MANAGER_APPROVED, participant receives email
  - Admin approves → Points awarded, status=APPROVED
- Test full RewardSTACK workflow end-to-end:
  - Admin approves submission with SKU reward
  - Job enqueued, order created in RewardSTACK (mocked)
  - Webhook received, RewardIssuance updated to ISSUED
  - Participant sees tracking URL
- Test manager + RewardSTACK combined
- Test email triggers (with mock SMTP)
- Test webhook handling (signature verification, event types)
- **File:** tests/integration/full-workflow.spec.ts (NEW)
- **Dependencies:** All Phase 2 and 3 tasks
- **Deliverable:** Complete end-to-end test suite (10+ scenarios)
- **Risk:** CRITICAL - Tests are flaky due to timing issues (async jobs)

**Task 55: Performance Testing - Manager Queue (3 hours)**

- Create dataset with 500 pending submissions across 10 challenges
- Assign manager to all 10 challenges
- Load manager queue page
- Measure response time with Chrome DevTools
- Add pagination if >3 seconds
- Add database query logging to find slow queries
- Optimize with indexes or query changes
- **Dependencies:** Task 23
- **Deliverable:** Performance benchmarks, pagination if needed
- **Risk:** Production data size exceeds test (need to test with 5000+ submissions)

**Task 56: Security Audit - Authorization (4 hours) - CRITICAL GATE**

- Review all new API endpoints for authorization checks
- Test cross-workspace access attempts (manager sees other workspace submissions)
- Test role escalation attempts (participant calls manager endpoints)
- Penetration test manager assignment endpoints (assign to other workspace)
- Test JWT token manipulation
- Review webhook endpoint for replay attacks
- **Dependencies:** Phase 2 complete
- **Deliverable:** Security audit report with findings
- **Risk:** CRITICAL - Missing authorization check discovered late (production vulnerability)

### Documentation & Deployment

**Task 57: Documentation - API Endpoints (3 hours)**

- Document all new endpoints in docs/api/:
  - POST /api/workspaces/[slug]/challenges/[id]/managers
  - GET/DELETE manager assignment endpoints
  - GET /api/workspaces/[slug]/manager/queue
  - POST /api/workspaces/[slug]/submissions/[id]/manager-review
  - POST /api/webhooks/rewardstack
- Include request/response examples (JSON)
- Document authorization requirements (ADMIN, MANAGER, etc.)
- Document error codes (400, 401, 403, 404, 500)
- **File:** docs/api/manager-endpoints.md (NEW), docs/api/rewardstack-integration.md (NEW)
- **Dependencies:** Phases 2 and 3 complete
- **Deliverable:** Complete API documentation
- **Risk:** Docs out of sync with code if endpoints change

**Task 58: Documentation - User Guides (4 hours)**

- Write admin guide for manager assignment (docs/guides/admin-manager-assignment.md)
  - How to assign managers to challenges
  - How to configure manager approval settings
  - How to handle failed rewards
- Write manager guide for submission review (docs/guides/manager-review-guide.md)
  - How to access manager queue
  - How to approve/reject submissions
  - Best practices for feedback
- Write participant guide for rewards (docs/guides/participant-rewards-guide.md)
  - How to view reward status
  - What to do if reward fails
  - Tracking SKU shipments
- Include screenshots of key UI
- **Files:** docs/guides/*.md (NEW, 3 files)
- **Dependencies:** All UI complete
- **Deliverable:** User-facing documentation
- **Risk:** Screenshots become outdated quickly

**Task 59: Deployment Runbook (3 hours) - CRITICAL**

- Write step-by-step deployment procedure in docs/deployment/manager-role-runbook.md
- Include database migration steps (with timing estimates)
- Include rollback procedure for each phase
- Include environment variable checklist (copy from .env.example)
- Include smoke test checklist (manual QA steps)
- Include monitoring checklist (what to watch post-deployment)
- Include team communication template (Slack message, email)
- **File:** docs/deployment/manager-role-runbook.md (NEW)
- **Dependencies:** All phases complete
- **Deliverable:** Production-ready deployment runbook
- **Risk:** CRITICAL - Missing critical step causes production outage

**Task 60: Production Deployment & Monitoring (4 hours) - FINAL**

- Schedule deployment window (off-hours, coordinated with team)
- Backup production database: `pg_dump > backup_$(date +%Y%m%d).sql`
- Deploy to production (Vercel, AWS, etc.)
- Run database migrations: `pnpm prisma migrate deploy`
- Verify zero downtime (application stays up during migration)
- Monitor error rates for 2 hours (Sentry, CloudWatch, etc.)
- Enable RewardSTACK webhooks (register webhook URL with RewardSTACK)
- Run smoke tests from runbook
- Send deployment success notification to team
- **Dependencies:** All tasks 1-59
- **Deliverable:** Production deployment complete, monitoring active
- **Risk:** CRITICAL - Production issues not caught in staging (schema differences, environment variables)

---

## Phase 4 Gate Criteria (Production Ready)

- > 90% overall test coverage (133 tests, up from 58)
  >
- Zero critical security issues from audit
- Manager queue loads <2 seconds
- All email triggers working and tested
- Deployment runbook verified in staging
- Team sign-off on production deployment

---

## Summary Statistics

**Total Tasks:** 60

- Phase 1: 15 tasks (Foundation)
- Phase 2: 15 tasks (Manager Role)
- Phase 3: 15 tasks (RewardSTACK)
- Phase 4: 15 tasks (Polish & Production)

**New Files Created:** ~60 files

- Database: 2 migrations
- Backend: 10 TypeScript files (helpers, API clients, jobs)
- API Routes: 8 route files
- UI Components: 7 component/page files
- Tests: 15 test files
- Documentation: 6 documentation files
- Email Templates: 4 template files

**Test Coverage:**

- Starting: 58 tests
- Ending: 133 tests (+75 new tests)
- Increase: 130%

**Critical Gates:**

- Gate 1: Phase 1 complete, 100% tests pass
- Gate 2: Phase 2 complete, MVP ready to ship
- Gate 3: Phase 3 complete, RewardSTACK validated
- Final Gate: Phase 4 complete, production deployment

**Rollback Points:**

- Phase 1: SQL rollback script
- Phase 2: Feature flag FEATURE_MANAGER_WORKFLOW=false
- Phase 3: Feature flag FEATURE_EXTERNAL_REWARDS=false
- Phase 4: Disable email triggers

**Success Metrics:**

- Zero critical bugs in production
- Manager workflow reduces admin workload by 50%
- > 95% reward fulfillment success rate
  >
- <2 second page load times
- > 90% test coverage maintained
  >
