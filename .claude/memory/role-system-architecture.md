# Role System Architecture (Production - Phase 2 Complete)

> **Status**: Phase 2 (Manager Role) completed October 2025. All features implemented, tested (22 RLS tests passing), and production-ready.

## Role Enumeration

### Database Schema (prisma/schema.prisma)
```prisma
enum Role {
  ADMIN       // Workspace administrator
  PARTICIPANT // Challenge participant
  MANAGER     // Submission reviewer (assignment-based) ✅ IMPLEMENTED
}
```

**Platform Super Admin**: NOT in Role enum
- Platform-level access (NOT workspace-level)
- Implemented via email allowlist + permissions array
- Bypass logic in `isPlatformSuperAdmin()` (lib/auth/rbac.ts:105-113)
- Allowlist emails:
  - krobinson@alldigitalrewards.com
  - jhoughtelin@alldigitalrewards.com
  - kfelke@alldigitalrewards.com
  - jfelke@alldigitalrewards.com
- Grants access to `/admin/*` routes (platform dashboard, cross-workspace analytics)
- Does NOT grant workspace admin privileges (separate from workspace ADMIN role)

## Data Model

### Modern System: WorkspaceMembership (lib/db/workspace-membership.ts)
```typescript
model WorkspaceMembership {
  userId      String   @db.Uuid
  workspaceId String   @db.Uuid
  role        Role
  isPrimary   Boolean  @default(false)
  joinedAt    DateTime @default(now())

  @@unique([userId, workspaceId])
}
```

**Features**:
- Many-to-many: Users can belong to multiple workspaces
- Role per workspace (same user can be ADMIN in workspace A, PARTICIPANT in workspace B)
- `isPrimary`: Marks user's default workspace

### Legacy System: User.workspaceId + User.role
```typescript
model User {
  workspaceId String? @db.Uuid  // ← Legacy, single workspace only
  role        Role              // ← Legacy, global role
  Workspace   Workspace?        // ← Legacy relation
}
```

**Migration Status**:
- ~15-20 files still use `User.workspaceId` pattern
- Production will use WorkspaceMembership exclusively
- Compatibility layer exists in lib/db/workspace-compatibility.ts

## Role Resolution Logic

**Priority Order** (lib/db/workspace-compatibility.ts:59-85):
1. **WorkspaceMembership.role** (HIGHEST PRIORITY)
   - Query: `getMembership(userId, workspaceId).role`
   - Returns workspace-specific role
2. **User.role** (FALLBACK if workspaceId matches)
   - Only if `User.workspaceId === workspace.id`
   - Legacy compatibility
3. **Global User.role** (LAST RESORT)
   - Used in `requireWorkspaceAccess()` when no membership found
   - ⚠️ Security risk: Allows global role to override workspace scoping

**Critical Issue**: Global fallback in requireWorkspaceAccess()
```typescript
// lib/auth/api-auth.ts:35-36
return {
  workspace,
  user,
  role: role || user.dbUser.role  // ← PROBLEM: Falls back to global role
}
```

**Recommendation**: Remove global fallback after WorkspaceMembership migration complete

## Access Control Functions

### Authentication
**requireAuth()** (lib/auth/api-auth.ts:10-25)
- Verifies Supabase session
- Returns `{ supabaseUser, dbUser }`
- Throws 401 if not authenticated

### Authorization
**requireWorkspaceAccess(slug)** (lib/auth/api-auth.ts:27-48)
- Enforces workspace membership
- Returns `{ workspace, user, role }`
- Throws 403 if access denied
- Uses: Any API route that needs workspace data

**requireWorkspaceAdmin(slug)** (lib/auth/api-auth.ts:50-61)
- Enforces ADMIN role
- Returns `{ workspace, user }`
- Throws 403 if not admin
- Uses: Challenge creation, participant management, approval

**canAccessWorkspace()** (lib/auth/api-auth.ts:63-75)
- Platform super admin bypass
- Checks membership existence
- Used internally by requireWorkspaceAccess()

## Permission Mappings ✅ UPDATED

**ROLE_PERMISSIONS** (lib/auth/rbac.ts:34-82)
```typescript
const ROLE_PERMISSIONS = {
  ADMIN: [
    'workspace:manage',         // Full workspace control
    'workspace:view',
    'challenge:create',          // Create challenges
    'challenge:edit',            // Edit any challenge
    'challenge:delete',          // Delete challenges
    'challenge:view',
    'user:manage',               // Invite/manage workspace users
    'user:view',
    'enrollment:create',         // Manually enroll users
    'enrollment:view',
    'enrollment:manage',         // Bulk operations
    'submission:review',         // Review/approve ALL submissions
    'submission:view'            // View ALL submissions
  ],
  MANAGER: [                     // ✅ IMPLEMENTED
    'workspace:view',            // View workspace data
    'challenge:view',            // View challenges
    'challenge:edit',            // Edit ASSIGNED challenges only (enforced by RLS)
    'user:view',                 // View user info
    'enrollment:view',           // View enrollments
    'submission:review',         // Review ASSIGNED submissions (enforced by RLS)
    'submission:view'            // View ASSIGNED submissions (enforced by RLS)
  ],
  PARTICIPANT: [
    'workspace:view',            // View workspace info
    'challenge:view',            // View published challenges
    'user:view',                 // View basic user info
    'enrollment:create',         // Self-enroll in challenges
    'enrollment:view',           // View own enrollments
    'submission:view'            // View OWN submissions only (enforced by RLS)
  ]
}
```

**Key Security Notes**:
- Manager permissions are **enforced at the database level via RLS policies**
- Application code checks provide UX, RLS provides security
- Manager's assignment-based access is controlled by `ChallengeAssignment` table
- See tests/security/rls-policies.spec.ts for 22 comprehensive RLS tests

**hasPermission()** (lib/auth/rbac.ts:84-94)
```typescript
export function hasPermission(
  role: Role | null,
  permission: string
): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}
```

## Workspace Isolation

**Query Pattern**: 95%+ of queries filter by `workspaceId`
```typescript
// Example from lib/db/queries.ts
await prisma.challenge.findMany({
  where: {
    workspaceId,  // ← Enforced isolation
    // ... other filters
  }
})
```

**Super Admin Cross-Workspace Access**:
```typescript
// lib/auth/api-auth.ts:63-75
export function canAccessWorkspace(user, workspace, hasMembership) {
  // Platform super admins bypass workspace checks
  if (isPlatformSuperAdmin(user.permissions, user.email)) {
    return true
  }

  return hasMembership
}
```

**Platform Admin Routes**: Isolated from workspace routes
- `/admin/*` - Platform-level admin (workspace management, user management)
- `/w/[slug]/admin/*` - Workspace-level admin (challenges, participants)

## Implementation Files

### Core Auth
- `lib/auth/api-auth.ts` - API route auth helpers
- `lib/auth/rbac.ts` - Permission mappings + checks
- `lib/auth/session.ts` - Supabase session management

### Workspace Membership
- `lib/db/workspace-membership.ts` - CRUD operations
- `lib/db/workspace-compatibility.ts` - Legacy fallback bridge

### Middleware
- `middleware.ts` - Authentication only (no role checks)
- Role checks happen in layouts and API routes

### Layout Protection
- `app/w/[slug]/admin/layout.tsx:31-34` - Admin role required
- `app/w/[slug]/participant/layout.tsx:29-32` - Any role accepted
- `app/admin/layout.tsx:29-32` - Platform super admin required

## Manager Role Implementation ✅ COMPLETE

### Schema Changes (Phase 2 Completed)

1. **Role Enum** ✅
   ```prisma
   enum Role {
     ADMIN
     PARTICIPANT
     MANAGER  // ✅ ADDED
   }
   ```

2. **ChallengeAssignment Model** ✅
   ```prisma
   model ChallengeAssignment {
     id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
     challengeId String    @db.Uuid
     managerId   String    @db.Uuid  // Manager User.id
     workspaceId String    @db.Uuid
     assignedBy  String    @db.Uuid  // Admin User.id who made assignment
     assignedAt  DateTime  @default(now())

     Challenge   Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
     Manager     User      @relation("ManagerAssignments", fields: [managerId], references: [id])
     AssignedBy  User      @relation("AssignmentCreator", fields: [assignedBy], references: [id])

     @@unique([challengeId, managerId]) // One assignment per manager per challenge
   }
   ```

3. **ActivitySubmission Manager Fields** ✅
   ```prisma
   model ActivitySubmission {
     status            SubmissionStatus @default(PENDING)

     // Admin review fields
     reviewNotes       String?
     reviewedBy        String? @db.Uuid
     reviewedAt        DateTime?

     // Manager review fields ✅ ADDED
     managerReviewedBy String? @db.Uuid
     managerReviewedAt DateTime?
     managerNotes      String?
   }
   ```

4. **SubmissionStatus Enum** ✅
   ```prisma
   enum SubmissionStatus {
     PENDING           // Initial state
     MANAGER_APPROVED  // Manager approved, needs admin approval ✅ ADDED
     NEEDS_REVISION    // Manager/admin requested changes
     APPROVED          // Final approval by admin
     REJECTED          // Final rejection by admin
     DRAFT             // Incomplete submission
   }
   ```

### Authorization Helpers (lib/auth/api-auth.ts) ✅

```typescript
// ✅ IMPLEMENTED
export async function requireManagerAccess(
  workspaceId: string,
  challengeId?: string
): Promise<{ workspace: Workspace; user: User; role: Role }> {
  const { workspace, user, role } = await requireWorkspaceAccess(workspaceId);

  // Admin has manager access to all challenges
  if (role === 'ADMIN') {
    return { workspace, user, role };
  }

  // Manager must have assignment to specific challenge
  if (role === 'MANAGER') {
    if (!challengeId) {
      throw new Error('Manager access requires challengeId parameter');
    }

    const assignment = await prisma.challengeAssignment.findUnique({
      where: {
        challengeId_managerId: {
          challengeId,
          managerId: user.id
        }
      }
    });

    if (!assignment) {
      throw NextResponse.json(
        { error: 'Manager not assigned to this challenge' },
        { status: 403 }
      );
    }

    return { workspace, user, role };
  }

  throw NextResponse.json(
    { error: 'Manager or admin privileges required' },
    { status: 403 }
  );
}
```

### RLS Policies (Supabase) ✅

All policies implemented and tested (22 tests passing):

1. **Manager Assignment-Based Access** ✅
   ```sql
   CREATE POLICY "manager_assigned_select" ON "ActivitySubmission"
   FOR SELECT USING (
     EXISTS (
       SELECT 1 FROM "ChallengeAssignment" ca
       INNER JOIN "Activity" a ON a."challengeId" = ca."challengeId"
       WHERE ca."managerId" = auth.uid()
       AND a.id = "ActivitySubmission"."activityId"
     )
   );
   ```

2. **Manager Update Permissions** ✅
   ```sql
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

3. **Workspace Isolation** ✅ (Prevents cross-workspace access)
4. **Admin Override** ✅ (Admin can access all submissions in workspace)
5. **Participant Isolation** ✅ (Participants can only see own submissions)

### Two-Stage Approval Workflow ✅

**Optional via `Challenge.requireManagerApproval` flag**:

When enabled:
1. PENDING → MANAGER_APPROVED (manager review)
2. MANAGER_APPROVED → APPROVED (admin final approval)

When disabled:
1. PENDING → APPROVED (admin direct approval)

**API Endpoints**:
- `POST /api/w/[slug]/admin/challenges/[id]/assign-manager` ✅
- `POST /api/w/[slug]/manager/submissions/[id]/review` ✅
- `GET /api/w/[slug]/manager/submissions` ✅

**UI Pages**:
- `/w/[slug]/manager/submissions` - Manager review queue ✅
- `/w/[slug]/admin/challenges/[id]` - Manager assignment interface ✅

## Security Implementation

### Database-Level Security (RLS) ✅
- **Primary Security Layer**: All authorization enforced at database level
- **Prevents accidental leaks**: Buggy application queries cannot bypass RLS
- **Consistent enforcement**: Works across all database access methods
- **Tested coverage**: 22 comprehensive RLS tests (tests/security/rls-policies.spec.ts)

### Application-Level Checks ✅
- **UX Enhancement**: Provide better error messages and UI feedback
- **NOT Primary Security**: Never rely solely on application checks
- **Server-Side Only**: Client-side checks are UI convenience only

### Role Precedence ✅
1. WorkspaceMembership.role (highest priority)
2. User.role (fallback during migration)
3. Platform super admin bypass (cross-workspace access)

## Testing Coverage ✅

**RLS Policy Tests** (tests/security/rls-policies.spec.ts): 22 tests, all passing
- Workspace isolation (3 tests)
- Manager assignment-based access (5 tests)
- Role-based access control (6 tests)
- ActivitySubmission multi-role policy (3 tests)
- Service role bypass (1 test)
- Edge cases (3 tests)
- Performance verification (2 tests)

**Manager Authorization Tests** (tests/api/manager-auth.spec.ts): 10 tests, all passing
- Manager can access assigned challenge submissions
- Manager cannot access unassigned challenge submissions
- Participant cannot access manager data
- Admin has full access
- Cross-workspace isolation
- Deleted assignment blocks access

**Manager Workflow Tests** (tests/api/manager-workflow.spec.ts): 8 tests, all passing
- Submission review flow (PENDING → MANAGER_APPROVED → APPROVED)
- Challenge assignment CRUD operations
- Manager queue filtering
- Two-stage approval workflow

## Production Readiness ✅

**Phase 2 Status**: APPROVED (90/100 score)

✅ All features implemented
✅ All tests passing (40+ tests)
✅ RLS policies enforced
✅ Documentation complete
✅ Migration path defined
✅ No breaking changes to existing code
