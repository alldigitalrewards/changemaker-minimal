# EPIC: Manager Role & RewardSTACK Integration

**Project**: Changemaker Multi-Tenant Platform
**Created**: October 20, 2025
**Current State**: 51/58 tests passing, production-ready workspace isolation
**Goal**: Add MANAGER role with submission approval workflow + integrate RewardSTACK API for SKU/monetary fulfillment

---

## Discovery Summary

### Discovery 1: Role System Architecture ✅

The Changemaker platform currently supports two roles (ADMIN, PARTICIPANT) via a Role enum in Prisma. The modern WorkspaceMembership model enables many-to-many user-workspace relationships with role-per-workspace isolation, though ~15-20 files still use the legacy User.workspaceId pattern. A critical security issue exists in requireWorkspaceAccess() which falls back to global User.role when no WorkspaceMembership is found.

Platform super admins bypass workspace checks via an email allowlist (not in Role enum), managed through isPlatformSuperAdmin() in lib/auth/rbac.ts. The ROLE_PERMISSIONS mapping defines granular permissions for each role. Authorization happens through requireAuth(), requireWorkspaceAccess(), and requireWorkspaceAdmin() helpers in lib/auth/api-auth.ts.

**Key Takeaways**:
- WorkspaceMembership is source of truth for roles (highest priority)
- Need to add MANAGER to Role enum (prisma/schema.prisma:519-522)
- ~15-20 files need migration from User.workspaceId to WorkspaceMembership queries
- Must remove global role fallback in requireWorkspaceAccess() (security risk)
- Need to add requireWorkspaceManager() and requireManagerAccess() helpers
- ROLE_PERMISSIONS needs MANAGER permission set (challenges:view_assigned, submissions:review, submissions:approve_first_level)

### Discovery 2: Submission Approval Flow ✅

The current approval flow is single-stage: Participant submits → status=PENDING → Admin reviews → status=APPROVED/REJECTED → issueReward() called. The createActivitySubmission() function (lib/db/queries.ts:1388-1467) creates submissions, reviewActivitySubmission() (1468-1505) updates status and review fields, and issueReward() (2351-2420) handles reward issuance. Currently only ADMIN can approve via requireWorkspaceAdmin() auth check.

The proposed manager workflow introduces multi-stage approval: PENDING → MANAGER_APPROVED (if requireAdminReapproval=true) → APPROVED, with NEEDS_REVISION status for manager rejections. This requires new SubmissionStatus enum values, new ActivitySubmission fields (managerReviewedBy, managerNotes, managerReviewedAt), and a Challenge.requireAdminReapproval boolean flag to toggle direct vs two-stage approval.

**Key Takeaways**:
- Current flow: createActivitySubmission() → reviewActivitySubmission() → issueReward()
- Insertion point: New managerReviewSubmission() function in lib/db/queries.ts
- Need MANAGER_APPROVED and NEEDS_REVISION status values in SubmissionStatus enum
- Need manager review fields in ActivitySubmission model
- Need Challenge.requireAdminReapproval flag (default: false)
- API endpoint: POST /api/workspaces/[slug]/submissions/[id]/manager-review
- Admin override: Admin can change MANAGER_APPROVED → REJECTED (log ADMIN_OVERRIDE_MANAGER event)

### Discovery 3: Manager Assignment Strategy ✅

Evaluated two approaches for assigning managers to challenges: Option A (array field in WorkspaceMembership) vs Option B (ChallengeAssignment join table). Chose Option B for fast bidirectional queries, built-in audit trail (assignedAt, assignedBy), automatic cascade deletes, and extensibility for future features like delegation or permissions.

The ChallengeAssignment model creates a many-to-many relationship between Users (with MANAGER role) and Challenges, scoped by workspaceId. Includes indexes on (managerId, workspaceId) and (challengeId) for query performance. The unique constraint on (challengeId, managerId) prevents duplicate assignments.

**Key Takeaways**:
- Create ChallengeAssignment join table with challengeId, managerId, workspaceId, assignedAt, assignedBy
- Add helper functions: assignChallengeManager(), removeChallengeManager(), getManagerAssignments(), getChallengeManagers(), isManagerAssignedToChallenge()
- API routes: POST/DELETE /api/workspaces/[slug]/challenges/[id]/managers, GET /api/workspaces/[slug]/challenges/[id]/managers
- Authorization: requireManagerAccess() checks if manager is assigned to specific challenge
- UI: Manager assignment form in admin challenge details, manager dashboard showing assigned challenges

### Discovery 4: RewardSTACK API Integration 🔍

RewardSTACK (ADR Marketplace Platform) is the external API for fulfilling SKU and monetary rewards. Currently, issueReward() creates RewardIssuance records with PENDING status for non-point rewards but has no fulfillment logic. Points are awarded synchronously via awardPointsWithBudget() in an atomic transaction.

Integration requires API client (lib/rewardstack/client.ts) with createRewardIssuance(), checkRewardStatus(), cancelReward() functions. Webhook handler at /api/webhooks/rewardstack processes reward.fulfilled, reward.failed, reward.cancelled events from RewardSTACK, updating RewardIssuance status and logging ActivityEvents.

**Key Takeaways**:
- API endpoints: Production (https://admin.alldigitalrewards.com), Staging (https://admin.stage.alldigitalrewards.com)
- Environment variables: REWARDSTACK_API_KEY, REWARDSTACK_API_URL, REWARDSTACK_WEBHOOK_SECRET
- Enhance issueReward() to call RewardSTACK API for SKU/monetary rewards
- Add rewardStackId field to RewardIssuance model
- Status lifecycle: PENDING → PENDING_FULFILLMENT → FULFILLED/FAILED/CANCELLED
- Create webhook handler with signature verification
- Admin UI for viewing reward status and manual retry of failed rewards

### Discovery 5: Notification System 🔍

Current email infrastructure uses NodeMailer + Resend SMTP (lib/email/smtp.ts) with synchronous sends. Only one template exists (invite.ts). The ActivityEvent table logs events for audit trail but is NOT used for notifications. Six new email templates are required for manager workflow notifications.

Email triggers map to workflow events: Manager assigned (ChallengeAssignment created), Submission received (notify managers), Manager approved (notify participant), Needs revision (notify participant with feedback), Admin re-approval needed (notify admins when MANAGER_APPROVED), Admin override (notify manager when decision overridden).

**Key Takeaways**:
- Create 6 email templates: manager-assigned.ts, submission-received-manager.ts, submission-approved-participant.ts, submission-needs-revision.ts, admin-reapproval-needed.ts, admin-override.ts
- Add send functions in lib/email/smtp.ts for each template
- Trigger points: POST /api/.../challenges/[id]/managers, createActivitySubmission(), managerReviewSubmission(), admin override in reviewActivitySubmission()
- Non-blocking sends (don't block submission update on email delivery)
- Retry logic for failed emails (3 attempts)
- Log ActivityEvents: SUBMISSION_MANAGER_APPROVED, SUBMISSION_MANAGER_REJECTED, SUBMISSION_NEEDS_REVISION, ADMIN_OVERRIDE_MANAGER, MANAGER_ASSIGNED, MANAGER_REMOVED

---

## Requirements (Original Ticket)

### Functional Requirements

1. **Manager Role**
   - Add MANAGER to Role enum
   - Managers can be assigned to specific challenges (many-to-many)
   - Managers can only review submissions for assigned challenges
   - Managers cannot access non-assigned challenges or workspace settings

2. **Submission Approval Workflow**
   - Manager reviews submission → Approve/Reject/Needs Revision
   - If Challenge.requireAdminReapproval=false: Manager approval directly approves submission and issues reward
   - If Challenge.requireAdminReapproval=true: Manager approval sets MANAGER_APPROVED status, awaits admin final approval
   - NEEDS_REVISION status allows participant to resubmit with feedback
   - Admin can override manager decisions (log to audit trail)

3. **RewardSTACK Integration**
   - SKU rewards call RewardSTACK API to create issuances
   - Monetary rewards call RewardSTACK API to create issuances
   - Points continue to use existing synchronous logic (no API call)
   - Webhook handler processes fulfillment status updates
   - Admin can view reward status and manually retry failed rewards

4. **Notifications**
   - Email managers when assigned to challenges
   - Email managers when submissions are received
   - Email participants when submissions approved/rejected/need revision
   - Email admins when manager-approved submissions await final review
   - Email managers when admins override their decisions

### Non-Functional Requirements

1. **Security**
   - Workspace isolation maintained (all queries filter by workspaceId)
   - Managers cannot escalate privileges
   - Platform super admins retain bypass capability
   - Webhook signature verification required

2. **Performance**
   - Manager dashboard <500ms response time
   - Proper database indexing for assignment queries
   - Email sends non-blocking (don't delay API responses)

3. **Testing**
   - 90%+ code coverage for new code
   - Integration tests for all approval scenarios
   - E2E tests for manager workflow
   - Webhook testing with RewardSTACK sandbox

4. **Data Integrity**
   - Database migrations backward-compatible
   - Audit trail in ApprovalHistory for all decisions
   - ActivityEvent logging for all status changes

---

## Planning Request

Create a detailed, prioritized implementation plan with:

### 1. Task Breakdown (numbered 1-50)

Each task should include:
- **ID**: Unique identifier (e.g., TASK-001)
- **Name**: Clear, actionable task name
- **Description**: What needs to be done, including specific files and functions
- **Estimate**: Time in hours (be realistic)
- **Dependencies**: Which tasks must complete first
- **Category**: Database | Backend | API | UI | Testing | Documentation

Group tasks by category and prioritize foundation work (schema, auth) before feature work (UI, notifications).

### 2. Dependency Graph

Provide a text-based or Mermaid diagram showing:
- Foundation tasks that block everything else
- Parallel tracks that can be worked on concurrently
- Critical path from start to production deployment

Example format:
```
Foundation (Days 1-2)
├── TASK-001: Add MANAGER to Role enum (blocks all manager features)
├── TASK-002: Create ChallengeAssignment table (blocks assignment features)
├── TASK-003: Add manager review fields to ActivitySubmission (blocks review workflow)
└── TASK-004: Remove global role fallback (security fix)

Parallel Track A: Manager Core (Days 3-4)
├── TASK-010: managerReviewSubmission() function
├── TASK-011: Manager review API endpoint
├── TASK-012: Manager dashboard UI
└── TASK-013: Manager submission review UI

Parallel Track B: RewardSTACK (Days 3-5)
├── TASK-020: RewardSTACK API client
├── TASK-021: Enhance issueReward() for SKU/monetary
├── TASK-022: Webhook handler
└── TASK-023: Admin reward management UI

Parallel Track C: Notifications (Days 4-5)
├── TASK-030: Create 6 email templates
├── TASK-031: Add send functions
└── TASK-032: Wire up trigger points
```

### 3. File Structure

Detail the new files and directories to be created:

```
lib/
  auth/
    manager-permissions.ts (NEW) - Manager-specific permission helpers
  integrations/
    rewardstack/ (NEW)
      client.ts - API client with createRewardIssuance(), checkRewardStatus(), cancelReward()
      webhooks.ts - Webhook signature verification and event handling
      types.ts - TypeScript types for RewardSTACK API
  email/
    templates/
      manager-assigned.ts (NEW)
      submission-received-manager.ts (NEW)
      submission-approved-participant.ts (NEW)
      submission-needs-revision.ts (NEW)
      admin-reapproval-needed.ts (NEW)
      admin-override.ts (NEW)

app/
  w/[slug]/manager/ (NEW)
    layout.tsx - Manager layout with role check
    dashboard/
      page.tsx - Stats cards, pending submissions alert
    challenges/
      page.tsx - List of assigned challenges
      [id]/
        submissions/
          page.tsx - Submission review with filters

  w/[slug]/admin/
    challenges/
      [id]/
        managers/
          page.tsx (NEW) - Manager assignment UI
    rewards/
      page.tsx (NEW) - Reward status dashboard

  api/
    workspaces/[slug]/
      submissions/[id]/
        manager-review/
          route.ts (NEW) - POST handler for manager review
      challenges/[id]/
        managers/
          route.ts (NEW) - POST/GET for assignment
          [managerId]/
            route.ts (NEW) - DELETE for removal
      rewards/
        [id]/
          retry/
            route.ts (NEW) - Manual reward retry
    webhooks/
      rewardstack/
        route.ts (NEW) - Webhook event handler

components/
  manager/
    submission-manager-review-button.tsx (NEW) - Manager review dialog
  admin/
    manager-assignment-form.tsx (NEW) - Assign managers to challenges
  navigation/
    manager-sidebar.tsx (NEW) - Manager nav items
```

### 4. Risk Assessment

| Risk | Severity | Probability | Mitigation | Contingency |
|------|----------|-------------|------------|-------------|
| Breaking existing tests | High | Medium | Run tests after each schema change, use transactions | Rollback migration, fix tests before proceeding |
| RewardSTACK API downtime | Medium | Low | Implement retry logic, queue failed rewards | Manual admin retry, status dashboard |
| Email delivery failures | Medium | Low | Non-blocking sends, retry queue | Log failures, admin notification dashboard |
| WorkspaceMembership migration bugs | High | Medium | Thorough testing, staged rollout | Keep legacy fallback temporarily |
| Database migration issues | High | Low | Test on staging replica, use transactions | Rollback plan, backup before migration |
| Performance degradation | Medium | Low | Proper indexing, query optimization | Add caching, pagination |
| Webhook signature bypass | High | Low | Strict signature verification | IP allowlist, rate limiting |
| Manager privilege escalation | High | Low | Authorization checks in all endpoints | Audit log review, role validation |

### 5. Migration Strategy

**Existing Users**:
- No changes required for existing ADMIN and PARTICIPANT users
- User.role enum automatically supports MANAGER after migration
- Existing WorkspaceMembership records remain valid

**Existing Submissions**:
- All existing submissions remain in current status (PENDING/APPROVED/REJECTED)
- New MANAGER_APPROVED and NEEDS_REVISION statuses only apply to new submissions reviewed by managers
- No data migration needed for ActivitySubmission table (new fields are nullable)

**Challenge Configuration**:
- Add Challenge.requireAdminReapproval field (default: false)
- Existing challenges default to direct approval (no admin re-approval needed)
- Admins can toggle this flag per challenge after deployment

**Backward Compatibility**:
- Keep legacy User.workspaceId + User.role for 30 days post-deployment
- WorkspaceMembership queries take priority (existing logic)
- Remove global role fallback only after confirming all files migrated

**Rollback Plan**:
- Database migrations are add-only (no drops or destructive changes)
- Feature flag: ENABLE_MANAGER_WORKFLOW (environment variable, default: false)
- Can disable manager workflow by setting flag to false without code rollback
- ApprovalHistory and ChallengeAssignment tables can remain (no harm if unused)

**Seed Data**:
- Create test manager user in staging: `manager@test.com` with MANAGER role
- Assign to test challenge for QA validation
- Production deployment does NOT auto-create managers (admin action required)

### 6. Testing Strategy

**Unit Tests** (90%+ coverage target):
- lib/auth/rbac.ts - hasPermission() with MANAGER role
- lib/auth/api-auth.ts - requireWorkspaceManager(), requireManagerAccess()
- lib/db/queries.ts - managerReviewSubmission(), assignChallengeManager(), all manager helper functions
- lib/integrations/rewardstack/client.ts - API calls, error handling, retry logic
- lib/integrations/rewardstack/webhooks.ts - Signature verification, event processing
- lib/email/smtp.ts - All new send functions
- New email templates - Template rendering with test data

**API Tests**:
- POST /api/workspaces/[slug]/submissions/[id]/manager-review - All approval scenarios
- POST /api/workspaces/[slug]/challenges/[id]/managers - Assignment validation, duplicate prevention
- DELETE /api/workspaces/[slug]/challenges/[id]/managers/[managerId] - Removal, authorization
- POST /api/webhooks/rewardstack - Signature verification, all event types, invalid payloads
- POST /api/workspaces/[slug]/rewards/[id]/retry - Failed reward retry logic

**Integration Tests** (Full workflow scenarios):
1. **Direct Manager Approval** (requireAdminReapproval=false)
   - Participant submits → Manager approves → Reward issued → Participant notified

2. **Two-Stage Approval** (requireAdminReapproval=true)
   - Participant submits → Manager approves → MANAGER_APPROVED status → Admin notified → Admin approves → Reward issued → Participant notified

3. **Manager Rejection** (NEEDS_REVISION)
   - Participant submits → Manager marks needs revision → Participant notified with feedback → Participant resubmits → Cycle repeats

4. **Admin Override**
   - Manager approves → MANAGER_APPROVED → Admin rejects → REJECTED → Manager notified → ApprovalHistory records both decisions

5. **RewardSTACK Integration**
   - Submission approved with SKU reward → RewardSTACK API called → RewardIssuance created (PENDING_FULFILLMENT) → Webhook received → Status updated to FULFILLED → ActivityEvent logged

6. **Assignment Workflow**
   - Admin assigns manager to challenge → Manager notified → Manager can view challenge → Manager cannot access non-assigned challenges

**E2E Tests** (Playwright):
- Manager login → Dashboard → Review submission → Approve → Verify reward
- Admin login → Assign manager → Verify assignment
- Participant login → Submit activity → Receive revision feedback → Resubmit
- Admin login → Override manager decision → Verify manager notification
- Admin login → View reward dashboard → Retry failed reward

**Mock Strategy**:
- RewardSTACK API calls mocked in unit/integration tests
- Real API calls only in staging environment E2E tests
- Webhook events simulated with test payloads
- Email sends mocked to verify templates without actual SMTP delivery

**Coverage Targets**:
- New code: 90%+ (enforced via CI)
- Critical paths: 100% (manager review, reward issuance, auth checks)
- Edge cases: 80%+ (error handling, validation, boundary conditions)

### 7. MVP Definition

**Phase 1 (Must-Have) - Days 1-4**:
- Database schema (MANAGER role, ChallengeAssignment, manager review fields, requireAdminReapproval)
- Auth refactoring (requireWorkspaceManager, requireManagerAccess, remove global fallback)
- Manager review workflow (managerReviewSubmission, API endpoint, basic UI)
- Challenge assignment (assign/remove managers, API routes, admin UI)
- Manager dashboard (basic stats, assigned challenges list)
- Core email notifications (manager assigned, submission received, approval/rejection)
- Basic testing (unit tests for new functions, API tests for new endpoints)

**Phase 2 (Nice-to-Have) - Days 5-6**:
- RewardSTACK integration (API client, webhook handler, reward status UI)
- Advanced notifications (admin re-approval, override notifications)
- ApprovalHistory audit table
- Manager submission filters (by status, date range)
- Admin reward management UI (retry failed rewards, export)
- Comprehensive E2E tests
- Performance optimization (query analysis, caching)
- Documentation (manager workflow guide, RewardSTACK integration docs)

**Phase 3 (Future Enhancements) - Post-MVP**:
- Manager delegation (assign sub-managers)
- Bulk approval actions
- Manager performance analytics (avg review time, approval rates)
- Custom email template editor
- Notification preferences (email vs in-app)
- Mobile-optimized manager dashboard
- Advanced reward analytics

---

## Output Format

Provide the implementation plan as **Markdown** with:
1. Clear section headers
2. Numbered task lists with IDs
3. Dependency graphs (text or Mermaid)
4. File structure tree
5. Risk assessment table
6. Migration strategy bullet points
7. Testing checklist
8. MVP vs Phase 2 breakdown

This plan should be ready to:
- Copy into GitHub issues (one issue per task)
- Share with team for estimation review
- Use as sprint planning input
- Track in project management tools

**Requested Plan Timeline**: 5-6 days (not weeks)
**Team Size**: 1-2 developers
**Start Date**: October 21, 2025
**Target Completion**: October 26-27, 2025
