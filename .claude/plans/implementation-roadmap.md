# Manager Role + RewardSTACK Implementation Roadmap

## Overview

This roadmap tracks the implementation of the MANAGER role and enhanced submission approval workflow for the Changemaker platform. The work is organized into four phases, with Phase 1 and Phase 2 now complete.

**Current Status**: Phase 2 Complete ✓ | Phase 3 Planning ✓ | Ready for Implementation

**Phase Completion**:
- ✅ **Phase 1 (Foundation)**: COMPLETE - Database schema, auth refactoring, RBAC
- ✅ **Phase 2 (Manager Core)**: COMPLETE - Manager review logic, UI, RLS policies (22/22 tests passing)
- 🎯 **Phase 3 (RewardSTACK)**: PLANNED - Comprehensive implementation plan ready
- ⏸️ **Phase 4 (Polish)**: PENDING - Awaits Phase 3 completion

**Documentation Artifacts**:
- `/tmp/roles-permissions-review.md` - Complete roles & permissions architecture (400+ lines)
- `/tmp/phase-3-rewardstack-integration-plan.md` - Detailed Phase 3 plan (1642 lines)
- `tests/security/rls-policies.spec.ts` - RLS validation (22/22 tests passing, 14.8s)
- `tests/api/manager-auth.spec.ts` - Manager authorization (10/10 tests passing)

**Critical Dependencies**:
1. ✅ Phase 1 (Database Schema) → Phase 2 (Manager Core) - COMPLETE
2. ✅ Phase 2 (Manager approval logic) → Phase 3 (RewardSTACK) - READY
3. Phase 3 (RewardSTACK) → Phase 4 (Polish)

## Phase 1: Foundation ✅ COMPLETE

**Status**: All tasks complete - Database schema, auth refactoring, WorkspaceMembership migration
**Completion Date**: October 2025
**Validation**: RLS policies enforcing authorization at database level

### Database Schema ✓

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

## Phase 2: Manager Core ✅ COMPLETE

**Status**: All tasks complete - Manager review logic, UI, RLS policies enforced
**Completion Date**: October 2025
**Validation**:
- ✅ 22/22 RLS policy tests passing (14.8s runtime)
- ✅ 10/10 manager authorization tests passing
- ✅ Manager workflow: PENDING → MANAGER_APPROVED → APPROVED
- ✅ Assignment-based access via ChallengeAssignment table
- ✅ Two-stage approval flow operational

**Key Achievements**:
- Manager role fully implemented with assignment-based permissions
- RLS policies enforce database-level authorization for all roles
- Manager can only access/review submissions for assigned challenges
- Admin retains full approval authority and reward issuance
- Complete test coverage for authorization edge cases

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

## Phase 3: RewardSTACK Integration 🎯 READY FOR IMPLEMENTATION

**Status**: Planning complete - Comprehensive implementation plan with 5 weekly phases
**Dependencies**: Phase 2 complete ✓ (Manager approval workflow operational)
**Detailed Plan**: `/tmp/phase-3-rewardstack-integration-plan.md` (1642 lines)

**Goal**: Integrate AllDigitalRewards RewardSTACK Marketplace API for external reward fulfillment.

**Overview**: This phase transforms the local reward tracking system into a fully integrated external reward platform. The implementation is organized into 5 weekly sub-phases (3.1-3.5) that progressively build from authentication setup through monitoring and reconciliation.

**Target State**:
- ✓ Seamless RewardSTACK API integration with JWT bearer auth
- ✓ Automatic participant sync on first reward issuance
- ✓ Real-time reward fulfillment: Points, SKU, and monetary transactions
- ✓ SSO integration for participant catalog access
- ✓ Robust error handling with retry logic and reconciliation dashboard
- ✓ Admin monitoring for reward issuance stats and failed transaction recovery

**Key Integration Points**:
1. **Authentication** - JWT bearer tokens (2-hour expiry, auto-refresh)
2. **Participant Management** - Lazy sync on first reward, PATCH for updates
3. **Point Rewards** - POST to /adjustments endpoint with reason codes
4. **SKU Rewards** - POST to /transactions endpoint with catalog items
5. **SSO** - GET token for participant catalog access
6. **Error Recovery** - Retry logic for transient failures, manual reconciliation UI

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

### Weekly Sub-Phases (Phase 3 Implementation Plan)

**Session Preparation Instructions**:
Before starting each Phase 3 task session, use the Context7 MCP tool to retrieve the latest RewardSTACK API documentation:

```bash
# In Claude Code, use the Context7 MCP tool:
mcp__context7__resolve-library-id with libraryName: "context7.com/websites/app_swaggerhub_apis_alldigitalrewards_marketplace"

# Then fetch the relevant API section for your task:
mcp__context7__get-library-docs with:
  - context7CompatibleLibraryID: (use the ID from resolve step)
  - topic: "authentication" | "participants" | "adjustments" | "transactions" | "sso"
  - tokens: 5000 (adjust based on complexity)
```

**Why This Matters**: The RewardSTACK API spec is the source of truth for endpoint paths, request/response schemas, authentication headers, and error codes. Loading it into each session prevents implementation errors and ensures API contract compliance.

**API Documentation Resource**: `context7.com/websites/app_swaggerhub_apis_alldigitalrewards_marketplace`

---

#### Phase 3.1: Setup & Configuration (Week 1) 🔧

**Goal**: Establish RewardSTACK integration foundation and admin configuration UI

**Session Setup**:
- [ ] Load API docs via Context7: `mcp__context7__get-library-docs` with topic: "authentication"
- [ ] Review authentication section: JWT bearer token requirements, token expiry (2 hours)
- [ ] Check API base URLs: Production vs Staging environments

**Tasks**:

**Database Schema (Migration: `supabase/migrations/YYYYMMDD_rewardstack_integration.sql`)**:
- [ ] Add Workspace fields for RewardSTACK configuration:
  - `rewardStackEnabled BOOLEAN DEFAULT false` - Feature flag
  - `rewardStackApiKey TEXT` - Encrypted API key (use pgcrypto)
  - `rewardStackApiUrl TEXT` - Production or Staging URL
  - `rewardStackProgramId TEXT` - Program identifier from RewardSTACK
  - `rewardStackEnvironment TEXT CHECK (rewardStackEnvironment IN ('production', 'staging'))` - Environment indicator
- [ ] Add User fields for participant tracking:
  - `rewardStackParticipantId TEXT UNIQUE` - External participant ID from RewardSTACK
  - `rewardStackSyncedAt TIMESTAMP` - Last sync timestamp for reconciliation
  - `rewardStackSyncError TEXT` - Last sync error message (if any)
- [ ] Add RewardIssuance fields for transaction tracking:
  - `externalTransactionId TEXT` - RewardSTACK transaction/adjustment ID
  - `externalStatus TEXT` - RewardSTACK API status (pending, completed, failed)
  - `externalResponse JSONB` - Full API response for debugging (includes error details)
  - `retryCount INTEGER DEFAULT 0` - Number of retry attempts
  - `lastRetryAt TIMESTAMP` - Timestamp of last retry
- [ ] Add TenantSku field for catalog mapping:
  - `rewardStackSkuId TEXT` - SKU ID from RewardSTACK catalog
- [ ] Add indexes for performance:
  - `CREATE INDEX idx_reward_issuance_external_status ON "RewardIssuance"(externalStatus) WHERE externalStatus IS NOT NULL;`
  - `CREATE INDEX idx_reward_issuance_retry ON "RewardIssuance"(status, retryCount, lastRetryAt) WHERE status = 'FAILED';`
  - `CREATE INDEX idx_user_rewardstack_participant ON "User"(rewardStackParticipantId) WHERE rewardStackParticipantId IS NOT NULL;`

**Authentication Layer (`lib/rewardstack/auth.ts`)**:
- [ ] Implement `generateBearerToken()` function:
  - Fetch API key from Workspace.rewardStackApiKey (decrypt if encrypted)
  - Generate JWT with 2-hour expiry: `{ apiKey: string, programId: string, exp: number }`
  - Use `jsonwebtoken` library or built-in Web Crypto API
  - Return token string for Authorization header
- [ ] Implement `getAuthHeaders()` function:
  - Return `{ 'Authorization': 'Bearer ${token}', 'Content-Type': 'application/json' }`
  - Cache token in memory with expiry check
  - Automatically refresh token if within 5 minutes of expiry
- [ ] Implement `refreshToken()` function:
  - Check if cached token expires within 5 minutes
  - Generate new token if needed
  - Update in-memory cache
- [ ] Error handling:
  - Throw `AuthenticationError` for 401 responses with retry logic
  - Throw `ConfigurationError` if API key missing or invalid
  - Log all auth attempts for security audit

**Admin Settings UI (`app/w/[slug]/admin/settings/integrations/page.tsx`)**:
- [ ] Create integrations settings page with tab navigation:
  - Tab 1: RewardSTACK
  - Tab 2: (Future integrations placeholder)
- [ ] RewardSTACK configuration form:
  - Environment dropdown: Production (https://admin.alldigitalrewards.com) | Staging (https://admin.stage.alldigitalrewards.com)
  - API Key input (password field, masked)
  - Program ID input (text field)
  - Enable/Disable toggle (updates Workspace.rewardStackEnabled)
  - Save button with loading state
- [ ] Test connection button:
  - On click: POST to `/api/workspaces/[slug]/rewardstack/test-connection`
  - Shows success toast: "Connection successful! Program: {programName}"
  - Shows error toast with details if fails
- [ ] Display current configuration status:
  - Badge: "Enabled" (green) or "Disabled" (gray)
  - Last connection test timestamp
  - Connection health indicator (green/yellow/red)
- [ ] Validation:
  - API Key required if enabled
  - Program ID required if enabled
  - Environment required if enabled
  - Confirm dialog before disabling (warns about pending rewards)

**API Route (`app/api/workspaces/[slug]/rewardstack/test-connection/route.ts`)**:
- [ ] POST handler:
  - Auth: `requireWorkspaceAdmin(slug)`
  - Accept: `{ apiKey: string, programId: string, environment: 'production' | 'staging' }`
  - Generate bearer token using provided credentials
  - Call RewardSTACK API: GET /api/2.0/programs/{programId}
  - Return success: `{ success: true, program: { id, name, description } }`
  - Return error: `{ success: false, error: string, details: object }`
  - Do NOT save credentials (test only)

**Configuration Update Route (`app/api/workspaces/[slug]/rewardstack/config/route.ts`)**:
- [ ] PUT handler:
  - Auth: `requireWorkspaceAdmin(slug)`
  - Accept: `{ enabled: boolean, apiKey?: string, programId?: string, environment?: string }`
  - Validate all required fields if enabled
  - Encrypt API key before storing (use pgcrypto or crypto module)
  - Update Workspace record in transaction
  - Return: `{ success: true, config: { enabled, programId, environment } }`
  - Log configuration change in ActivityEvent for audit

**Testing Checklist (Phase 3.1)**:
- [ ] Unit tests for auth token generation (valid/expired tokens)
- [ ] Test API key encryption/decryption
- [ ] Test connection with valid credentials (staging environment)
- [ ] Test connection with invalid credentials (401 error handling)
- [ ] Test UI form validation (missing fields, invalid format)
- [ ] Test enable/disable toggle (database updates correctly)
- [ ] Test configuration update with audit logging
- [ ] Verify migration applies cleanly to existing database
- [ ] Verify indexes created successfully (check query performance)

**Deliverable**: Admin can enable RewardSTACK, configure credentials securely, test connection, and view configuration status

#### Phase 3.2: Participant Sync (Week 2) 👥

**Goal**: Implement automatic participant creation in RewardSTACK on first reward

**Session Setup**:
- [ ] Load API docs via Context7: `mcp__context7__get-library-docs` with topic: "participants"
- [ ] Review participant endpoints: POST /api/2.0/participants, PATCH /api/2.0/participants/{uniqueId}
- [ ] Check required fields: uniqueId, firstName, lastName, email, programId
- [ ] Review error responses: 400 (duplicate participant), 401 (auth), 422 (validation)

**Tasks**:

**Participant Management Service (`lib/rewardstack/participants.ts`)**:
- [ ] Create participant sync interface:
  ```typescript
  interface ParticipantSyncData {
    uniqueId: string;        // User.id from Changemaker
    firstName: string;
    lastName: string;
    email: string;
    programId: string;       // From Workspace.rewardStackProgramId
    metadata?: {             // Optional custom fields
      workspaceId: string;
      enrollmentDate: string;
    };
  }
  ```
- [ ] Implement `createParticipant(data: ParticipantSyncData)`:
  - POST to `/api/2.0/participants` with JWT bearer token
  - Request body: `{ uniqueId, firstName, lastName, email, programId, metadata }`
  - Response: `{ participantId: string, status: "active", createdAt: string }`
  - Error handling: 400 (duplicate uniqueId), 401 (auth), 422 (validation)
  - Return `{ success: boolean, participantId?: string, error?: string }`
- [ ] Implement `updateParticipant(participantId: string, data: Partial<ParticipantSyncData>)`:
  - PATCH to `/api/2.0/participants/{participantId}`
  - Update email, name, or metadata fields
  - Handle 404 (participant not found), 422 (validation errors)
- [ ] Implement `getParticipant(participantId: string)`:
  - GET to `/api/2.0/participants/{participantId}`
  - Return participant data including current point balance
  - Cache response for 5 minutes (to reduce API calls)
- [ ] Add error logging:
  - Log all API calls to `console.log` with request/response details
  - Store errors in `User.rewardStackSyncError` for admin visibility
  - Track sync timestamps in `User.rewardStackSyncedAt`

**Lazy Sync Integration (`lib/db/queries.ts` - `issueReward()` function)**:
- [ ] Add participant sync check before reward issuance:
  ```typescript
  async function issueReward(submissionId: string) {
    const submission = await getSubmissionWithUser(submissionId);
    const user = submission.user;

    // Check if user needs RewardSTACK sync
    if (!user.rewardStackParticipantId) {
      const syncResult = await createParticipant({
        uniqueId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        programId: workspace.rewardStackProgramId,
      });

      if (!syncResult.success) {
        throw new Error(`Failed to sync participant: ${syncResult.error}`);
      }

      // Update User record with participant ID
      await prisma.user.update({
        where: { id: user.id },
        data: {
          rewardStackParticipantId: syncResult.participantId,
          rewardStackSyncedAt: new Date(),
          rewardStackSyncError: null,
        },
      });
    }

    // Proceed with reward issuance...
  }
  ```
- [ ] Handle sync failures gracefully:
  - Log error to `User.rewardStackSyncError`
  - Set `RewardIssuance.status` to FAILED with error message in `externalResponse`
  - Allow admin to manually retry sync from reconciliation dashboard
- [ ] Add database transaction to ensure atomicity:
  - Participant sync + User update + RewardIssuance creation should succeed or fail together
  - Use Prisma `$transaction()` to wrap all operations

**Unit Tests (`tests/unit/rewardstack-participants.spec.ts`)**:
- [ ] Test `createParticipant()` success:
  - Mock POST request to return valid participant ID
  - Verify User record is updated with participantId and syncedAt
- [ ] Test duplicate participant detection (400 error):
  - API returns 400 "Participant with uniqueId already exists"
  - Function should attempt `getParticipant()` to retrieve existing ID
  - Store existing ID in User record
- [ ] Test email validation (422 error):
  - API returns 422 "Invalid email format"
  - Function logs error to `User.rewardStackSyncError`
  - Reward issuance is blocked until email is corrected
- [ ] Test network timeout (30s):
  - Simulate request timeout
  - Function should retry once, then fail gracefully
  - Log timeout error for admin investigation
- [ ] Test authentication failure (401 error):
  - Mock expired JWT token
  - Function should trigger token refresh and retry
  - If refresh fails, throw authentication error
- [ ] Test lazy sync trigger:
  - User without `rewardStackParticipantId` triggers sync
  - User with existing `rewardStackParticipantId` skips sync
  - Verify `issueReward()` only syncs when necessary
- [ ] Test sync error recovery:
  - Failed sync stores error in `User.rewardStackSyncError`
  - Admin manually clears error (fixes user data)
  - Next reward issuance retries sync successfully

**Deliverable**: Participants are automatically synced to RewardSTACK on first reward issuance, with robust error handling and manual retry capability for admins.

#### Phase 3.3: Point Rewards (Week 3) 💰

**Goal**: Enable point adjustments via RewardSTACK API on submission approval

**Session Setup**:
- [ ] Load API docs via Context7: `mcp__context7__get-library-docs` with topic: "adjustments"
- [ ] Review adjustments endpoint: POST /api/2.0/adjustments
- [ ] Check required fields: participantId, programId, points, reason, description
- [ ] Review response schema: adjustmentId, status, balance, createdAt
- [ ] Check error codes: 400 (invalid points), 404 (participant not found), 422 (validation)

**Tasks**:

**Point Adjustment Service (`lib/rewardstack/rewards.ts`)**:
- [ ] Create point adjustment interface:
  ```typescript
  interface PointAdjustmentRequest {
    participantId: string;      // User.rewardStackParticipantId
    programId: string;          // Workspace.rewardStackProgramId
    points: number;             // Reward amount (positive for credit, negative for debit)
    reason: string;             // Reason code: "CHALLENGE_COMPLETION", "MANUAL_ADJUSTMENT"
    description: string;        // Human-readable: "Completed activity: [Activity Title]"
    metadata?: {
      activityId: string;
      submissionId: string;
      challengeId: string;
    };
  }

  interface PointAdjustmentResponse {
    adjustmentId: string;       // RewardSTACK transaction ID
    status: "pending" | "completed" | "failed";
    balance: number;            // New point balance after adjustment
    createdAt: string;          // ISO 8601 timestamp
  }
  ```
- [ ] Implement `issuePointReward(request: PointAdjustmentRequest)`:
  - POST to `/api/2.0/adjustments` with JWT bearer token
  - Request body: `{ participantId, programId, points, reason, description, metadata }`
  - Response parsing: Extract `adjustmentId`, `status`, `balance`, `createdAt`
  - Error handling:
    - 400 (invalid points value): Reject negative rewards, validate amount
    - 404 (participant not found): Participant not synced yet, trigger sync
    - 422 (validation error): Log details to `RewardIssuance.externalResponse`
    - 500 (server error): Mark as transient failure for retry
  - Return `{ success: boolean, adjustmentId?: string, error?: string }`
- [ ] Implement retry logic with exponential backoff:
  ```typescript
  async function issuePointRewardWithRetry(
    request: PointAdjustmentRequest,
    maxRetries = 3
  ): Promise<PointAdjustmentResponse> {
    let attempt = 0;
    let lastError: Error;

    while (attempt < maxRetries) {
      try {
        const response = await issuePointReward(request);
        if (response.success) {
          return response;
        }

        // Check if error is retryable
        if (!isTransientError(response.error)) {
          throw new Error(response.error); // Permanent failure
        }

        lastError = new Error(response.error);
      } catch (error) {
        lastError = error;
      }

      attempt++;
      const delayMs = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      await sleep(delayMs);
    }

    throw new Error(`Failed after ${maxRetries} retries: ${lastError.message}`);
  }

  function isTransientError(errorMessage: string): boolean {
    // Retry on network, timeout, and 5xx errors
    return errorMessage.includes("timeout") ||
           errorMessage.includes("network") ||
           errorMessage.includes("500") ||
           errorMessage.includes("502") ||
           errorMessage.includes("503");
  }
  ```
- [ ] Add request timeout handling:
  - Set 30-second timeout for all API calls
  - Cancel request if timeout is reached
  - Log timeout as transient error for retry

**Approval Workflow Integration (`lib/db/queries.ts` - `issueReward()` function)**:
- [ ] Modify `issueReward()` to detect point rewards:
  ```typescript
  async function issueReward(submissionId: string) {
    const submission = await getSubmissionWithUser(submissionId);
    const reward = submission.activity.rewardConfig;

    // Ensure participant is synced (from Phase 3.2)
    await ensureParticipantSynced(submission.user);

    // Handle point rewards via RewardSTACK
    if (reward.type === 'POINTS') {
      try {
        const adjustmentResult = await issuePointRewardWithRetry({
          participantId: submission.user.rewardStackParticipantId,
          programId: workspace.rewardStackProgramId,
          points: reward.amount,
          reason: "CHALLENGE_COMPLETION",
          description: `Completed activity: ${submission.activity.title}`,
          metadata: {
            activityId: submission.activity.id,
            submissionId: submission.id,
            challengeId: submission.activity.challengeId,
          },
        });

        // Create RewardIssuance record
        await prisma.rewardIssuance.create({
          data: {
            userId: submission.userId,
            activitySubmissionId: submissionId,
            type: 'POINTS',
            amount: reward.amount,
            status: 'ISSUED',
            externalTransactionId: adjustmentResult.adjustmentId,
            externalStatus: adjustmentResult.status,
            externalResponse: adjustmentResult, // Store full response
            issuedAt: new Date(),
          },
        });

        return { success: true, adjustmentId: adjustmentResult.adjustmentId };
      } catch (error) {
        // Log failed reward for manual retry
        await prisma.rewardIssuance.create({
          data: {
            userId: submission.userId,
            activitySubmissionId: submissionId,
            type: 'POINTS',
            amount: reward.amount,
            status: 'FAILED',
            externalResponse: { error: error.message },
            retryCount: 3, // Exhausted retries
            lastRetryAt: new Date(),
          },
        });

        throw new Error(`Failed to issue point reward: ${error.message}`);
      }
    }

    // SKU and monetary rewards handled in Phase 3.4...
  }
  ```
- [ ] Update ActivityEvent logging:
  - Log REWARD_ISSUED event with `externalTransactionId`
  - Log REWARD_FAILED event with error message
  - Track all status changes for audit trail
- [ ] Add database indexes for performance:
  - `CREATE INDEX idx_reward_issuance_status ON "RewardIssuance"(status) WHERE status = 'FAILED';`
  - `CREATE INDEX idx_reward_issuance_retry ON "RewardIssuance"(retryCount, lastRetryAt);`

**Integration Tests (`tests/integration/rewardstack-point-rewards.spec.ts`)**:
- [ ] Test successful point issuance (sandbox environment):
  - Create test participant in RewardSTACK sandbox
  - Approve submission with point reward
  - Verify `RewardIssuance` created with `status=ISSUED`
  - Verify `externalTransactionId` is stored
  - Check participant balance increased in RewardSTACK
- [ ] Test API authentication error (401):
  - Mock expired JWT token
  - Verify token refresh is triggered
  - Verify retry succeeds after refresh
- [ ] Test invalid points error (400):
  - Attempt to issue negative points
  - Verify `RewardIssuance.status=FAILED`
  - Verify error message in `externalResponse`
- [ ] Test participant not found (404):
  - Delete participant from RewardSTACK
  - Attempt point issuance
  - Verify participant re-sync is triggered
  - Verify retry succeeds after sync
- [ ] Test network timeout:
  - Simulate 30-second timeout
  - Verify retry with exponential backoff
  - Verify success on 2nd attempt
- [ ] Test API server error (500):
  - Mock 500 response from RewardSTACK
  - Verify 3 retry attempts with backoff
  - Verify `RewardIssuance.status=FAILED` after exhausting retries
  - Verify `retryCount=3` in database
- [ ] Test concurrent reward issuances:
  - Approve multiple submissions simultaneously
  - Verify all rewards are issued independently
  - Verify no race conditions in database
- [ ] Test reward issuance rollback:
  - API call succeeds but database update fails
  - Verify transaction is rolled back
  - Verify no orphaned `RewardIssuance` records

**Deliverable**: Points are automatically issued on submission approval with exponential backoff retry logic. Failed rewards are logged for manual admin retry via reconciliation dashboard (implemented in Phase 3.4).

#### Phase 3.4: SKU Rewards & SSO (Week 4) 🎁

**Goal**: Complete SKU transactions and enable catalog browsing for participants

**Session Setup**:
- [ ] Load API docs via Context7: `mcp__context7__get-library-docs` with topic: "transactions"
- [ ] Review transactions endpoint: POST /api/2.0/transactions
- [ ] Check required fields: participantId, programId, skuId, quantity, description
- [ ] Review SKU validation: Ensure SKU exists in catalog before transaction
- [ ] Check transaction response: transactionId, status, fulfillmentStatus
- [ ] Load SSO docs: `mcp__context7__get-library-docs` with topic: "sso"
- [ ] Review SSO token endpoint: GET /api/2.0/sso/token
- [ ] Check SSO response: token, redirectUrl, expiresAt

**Tasks**:

**SKU Transaction Service (`lib/rewardstack/rewards.ts`)**:
- [ ] Create SKU transaction interface:
  ```typescript
  interface SkuTransactionRequest {
    participantId: string;      // User.rewardStackParticipantId
    programId: string;          // Workspace.rewardStackProgramId
    skuId: string;              // TenantSku.rewardStackSkuId
    quantity: number;           // Usually 1 for single item
    description: string;        // "Reward for completing: [Activity Title]"
    metadata?: {
      activityId: string;
      submissionId: string;
      challengeId: string;
    };
  }

  interface SkuTransactionResponse {
    transactionId: string;      // RewardSTACK transaction ID
    status: "pending" | "completed" | "failed";
    fulfillmentStatus: "pending" | "processing" | "shipped" | "delivered";
    createdAt: string;          // ISO 8601 timestamp
    estimatedDeliveryDate?: string;
  }
  ```
- [ ] Implement `issueSkuReward(request: SkuTransactionRequest)`:
  - POST to `/api/2.0/transactions` with JWT bearer token
  - Request body: `{ participantId, programId, skuId, quantity, description, metadata }`
  - Response parsing: Extract `transactionId`, `status`, `fulfillmentStatus`, `createdAt`
  - Error handling:
    - 400 (invalid SKU): SKU not found in catalog or inactive
    - 404 (participant not found): Trigger participant sync
    - 422 (validation error): Invalid quantity or missing fields
    - 500 (server error): Mark as transient failure for retry
  - Use same retry logic as point rewards (exponential backoff, 3 max retries)
- [ ] Add SKU validation before transaction:
  ```typescript
  async function validateSku(skuId: string, programId: string): Promise<boolean> {
    // Check if SKU exists in RewardSTACK catalog
    const response = await fetch(`${apiUrl}/api/2.0/catalog/skus/${skuId}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Program-Id': programId },
    });

    if (!response.ok) {
      throw new Error(`SKU ${skuId} not found in catalog`);
    }

    const sku = await response.json();
    return sku.active && sku.inStock;
  }
  ```
- [ ] Integrate SKU rewards in `issueReward()` function:
  ```typescript
  // Add to lib/db/queries.ts issueReward()
  if (reward.type === 'SKU') {
    // Validate SKU before transaction
    const isValid = await validateSku(reward.skuId, workspace.rewardStackProgramId);
    if (!isValid) {
      throw new Error(`SKU ${reward.skuId} is inactive or out of stock`);
    }

    const transactionResult = await issueSkuRewardWithRetry({
      participantId: user.rewardStackParticipantId,
      programId: workspace.rewardStackProgramId,
      skuId: reward.skuId,
      quantity: 1,
      description: `Reward for completing: ${activity.title}`,
      metadata: { activityId, submissionId, challengeId },
    });

    await prisma.rewardIssuance.create({
      data: {
        userId: submission.userId,
        activitySubmissionId: submissionId,
        type: 'SKU',
        skuId: reward.skuId,
        status: 'ISSUED',
        externalTransactionId: transactionResult.transactionId,
        externalStatus: transactionResult.fulfillmentStatus,
        externalResponse: transactionResult,
        issuedAt: new Date(),
      },
    });
  }
  ```

**SSO Endpoint (`app/api/rewardstack/sso/route.ts`)**:
- [ ] Create SSO token endpoint:
  ```typescript
  // POST /api/rewardstack/sso
  // Returns SSO token and redirect URL for participant catalog access
  export async function POST(req: Request) {
    const session = await getServerSession();
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { workspaceSlug } = await req.json();
    const workspace = await getWorkspaceBySlug(workspaceSlug);

    // Get RewardSTACK participant ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { rewardStackParticipantId: true },
    });

    if (!user?.rewardStackParticipantId) {
      return Response.json({ error: 'Participant not synced' }, { status: 400 });
    }

    // Request SSO token from RewardSTACK
    const token = await getAuthToken(workspace);
    const ssoResponse = await fetch(
      `${workspace.rewardStackApiUrl}/api/2.0/sso/token`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Participant-Id': user.rewardStackParticipantId,
          'X-Program-Id': workspace.rewardStackProgramId,
        },
      }
    );

    const ssoData = await ssoResponse.json();
    return Response.json({
      token: ssoData.token,
      redirectUrl: ssoData.redirectUrl,  // RewardSTACK catalog URL with token
      expiresAt: ssoData.expiresAt,      // Token expiry (usually 15 minutes)
    });
  }
  ```
- [ ] Add SSO error handling:
  - 401 (authentication failed): Refresh JWT token and retry
  - 404 (participant not found): Return error to trigger sync
  - 500 (server error): Log error and show user-friendly message

**Participant Catalog UI (`app/w/[slug]/participant/rewards/page.tsx`)**:
- [ ] Create "Browse Reward Catalog" button:
  ```tsx
  'use client';
  import { useState } from 'react';
  import { Button } from '@/components/ui/button';

  export default function RewardCatalogButton() {
    const [loading, setLoading] = useState(false);

    async function openCatalog() {
      setLoading(true);
      try {
        const response = await fetch('/api/rewardstack/sso', {
          method: 'POST',
          body: JSON.stringify({ workspaceSlug }),
        });

        const { token, redirectUrl } = await response.json();

        // Open RewardSTACK catalog in new tab with SSO token
        window.open(`${redirectUrl}?token=${token}`, '_blank');
      } catch (error) {
        alert('Failed to load catalog. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    return (
      <Button onClick={openCatalog} disabled={loading}>
        {loading ? 'Loading...' : 'Browse Reward Catalog'}
      </Button>
    );
  }
  ```
- [ ] Add catalog button to participant dashboard
- [ ] Show participant point balance from RewardSTACK
- [ ] Display recent reward history (last 10 issuances)

**Admin Reconciliation Dashboard (`app/w/[slug]/admin/rewards/page.tsx`)**:
- [ ] Create reward issuance table:
  ```tsx
  // Display all reward issuances with filters
  interface RewardIssuanceRow {
    id: string;
    user: { email: string; firstName: string; lastName: string };
    activity: { title: string };
    type: 'POINTS' | 'SKU' | 'MONETARY';
    amount?: number;
    skuId?: string;
    status: 'PENDING' | 'ISSUED' | 'FAILED';
    externalStatus?: string;
    externalTransactionId?: string;
    retryCount: number;
    issuedAt?: Date;
    createdAt: Date;
  }
  ```
- [ ] Add filters:
  - Status: PENDING, ISSUED, FAILED
  - Type: POINTS, SKU, MONETARY
  - Date range: Last 7 days, Last 30 days, Custom
  - Search: By user email, transaction ID
- [ ] Add manual retry button for failed rewards:
  ```typescript
  async function retryFailedReward(rewardIssuanceId: string) {
    const issuance = await prisma.rewardIssuance.findUnique({
      where: { id: rewardIssuanceId },
      include: { user: true, activitySubmission: { include: { activity: true } } },
    });

    if (issuance.status !== 'FAILED') {
      throw new Error('Only failed rewards can be retried');
    }

    // Retry point or SKU reward based on type
    if (issuance.type === 'POINTS') {
      await issuePointRewardWithRetry({ /* params */ });
    } else if (issuance.type === 'SKU') {
      await issueSkuRewardWithRetry({ /* params */ });
    }

    // Update status on success
    await prisma.rewardIssuance.update({
      where: { id: rewardIssuanceId },
      data: { status: 'ISSUED', retryCount: issuance.retryCount + 1 },
    });
  }
  ```
- [ ] Add bulk retry for multiple failed rewards
- [ ] Show error details in expandable row (from `externalResponse`)

**E2E Tests (`tests/e2e/rewardstack-sku-flow.spec.ts`)**:
- [ ] Test complete SKU reward flow:
  - Login as participant
  - Enroll in challenge with SKU reward
  - Submit activity
  - Login as admin
  - Approve submission
  - Verify `RewardIssuance` created with `status=ISSUED`
  - Login as participant
  - Click "Browse Reward Catalog" button
  - Verify SSO token is generated
  - Verify redirect to RewardSTACK catalog
- [ ] Test SKU validation failure:
  - Configure inactive SKU in reward
  - Approve submission
  - Verify `RewardIssuance.status=FAILED`
  - Verify error message: "SKU is inactive or out of stock"
- [ ] Test participant not synced error:
  - Delete `User.rewardStackParticipantId`
  - Approve submission with SKU reward
  - Verify participant sync is triggered
  - Verify SKU reward issued after sync
- [ ] Test SSO token expiry:
  - Generate SSO token
  - Wait 16 minutes (token expires after 15 minutes)
  - Attempt to open catalog
  - Verify new token is generated
- [ ] Test admin reconciliation dashboard:
  - Create 3 failed rewards
  - Login as admin
  - Navigate to rewards reconciliation page
  - Filter by status=FAILED
  - Click retry button on one reward
  - Verify reward status changes to ISSUED
- [ ] Test bulk retry:
  - Select 3 failed rewards
  - Click "Retry Selected" button
  - Verify all 3 rewards are retried
  - Verify status updates for successful retries

**Deliverable**: SKU rewards are issued end-to-end with validation, SSO catalog access works for participants, and admins can monitor/retry failed rewards via reconciliation dashboard.

#### Phase 3.5: Monitoring & Refinement (Week 5) 📊

**Goal**: Production-ready monitoring, error recovery, and operational documentation

**Session Setup**:
- [ ] Load comprehensive API docs via Context7: `mcp__context7__get-library-docs` with topic: "error-handling"
- [ ] Review all error codes across endpoints: 400, 401, 403, 404, 422, 429, 500, 503
- [ ] Check rate limiting: Requests per minute/hour limits
- [ ] Review retry-after headers for 429 (rate limit) responses
- [ ] Check API status endpoint: GET /api/2.0/status for health monitoring

**Tasks**:

**Admin Reporting Dashboard (`app/w/[slug]/admin/dashboard/page.tsx` - Add widgets)**:
- [ ] Add "Reward Issuance Stats" widget:
  ```tsx
  interface RewardStats {
    totalIssued: number;          // Last 7 days
    totalIssuedLast30Days: number;
    successRate: number;          // (ISSUED / (ISSUED + FAILED)) * 100
    failureRate: number;
    totalPoints: number;
    totalSkus: number;
    totalMonetary: number;
    topRewardType: 'POINTS' | 'SKU' | 'MONETARY';
  }

  async function getRewardStats(): Promise<RewardStats> {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [issued7d, issued30d, failed7d] = await Promise.all([
      prisma.rewardIssuance.count({
        where: { status: 'ISSUED', issuedAt: { gte: last7Days } },
      }),
      prisma.rewardIssuance.count({
        where: { status: 'ISSUED', issuedAt: { gte: last30Days } },
      }),
      prisma.rewardIssuance.count({
        where: { status: 'FAILED', createdAt: { gte: last7Days } },
      }),
    ]);

    const successRate = ((issued7d / (issued7d + failed7d)) * 100).toFixed(1);

    const byType = await prisma.rewardIssuance.groupBy({
      by: ['type'],
      where: { status: 'ISSUED', issuedAt: { gte: last7Days } },
      _count: { id: true },
    });

    return {
      totalIssued: issued7d,
      totalIssuedLast30Days: issued30d,
      successRate: parseFloat(successRate),
      failureRate: 100 - parseFloat(successRate),
      totalPoints: byType.find(t => t.type === 'POINTS')?._count.id || 0,
      totalSkus: byType.find(t => t.type === 'SKU')?._count.id || 0,
      totalMonetary: byType.find(t => t.type === 'MONETARY')?._count.id || 0,
      topRewardType: byType.sort((a, b) => b._count.id - a._count.id)[0]?.type,
    };
  }
  ```
- [ ] Add "Failed Rewards" alert widget:
  - Show count of FAILED rewards requiring manual retry
  - Link to reconciliation dashboard with filter=FAILED
  - Red badge if count > 0
- [ ] Add "Recent Reward Activity" widget:
  - Last 10 reward issuances with status
  - User name, activity title, type, status
  - Click to view full details

**Background Job for Retry (`lib/cron/retry-failed-rewards.ts`)**:
- [ ] Create cron job for automatic retry:
  ```typescript
  // Runs every hour via Vercel Cron or scheduled function
  export async function retryFailedRewards() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Find FAILED rewards older than 1 hour, not exhausted retries
    const failedRewards = await prisma.rewardIssuance.findMany({
      where: {
        status: 'FAILED',
        retryCount: { lt: 3 },         // Max 3 retries
        createdAt: { lt: oneHourAgo }, // Wait 1 hour before retry
      },
      include: {
        user: true,
        activitySubmission: { include: { activity: true } },
      },
      take: 50, // Process 50 rewards per run
    });

    const results = { succeeded: 0, failed: 0, errors: [] };

    for (const reward of failedRewards) {
      try {
        if (reward.type === 'POINTS') {
          await issuePointRewardWithRetry({
            participantId: reward.user.rewardStackParticipantId,
            programId: workspace.rewardStackProgramId,
            points: reward.amount,
            reason: 'CHALLENGE_COMPLETION',
            description: `Retry: ${reward.activitySubmission.activity.title}`,
          });

          await prisma.rewardIssuance.update({
            where: { id: reward.id },
            data: {
              status: 'ISSUED',
              retryCount: reward.retryCount + 1,
              lastRetryAt: new Date(),
            },
          });

          results.succeeded++;
        } else if (reward.type === 'SKU') {
          // Similar retry logic for SKU rewards
          await issueSkuRewardWithRetry({ /* params */ });
          await prisma.rewardIssuance.update({ /* update status */ });
          results.succeeded++;
        }
      } catch (error) {
        // Update retry count but keep FAILED status
        await prisma.rewardIssuance.update({
          where: { id: reward.id },
          data: {
            retryCount: reward.retryCount + 1,
            lastRetryAt: new Date(),
            externalResponse: {
              ...reward.externalResponse,
              lastError: error.message,
            },
          },
        });

        results.failed++;
        results.errors.push({ rewardId: reward.id, error: error.message });
      }
    }

    // Alert admin after 3 consecutive failures
    const exhaustedRetries = failedRewards.filter(r => r.retryCount >= 2);
    if (exhaustedRetries.length > 0) {
      await sendAdminAlert({
        subject: `${exhaustedRetries.length} rewards exhausted retries`,
        body: `These rewards require manual investigation: ${exhaustedRetries.map(r => r.id).join(', ')}`,
      });
    }

    return results;
  }
  ```
- [ ] Set up Vercel Cron job (`vercel.json`):
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/retry-failed-rewards",
        "schedule": "0 * * * *"  // Every hour
      }
    ]
  }
  ```
- [ ] Create API route for cron (`app/api/cron/retry-failed-rewards/route.ts`):
  ```typescript
  export async function GET(req: Request) {
    // Verify Vercel cron secret
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const results = await retryFailedRewards();
    return Response.json(results);
  }
  ```

**Performance Optimization**:
- [ ] Implement batch participant sync (`lib/rewardstack/participants.ts`):
  ```typescript
  async function batchSyncParticipants(userIds: string[]): Promise<void> {
    // For bulk enrollment scenarios (e.g., CSV import)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, rewardStackParticipantId: null },
    });

    const syncPromises = users.map(user =>
      createParticipant({
        uniqueId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        programId: workspace.rewardStackProgramId,
      })
    );

    // Process in batches of 10 to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < syncPromises.length; i += batchSize) {
      const batch = syncPromises.slice(i, i + batchSize);
      await Promise.all(batch);
      await sleep(1000); // 1-second delay between batches
    }
  }
  ```
- [ ] Add RewardSTACK catalog caching (`lib/rewardstack/catalog.ts`):
  ```typescript
  // Cache catalog data for 1 hour to reduce API calls
  const catalogCache = new Map<string, { data: any; expiresAt: number }>();

  async function getCatalog(programId: string): Promise<any> {
    const cached = catalogCache.get(programId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const response = await fetch(`${apiUrl}/api/2.0/catalog`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Program-Id': programId },
    });

    const catalog = await response.json();
    catalogCache.set(programId, {
      data: catalog,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    return catalog;
  }
  ```
- [ ] Add database indexes for reward queries:
  ```sql
  -- Already created in Phase 3.3, verify they exist
  CREATE INDEX IF NOT EXISTS idx_reward_issuance_status ON "RewardIssuance"(status);
  CREATE INDEX IF NOT EXISTS idx_reward_issuance_retry ON "RewardIssuance"(retryCount, lastRetryAt);
  CREATE INDEX IF NOT EXISTS idx_reward_issuance_user ON "RewardIssuance"(userId, status);
  CREATE INDEX IF NOT EXISTS idx_reward_issuance_created ON "RewardIssuance"(createdAt DESC);
  ```

**Documentation and Runbooks (`docs/rewardstack/`)**:
- [ ] Create API integration guide (`docs/rewardstack/api-integration.md`):
  ```markdown
  # RewardSTACK API Integration Guide

  ## Authentication
  - JWT bearer tokens (2-hour expiry)
  - Auto-refresh on 401 errors
  - Store encrypted API key in Workspace.rewardStackApiKey

  ## Endpoints
  - POST /api/2.0/participants - Create participant
  - PATCH /api/2.0/participants/{id} - Update participant
  - POST /api/2.0/adjustments - Issue point reward
  - POST /api/2.0/transactions - Issue SKU reward
  - GET /api/2.0/sso/token - Generate SSO token for catalog

  ## Error Codes
  - 400: Invalid request (check request body)
  - 401: Authentication failed (refresh token)
  - 404: Resource not found (participant/SKU)
  - 422: Validation error (check required fields)
  - 429: Rate limit exceeded (retry after delay)
  - 500/503: Server error (transient, retry with backoff)

  ## Rate Limits
  - 100 requests per minute per program
  - 1000 requests per hour per program
  - Monitor 429 responses and implement backoff
  ```
- [ ] Create troubleshooting guide (`docs/rewardstack/troubleshooting.md`):
  ```markdown
  # RewardSTACK Troubleshooting Guide

  ## Common Errors

  ### "Participant not synced"
  - **Cause**: User.rewardStackParticipantId is null
  - **Solution**: Approve submission again, sync will trigger automatically
  - **Manual Fix**: Navigate to admin → users → click "Sync to RewardSTACK"

  ### "SKU is inactive or out of stock"
  - **Cause**: SKU was deactivated or removed from RewardSTACK catalog
  - **Solution**: Update TenantSku.rewardStackSkuId to a valid SKU
  - **Manual Fix**: Navigate to admin → rewards → edit SKU configuration

  ### "Failed after 3 retries"
  - **Cause**: Persistent API error (network, auth, or server issue)
  - **Solution**: Check RewardIssuance.externalResponse for error details
  - **Manual Fix**: Navigate to admin → rewards → filter by FAILED → click Retry

  ### "Authentication failed (401)"
  - **Cause**: JWT token expired or API key is invalid
  - **Solution**: Token refresh failed, check Workspace.rewardStackApiKey
  - **Manual Fix**: Navigate to admin → settings → re-enter API key

  ## Health Checks
  - Test connection: Admin → Settings → "Test RewardSTACK Connection" button
  - View API status: Check RewardSTACK status page (status.alldigitalrewards.com)
  - Monitor failed rewards: Admin → Dashboard → Failed Rewards widget
  ```
- [ ] Create admin guide (`docs/rewardstack/admin-guide.md`):
  ```markdown
  # RewardSTACK Admin Guide

  ## Initial Setup
  1. Navigate to Admin → Settings → RewardSTACK Integration
  2. Enter API Key (obtain from AllDigitalRewards account manager)
  3. Select Environment (Production or Staging)
  4. Enter Program ID (provided by AllDigitalRewards)
  5. Click "Test Connection" to verify setup
  6. Click "Save" to enable integration

  ## Managing Failed Rewards
  1. Navigate to Admin → Rewards → Reconciliation Dashboard
  2. Filter by Status: FAILED
  3. Review error details by expanding row
  4. Fix underlying issue (e.g., update SKU, sync participant)
  5. Click "Retry" button to reprocess reward

  ## Bulk Operations
  - **Bulk Retry**: Select multiple failed rewards → Click "Retry Selected"
  - **Bulk Sync**: Import CSV of users → System automatically syncs on first reward
  - **Catalog Refresh**: Admin → Rewards → Click "Refresh Catalog" (updates SKU list)

  ## Monitoring
  - Dashboard widget shows success rate and recent activity
  - Email alerts for rewards that exhaust retries (3 failures)
  - Cron job runs hourly to auto-retry failed rewards
  ```

**Deliverable**: Production-ready monitoring with automated error recovery (hourly cron), admin reporting dashboard with success metrics, and comprehensive documentation for support team.

---

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
