# Role System Complete Reference

> **Quick reference for all role capabilities and access patterns in Changemaker**

## Role Hierarchy Overview

```
SUPERADMIN (Platform Level - email-based detection)
├─ Access: /admin routes (platform dashboard)
├─ Capability: View all workspaces across all tenants
└─ Note: NOT in Prisma Role enum

ADMIN (Workspace Level - stored in database)
├─ Access: /w/[slug]/admin routes
├─ Capability: Full workspace control
└─ Can: Create/edit/delete challenges, assign managers, manage users

MANAGER (Workspace Level - assignment-based)
├─ Access: /w/[slug]/manager routes
├─ Capability: Review assigned challenge submissions
└─ Cannot: Create challenges, manage users, issue final approvals

PARTICIPANT (Workspace Level)
├─ Access: /w/[slug]/participant routes
├─ Capability: Enroll in challenges, submit activities
└─ Cannot: See other participants' submissions
```

## Complete Access Control Matrix

| Feature | SUPERADMIN | ADMIN | MANAGER | PARTICIPANT |
|---------|------------|-------|---------|-------------|
| **Platform Routes** |
| Access `/admin` routes | ✓ | ✗ | ✗ | ✗ |
| View all tenants | ✓ | ✗ | ✗ | ✗ |
| Platform analytics | ✓ | ✗ | ✗ | ✗ |
| **Workspace Routes** |
| Access `/w/[slug]/admin` | ✗ | ✓ | ✗ | ✗ |
| Access `/w/[slug]/manager` | ✗ | ✓ | ✓ | ✗ |
| Access `/w/[slug]/participant` | ✗ | ✓ | ✓ | ✓ |
| **Challenge Management** |
| Create challenges | ✗ | ✓ | ✗ | ✗ |
| Edit any challenge | ✗ | ✓ | ✗ | ✗ |
| Edit assigned challenges | ✗ | ✓ | ✓ | ✗ |
| Delete challenges | ✗ | ✓ | ✗ | ✗ |
| View challenges | ✗ | ✓ | ✓ | ✓ |
| **Manager Assignment** |
| Assign managers to challenges | ✗ | ✓ | ✗ | ✗ |
| Remove manager assignments | ✗ | ✓ | ✗ | ✗ |
| View assignments | ✗ | ✓ | ✓ (own only) | ✗ |
| **Submission Review** |
| View all submissions | ✗ | ✓ | ✗ | ✗ |
| View assigned submissions | ✗ | ✓ | ✓ | ✗ |
| View own submissions | ✗ | ✓ | ✓ | ✓ |
| Review submissions (pre-approve) | ✗ | ✓ | ✓ (assigned) | ✗ |
| Final approve/reject | ✗ | ✓ | ✗ | ✗ |
| Request revisions | ✗ | ✓ | ✓ (assigned) | ✗ |
| **Reward Management** |
| Issue rewards | ✗ | ✓ | ✗ | ✗ |
| Configure reward settings | ✗ | ✓ | ✗ | ✗ |
| View reward history | ✗ | ✓ | ✓ (assigned) | ✓ (own) |
| **User Management** |
| Invite users | ✗ | ✓ | ✗ | ✗ |
| Change user roles | ✗ | ✓ | ✗ | ✗ |
| Remove users | ✗ | ✓ | ✗ | ✗ |
| View user list | ✗ | ✓ | ✓ | ✗ |
| **Enrollment** |
| Manually enroll users | ✗ | ✓ | ✗ | ✗ |
| Self-enroll | ✗ | ✓ | ✓ | ✓ |
| Bulk enrollment operations | ✗ | ✓ | ✗ | ✗ |
| View enrollments | ✗ | ✓ | ✓ | ✓ (own) |
| **Workspace Settings** |
| Update workspace settings | ✗ | ✓ | ✗ | ✗ |
| Configure branding | ✗ | ✓ | ✗ | ✗ |
| Manage budgets | ✗ | ✓ | ✗ | ✗ |
| View workspace info | ✗ | ✓ | ✓ | ✓ |
| **Activity Submission** |
| Submit activities | ✗ | ✓ | ✓ | ✓ |
| Edit own submissions | ✗ | ✓ | ✓ | ✓ |
| Delete own submissions | ✗ | ✓ | ✓ | ✓ |

## Permission Constants

### ADMIN Permissions
```typescript
[
  'workspace:manage',
  'workspace:view',
  'challenge:create',
  'challenge:edit',
  'challenge:delete',
  'challenge:view',
  'user:manage',
  'user:view',
  'enrollment:create',
  'enrollment:view',
  'enrollment:manage',
  'submission:review',
  'submission:view'
]
```

### MANAGER Permissions
```typescript
[
  'workspace:view',
  'challenge:view',
  'challenge:edit',      // ASSIGNED challenges only (RLS enforced)
  'user:view',
  'enrollment:view',
  'submission:review',   // ASSIGNED submissions only (RLS enforced)
  'submission:view'      // ASSIGNED submissions only (RLS enforced)
]
```

### PARTICIPANT Permissions
```typescript
[
  'workspace:view',
  'challenge:view',
  'user:view',
  'enrollment:create',
  'enrollment:view',
  'submission:view'      // OWN submissions only (RLS enforced)
]
```

## Database Schema Quick Reference

### Role Enum
```prisma
enum Role {
  ADMIN       // Full workspace control
  PARTICIPANT // Basic challenge participation
  MANAGER     // Assignment-based submission review
}
```

### ChallengeAssignment (Manager Assignments)
```prisma
model ChallengeAssignment {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  challengeId String    @db.Uuid
  managerId   String    @db.Uuid  // User.id of manager
  workspaceId String    @db.Uuid
  assignedBy  String    @db.Uuid  // User.id of admin who assigned
  assignedAt  DateTime  @default(now())

  @@unique([challengeId, managerId])
}
```

### SubmissionStatus States
```prisma
enum SubmissionStatus {
  PENDING           // Initial state after submission
  MANAGER_APPROVED  // Manager approved (if two-stage workflow enabled)
  NEEDS_REVISION    // Manager/admin requested changes
  APPROVED          // Final approval by admin (rewards issued if configured)
  REJECTED          // Final rejection by admin
  DRAFT             // Incomplete/unsubmitted
}
```

## Approval Workflow

### Two-Stage Workflow (Optional)
Enable via `Challenge.requireManagerApproval = true`

```
1. Participant submits activity
   └─> Status: PENDING

2. Manager reviews (assigned challenges only)
   ├─> Approve: Status → MANAGER_APPROVED
   └─> Request revision: Status → NEEDS_REVISION

3. Admin final review (all submissions)
   ├─> Approve: Status → APPROVED (rewards issued)
   └─> Reject: Status → REJECTED
```

### Single-Stage Workflow (Default)
`Challenge.requireManagerApproval = false`

```
1. Participant submits activity
   └─> Status: PENDING

2. Admin reviews (all submissions)
   ├─> Approve: Status → APPROVED (rewards issued)
   ├─> Reject: Status → REJECTED
   └─> Request revision: Status → NEEDS_REVISION
```

## RLS Policy Summary

### Manager Assignment-Based Access
```sql
-- Manager can SELECT submissions for assigned challenges
CREATE POLICY "manager_assigned_select" ON "ActivitySubmission"
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "ChallengeAssignment" ca
    INNER JOIN "Activity" a ON a."challengeId" = ca."challengeId"
    WHERE ca."managerId" = auth.uid()
    AND a.id = "ActivitySubmission"."activityId"
  )
);

-- Manager can UPDATE submissions for assigned challenges
CREATE POLICY "manager_assigned_update" ON "ActivitySubmission"
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM "ChallengeAssignment" ca
    INNER JOIN "Activity" a ON a."challengeId" = ca."challengeId"
    WHERE ca."managerId" = auth.uid()
    AND a.id = "ActivitySubmission"."activityId"
  )
);
```

### Admin Full Access
```sql
-- Admin can access ALL submissions in their workspace
CREATE POLICY "admin_workspace_all" ON "ActivitySubmission"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM "User" u
    INNER JOIN "Activity" a ON a.id = "ActivitySubmission"."activityId"
    INNER JOIN "Challenge" c ON c.id = a."challengeId"
    WHERE u."supabaseUserId" = auth.uid()
    AND u.role = 'ADMIN'
    AND u."workspaceId" = c."workspaceId"
  )
);
```

### Participant Own Submissions
```sql
-- Participant can only access their own submissions
CREATE POLICY "participant_own_select" ON "ActivitySubmission"
FOR SELECT USING ("userId" = auth.uid());
```

## Authorization Helper Functions

### requireWorkspaceAccess()
```typescript
// Verifies user has membership in workspace
// Returns: { workspace, user, role }
// Throws: 403 if no access

const { workspace, user, role } = await requireWorkspaceAccess(slug);
```

### requireWorkspaceAdmin()
```typescript
// Verifies user is ADMIN in workspace
// Returns: { workspace, user }
// Throws: 403 if not admin

const { workspace, user } = await requireWorkspaceAdmin(slug);
```

### requireManagerAccess()
```typescript
// Verifies user is ADMIN or MANAGER with assignment
// Returns: { workspace, user, role }
// Throws: 403 if no access or no assignment

const { workspace, user, role } = await requireManagerAccess(
  workspaceId,
  challengeId  // Required for MANAGER role
);
```

### hasPermission()
```typescript
// Checks if role has specific permission
// Returns: boolean

const canReview = hasPermission(user.role, 'submission:review');
```

### isPlatformSuperAdmin()
```typescript
// Checks if user is platform super admin
// Uses: Email allowlist + permissions array
// Returns: boolean

if (isPlatformSuperAdmin(user.permissions, user.email)) {
  // Grant platform-level access
}
```

## API Route Patterns

### Admin-Only Endpoint
```typescript
// POST /api/w/[slug]/admin/challenges
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const { workspace, user } = await requireWorkspaceAdmin(params.slug);

  // Admin-only logic here
}
```

### Manager or Admin Endpoint
```typescript
// POST /api/w/[slug]/manager/submissions/[id]/review
export async function POST(
  req: Request,
  { params }: { params: { slug: string; id: string } }
) {
  const { challengeId } = await req.json();

  const { workspace, user, role } = await requireManagerAccess(
    workspace.id,
    challengeId
  );

  // Manager or admin review logic
}
```

### Any Authenticated User
```typescript
// GET /api/w/[slug]/participant/challenges
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { workspace, user, role } = await requireWorkspaceAccess(params.slug);

  // Any authenticated workspace member can access
}
```

## Testing Reference

### RLS Policy Tests
Location: `tests/security/rls-policies.spec.ts`
Status: 22 tests passing

Key test scenarios:
- Workspace isolation (users cannot cross workspaces)
- Manager assignment-based access (can only see assigned challenges)
- Admin override (admin sees all in workspace)
- Participant isolation (only own submissions)
- Service role bypass (API routes using service client)
- Edge cases (deleted assignments, cross-workspace attempts)

### Manager Authorization Tests
Location: `tests/api/manager-auth.spec.ts`
Status: 10 tests passing

Key test scenarios:
- Manager access via RLS (assigned challenges)
- Manager blocking via RLS (unassigned challenges)
- Participant blocking (no access to manager data)
- Admin full access (all submissions in workspace)
- Cross-workspace isolation
- Deleted assignment cleanup

### Manager Workflow Tests
Location: `tests/api/manager-workflow.spec.ts`
Status: 8 tests passing

Key test scenarios:
- Two-stage approval flow
- Challenge assignment CRUD
- Manager queue filtering
- Status transitions (PENDING → MANAGER_APPROVED → APPROVED)

## Common Patterns

### Check Role Before Rendering UI
```typescript
// In server component
const { role } = await getUserWorkspaceRole(slug);

return (
  <>
    {role === 'ADMIN' && <AdminPanel />}
    {(role === 'ADMIN' || role === 'MANAGER') && <ReviewQueue />}
    <ParticipantDashboard />
  </>
);
```

### Check Permission Before Action
```typescript
// In client component action handler
const canApprove = hasPermission(user.role, 'submission:review');

if (!canApprove) {
  toast.error('You do not have permission to approve submissions');
  return;
}

// Proceed with API call
```

### Query with Workspace Isolation
```typescript
// Always filter by workspaceId
const challenges = await prisma.challenge.findMany({
  where: {
    workspaceId: workspace.id,  // REQUIRED for isolation
    status: 'PUBLISHED'
  }
});
```

### Query Respecting RLS
```typescript
// Use authenticated Supabase client for user-scoped queries
const { data: submissions } = await supabaseClient
  .from('ActivitySubmission')
  .select('*')
  .eq('activityId', activityId);
// RLS automatically filters to accessible submissions based on role
```

---

**Last Updated**: October 2025 (Phase 2 Complete)
**Related Files**:
- Architecture: `.claude/memory/role-system-architecture.md`
- Implementation Roadmap: `.claude/plans/implementation-roadmap.md`
- RLS Documentation: `docs/security/rls-policies.md`
- Test Results: `docs/testing/test-status-summary.md`
