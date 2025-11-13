### **Zen Planner** session Prompt

@zen planner create

**EPIC: Manager Role & RewardSTACK Integration**

## Complete Discovery Context

[Paste all 8 query results here in organized sections]

### Query 1: Role System ✅

[Already completed]

Both SUPER_ADMIN & ADMIN can create new workspaces & transfer ownership of their workspaces
SUPER_ADMIN (platform-wide) /admin
ADMIN (workspace-specific) /w/{slug}/admin/dashboard

Workspace (ADMIN/MANAGER/PARTICIPANT)
[Changemaker.im](http://changemaker.im/) is intended to be multi-tenant, admin users can have multiple workspaces that they own but each workspace is isolated so if managers or participants are not members of the workspace they will not see it until they are added as a user.

### Query 2: Platform Architecture ✅

Workspace Isolation Analysis Report

1. Platform Admin Features (/admin Routes)

✅ Platform-level admin routes EXIST:

/app/admin/
├── dashboard/page.tsx       → Platform overview
├── workspaces/page.tsx      → All workspaces management
├── users/page.tsx           → Cross-workspace user management
└── settings/page.tsx        → Platform settings

Access Control:
// app/admin/layout.tsx:29
const isSuperAdmin = isPlatformSuperAdmin(dbUser?.permissions, user.email!)
if (!isSuperAdmin) {
redirect("/workspaces")  // Non-super-admins redirected
}

✅ Properly protected - Only platform super admins can access.

---

1. Workspace Creation & Transfer Logic

Workspace Creation (app/workspaces/actions.ts:8-45)

export async function createWorkspace(formData: FormData, userId: string) {
const workspace = await prisma.workspace.create({
data: {
id: crypto.randomUUID(),
name,
slug,
tenantId: `tenant_${nanoid(12)}`  // ✅ Unique tenant per workspace
}
})

```
// ✅ Creator becomes ADMIN with primary membership
await createMembership(userId, workspace.id, 'ADMIN', true)

```

}

Key Security Features:

* ✅ Each workspace gets unique tenantId
* ✅ Creator automatically becomes ADMIN
* ✅ Primary membership set for creator
* ✅ No cross-workspace inheritance

Workspace Transfer (lib/db/workspace-membership.ts:413-481)

export async function transferWorkspaceOwnership(
workspaceId: string,
fromUserId: string,
toUserId: string
) {
// ✅ Verify current owner
const currentOwner = await prisma.workspaceMembership.findUnique({
where: { userId_workspaceId: { userId: fromUserId, workspaceId } }
})

```
if (!currentOwner?.isPrimary || currentOwner.role !== 'ADMIN') {
  return { error: 'Only the workspace owner can transfer ownership' }
}

// ✅ Verify new owner is already an admin
const newOwner = await prisma.workspaceMembership.findUnique({
  where: { userId_workspaceId: { userId: toUserId, workspaceId } }
})

if (newOwner?.role !== 'ADMIN') {
  return { error: 'Target user must be an admin' }
}

// ✅ Atomic transaction
await prisma.$transaction([...])

```

}

Security Assessment:

* ✅ Validates ownership before transfer
* ✅ Requires target user to already be ADMIN
* ✅ Uses atomic transaction (no partial states)
* ✅ Properly scoped to single workspace

---

1. Super Admin Cross-Workspace Access Patterns

Platform Super Admin Detection (lib/auth/rbac.ts:84-92)

export function isPlatformSuperAdmin(
input: { permissions?: string[] } | string[] | null | undefined,
email?: string
): boolean {
// Method 1: Email allowlist (hardcoded)
const PLATFORM_SUPERADMIN_EMAILS = [
'krobinson@alldigitalrewards.com',
'jhoughtelin@alldigitalrewards.com',
'kfelke@alldigitalrewards.com',
'jfelke@alldigitalrewards.com',
]

```
if (email && PLATFORM_SUPERADMIN_EMAILS.includes(email)) {
  return true
}

// Method 2: Permission flag
const permissions = Array.isArray(input) ? input : (input?.permissions ?? [])
return permissions.includes('platform_super_admin')

```

}

Cross-Workspace Access Enforcement (lib/auth/api-auth.ts:60-69)

export function canAccessWorkspace(
user: User,
workspace: { tenantId: string },
hasMembership: boolean
): boolean {
// ✅ Platform super admins bypass all tenant restrictions
if (isPlatformSuperAdmin(user)) {
return true
}

```
// ❌ All other users REQUIRE explicit membership
return hasMembership

```

}

Super Admin Workspace Discovery (lib/db/workspace-compatibility.ts:138-146)

export async function getUserWorkspaces(supabaseUserId: string) {
const dbUser = await getUserBySupabaseId(supabaseUserId)

```
// ✅ Platform super admins see ALL workspaces (no tenant filtering)
if (isPlatformSuperAdmin(dbUser)) {
  return await prisma.workspace.findMany({
    orderBy: { name: 'asc' }
  })
}

// ❌ Regular users only see workspaces they're members of
const memberships = await listMemberships(dbUser.id)
return memberships.map(m => m.workspace)

```

}

Super Admin Capabilities:

1. ✅ Access ANY workspace (bypasses membership checks)
2. ✅ See ALL workspaces across tenants (in /admin/workspaces)
3. ✅ Manage users across workspaces (in /admin/users)
4. ⚠️ Security Note: No audit logging for super admin actions

---

1. Workspace Isolation Enforcement in Queries

✅ WELL-ISOLATED Queries

Example 1: Challenge Listing (app/w/[slug]/participant/challenges/page.tsx:26-46)
const challenges = await prisma.challenge.findMany({
where: {
workspaceId: [workspace.id](http://workspace.id/),  // ✅ SCOPED
status: 'PUBLISHED',
Enrollment: {
some: {
userId,
status: { in: ['INVITED', 'ENROLLED'] }
}
}
}
})

Example 2: Participant Updates (app/api/workspaces/[slug]/challenges/[id]/route.ts:192-198)
const validInvitedParticipants = await prisma.user.findMany({
where: {
id: { in: invitedParticipantIds },
workspaceId: [workspace.id](http://workspace.id/),  // ✅ SCOPED
}
})

Example 3: Submissions (app/api/workspaces/[slug]/submissions/route.ts:22-25)
const enrollment = await prisma.enrollment.findFirst({
where: {
id: enrollmentId,
userId: [user.dbUser.id](http://user.dbuser.id/),
Challenge: { workspaceId: [workspace.id](http://workspace.id/) }  // ✅ SCOPED via relation
}
})

⚠️ POTENTIAL LEAKAGE POINTS

Issue 1: Platform Admin Queries (INTENDED BEHAVIOR)

// lib/db/queries.ts:2665-2680
export async function getAllPlatformUsers() {
return await prisma.user.findMany({
// ⚠️ NO workspace filtering (intentional for platform admins)
include: {
WorkspaceMembership: {
include: { Workspace: { select: { id: true, slug: true, name: true } } }
}
}
})
}

// lib/db/queries.ts:2627-2651
export async function getAllWorkspacesWithDetails(tenantId = 'default') {
return await prisma.workspace.findMany({
where: { tenantId },  // ⚠️ Filters by tenantId, not workspaceId
include: { /* ... */ }
})
}

Verdict: ✅ SAFE - These are platform-level queries only accessible via /app/admin/* routes, which are protected by isPlatformSuperAdmin() check in layout.

Issue 2: Legacy User.workspaceId Queries

// Multiple locations still use User.workspaceId
const user = await prisma.user.findFirst({
where: {
id: userId,
workspaceId: [workspace.id](http://workspace.id/)  // ⚠️ Uses legacy field
}
})

Verdict: ⚠️ MIGRATION RISK - Using legacy User.workspaceId field instead of WorkspaceMembership. This works for backward compatibility but:

* Users can only have ONE User.workspaceId (limits multi-workspace)
* If User.workspaceId is null but membership exists, queries fail
* Mixing legacy and modern patterns creates confusion

Recommendation: Migrate all queries to use WorkspaceMembership:
// Instead of:
where: { id: userId, workspaceId: [workspace.id](http://workspace.id/) }

// Use:
where: {
id: userId,
WorkspaceMembership: {
some: { workspaceId: [workspace.id](http://workspace.id/) }
}
}

---

1. Cross-Workspace Data Leakage Risks

🟢 LOW RISK Areas

1. API Routes: All use requireWorkspaceAccess(slug) which enforces membership
2. Challenge CRUD: Always filters by workspaceId: [workspace.id](http://workspace.id/)
3. Enrollment Operations: Always joins through Challenge.workspaceId
4. Activity Submissions: Scoped via Enrollment → Challenge → Workspace

🟡 MEDIUM RISK Areas

1. Legacy User Queries: Some queries still rely on User.workspaceId instead of WorkspaceMembership

* Impact: Users without legacy field but with memberships may be excluded
* Mitigation: Use compatibility layer (getUserWorkspaceRole())

2. Platform Admin Functions: Exposed to ALL data across tenants

* Impact: Super admin compromise = full platform breach
* Mitigation: Add audit logging, restrict IP ranges, require 2FA

3. Tenant ID Not Used: tenantId field exists but not consistently enforced

* Impact: If tenant isolation is future requirement, queries need updates
* Current State: Single-tenant deployment (tenantId: 'default')

🔴 HIGH RISK Areas

NONE IDENTIFIED - No unprotected cross-workspace queries found.

---

1. Route Structure Validation

Your Proposed Structure:
/admin (SUPER_ADMIN only)
├── /dashboard          ✅ EXISTS (app/admin/dashboard/page.tsx)
├── /workspaces         ✅ EXISTS (app/admin/workspaces/page.tsx)
├── /users              ✅ EXISTS (app/admin/users/page.tsx)
└── /settings           ✅ EXISTS (app/admin/settings/page.tsx)

/workspaces              ✅ EXISTS (app/workspaces/page.tsx)

/w/{slug}/admin (ADMIN only)
├── /dashboard           ✅ EXISTS
├── /challenges          ✅ EXISTS
├── /participants        ✅ EXISTS
├── /settings            ✅ EXISTS
└── /reports             ❌ NOT FOUND (could be added)

/w/{slug}/manager (MANAGER - NEW)
├── /dashboard           ❌ NOT EXISTS (needs creation)
├── /submissions         ❌ NOT EXISTS (needs creation)
├── /reports             ❌ NOT EXISTS (needs creation)
└── /participants        ❌ NOT EXISTS (needs creation)

/w/{slug}/participant (PARTICIPANT, MANAGER, ADMIN)
├── /dashboard           ✅ EXISTS
├── /challenges          ✅ EXISTS
└── /profile             ✅ EXISTS

---

1. Comprehensive Security Assessment

| Category                 | Status              | Details                                                              |
| ------------------------ | ------------------- | -------------------------------------------------------------------- |
| Platform Admin Isolation | ✅ Secure           | Only super admins can access /admin/* routes                         |
| Workspace Creation       | ✅ Secure           | Unique tenantId per workspace, proper membership setup               |
| Ownership Transfer       | ✅ Secure           | Validates ownership, requires target to be admin, atomic transaction |
| API Route Protection     | ✅ Secure           | All routes use requireWorkspaceAccess() or requireWorkspaceAdmin()   |
| Query Scoping            | ✅ Mostly Secure    | 95%+ of queries filter by workspaceId                                |
| Super Admin Bypass       | ⚠️ By Design      | Platform admins can access all workspaces (intentional)              |
| Legacy Field Usage       | ⚠️ Migration Risk | Some queries use User.workspaceId instead of WorkspaceMembership     |
| Tenant Isolation         | ⚠️ Not Enforced   | tenantId exists but not used for access control                      |
| Audit Logging            | ❌ Missing          | No logging for super admin cross-workspace actions                   |

---

1. Recommendations for MANAGER Role Implementation

Step 1: Add Role to Schema
enum Role {
ADMIN
PARTICIPANT
MANAGER  // ← Add here
}

Step 2: Update Permission Mapping
// lib/auth/rbac.ts
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
[ROLES.MANAGER]: [
PERMISSIONS.WORKSPACE_VIEW,
PERMISSIONS.CHALLENGE_VIEW,
PERMISSIONS.CHALLENGE_CREATE,     // Can create challenges
PERMISSIONS.ENROLLMENT_MANAGE,     // Can manage enrollments
PERMISSIONS.USER_VIEW,
// ❌ NO workspace management
// ❌ NO user role changes
]
}

Step 3: Create Manager Routes
// app/w/[slug]/manager/layout.tsx
export default async function ManagerLayout({ children, params }) {
const { slug } = await params
const role = await getUserWorkspaceRole(slug)

```
if (!role || !['ADMIN', 'MANAGER'].includes(role)) {
  redirect(`/w/${slug}/participant/dashboard`)
}

return <>{children}</>

```

}

Step 4: Update Existing Access Checks
// Find all instances of:
if (role !== 'ADMIN') { ... }

// Replace with:
if (!canAccessAdminRoutes(role)) { ... }

// Where canAccessAdminRoutes = (role) => role === 'ADMIN' || role === 'MANAGER'

Step 5: Scope Manager Permissions
// Managers can ONLY manage challenges they created or are assigned to
const challenges = await prisma.challenge.findMany({
where: {
workspaceId: [workspace.id](http://workspace.id/),
OR: [
{ createdBy: [user.id](http://user.id/) },           // Challenges they created
{ assignedManagers: { has: [user.id](http://user.id/) } }  // Challenges assigned to them
]
}
})

---

Final Verdict

✅ Workspace isolation is PROPERLY ENFORCED in 95% of the codebase.

Key Strengths:

* Platform admin routes properly protected
* All API routes enforce workspace membership
* Queries consistently filter by workspaceId
* Workspace creation assigns unique tenant IDs
* Ownership transfer logic is secure

Areas for Improvement:

1. Migrate remaining User.workspaceId queries to WorkspaceMembership
2. Add audit logging for platform super admin actions
3. Consider enforcing tenantId filtering for future multi-tenancy
4. Document which queries are intentionally cross-workspace (platform admin)

MANAGER Role Implementation Risk: ⚠️ MEDIUM

* Requires updates to ~15-20 files
* Main risk: Forgetting to update role checks in UI/routes
* Mitigation: Use TypeScript exhaustiveness checks and comprehensive testing

### Query 3: Submission & Approval

Submission Review & Approval Flow - Complete Analysis

1. ActivitySubmission Model (from prisma/schema.prisma:55-81)

model ActivitySubmission {
id               String           @id @db.Uuid
activityId       String           @db.Uuid
userId           String           @db.Uuid
enrollmentId     String           @db.Uuid
textContent      String?
fileUrls         String[]
linkUrl          String?
status           SubmissionStatus @default(PENDING)
pointsAwarded    Int?             // ✅ Points awarded on approval
reviewNotes      String?          // ✅ Reviewer comments
reviewedBy       String?          @db.Uuid  // ✅ Reviewer ID
reviewedAt       DateTime?        // ✅ Review timestamp
submittedAt      DateTime         @default(now())
updatedAt        DateTime         @default(now())
rewardIssuanceId String?          @unique @db.Uuid
rewardIssued     Boolean          @default(false)
Activity         Activity         @relation(...)
Enrollment       Enrollment       @relation(...)
RewardIssuance   RewardIssuance?  @relation(...)
User             User             @relation(...)

```
@@index([activityId])
@@index([enrollmentId])
@@index([status])
@@index([userId])

```

}

Key Fields:

* ✅ reviewedBy - Stores who approved/rejected
* ✅ reviewNotes - Stores review comments
* ✅ reviewedAt - Timestamp of review
* ✅ pointsAwarded - Points given on approval (nullable, set by reviewer)
* ✅ rewardIssuanceId - Links to RewardIssuance record
* ❌ NO requiresManagerApproval flag (would need to add)
* ❌ NO managerApprovedBy field (would need to add)
* ❌ NO managerApprovedAt field (would need to add)

Relationships:
ActivitySubmission
→ Activity → Challenge (for workspace scoping)
→ Enrollment (for user context)
→ User (submitter)
→ RewardIssuance (optional, created on approval)

---

1. SubmissionStatus Enum (prisma/schema.prisma:524-529)

enum SubmissionStatus {
PENDING        // ← Initial state
APPROVED       // ← Final approved state
REJECTED       // ← Final rejected state
DRAFT          // ← Not submitted yet
}

Current States:

* ✅ PENDING - Awaiting review
* ✅ APPROVED - Admin approved (final)
* ✅ REJECTED - Admin rejected (final)
* ✅ DRAFT - Not submitted

Missing States for Manager Flow:

* ❌ MANAGER_APPROVED - Manager approved, awaiting admin
* ❌ NEEDS_REVISION - Sent back for changes
* ❌ ADMIN_REVIEW - Bypassed manager, went to admin

Recommendation: Add these statuses
enum SubmissionStatus {
DRAFT
PENDING              // ← New submission
MANAGER_APPROVED     // ← Manager approved, needs admin
NEEDS_REVISION       // ← Sent back to participant
APPROVED             // ← Admin final approval
REJECTED             // ← Final rejection
}

---

1. Current Approval Logic (lib/db/queries.ts:1468-1505)

export async function reviewActivitySubmission(
submissionId: string,
data: {
status: 'APPROVED' | 'REJECTED'
reviewNotes?: string
pointsAwarded?: number
reviewedBy: UserId
},
workspaceId: WorkspaceId
): Promise<ActivitySubmission & {
Activity: Activity & { ActivityTemplate, Challenge }
}> {
try {
return await prisma.activitySubmission.update({
where: {
id: submissionId,
Activity: {
Challenge: { workspaceId }  // ✅ Workspace isolation
}
},
data: {
status: data.status,           // ← Sets APPROVED or REJECTED
reviewNotes: data.reviewNotes,
pointsAwarded: data.pointsAwarded,
reviewedBy: data.reviewedBy,
reviewedAt: new Date()
},
include: {
Activity: {
include: {
ActivityTemplate: true,
Challenge: true
}
}
}
})
} catch (error) {
throw new DatabaseError(`Failed to review activity submission: ${error}`)
}
}

What it does:

1. ✅ Updates submission status (APPROVED or REJECTED)
2. ✅ Records reviewer ID and timestamp
3. ✅ Stores review notes
4. ✅ Sets points awarded (if provided)
5. ✅ Enforces workspace isolation via Challenge.workspaceId
6. ❌ Does NOT issue rewards (handled separately in route)
7. ❌ No support for intermediate states (manager approval)

---

1. Review Endpoint (app/api/workspaces/[slug]/submissions/[id]/review/route.ts)

Full Implementation:

export const POST = withErrorHandling(async (
request: NextRequest,
context: { params: Promise<{ slug: string; id: string }> }
) => {
const { slug, id } = await context.params
const { status, reviewNotes, pointsAwarded, reward } = await request.json()

```
// ══════════════════════════════════════════════════════════
// AUTHORIZATION: Only ADMIN can review
// ══════════════════════════════════════════════════════════
const { workspace, user } = await requireWorkspaceAdmin(slug)  // ⚠️ ADMIN only

if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
  return NextResponse.json({ error: 'Valid status required' }, { status: 400 })
}

// Get submission
const existingSubmission = await prisma.activitySubmission.findUnique({
  where: { id },
  include: {
    Activity: {
      include: {
        Challenge: true,
        ActivityTemplate: true
      }
    }
  }
})

if (!existingSubmission) {
  return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
}

// ══════════════════════════════════════════════════════════
// IDEMPOTENCY: Prevent re-review
// ══════════════════════════════════════════════════════════
if (existingSubmission.status !== 'PENDING') {
  return NextResponse.json({
    error: 'Submission has already been reviewed'
  }, { status: 400 })
}

// ══════════════════════════════════════════════════════════
// STEP 1: Update submission status
// ══════════════════════════════════════════════════════════
const submission = await reviewActivitySubmission(
  id,
  {
    status,
    reviewNotes,
    pointsAwarded,
    reviewedBy: user.dbUser.id
  },
  workspace.id
)

// ══════════════════════════════════════════════════════════
// STEP 2: Issue reward on approval
// ══════════════════════════════════════════════════════════
if (status === 'APPROVED') {
  // Determine reward config (priority order)
  let rewardType: 'points' | 'sku' | 'monetary' | null = null
  let rewardAmount: number | null = null
  let rewardCurrency: string | null = null
  let rewardSkuId: string | null = null
  let rewardProvider: string | null = null

  if (reward && reward.type) {
    // 1️⃣ HIGHEST PRIORITY: Explicit reward in request
    rewardType = reward.type.toLowerCase()
    rewardAmount = reward.amount ?? null
    rewardCurrency = reward.currency ?? null
    rewardSkuId = reward.skuId ?? null
    rewardProvider = reward.provider ?? null
  } else if ((pointsAwarded ?? 0) > 0) {
    // 2️⃣ MEDIUM PRIORITY: Points awarded (legacy)
    rewardType = 'points'
    rewardAmount = pointsAwarded
  } else if (existingSubmission.Activity.Challenge.rewardType) {
    // 3️⃣ LOWEST PRIORITY: Challenge reward config
    const challengeRewardType = existingSubmission.Activity.Challenge.rewardType
    rewardType = challengeRewardType.toLowerCase()
    const config = existingSubmission.Activity.Challenge.rewardConfig as any
    if (config) {
      rewardAmount = config.pointsAmount || config.amount || null
      rewardCurrency = config.currency || null
      rewardSkuId = config.skuId || null
    }
  }

  // Issue reward if configured
  if (rewardType) {
    await issueReward({
      workspaceId: workspace.id,
      userId: submission.userId,
      challengeId: existingSubmission.Activity.challengeId,
      submissionId: submission.id,
      type: rewardType,
      amount: rewardAmount ?? undefined,
      currency: rewardCurrency ?? undefined,
      skuId: rewardSkuId ?? undefined,
      provider: rewardProvider ?? undefined
    })
  }
}

// ══════════════════════════════════════════════════════════
// STEP 3: Log activity event
// ══════════════════════════════════════════════════════════
await logActivityEvent({
  workspaceId: workspace.id,
  challengeId: existingSubmission.Activity.challengeId,
  userId: submission.userId,
  actorUserId: user.dbUser.id,
  type: status === 'APPROVED' ? 'SUBMISSION_APPROVED' : 'SUBMISSION_REJECTED',
  metadata: {
    submissionId: submission.id,
    pointsAwarded: pointsAwarded || reward?.amount || 0,
    activityId: submission.activityId,
    activityName: existingSubmission.Activity?.ActivityTemplate?.name,
    reviewNotes: reviewNotes || undefined
  }
})

return NextResponse.json({ submission })

```

})

Authorization:

* ⚠️ ADMIN ONLY via requireWorkspaceAdmin(slug) (line 14)
* ❌ MANAGER cannot review (would need separate endpoint or role check)

Accepted Parameters:
{
status: 'APPROVED' | 'REJECTED',  // Required
reviewNotes?: string,              // Optional comment
pointsAwarded?: number,            // Optional points override
reward?: {                         // Optional reward override
type: 'points' | 'sku' | 'monetary',
amount?: number,
currency?: string,
skuId?: string,
provider?: string
}
}

Response:
{
submission: ActivitySubmission & {
Activity: Activity & {
ActivityTemplate: ActivityTemplate
Challenge: Challenge
}
}
}

---

1. Audit Trail

Current Fields in ActivitySubmission:

* ✅ reviewedBy (UUID) - Who approved/rejected
* ✅ reviewedAt (DateTime) - When
* ✅ reviewNotes (String) - Comments
* ✅ pointsAwarded (Int) - Points given
* ✅ status (Enum) - Current state

Missing for Manager Workflow:

* ❌ No separate approval history table (all edits overwrite)
* ❌ No manager review fields (managerReviewedBy, managerReviewedAt, managerNotes)
* ❌ No revision request tracking (who requested changes, when, why)

ActivityEvent Table:
// lib/db/queries.ts:1822-1847
await logActivityEvent({
workspaceId: [workspace.id](http://workspace.id/),
type: 'SUBMISSION_APPROVED' | 'SUBMISSION_REJECTED',  // ← Logged
challengeId,
userId: submission.userId,
actorUserId: [user.dbUser.id](http://user.dbuser.id/),  // ← Who acted
metadata: {
submissionId,
pointsAwarded,
reviewNotes
}
})

Verdict: ✅ Audit trail exists via ActivityEvent but NOT granular enough for multi-step approval (manager → admin).

---

1. Challenge Reward Configuration (prisma/schema.prisma:103-131)

model Challenge {
id                      String          @id @db.Uuid
title                   String
description             String
startDate               DateTime
endDate                 DateTime
enrollmentDeadline      DateTime?
workspaceId             String          @db.Uuid
createdAt               DateTime        @default(now())
updatedAt               DateTime        @default(now())
status                  ChallengeStatus @default(DRAFT)
emailEditAllowed        Boolean         @default(true)
rewardConfig            Json?           // ← Reward configuration
rewardType              RewardType?     // ← points, sku, monetary
// ... relations
}

enum RewardType {
points
sku
monetary
}

Existing Fields:

* ✅ rewardType - Type of reward (points, sku, monetary)
* ✅ rewardConfig - JSON config (e.g., { pointsAmount: 100, currency: 'USD' })
* ✅ emailEditAllowed - Controls if participants can edit email

Missing Fields for Manager Flow:

* ❌ requireManagerApproval - Flag to enable manager step
* ❌ requireAdminReapproval - Flag to require admin final approval
* ❌ assignedManagerIds - Array of managers who can approve
* ❌ autoApprovalThreshold - Auto-approve if points < threshold

---

Exact Insertion Point for Manager Approval

Current Flow:

Participant submits
↓
Status: PENDING
↓
ADMIN reviews (requireWorkspaceAdmin)
↓
Status: APPROVED or REJECTED
↓
If APPROVED → issueReward() → awardPointsWithBudget()

Proposed Manager Flow:

Participant submits
↓
Status: PENDING
↓
┌─────────────────────────────────────┐
│ Check: Challenge.requireManagerApproval? │
└─────────────────────────────────────┘
├─ NO → Route to ADMIN (current flow)
│
└─ YES → MANAGER reviews
↓
Status: MANAGER_APPROVED (new)
↓
┌──────────────────────────────────┐
│ Check: Challenge.requireAdminReapproval? │
└──────────────────────────────────┘
├─ NO → Status: APPROVED
│        ↓
│    issueReward() immediately
│
└─ YES → ADMIN reviews
↓
Status: APPROVED or REJECTED
↓
If APPROVED → issueReward()

---

Required Schema Changes

1. Add Manager Fields to ActivitySubmission

model ActivitySubmission {
// ... existing fields ...

```
// Manager review fields (NEW)
managerReviewedBy   String?    @db.Uuid
managerReviewedAt   DateTime?
managerNotes        String?

// Keep existing admin fields
reviewedBy          String?    @db.Uuid  // ← Admin reviewer
reviewedAt          DateTime?
reviewNotes         String?

```

}

1. Expand SubmissionStatus Enum

enum SubmissionStatus {
DRAFT
PENDING
MANAGER_APPROVED      // ← NEW: Manager approved, awaiting admin
NEEDS_REVISION        // ← NEW: Sent back to participant
APPROVED              // ← Admin final approval
REJECTED
}

1. Add Manager Config to Challenge

model Challenge {
// ... existing fields ...

```
// Manager approval settings (NEW)
requireManagerApproval  Boolean   @default(false)
requireAdminReapproval  Boolean   @default(true)
assignedManagerIds      String[]  @default([])  // ← UUIDs of managers
autoApprovalThreshold   Int?                    // ← Auto-approve if points < X

```

}

---

Required Code Changes

1. New Review Endpoint for Managers

// app/api/workspaces/[slug]/submissions/[id]/manager-review/route.ts
export const POST = withErrorHandling(async (request, context) => {
const { slug, id } = await context.params
const { action, notes } = await request.json()  // 'approve' | 'reject' | 'needs_revision'

```
// ✅ MANAGER or ADMIN can review
const { workspace, user, role } = await requireWorkspaceAccess(slug)

if (!['ADMIN', 'MANAGER'].includes(role)) {
  throw NextResponse.json({ error: 'Manager privileges required' }, { status: 403 })
}

const submission = await prisma.activitySubmission.findUnique({
  where: { id },
  include: { Activity: { include: { Challenge: true } } }
})

// Check if manager is assigned to this challenge
const challenge = submission.Activity.Challenge
if (role === 'MANAGER' && !challenge.assignedManagerIds.includes(user.dbUser.id)) {
  throw NextResponse.json({ error: 'Not assigned to this challenge' }, { status: 403 })
}

if (action === 'approve') {
  // Update to MANAGER_APPROVED
  await prisma.activitySubmission.update({
    where: { id },
    data: {
      status: 'MANAGER_APPROVED',
      managerReviewedBy: user.dbUser.id,
      managerReviewedAt: new Date(),
      managerNotes: notes
    }
  })

  // If admin reapproval NOT required, auto-approve
  if (!challenge.requireAdminReapproval) {
    await finalApproval(id, workspace.id, user.dbUser.id)
  }
} else if (action === 'needs_revision') {
  await prisma.activitySubmission.update({
    where: { id },
    data: {
      status: 'NEEDS_REVISION',
      managerNotes: notes
    }
  })
}

return NextResponse.json({ success: true })

```

})

1. Update Admin Review Endpoint

// app/api/workspaces/[slug]/submissions/[id]/review/route.ts
// Modify line 14:
const { workspace, user, role } = await requireWorkspaceAccess(slug)

// Add manager check:
if (!['ADMIN', 'MANAGER'].includes(role)) {
throw NextResponse.json({ error: 'Review privileges required' }, { status: 403 })
}

// Update status validation (line 16):
const validStatuses = role === 'ADMIN'
? ['APPROVED', 'REJECTED', 'NEEDS_REVISION']
: ['MANAGER_APPROVED', 'NEEDS_REVISION']

if (!validStatuses.includes(status)) {
throw NextResponse.json({ error: 'Invalid status' }, { status: 400 })
}

---

Summary: Exact Insertion Points

| Component                            | Current State                         | Required Change                                                        |
| ------------------------------------ | ------------------------------------- | ---------------------------------------------------------------------- |
| Schema: ActivitySubmission           | reviewedBy, reviewNotes, reviewedAt   | Add managerReviewedBy, managerNotes, managerReviewedAt                 |
| Schema: SubmissionStatus             | PENDING, APPROVED, REJECTED, DRAFT    | Add MANAGER_APPROVED, NEEDS_REVISION                                   |
| Schema: Challenge                    | rewardType, rewardConfig              | Add requireManagerApproval, requireAdminReapproval, assignedManagerIds |
| Endpoint: Review                     | /submissions/[id]/review (ADMIN only) | Update to allow MANAGER with role-based status options                 |
| New Endpoint                         | None                                  | Add /submissions/[id]/manager-review for manager-specific actions      |
| Function: reviewActivitySubmission() | Only sets reviewedBy                  | Add manager review fields parameter                                    |
| Reward Issuance                      | Triggered on APPROVED                 | Delay until final APPROVED (not MANAGER_APPROVED)                      |

The cleanest insertion point is between PENDING and APPROVED with a new MANAGER_APPROVED intermediate state that conditionally triggers admin review based on
Challenge.requireAdminReapproval.

### Query 4: Challenge Assignment

Manager Challenge Assignment Strategy - Complete Analysis

1. Current Challenge Model Structure

model Challenge {
id                     String                   @id @db.Uuid
title                  String
description            String
startDate              DateTime
endDate                DateTime
enrollmentDeadline     DateTime?
workspaceId            String                   @db.Uuid
createdAt              DateTime                 @default(now())
updatedAt              DateTime                 @default(now())
status                 ChallengeStatus          @default(DRAFT)
emailEditAllowed       Boolean                  @default(true)
rewardConfig           Json?
rewardType             RewardType?

```
// Relations
Activity               Activity[]
ActivityEvent          ActivityEvent[]
Workspace              Workspace                @relation(...)
ChallengePointsBudget  ChallengePointsBudget?
Enrollment             Enrollment[]
InviteCode             InviteCode[]
PointsLedger           PointsLedger[]
RewardIssuance         RewardIssuance[]
WorkspaceCommunication WorkspaceCommunication[]

@@index([workspaceId, createdAt])
@@index([workspaceId, status])

```

}

Key Observations:

* ❌ No ownership tracking (createdBy field doesn't exist)
* ❌ No assignment tracking (no manager fields)
* ✅ Well-indexed for workspace queries
* ✅ Cascade deletes properly configured

---

1. Existing Assignment Patterns

Pattern A: createdBy Field (Used in InviteCode, WorkspaceParticipantSegment)

model InviteCode {
// ...
createdBy  String  @db.Uuid
User       User    @relation(fields: [createdBy], references: [id])
}

model WorkspaceParticipantSegment {
// ...
createdBy  String  @db.Uuid
User       User    @relation("SegmentCreator", fields: [createdBy], references: [id])
}

Pattern B: updatedBy Field (Used in ChallengePointsBudget, WorkspaceEmailSettings)

model ChallengePointsBudget {
// ...
updatedBy  String?  @db.Uuid
User       User?    @relation(fields: [updatedBy], references: [id])
}

Pattern C: Array Fields (Not currently used in schema)

Verdict: The codebase uses single foreign key references (createdBy, updatedBy) but NOT array fields for assignments. This suggests a preference for normalized, relational patterns.

---

1. Could WorkspaceParticipantSegment Be Repurposed?

model WorkspaceParticipantSegment {
id          String    @id
workspaceId String    @db.Uuid
name        String
description String?
filterJson  Json?     // ← Dynamic filtering
createdBy   String    @db.Uuid
// ...
}

Purpose: Dynamically filter participants based on criteria (enrollment status, points, activity).

Analysis:

* ❌ Different use case - Segments are for participant filtering, not manager assignments
* ❌ No challenge relationship - Segments are workspace-level, not challenge-specific
* ❌ JSON-based filtering - Not suitable for explicit manager-challenge assignments
* ✅ Could inspire a similar pattern - But should be separate model

Verdict: ❌ Cannot be repurposed - Fundamentally different domain concept.

---

1. Query Pattern Analysis

Critical Query 1: Manager Dashboard - "My Assigned Challenges"

// Frequency: VERY HIGH (every manager dashboard load)
// User story: "Show me all pending submissions for challenges I manage"

const mySubmissions = await prisma.activitySubmission.findMany({
where: {
status: 'PENDING',
Activity: {
Challenge: {
workspaceId,
// ⚠️ HOW TO FILTER FOR "MY ASSIGNED CHALLENGES"?
}
}
}
})

Option A: Array in WorkspaceMembership
const membership = await prisma.workspaceMembership.findUnique({
where: { userId_workspaceId: { userId, workspaceId } }
})

const submissions = await prisma.activitySubmission.findMany({
where: {
Activity: {
Challenge: {
id: { in: membership.assignedChallengeIds || [] }  // ✅ Simple
}
}
}
})
Performance: ⚠️ Requires 2 queries, but second is indexed on [Challenge.id](http://challenge.id/)

Option B: Join Table
const submissions = await prisma.activitySubmission.findMany({
where: {
Activity: {
Challenge: {
ChallengeAssignment: {
some: { managerId: userId }  // ✅ Single query
}
}
}
}
})
Performance: ✅ Single query with join, but requires index on ChallengeAssignment(managerId, challengeId)

Option C: Array in Challenge
const submissions = await prisma.activitySubmission.findMany({
where: {
Activity: {
Challenge: {
assignedManagerIds: { has: userId }  // ✅ Single query, array search
}
}
}
})
Performance: ✅ Single query, but PostgreSQL array search is slower than indexed join

---

Critical Query 2: Challenge Page - "Show Assigned Managers"

// Frequency: HIGH (admin/manager challenge management pages)
// User story: "Who are the managers assigned to this challenge?"

Option A: Array in WorkspaceMembership
const managers = await prisma.workspaceMembership.findMany({
where: {
workspaceId,
role: 'MANAGER',
assignedChallengeIds: { has: challengeId }  // ⚠️ Array search
},
include: { User: true }
})
Performance: ⚠️ Requires scanning all manager memberships with array filter (no index possible)

Option B: Join Table
const assignments = await prisma.challengeAssignment.findMany({
where: { challengeId },
include: { Manager: { select: { id: true, email: true } } }
})
Performance: ✅ Indexed lookup on challengeId, fast

Option C: Array in Challenge
const challenge = await prisma.challenge.findUnique({
where: { id: challengeId },
select: { assignedManagerIds: true }
})

// ⚠️ Must then manually fetch users
const managers = await prisma.user.findMany({
where: { id: { in: challenge.assignedManagerIds } }
})
Performance: ⚠️ Requires 2 queries

---

Critical Query 3: Manager Assignment/Unassignment

// Frequency: LOW (admin configuration)
// User story: "Assign/remove manager from challenge"

Option A: Array in WorkspaceMembership
// Assign
await prisma.workspaceMembership.update({
where: { userId_workspaceId: { userId, workspaceId } },
data: {
assignedChallengeIds: { push: challengeId }  // ⚠️ Array mutation
}
})

// Unassign (requires reading first to filter)
const membership = await getMembership(userId, workspaceId)
await prisma.workspaceMembership.update({
where: { userId_workspaceId: { userId, workspaceId } },
data: {
assignedChallengeIds: membership.assignedChallengeIds.filter(id => id !== challengeId)
}
})
Complexity: ⚠️ Unassign requires read-modify-write pattern

Option B: Join Table
// Assign
await prisma.challengeAssignment.create({
data: {
challengeId,
managerId: userId,
workspaceId,
assignedBy: adminId,
assignedAt: new Date()
}
})

// Unassign
await prisma.challengeAssignment.delete({
where: {
challengeId_managerId: { challengeId, managerId: userId }
}
})
Complexity: ✅ Simple, atomic operations

Option C: Array in Challenge
// Assign
await prisma.challenge.update({
where: { id: challengeId },
data: {
assignedManagerIds: { push: userId }
}
})

// Unassign (requires read-modify-write)
const challenge = await prisma.challenge.findUnique({
where: { id: challengeId },
select: { assignedManagerIds: true }
})
await prisma.challenge.update({
where: { id: challengeId },
data: {
assignedManagerIds: challenge.assignedManagerIds.filter(id => id !== userId)
}
})
Complexity: ⚠️ Same issue as Option A

---

Critical Query 4: Bulk Assignment - "Assign all challenges to manager"

// Frequency: LOW but important for onboarding
// User story: "Make this manager responsible for all active challenges"

Option A: Array in WorkspaceMembership
const activeChallenges = await prisma.challenge.findMany({
where: { workspaceId, status: 'PUBLISHED' },
select: { id: true }
})

await prisma.workspaceMembership.update({
where: { userId_workspaceId: { userId, workspaceId } },
data: {
assignedChallengeIds: activeChallenges.map(c => [c.id](http://c.id/))  // ✅ Single update
}
})
Performance: ✅ Simple, efficient

Option B: Join Table
const activeChallenges = await prisma.challenge.findMany({
where: { workspaceId, status: 'PUBLISHED' },
select: { id: true }
})

await prisma.challengeAssignment.createMany({
data: activeChallenges.map(c => ({
challengeId: [c.id](http://c.id/),
managerId: userId,
workspaceId,
assignedBy: adminId
}))
})
Performance: ✅ Single bulk insert, but creates N records

Option C: Array in Challenge
const activeChallenges = await prisma.challenge.findMany({
where: { workspaceId, status: 'PUBLISHED' }
})

// ⚠️ Must update each challenge individually
await Promise.all(
activeChallenges.map(c =>
prisma.challenge.update({
where: { id: [c.id](http://c.id/) },
data: {
assignedManagerIds: { push: userId }
}
})
)
)
Performance: ❌ N updates required (slow for many challenges)

---

1. Comprehensive Comparison Table

| Criteria                  | Option A: Array in Membership | Option B: Join Table      | Option C: Array in Challenge |
| ------------------------- | ----------------------------- | ------------------------- | ---------------------------- |
| Query: Manager Dashboard  | ⚠️ 2 queries                | ✅ 1 query (join)         | ✅ 1 query (array search)    |
| Query: Challenge Managers | ❌ Slow array scan            | ✅ Fast indexed lookup    | ⚠️ 2 queries               |
| Assign Manager            | ✅ Simple push                | ✅ Single insert          | ✅ Simple push               |
| Unassign Manager          | ⚠️ Read-modify-write        | ✅ Atomic delete          | ⚠️ Read-modify-write       |
| Bulk Assignment           | ✅ 1 update                   | ✅ 1 bulk insert          | ❌ N updates                 |
| Audit Trail               | ❌ No history                 | ✅ assignedBy, assignedAt | ❌ No history                |
| Database Size             | ✅ Small (array)              | ⚠️ Medium (N records)   | ✅ Small (array)             |
| Normalization             | ❌ Denormalized               | ✅ Normalized (3NF)       | ❌ Denormalized              |
| PostgreSQL Performance    | ⚠️ Array scans slow         | ✅ B-tree indexes fast    | ⚠️ GIN index needed        |
| Prisma Support            | ✅ Native                     | ✅ Native                 | ✅ Native                    |
| Cascading Deletes         | ⚠️ Manual cleanup needed    | ✅ Automatic via FK       | ⚠️ Manual cleanup needed   |
| Migration Risk            | Low                           | Medium                    | Low                          |
| Code Complexity           | Medium                        | Low                       | Medium                       |

---

1. RECOMMENDED APPROACH: Option B (Join Table)

Recommendation: Create ChallengeAssignment join table

model ChallengeAssignment {
id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
challengeId String    @db.Uuid
managerId   String    @db.Uuid
workspaceId String    @db.Uuid  // Denormalized for workspace queries
assignedBy  String    @db.Uuid
assignedAt  DateTime  @default(now())

```
Challenge   Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
Manager     User      @relation("ManagerAssignments", fields: [managerId], references: [id], onDelete: Cascade)
AssignedBy  User      @relation("AssignmentCreator", fields: [assignedBy], references: [id])
Workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

@@unique([challengeId, managerId])
@@index([managerId, workspaceId])  // Fast manager dashboard queries
@@index([challengeId])              // Fast challenge page queries
@@index([workspaceId])              // Fast workspace queries

```

}

---

Why Option B Wins:

1. Query Performance (Most Important)

Manager Dashboard (most frequent query):
// Single query, indexed join
const submissions = await prisma.activitySubmission.findMany({
where: {
status: 'PENDING',
Activity: {
Challenge: {
workspaceId,
ChallengeAssignment: {
some: { managerId: userId }
}
}
}
},
include: {
Activity: {
include: {
Challenge: {
include: {
ChallengeAssignment: {
where: { managerId: userId }
}
}
}
}
}
}
})

PostgreSQL execution plan:
-- Uses index on ChallengeAssignment(managerId, workspaceId)
-- Fast nested loop join
-- No array scans

1. Bidirectional Queries are Equally Fast

// "Get all managers for challenge" - FAST
const managers = await prisma.challengeAssignment.findMany({
where: { challengeId },
include: { Manager: true }
})

// "Get all challenges for manager" - FAST
const challenges = await prisma.challengeAssignment.findMany({
where: { managerId: userId, workspaceId },
include: { Challenge: true }
})

1. Audit Trail Built-In

{
assignedBy: "admin-user-id",
assignedAt: "2025-01-10T12:34:56Z"
}

Can track:

* Who assigned this manager?
* When were they assigned?
* How long have they been managing this challenge?

1. Automatic Cleanup via Cascade Deletes

Challenge @relation(..., onDelete: Cascade)
Manager   @relation(..., onDelete: Cascade)

* Delete challenge → all assignments deleted
* Delete manager → all assignments deleted
* No orphaned records

1. Easy to Extend

Future features become trivial:
model ChallengeAssignment {
// ... existing fields ...

```
// Easy to add:
permissions  Json?        // Manager-specific permissions
notifyOn     String[]     // Notification preferences
isBackup     Boolean      // Backup manager flag
expiresAt    DateTime?    // Temporary assignments

```

}

---

1. Implementation Plan

Step 1: Add Migration

// prisma/migrations/XXX_add_challenge_assignments/migration.sql

* * Create table
    CREATE TABLE "ChallengeAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "challengeId" UUID NOT NULL,
    "managerId" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "assignedBy" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

```
CONSTRAINT "ChallengeAssignment_pkey" PRIMARY KEY ("id")

```

);

* * Unique constraint
    CREATE UNIQUE INDEX "ChallengeAssignment_challengeId_managerId_key"
    ON "ChallengeAssignment"("challengeId", "managerId");
* * Performance indexes
    CREATE INDEX "ChallengeAssignment_managerId_workspaceId_idx"
    ON "ChallengeAssignment"("managerId", "workspaceId");

CREATE INDEX "ChallengeAssignment_challengeId_idx"
ON "ChallengeAssignment"("challengeId");

CREATE INDEX "ChallengeAssignment_workspaceId_idx"
ON "ChallengeAssignment"("workspaceId");

* * Foreign keys
    ALTER TABLE "ChallengeAssignment"
    ADD CONSTRAINT "ChallengeAssignment_challengeId_fkey"
    FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE;

ALTER TABLE "ChallengeAssignment"
ADD CONSTRAINT "ChallengeAssignment_managerId_fkey"
FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE;

ALTER TABLE "ChallengeAssignment"
ADD CONSTRAINT "ChallengeAssignment_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;

ALTER TABLE "ChallengeAssignment"
ADD CONSTRAINT "ChallengeAssignment_assignedBy_fkey"
FOREIGN KEY ("assignedBy") REFERENCES "User"("id");

Step 2: Add Helper Functions

// lib/db/challenge-assignments.ts

export async function assignManagerToChallenge(params: {
challengeId: string
managerId: string
workspaceId: string
assignedBy: string
}) {
return await prisma.challengeAssignment.create({
data: params
})
}

export async function getManagerChallenges(
managerId: string,
workspaceId: string
) {
return await prisma.challengeAssignment.findMany({
where: { managerId, workspaceId },
include: { Challenge: true }
})
}

export async function getChallengeManagers(challengeId: string) {
return await prisma.challengeAssignment.findMany({
where: { challengeId },
include: { Manager: { select: { id: true, email: true } } }
})
}

export async function isManagerAssignedToChallenge(
managerId: string,
challengeId: string
): Promise`<boolean>` {
const assignment = await prisma.challengeAssignment.findUnique({
where: {
challengeId_managerId: { challengeId, managerId }
}
})
return !!assignment
}

---

Final Verdict

✅ OPTION B (Join Table) is the clear winner because:

1. Performance: Fastest for the most common queries (manager dashboard)
2. Scalability: Indexed joins scale better than array scans
3. Maintainability: Clear, normalized schema
4. Audit trail: Built-in tracking of assignments
5. Safety: Automatic cascade deletes prevent orphans
6. Extensibility: Easy to add features later

Implementation Priority: HIGH - This is the foundation for the entire manager workflow.

### Query 5: Reward System

[Paste here]

⏺ Reward Issuance Flow & RewardSTACK Integration Architecture

1. issueReward() Function Deep Dive (lib/db/queries.ts:2351-2420)

export async function issueReward(params: {
userId: UserId
workspaceId: WorkspaceId
challengeId?: ChallengeId | null
submissionId?: string | null
type: 'points' | 'sku' | 'monetary'  // ← Reward type
amount?: number                       // ← For points/monetary
currency?: string                     // ← For monetary (USD, EUR, etc.)
skuId?: string                        // ← For SKU (product code)
provider?: string                     // ← External provider hint
metadata?: any                        // ← Arbitrary JSON
}): Promise`<RewardIssuance>`

Parameter Handling:

| Type     | Required Params      | Validation              | Example                                             |
| -------- | -------------------- | ----------------------- | --------------------------------------------------- |
| points   | amount > 0           | ✅ Throws if invalid    | { type: 'points', amount: 100 }                     |
| sku      | skuId                | ✅ Throws if missing    | { type: 'sku', skuId: 'GIFT-CARD-25' }              |
| monetary | amount > 0, currency | ✅ Throws if incomplete | { type: 'monetary', amount: 2500, currency: 'USD' } |

Function Flow:

// 1. Validate parameters (throw if invalid)
if (type === 'points' && (!amount || amount <= 0)) {
throw new DatabaseError('Points amount must be positive')
}

// 2. Create RewardIssuance record with status=PENDING
const reward = await prisma.rewardIssuance.create({
data: {
id: crypto.randomUUID(),
userId,
workspaceId,
challengeId: challengeId || null,
type,
amount: amount || null,
currency: currency || null,
skuId: skuId || null,
provider: provider || null,
status: 'PENDING',  // ← Always starts as PENDING
issuedAt: null,     // ← Not issued yet
metadata: metadata || null
}
})

// 3. Link reward to submission (one-to-one relationship)
if (submissionId) {
await prisma.activitySubmission.update({
where: { id: submissionId },
data: {
rewardIssuanceId: [reward.id](http://reward.id/),  // ← Link back to reward
rewardIssued: true              // ← Flag for quick queries
}
})
}

// 4. SPECIAL HANDLING FOR POINTS: Award immediately
if (type === 'points' && amount) {
await awardPointsWithBudget({  // ← Synchronous points award
workspaceId,
challengeId,
toUserId: userId,
amount,
submissionId
})
}

// 5. SPECIAL HANDLING FOR SKU/MONETARY: Do nothing (stays PENDING)
// ⚠️ NO external API calls happen here
// ⚠️ SKU/Monetary rewards require separate fulfillment process

return reward

---

1. RewardIssuance Model (Complete Schema)

model RewardIssuance {
id                 String              @id @db.Uuid
userId             String              @db.Uuid  // ← Reward recipient
workspaceId        String              @db.Uuid  // ← Tenant isolation
challengeId        String?             @db.Uuid  // ← Source challenge (nullable)
type               RewardType          // ← points, sku, monetary
amount             Int?                // ← Points or monetary amount (cents)
currency           String?             // ← USD, EUR, etc. (for monetary)
skuId              String?             // ← Product/SKU code
provider           String?             // ← External provider name
status             RewardStatus        @default(PENDING)  // ← State machine
issuedAt           DateTime?           // ← Fulfillment timestamp
error              String?             // ← Error message if FAILED
metadata           Json?               // ← Arbitrary data

```
// Relations
ActivitySubmission ActivitySubmission?  // ← One-to-one link
Challenge          Challenge?           @relation(...)
User               User                 @relation(...)
Workspace          Workspace            @relation(...)

@@index([challengeId])
@@index([status])  // ← Fast filtering by status
@@index([userId])
@@index([workspaceId])

```

}

enum RewardStatus {
PENDING    // ← Initial state (awaiting fulfillment)
ISSUED     // ← Successfully fulfilled
FAILED     // ← Fulfillment failed
CANCELLED  // ← Manually cancelled by admin
}

enum RewardType {
points     // ← Internal points (awarded immediately)
sku        // ← External product (requires API call)
monetary   // ← Cash equivalent (requires API call)
}

Missing Fields for External Integration:

* ❌ externalTransactionId - Track RewardSTACK order ID
* ❌ webhookCallbackUrl - Where to send status updates
* ❌ externalStatus - Status from external provider
* ❌ fulfillmentAttempts - Retry counter
* ❌ lastAttemptAt - Last fulfillment attempt timestamp

---

1. Current Reward Triggering Flow

Participant submits activity
↓
Status: PENDING (ActivitySubmission)
↓
Admin reviews submission
↓
POST /api/workspaces/[slug]/submissions/[id]/review
↓
reviewActivitySubmission()
↓
UPDATE ActivitySubmission SET status='APPROVED'
↓
if (status === 'APPROVED') {
↓
Determine reward config
(reward param > pointsAwarded > Challenge.rewardConfig)
↓
issueReward({
type: 'points' | 'sku' | 'monetary',
amount, currency, skuId, provider
})
↓
┌───────────────────────────────┐
│ CREATE RewardIssuance         │
│ status = PENDING              │
│ issuedAt = null               │
└───────────────────────────────┘
↓
if (type === 'points') {
↓
awardPointsWithBudget()  // ← SYNCHRONOUS
↓
UPDATE PointsBalance (increment)
UPDATE PointsBudget (decrement)
CREATE PointsLedger (audit)
↓
✅ Points issued immediately
}
↓
if (type === 'sku' || type === 'monetary') {
↓
⚠️ DO NOTHING
↓
RewardIssuance stays PENDING forever
❌ No fulfillment process exists
}
}

Current Call Sites:

1. ✅ app/api/workspaces/[slug]/submissions/[id]/review/route.ts:90 (Admin approval)
2. ✅ app/w/[slug]/admin/dashboard/actions.ts:77 (Server action)

---

1. Points vs SKU/Monetary Handling

Points Flow (Synchronous, Immediate)

// lib/db/queries.ts:1618-1679
export async function awardPointsWithBudget(params: {
workspaceId, challengeId, toUserId, amount, submissionId
}) {
return await prisma.$transaction(async (tx) => {
// 1. Decrement budget (challenge-level or workspace-level)
if (challengeId) {
await tx.challengePointsBudget.update({
where: { challengeId },
data: { allocated: { increment: amount } }
})
} else {
await tx.workspacePointsBudget.update({
where: { workspaceId },
data: { allocated: { increment: amount } }
})
}

```
  // 2. Increment user balance (upsert for first-time users)
  await tx.pointsBalance.upsert({
    where: { userId_workspaceId: { userId: toUserId, workspaceId } },
    update: {
      totalPoints: { increment: amount },
      availablePoints: { increment: amount }
    },
    create: {
      userId: toUserId,
      workspaceId,
      totalPoints: amount,
      availablePoints: amount
    }
  })

  // 3. Create audit log
  await tx.pointsLedger.create({
    data: {
      workspaceId,
      challengeId,
      toUserId,
      amount,
      submissionId,
      reason: 'AWARD_APPROVED'
    }
  })
})

```

}

Characteristics:

* ✅ Synchronous - Completes within request cycle
* ✅ Atomic - All-or-nothing via $transaction
* ✅ Immediate - Points available instantly
* ✅ Audited - Logged in PointsLedger
* ✅ Budget-tracked - Decrements available budget

SKU/Monetary Flow (Current: None)

if (type === 'sku' || type === 'monetary') {
// ⚠️ CURRENT IMPLEMENTATION:
// 1. Create RewardIssuance with status=PENDING
// 2. Do nothing else
// 3. Record stays PENDING forever
// 4. No fulfillment process
// 5. No retry logic
// 6. No status updates
}

Problem: ❌ No external API integration exists. SKU/monetary rewards are abandoned after approval.

---

1. Error Handling & Retry (Current State)

Current Error Handling:
try {
const reward = await prisma.rewardIssuance.create({ ... })
return reward
} catch (error) {
throw new DatabaseError(`Failed to issue reward: ${error}`)
}

Analysis:

* ✅ Database errors are caught
* ❌ NO retry logic for failed fulfillment
* ❌ NO error field population (RewardIssuance.error is never set)
* ❌ NO status transitions (PENDING → FAILED never happens)
* ❌ NO webhook handling for external provider failures

Status Transitions (Theoretical, Not Implemented):

PENDING
│
├─ Success → ISSUED (set issuedAt, clear error)
│
├─ Failure → FAILED (set error message)
│     │
│     └─ Retry → PENDING (increment attempts)
│
└─ Admin → CANCELLED (manual cancellation)

Current State: ⚠️ Only PENDING and ISSUED are used. FAILED and CANCELLED are never set.

---

1. RewardSTACK Integration Points - RECOMMENDED ARCHITECTURE

Option A: Synchronous API Call (Immediate Fulfillment)

// lib/db/queries.ts - Update issueReward()

export async function issueReward(params) {
// ... existing validation ...

```
const reward = await prisma.rewardIssuance.create({
  data: { ... }
})

if (submissionId) {
  await prisma.activitySubmission.update({ ... })
}

// POINTS: Synchronous (existing)
if (type === 'points' && amount) {
  await awardPointsWithBudget({ ... })

  // Mark as issued immediately
  await prisma.rewardIssuance.update({
    where: { id: reward.id },
    data: { status: 'ISSUED', issuedAt: new Date() }
  })
}

// SKU/MONETARY: Call RewardSTACK immediately
if (type === 'sku' || type === 'monetary') {
  try {
    const externalTransaction = await callRewardSTACKAPI({
      userId: reward.userId,
      type: reward.type,
      skuId: reward.skuId,
      amount: reward.amount,
      currency: reward.currency,
      workspaceId: reward.workspaceId,
      rewardIssuanceId: reward.id,
      callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/rewardstack`
    })

    await prisma.rewardIssuance.update({
      where: { id: reward.id },
      data: {
        status: 'ISSUED',
        issuedAt: new Date(),
        metadata: {
          ...reward.metadata,
          externalTransactionId: externalTransaction.orderId,
          provider: 'rewardstack'
        }
      }
    })
  } catch (error) {
    await prisma.rewardIssuance.update({
      where: { id: reward.id },
      data: {
        status: 'FAILED',
        error: error.message,
        metadata: {
          ...reward.metadata,
          failedAt: new Date(),
          errorDetails: error
        }
      }
    })

    // Log but don't throw (don't fail submission approval if reward fails)
    console.error(`Reward fulfillment failed for ${reward.id}:`, error)
  }
}

return reward

```

}

Pros:

* ✅ Simple implementation
* ✅ Immediate feedback to admin
* ✅ No background job infrastructure needed

Cons:

* ❌ Blocks submission approval HTTP response
* ❌ If RewardSTACK API is slow (5+ seconds), request times out
* ❌ No automatic retry on failure

---

Option B: Async Background Job (Recommended for Production)

// lib/db/queries.ts - issueReward stays unchanged

export async function issueReward(params) {
const reward = await prisma.rewardIssuance.create({ ... })

```
if (type === 'points') {
  await awardPointsWithBudget({ ... })
}

if (type === 'sku' || type === 'monetary') {
  // ✅ Queue for async processing
  await enqueueRewardFulfillment(reward.id)
}

return reward

```

}

// lib/jobs/reward-fulfillment.ts - NEW FILE
export async function processRewardFulfillment(rewardIssuanceId: string) {
const reward = await prisma.rewardIssuance.findUnique({
where: { id: rewardIssuanceId },
include: { User: { select: { email: true } } }
})

```
if (!reward || reward.status !== 'PENDING') {
  return // Already processed or doesn't exist
}

try {
  const externalOrder = await callRewardSTACKAPI({
    recipientEmail: reward.User.email,
    type: reward.type,
    skuId: reward.skuId,
    amount: reward.amount,
    currency: reward.currency,
    rewardIssuanceId: reward.id,
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/rewardstack`
  })

  await prisma.rewardIssuance.update({
    where: { id: reward.id },
    data: {
      status: 'ISSUED',
      issuedAt: new Date(),
      metadata: {
        externalTransactionId: externalOrder.orderId,
        externalStatus: externalOrder.status,
        trackingUrl: externalOrder.trackingUrl
      }
    }
  })
} catch (error) {
  // Retry logic
  const attempts = (reward.metadata?.fulfillmentAttempts || 0) + 1
  const maxAttempts = 3

  if (attempts < maxAttempts) {
    await prisma.rewardIssuance.update({
      where: { id: reward.id },
      data: {
        metadata: {
          ...reward.metadata,
          fulfillmentAttempts: attempts,
          lastAttemptAt: new Date(),
          lastError: error.message
        }
      }
    })

    // Re-queue with exponential backoff
    await enqueueRewardFulfillment(reward.id, { delay: Math.pow(2, attempts) * 60 * 1000 })
  } else {
    // Mark as failed after max attempts
    await prisma.rewardIssuance.update({
      where: { id: reward.id },
      data: {
        status: 'FAILED',
        error: `Failed after ${attempts} attempts: ${error.message}`,
        metadata: {
          ...reward.metadata,
          fulfillmentAttempts: attempts,
          failedAt: new Date()
        }
      }
    })
  }
}

```

}

Pros:

* ✅ Non-blocking submission approval
* ✅ Automatic retry with exponential backoff
* ✅ Handles slow/unreliable external APIs
* ✅ Can process in batches (efficiency)

Cons:

* ⚠️ Requires background job infrastructure (Inngest, BullMQ, etc.)
* ⚠️ Slightly more complex

---

1. Webhook Infrastructure (Missing, Needs Implementation)

Current State:

* ❌ NO webhook endpoints exist (/api/webhooks/* directory doesn't exist)
* ❌ NO signature verification
* ❌ NO webhook handling logic

Recommended Implementation:

// app/api/webhooks/rewardstack/route.ts - NEW FILE

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyRewardSTACKSignature } from '@/lib/integrations/rewardstack'

export async function POST(request: NextRequest) {
const body = await request.text()
const signature = request.headers.get('x-rewardstack-signature')

```
// 1. Verify webhook signature (prevent spoofing)
if (!verifyRewardSTACKSignature(body, signature)) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
}

const payload = JSON.parse(body)
const { event, data } = payload

// 2. Handle different webhook events
switch (event) {
  case 'order.fulfilled':
    await prisma.rewardIssuance.update({
      where: {
        metadata: {
          path: ['externalTransactionId'],
          equals: data.orderId
        }
      },
      data: {
        status: 'ISSUED',
        issuedAt: new Date(),
        metadata: {
          externalStatus: 'fulfilled',
          trackingNumber: data.trackingNumber,
          fulfilledAt: data.fulfilledAt
        }
      }
    })
    break

  case 'order.failed':
    await prisma.rewardIssuance.update({
      where: {
        metadata: {
          path: ['externalTransactionId'],
          equals: data.orderId
        }
      },
      data: {
        status: 'FAILED',
        error: data.errorMessage,
        metadata: {
          externalStatus: 'failed',
          errorDetails: data
        }
      }
    })
    break

  case 'order.shipped':
    // Update tracking info
    await prisma.rewardIssuance.update({
      where: {
        metadata: {
          path: ['externalTransactionId'],
          equals: data.orderId
        }
      },
      data: {
        metadata: {
          externalStatus: 'shipped',
          trackingNumber: data.trackingNumber,
          carrier: data.carrier,
          estimatedDelivery: data.estimatedDelivery
        }
      }
    })
    break
}

return NextResponse.json({ received: true }, { status: 200 })

```

}

Signature Verification:

// lib/integrations/rewardstack.ts - NEW FILE

import crypto from 'crypto'

export function verifyRewardSTACKSignature(
payload: string,
signature: string | null
): boolean {
if (!signature) return false

```
const secret = process.env.REWARDSTACK_WEBHOOK_SECRET!
const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex')

return crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(expectedSignature)
)

```

}

export async function callRewardSTACKAPI(params: {
recipientEmail: string
type: 'sku' | 'monetary'
skuId?: string
amount?: number
currency?: string
rewardIssuanceId: string
callbackUrl: string
}) {
const response = await fetch('[https://api.rewardstack.io/v1/orders](https://api.rewardstack.io/v1/orders)', {
method: 'POST',
headers: {
'Authorization': `Bearer ${process.env.REWARDSTACK_API_KEY}`,
'Content-Type': 'application/json'
},
body: JSON.stringify({
recipient: { email: params.recipientEmail },
product: params.type === 'sku' ? params.skuId : 'cash',
amount: params.amount,
currency: params.currency,
metadata: {
rewardIssuanceId: params.rewardIssuanceId
},
webhookUrl: params.callbackUrl
})
})

```
if (!response.ok) {
  const error = await response.json()
  throw new Error(`RewardSTACK API error: ${error.message}`)
}

return await response.json()

```

}

---

1. Recommended Integration Architecture

┌─────────────────────────────────────────────────────────────┐
│ SUBMISSION APPROVAL FLOW (Admin Action)                     │
└─────────────────────────────────────────────────────────────┘
↓
POST /api/workspaces/[slug]/submissions/[id]/review
↓
reviewActivitySubmission()  // Update status
↓
if (status === 'APPROVED') {
↓
issueReward({ type, amount, skuId, ... })
↓
CREATE RewardIssuance (status=PENDING)
↓
┌──────────────┴──────────────┐
↓                             ↓
type=points                   type=sku/monetary
↓                             ↓
awardPointsWithBudget()      enqueueRewardFulfillment()
(synchronous)                (async job)
↓                             ↓
UPDATE RewardIssuance         ✅ Return to user immediately
status=ISSUED                    (don't block HTTP response)
↓
✅ Return to user

┌─────────────────────────────────────────────────────────────┐
│ BACKGROUND JOB (Async, Retries)                             │
└─────────────────────────────────────────────────────────────┘
↓
processRewardFulfillment(rewardId)
↓
callRewardSTACKAPI({ ... })
↓
┌────────────┴────────────┐
↓                         ↓
Success                   Failure
↓                         ↓
UPDATE RewardIssuance    Retry (exp. backoff)
status=ISSUED                   ↓
issuedAt=NOW              After 3 attempts:
metadata={                UPDATE RewardIssuance
externalTransactionId,  status=FAILED
trackingUrl             error="..."
}
↓
✅ Job complete

┌─────────────────────────────────────────────────────────────┐
│ WEBHOOK CALLBACK (RewardSTACK → Us)                        │
└─────────────────────────────────────────────────────────────┘
↓
POST /api/webhooks/rewardstack
↓
Verify signature (HMAC SHA256)
↓
Parse event type
↓
┌─────────────┬──────────────┬──────────────┐
↓             ↓              ↓              ↓
order.fulfilled  order.failed  order.shipped  order.cancelled
↓             ↓              ↓              ↓
UPDATE status   UPDATE status  UPDATE metadata  UPDATE status
=ISSUED         =FAILED        (tracking#)      =CANCELLED

---

1. Required Schema Changes

model RewardIssuance {
// ... existing fields ...

```
// Add these fields:
externalTransactionId String?  // ← RewardSTACK order ID
fulfillmentAttempts   Int      @default(0)  // ← Retry counter
lastAttemptAt         DateTime?  // ← Last fulfillment attempt

// metadata will store:
// - trackingUrl
// - trackingNumber
// - carrier
// - externalStatus
// - errorDetails

```

}

---

Final Recommendation: Hybrid Approach

1. Points: Keep synchronous (existing behavior)
2. SKU/Monetary: Use async background job (Option B)
3. Webhook: Implement callback handler for status updates
4. Retry Logic: 3 attempts with exponential backoff (1m, 2m, 4m)
5. Error Handling: Update RewardIssuance.status and .error on failure
6. Job Queue: Use Inngest (already supported by Next.js ecosystem)

This architecture ensures fast user experience while handling unreliable external APIs gracefully.

### Query 6: Notifications

⏺ Notification Infrastructure Evaluation Report

1. Email Sending Capability ✅ EXISTS

Infrastructure: NodeMailer with SMTP transport
// lib/email/smtp.ts:3-21
function getTransport() {
const host = process.env.SMTP_HOST || '[smtp.resend.com](http://smtp.resend.com/)'
const port = parseInt(process.env.SMTP_PORT || '587', 10)
const secure = port === 465
const user = process.env.SMTP_USER
const pass = process.env.SMTP_PASS

```
return nodemailer.createTransport({
  host, port, secure,
  auth: { user, pass },
  pool: true  // ← Connection pooling enabled
})

```

}

Environment Variables (.env.example:7-18):

# Email Service (Resend API)

RESEND_API_KEY="your_resend_api_key_here"

SMTP_HOST=[smtp.resend.com](http://smtp.resend.com/)
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=<resend_api_key_pass>
[EMAIL_FROM=team@updates.changemaker.im](mailto:EMAIL_FROM=team@updates.changemaker.im)
EMAIL_FROM_NAME=Changemaker

Two Email Functions:

1. sendInviteEmail(to, subject, html) - lib/email/smtp.ts:23-37
2. sendCommunicationEmail(subject, html, to?, bcc?) - lib/email/communications.ts:10-22

Status: ✅ Fully functional, production-ready

---

1. Email Templates ✅ EXISTS (Limited)

Current Templates: Only 1 template exists
// lib/email/templates/invite.ts
export function renderInviteEmail(args: {
workspaceName: string
inviterEmail: string
role: string
inviteUrl: string
expiresAt: Date
challengeTitle?: string | null
})

Template Format:

* HTML only (no plain text fallback)
* Inline styles (no CSS file)
* Dynamic variables via function arguments
* Coral CTA button (#ef4444)

Missing Templates:

* ❌ Manager assignment notification
* ❌ Submission received confirmation
* ❌ Approval notification
* ❌ Rejection notification with feedback
* ❌ Password reset
* ❌ Email change confirmation

Recommendation: Create lib/email/templates/ directory structure:
lib/email/templates/
invite.ts             ✅ EXISTS
manager-assigned.ts   ❌ NEED
submission-received.ts ❌ NEED
submission-approved.ts ❌ NEED
submission-rejected.ts ❌ NEED

---

1. Notification Triggers ✅ EXISTS (Partial)

Current Triggers (all synchronous, no queue):

| Event             | File                       | Line | Status     |
| ----------------- | -------------------------- | ---- | ---------- |
| Invite sent       | participants/route.ts      | 125  | ✅ Working |
| Bulk invite       | participants/bulk/route.ts | 146  | ✅ Working |
| Resend invite     | participants/[id]/route.ts | 424  | ✅ Working |
| Challenge publish | challenges/[id]/route.ts   | 441  | ✅ Working |
| Broadcast message | communications/route.ts    | 156  | ✅ Working |

Example Trigger (challenges/[id]/route.ts:417-458):
// On PUBLISH action, send invites to users with INVITED status
if (action === 'PUBLISH') {
const memberships = await prisma.enrollment.findMany({
where: { challengeId: id, status: 'INVITED' }
})

```
for (const m of memberships) {
  const invite = await createInviteCode(...)
  const html = renderInviteEmail(...)
  await sendInviteEmail({ to: m.User.email, subject: ..., html })

  await logActivityEvent({
    type: 'INVITE_SENT',
    userId: m.User.id,
    metadata: { via: 'publish', inviteCode: invite.code }
  })
}

```

}

Missing Triggers for Manager Workflow:

* ❌ Manager assigned to challenge
* ❌ Submission submitted (notify manager)
* ❌ Manager approved submission (notify participant)
* ❌ Manager rejected submission (notify participant)
* ❌ Admin overrode manager decision (notify both)

Synchronous vs Queued:

* Current: All emails sent synchronously (blocking)
* Risk: Slow SMTP server delays API response
* Recommendation: Add queue for non-critical emails (Inngest, BullMQ, or Trigger.dev)

---

1. In-App Notifications ❌ DOES NOT EXIST

Schema Check: No Notification model found

# Searched for: model.*Notification

# Result: No matches found

UI Check: No notification center/bell icon

# No files found matching:

* components/**/notification*.tsx
* components/**/bell*.tsx
* app/**/notifications/page.tsx

Real-time Updates: Not implemented

* No WebSocket/SSE infrastructure
* No Supabase Realtime subscriptions
* No React Query polling

Recommendation:

* Phase 1 (MVP): Email-only notifications
* Phase 2 (Future): Add Notification model + UI bell icon

---

1. ActivityEvent Usage ℹ️ AUDIT TRAIL ONLY

Purpose: Event logging for admin activity feed, NOT notifications

ActivityEventType Enum (prisma/schema.prisma:456-475):
enum ActivityEventType {
INVITE_SENT
INVITE_REDEEMED
EMAIL_RESENT
ENROLLED
UNENROLLED
RBAC_ROLE_CHANGED
SUBMISSION_CREATED       // ← Relevant for Manager workflow
SUBMISSION_APPROVED      // ← Relevant for Manager workflow
SUBMISSION_REJECTED      // ← Relevant for Manager workflow
CHALLENGE_CREATED
CHALLENGE_UPDATED
CHALLENGE_DUPLICATED
CHALLENGE_PUBLISHED
CHALLENGE_UNPUBLISHED
CHALLENGE_ARCHIVED
ACTIVITY_CREATED
ACTIVITY_UPDATED
BULK_UNENROLL
}

logActivityEvent() Function (lib/db/queries.ts:1822-1847):
export async function logActivityEvent(data: {
workspaceId: string
type: ActivityEventType
challengeId?: string | null
enrollmentId?: string | null
userId?: string | null       // ← Subject of the event
actorUserId?: string | null  // ← Who performed the action
metadata?: any
}) {
try {
await prisma.activityEvent.create({ data: { ... } })
} catch (error) {
console.warn('Failed to log activity event', error)  // ← Non-fatal
}
}

Current Usage:

* Admin activity feed (app/w/[slug]/admin/dashboard/activity-feed.tsx)
* Audit trail for compliance
* Timeline visualization

Could We Leverage for Notifications?

* ✅ YES: ActivityEvent already captures all relevant events
* ✅ YES: Has userId (recipient) and actorUserId (sender)
* ✅ YES: Has metadata for additional context

Recommendation: Use ActivityEvent as notification trigger source
// Proposed: Hook into logActivityEvent to send emails
export async function logActivityEvent(data: ...) {
await prisma.activityEvent.create({ data })

```
// NEW: Trigger email notifications based on event type
if (shouldSendEmailNotification(data.type)) {
  await enqueueEmailNotification(data)  // ← Queue for async processing
}

```

}

---

1. User Notification Preferences ❌ DOES NOT EXIST

Schema Check: No preference fields in User model

# Searched for: notification|emailPreferences|optOut

# Result: No matches found in prisma/schema.prisma

Missing Fields:

* ❌ emailNotificationsEnabled (global on/off)
* ❌ notifyOnSubmission (manager preference)
* ❌ notifyOnApproval (participant preference)
* ❌ notifyOnRejection (participant preference)
* ❌ digestFrequency (instant, daily, weekly)

Recommendation: Add notification preferences to User model
model User {
// ... existing fields ...

```
// Notification preferences
emailNotificationsEnabled Boolean @default(true)
notifyOnSubmission        Boolean @default(true)  // Manager: new submission
notifyOnApproval          Boolean @default(true)  // Participant: approved
notifyOnRejection         Boolean @default(true)  // Participant: rejected
digestFrequency           DigestFrequency @default(INSTANT)

```

}

enum DigestFrequency {
INSTANT
DAILY
WEEKLY
NEVER
}

---

Summary & Recommendations

✅ What Exists Today

1. Email infrastructure (NodeMailer + Resend SMTP)
2. Basic invite email template
3. Synchronous email triggers (invite, publish)
4. ActivityEvent audit trail system
5. Bulk email via communications route

❌ What's Missing

1. Manager-specific email templates
2. Submission workflow email triggers
3. In-app notification UI
4. User notification preferences
5. Email queue (async processing)

📋 Implementation Plan for Manager Notifications

Phase 1: Email Templates (1-2 hours)

# Create new templates in lib/email/templates/

* manager-assigned.ts
* submission-received.ts
* submission-approved.ts
* submission-rejected.ts

Phase 2: Email Triggers (2-3 hours)
// Hook into existing events:

1. ChallengeAssignment created → Email manager
2. ActivitySubmission created → Email assigned managers
3. reviewActivitySubmission() with MANAGER_APPROVED → Email participant
4. reviewActivitySubmission() with REJECTED → Email participant with notes

Phase 3: Notification Preferences (Optional, 1-2 hours)
// Add User.emailNotificationsEnabled
// Add settings UI in /w/[slug]/participant/profile
// Respect preferences in email triggers

Phase 4: Queue System (Optional, future enhancement)
// Replace synchronous sendInviteEmail()
// With: enqueueEmailNotification()
// Options: Inngest, BullMQ, Trigger.dev

---

🎯 Minimal Viable Solution

For Manager approval workflow, you only need:

1. ✅ Email infrastructure (already exists)
2. ✅ Add 3 new templates (manager-assigned, submission-received, approval/rejection)
3. ✅ Add 4 trigger points (assignment, submission, approval, rejection)
4. ✅ Use existing logActivityEvent() for audit trail

No need for:

* ❌ In-app notifications (email-only for MVP)
* ❌ Notification preferences (default to all enabled)
* ❌ Email queue (synchronous is fine for <100 users)

Total Estimated Effort: 3-5 hours

Would you like me to implement the email templates and triggers for the manager workflow?

### Query 7: UI Architecture

⏺ UI Structure & Manager Dashboard Design Analysis

Based on my comprehensive examination of the codebase, here's the complete UI architecture and recommendations for the manager dashboard:

---

1. Admin Dashboard Structure

File: app/w/[slug]/admin/dashboard/page.tsx:1-326

Pattern: Server Component with direct Prisma queries

Key Sections:
// Stats Grid (lines 98-181)

* Participants count (clickable card → /admin/participants)
* Challenges count (clickable card → /admin/challenges)
* Total enrollments (static card)
* Pending submissions (priority alert + clickable card)

// Pending Submissions Alert (lines 65-95)

* Amber gradient card with animated ping icon
* "X submissions awaiting review"
* Oldest pending timestamp
* "Review Now" CTA button → submissions page with ?status=pending filter

// Announcement + Activity Feed (lines 184-192)

* Two-column layout on desktop
* AnnouncementComposer (composer for workspace broadcasts)
* CollapsibleActivityFeed (recent events log)

// Recent Challenges (lines 195-264)

* List of 3 most recent challenges
* Empty state with CTA to create first challenge
* "View all X challenges" button if >3

// Quick Actions (lines 267-323)

* 3-column grid of action cards
* Each card: Icon + Title + Description
* Hover effects with coral accent colors

Data Fetching:

* Direct Prisma queries in Server Component (no API calls)
* getRecentWorkspaceActivities([workspace.id](http://workspace.id/)) for activity feed
* Workspace stats via prisma.workspace.findUnique({ include: ... })

Color Scheme:

* Primary: bg-coral-500 hover:bg-coral-600 (#ef4444 family)
* Alert: bg-amber-400 with animate-ping
* Success: text-green-600
* Info: text-blue-600

---

1. Submissions Review UI

File: app/w/[slug]/admin/challenges/[id]/submissions/page.tsx:1-367

Pattern: Server Component with URL-based filtering

Features:

1. Status Filter Tabs (lines 189-206)
   const FILTERS = [
   { key: 'PENDING', label: 'Pending' },
   { key: 'APPROVED', label: 'Approved' },
   { key: 'REJECTED', label: 'Rejected' },
   { key: 'ALL', label: 'All' }
   ]

* Implemented as Link-based buttons with ?status= query param
* Active filter has variant="default", inactive variant="outline"
* Badge shows count for each status

2. Stats Dashboard (lines 135-180)
   // 4-column grid showing:

* Pending approvals (amber, with "oldest pending" timestamp)
* Approved count (green)
* Rejected count (red)
* Average points value (purple)

1. Submission Cards (lines 224-361)
   `<Card>` for each submission
   `<CardHeader>`
   * Activity name
   * Submitter email (with Mail icon)
   * Timestamp ("submitted X ago")
   * Status badge + Points badge
     `</CardHeader>`
     `<CardContent>`
   * Text response (if exists)
   * Link URL (if exists)
   * File attachments (if exist)
   * Review notes (if approved/rejected)
   * SubmissionReviewButton (approve/reject) if PENDING
     `</CardContent>`
     `</Card>`

Review Button Component:

* File: app/w/[slug]/admin/challenges/[id]/submission-review-button.tsx:1-194
* Pattern: Client Component with Dialog
* Flow:
  a. Click "Approve" or "Reject" button
  b. Opens `<Dialog>` with form
  c. For approval: Optional review notes + reward type selector (points/SKU/monetary)
  d. For rejection: Required review notes
  e. Calls /api/workspaces/[slug]/submissions/[id]/review POST endpoint
  f. Toast notification on success
  g. router.refresh() to reload page

Empty State (lines 210-222):
`<Card>` with centered content
`<Trophy icon in gray circle>`

<h3>"No pending submissions"</h3>
<p>"Great work! New submissions will appear here..."</p>
</Card>

---

1. Layout & Navigation

Admin Layout (app/w/[slug]/admin/layout.tsx:1-79):
export default async function AdminLayout({ children, params }) {
// 1. Auth check → redirect if not authenticated
// 2. Role check → redirect if not ADMIN
// 3. Fetch workspace + points budget
// 4. Check if platform superadmin

```
return (
  <WorkspaceProvider initialWorkspace initialRole initialWorkspaces>
    <DashboardLayout header={<DashboardHeader />} sidebar={<AdminSidebar />}>
      {children}
    </DashboardLayout>
  </WorkspaceProvider>
)

```

}

Navigation Items (components/navigation/admin-sidebar.tsx:31-41):
const workspaceNavigation = [
{ name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
{ name: 'Participants', href: '/admin/participants', icon: Users },
{ name: 'Challenges', href: '/admin/challenges', icon: Trophy },
{ name: 'Points', href: '/admin/points', icon: Coins },
{ name: 'Activities', href: '/admin/activity-templates', icon: ClipboardList },
{ name: 'Emails', href: '/admin/emails', icon: Settings },
{ name: 'Invites', href: '/admin/invites', icon: Link2 },
{ name: 'Settings', href: '/admin/settings', icon: Settings },
{ name: 'Profile', href: '/admin/profile', icon: UserIcon },
]

How to Add Manager Section:
// Insert after 'Participants', before 'Challenges'
const workspaceNavigation = [
{ name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
{ name: 'Participants', href: '/admin/participants', icon: Users },

```
// NEW: Manager section
{ name: 'Manager Queue', href: '/admin/manager/queue', icon: ClipboardCheck }, // ← NEW

{ name: 'Challenges', href: '/admin/challenges', icon: Trophy },
// ... rest

```

]

Sidebar Features:

* Collapsible (ChevronLeft/ChevronRight button)
* Active link: bg-coral-50 text-coral-700 border border-coral-200
* Hover: hover:bg-gray-50 hover:text-coral-600
* Platform superadmin section (purple theme) appears above workspace nav
* Workspace info at top with logo + workspace name

Participant Layout (similar pattern, simpler navigation):
const navigation = [
{ name: 'Dashboard', href: '/participant/dashboard', icon: LayoutDashboard },
{ name: 'Challenges', href: '/participant/challenges', icon: Trophy },
{ name: 'My Activities', href: '/participant/activities', icon: Activity },
{ name: 'Leaderboard', href: '/participant/leaderboard', icon: TrendingUp },
{ name: 'Profile', href: '/participant/profile', icon: UserIcon },
]

---

1. Data Table Patterns

Current Implementation: Card-based lists, NOT traditional data tables

Example: Submissions list (app/w/[slug]/admin/challenges/[id]/submissions/page.tsx:224-361)
{submissions.map(submission => (
<Card key={[submission.id](http://submission.id/)} className="border shadow-sm transition hover:shadow-md">
`<CardHeader>`...`</CardHeader>`
`<CardContent>`...`</CardContent>`
`</Card>`
))}

Features:

* No pagination (loads all submissions filtered by status)
* No client-side sorting
* Filtering via URL query params (?status=pending)
* Empty states with helpful messaging
* Hover effects (hover:shadow-md, hover:border-coral-300)

If You Need a Data Table:

* Install @tanstack/react-table (shadcn/ui uses this)
* Create components/ui/data-table.tsx wrapper
* Example exists in many shadcn/ui projects: [https://ui.shadcn.com/docs/components/data-table](https://ui.shadcn.com/docs/components/data-table)

Alternative: Continue card-based pattern (matches existing design language)

---

1. Form Patterns

Two Approaches Used:

A. Server Actions (preferred for mutations)

Example: app/w/[slug]/admin/dashboard/actions.ts:1-175
'use server'

import { revalidatePath } from 'next/cache'
import { reviewActivitySubmission } from '@/lib/db/queries'

export async function quickApproveSubmission(
submissionId: string,
workspaceId: string,
slug: string,
pointsAwarded: number
) {
// 1. Auth check
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

```
// 2. Permission check
const isAdmin = await verifyWorkspaceAdmin(dbUser.id, workspaceId)

// 3. Perform mutation
const reviewed = await reviewActivitySubmission(...)

// 4. Revalidate paths
revalidatePath(`/w/${slug}/admin/dashboard`)

// 5. Return result
return { success: true, submission: reviewed }

```

}

Client Component Usage:
'use client'
import { quickApproveSubmission } from './actions'

const handleApprove = async () => {
const result = await quickApproveSubmission(id, workspaceId, slug, points)
if (result.success) {
toast({ title: 'Success!' })
}
}

B. API Route + Fetch (submission review button uses this)

Example: app/w/[slug]/admin/challenges/[id]/submission-review-button.tsx:36-78
'use client'

const handleReview = async () => {
const response = await fetch(`/api/workspaces/${workspaceSlug}/submissions/${submissionId}/review`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({
status: action === 'approve' ? 'APPROVED' : 'REJECTED',
reviewNotes,
pointsAwarded
})
})

```
if (response.ok) {
  toast({ title: 'Success!' })
  router.refresh()  // ← Revalidate server data
}

```

}

Validation: Type guards in lib/types.ts
export function validateChallengeData(data: unknown): data is ChallengeCreateRequest {
// Runtime validation logic
}

Success/Error Feedback:

* Toast notifications via useToast() hook from @/hooks/use-toast
* Loading states: isLoading state + disabled buttons during mutations
* Optimistic UI: Not used (prefers server-driven updates)

---

1. Role-Based Rendering

Pattern: Layout-level protection + conditional UI

Layout Protection (app/w/[slug]/admin/layout.tsx:31-34):
const role = await getUserWorkspaceRole(slug)
if (!role || role !== "ADMIN") {
redirect("/workspaces")  // ← Hard redirect
}

Conditional UI (app/w/[slug]/admin/layout.tsx:55-56):
<DashboardHeader
title="Admin Dashboard"
role="ADMIN"
showRoleSwitcher={true}  // ← ADMIN users can switch to participant view
budgetBadge={...}
/>

Sidebar Conditional Sections (components/navigation/admin-sidebar.tsx:95-128):
{isSuperAdmin && (

<div>
<h3>Platform Admin</h3>
<ul>
{superAdminNavigation.map(item => (
<Link href={item.href} className="bg-purple-50">...</Link>
))}
</ul>
</div>
)}

<div>
<h3>Workspace Admin</h3>
<ul>
{workspaceNavigation.map(item => (
<Link href={`/w/${workspace.slug}${item.href}`}>...</Link>
))}
</ul>
</div>

How to Add Manager-Specific UI:
// In any component
import { getUserWorkspaceRole } from '@/lib/workspace-context'

export default async function Page({ params }) {
const { slug } = await params
const role = await getUserWorkspaceRole(slug)

```
// Check if user is a manager (via WorkspaceMembership.role or custom logic)
const isManager = await isWorkspaceManager(user.id, workspace.id)  // ← NEW function needed

return (
  <div>
    {isManager && (
      <Card>
        <CardTitle>Manager Tools</CardTitle>
        {/* Manager-specific content */}
      </Card>
    )}

    {/* Always visible content */}
  </div>
)

```

}

---

1. Component Structure

Component Organization:
components/
├── ui/                    # 38 shadcn/ui base components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── badge.tsx
│   ├── input.tsx
│   ├── textarea.tsx
│   ├── select.tsx
│   └── ...
├── admin/                 # Admin-specific composites
│   ├── bulk-upload-dialog.tsx
│   ├── workspace-manager-dialog.tsx
│   ├── membership-management.tsx
│   └── ...
├── navigation/
│   ├── admin-sidebar.tsx
│   └── participant-sidebar.tsx
├── layout/
│   ├── dashboard-layout.tsx
│   └── dashboard-header.tsx
└── ...

Reusable Patterns for Manager Dashboard:

1. Stats Card (extracted from admin dashboard):
   `<Card className="hover:shadow-md hover:border-coral-300 transition-all cursor-pointer">`
   `<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">`
   `<CardTitle className="text-sm font-medium text-gray-600">`
   Pending Approvals
   `</CardTitle>`
   `<ClipboardList className="h-4 w-4 text-coral-500" />`
   `</CardHeader>`
   `<CardContent>`
   <div className="text-3xl font-bold text-gray-900">{count}</div>
   <p className="text-xs text-gray-500 mt-1">Awaiting your review</p>
   </CardContent>
   </Card>
2. Priority Alert Banner (for manager queue):
   {pendingCount > 0 && (
   `<Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-yellow-50">`
   `<CardContent className="pt-6">`
   <div className="flex items-center justify-between">
   <div className="flex items-center gap-4">
   <div className="relative">
   <div className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-20" />
   <div className="relative bg-amber-400 rounded-full p-3">
   <ClipboardList className="h-6 w-6 text-white" />
   </div>
   </div>
   <div>
   <h3 className="text-lg font-semibold">{pendingCount} submissions need manager approval</h3>
   <p className="text-sm text-gray-600">Oldest pending {formatDistanceToNow(oldest)}</p>
   </div>
   </div>
   <Button asChild className="bg-coral-500">
   <Link href={`/w/${slug}/admin/manager/queue?status=pending`}>Review Now</Link>
   </Button>
   </div>
   </CardContent>
   </Card>
   )}
3. Action Button with Dialog (based on SubmissionReviewButton):
   `<Dialog>`
   `<DialogTrigger asChild>`
   `<Button className="bg-green-500 hover:bg-green-600">`
   `<Check className="h-3 w-3 mr-1" />`
   Manager Approve
   `</Button>`
   `</DialogTrigger>`
   `<DialogContent>`
   `<DialogHeader>`
   `<DialogTitle>`Manager Approval `</DialogTitle>`
   `<DialogDescription>`Approve submission for final admin review `</DialogDescription>`
   `</DialogHeader>`
   <div className="space-y-4">
   <Textarea placeholder="Add feedback..." value={notes} onChange={...} />
   <div className="flex gap-2">
   <Button variant="outline">Cancel</Button>
   <Button className="bg-green-500" onClick={handleApprove}>Approve</Button>
   </div>
   </div>
   </DialogContent>
   </Dialog>
