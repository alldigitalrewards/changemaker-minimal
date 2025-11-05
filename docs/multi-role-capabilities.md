# Multi-Role Capabilities

## Overview

The Changemaker platform supports users having multiple roles simultaneously through a three-tier permission model.

## Permission Model

### 1. Workspace-Level Role (WorkspaceMembership)
- ADMIN: Full workspace control
- MANAGER: Challenge management across workspace
- PARTICIPANT: Basic participation rights

### 2. Challenge-Level Management (ChallengeAssignment)
- Users can be assigned as managers to specific challenges
- Independent of workspace role
- Grants approval and management rights for that challenge only

### 3. Challenge-Level Participation (Enrollment)
- Users can enroll as participants in specific challenges
- Independent of workspace role and manager status
- Required to submit activities and earn points

## Permission Resolution Hierarchy

When determining a user's permissions for a specific challenge, the system checks in this order:

1. **Workspace Admin** - If user has ADMIN role in workspace, they get full control
2. **Challenge Manager** - If user is assigned as manager to this challenge via ChallengeAssignment
3. **Enrolled Participant** - If user is enrolled in the challenge via Enrollment
4. **Workspace Role Fallback** - Default permissions based on workspace MANAGER/PARTICIPANT role

## Multi-Role Scenarios

### Scenario 1: Admin as Participant
User: krobinson (Workspace ADMIN)
- Can manage all challenges in workspace (via ADMIN role)
- Can enroll as participant in Challenge A (via Enrollment)
- Can submit activities and earn points
- **Cannot approve own submissions** (business rule)

### Scenario 2: Manager of One, Participant in Another
User: sarah.manager (Workspace MANAGER)
- Assigned as manager to Challenge A (via ChallengeAssignment)
- Enrolled as participant in Challenge B (via Enrollment)
- In Challenge A: Can approve submissions, manage activities
- In Challenge B: Can only submit activities, cannot approve
- **Cannot approve own submissions in Challenge A** (business rule)

### Scenario 3: Participant Promoted to Manager
User: john.doe (Workspace PARTICIPANT)
- Enrolled in Challenge A (via Enrollment)
- Later assigned as manager to Challenge A (via ChallengeAssignment)
- Gains approval rights while remaining enrolled
- **Cannot approve own submissions** (business rule)
- Appears in leaderboard as participant

## Business Rules

### Self-Approval Prevention
Users cannot approve their own submissions, regardless of role.

**Implementation:** `canApproveSubmission()` in `/lib/auth/challenge-permissions.ts`

### Leaderboard Eligibility
Users enrolled via Enrollment appear in leaderboards, even if they are also managers or admins.

### Manager Visibility
Managers (both workspace-level and challenge-specific) can view all enrollments and submissions in challenges they manage.

### Enrollment Requirements
To submit activities, users must be enrolled via Enrollment, even if they are admins or managers.

## API Usage

### Get User Permissions for Challenge

```typescript
import { fetchUserChallengeContext } from '@/lib/auth/challenge-permissions';

const context = await fetchUserChallengeContext(
  userId,
  challengeId,
  workspaceId
);

// context.permissions contains:
// - role: effective role in this challenge
// - permissions: array of permission strings
// - canApproveSubmissions: boolean
// - canEnroll: boolean
// - canManage: boolean
// - isParticipant: boolean (enrolled)
// - isManager: boolean (manager or admin)
// - isAdmin: boolean (workspace admin)
```

### Check Approval Permissions

```typescript
import { canApproveSubmission } from '@/lib/auth/challenge-permissions';

const canApprove = canApproveSubmission(
  permissions,
  submission.userId,
  currentUser.id
);
```

## UI Components

### Submission Approval Actions
**Component:** `/components/submissions/submission-approval-actions.tsx`

Permission-aware approval UI that prevents self-approval:

```tsx
import { SubmissionApprovalActions } from '@/components/submissions/submission-approval-actions';

<SubmissionApprovalActions
  submission={{
    id: submission.id,
    userId: submission.userId,
    status: submission.status,
    challengeId: submission.challengeId
  }}
  workspaceSlug={workspaceSlug}
  currentUserId={user.id}
  onApprove={async (id) => {
    await fetch(`/api/workspaces/${workspaceSlug}/submissions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status: 'APPROVED' })
    });
    router.refresh();
  }}
  onReject={async (id) => {
    await fetch(`/api/workspaces/${workspaceSlug}/submissions/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status: 'REJECTED' })
    });
    router.refresh();
  }}
/>
```

**Features:**
- Shows "Your Submission" badge for own submissions
- Displays approve/reject buttons only when authorized
- Prevents self-approval (critical business rule)
- Loading states during actions
- Tooltips explaining disabled states

---

### Challenge Enrollment Button
**Component:** `/components/challenges/challenge-enrollment-button.tsx`

Smart enrollment button that adapts to permissions and enrollment state:

```tsx
import { ChallengeEnrollmentButton } from '@/components/challenges/challenge-enrollment-button';

<ChallengeEnrollmentButton
  challengeId={challenge.id}
  workspaceSlug={workspaceSlug}
  onEnroll={async () => {
    await fetch(`/api/workspaces/${workspaceSlug}/enrollments`, {
      method: 'POST',
      body: JSON.stringify({ challengeId: challenge.id })
    });
    router.refresh();
  }}
  size="lg"
  variant="default"
/>
```

**States:**
- **Can Enroll:** Shows "Enroll in Challenge" button
- **Already Enrolled:** Shows green "Enrolled" badge with checkmark
- **Cannot Enroll:** Shows disabled button with tooltip explanation

**Features:**
- Respects permission system (admins and managers can enroll)
- Loading state during enrollment
- Clear visual feedback for each state
- Tooltips explain why enrollment is disabled

---

### Access Denied Component
**Component:** `/components/auth/access-denied.tsx`

User-friendly unauthorized access page:

```tsx
import { AccessDenied } from '@/components/auth/access-denied';

<AccessDenied
  message="You need manager or admin permissions to access this page."
  returnUrl={`/w/${workspaceSlug}/participant/challenges`}
  returnLabel="Return to Challenges"
/>
```

**Features:**
- Shield icon for security context
- Customizable error message
- Return button to appropriate page
- Professional, non-threatening design

---

## Permission Guards

### Server-Side Guards
**File:** `/lib/auth/workspace-guards.ts`

Protect server components and API routes:

```tsx
import { requireWorkspaceAdmin, requireWorkspaceAccess } from '@/lib/auth/workspace-guards';

// In page.tsx (server component)
export default async function AdminPage({ params }) {
  const { user, workspace, membership } = await requireWorkspaceAdmin(params.slug);
  // User is guaranteed to be ADMIN or MANAGER
}

// Or for any workspace member
export default async function ParticipantPage({ params }) {
  const { user, workspace, membership } = await requireWorkspaceAccess(params.slug);
  // User is guaranteed to be a workspace member
}
```

**Behavior:**
- `requireWorkspaceAdmin()` - Requires ADMIN or MANAGER role
- `requireWorkspaceAccess()` - Requires any workspace membership
- Automatically redirects unauthorized users
- Returns user, workspace, and membership data

---

### Client-Side Guard Hook
**Hook:** `/hooks/use-permission-guard.ts`

Protect client components with permission checks:

```tsx
'use client';
import { useChallengePermissions } from '@/hooks/use-challenge-permissions';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { AccessDenied } from '@/components/auth/access-denied';
import { Loader2 } from 'lucide-react';

export default function ChallengeManagePage({ params }) {
  const { permissions, isLoading } = useChallengePermissions(
    params.slug,
    params.id
  );

  const { isAuthorized } = usePermissionGuard({
    permissions,
    isLoading,
    requireCanManage: true
  });

  if (isLoading) {
    return <Loader2 className="h-8 w-8 animate-spin" />;
  }

  if (!isAuthorized) {
    return <AccessDenied message="Manager access required" />;
  }

  return <div>{/* Protected content */}</div>;
}
```

**Options:**
- `requireAdmin` - Requires workspace ADMIN
- `requireManager` - Requires ADMIN or MANAGER
- `requireCanManage` - Can manage this challenge
- `requireCanApprove` - Can approve submissions
- `requireCanEnroll` - Can enroll in challenge
- `redirectUrl` - Optional automatic redirect
- `onUnauthorized` - Custom callback

---

## UI Guidelines

### Show Role Context
Always display the user's effective role(s) when viewing a challenge:
- Use `<RoleContextBadge permissions={permissions} showDetails />`
- Show "Manager & Participant" when user has both roles

### Contextual Actions
Use permission-aware components:
- `<SubmissionApprovalActions>` for submission approval
- `<ChallengeEnrollmentButton>` for enrollment CTAs
- Always check permissions before showing action buttons

### Clear Messaging
- Explain why actions are disabled (use tooltips)
- Show loading states during permission checks
- Provide helpful error messages
- Use badges to indicate current state

### Self-Approval Prevention
Always enforce self-approval prevention:
- Show "Your Submission" badge for own submissions
- Never display approval buttons on own submissions
- This is a critical business rule - enforce at UI and API levels

---

## Route Protection Examples

### Admin Layout (Server Component)
```tsx
// app/w/[slug]/admin/layout.tsx
export default async function AdminLayout({ children, params }) {
  const { slug } = await params;
  const role = await getUserWorkspaceRole(slug);

  // Allow both ADMIN and MANAGER roles
  if (!role || (role !== "ADMIN" && role !== "MANAGER")) {
    redirect("/workspaces");
  }

  return <>{children}</>;
}
```

### Challenge Management (Client Component)
```tsx
// Protected challenge management page
'use client';
export default function ManageChallengeApprovals({ params }) {
  const { permissions, isLoading } = useChallengePermissions(
    params.slug,
    params.id
  );

  const { isAuthorized } = usePermissionGuard({
    permissions,
    isLoading,
    requireCanManage: true
  });

  if (isLoading) return <Loader />;
  if (!isAuthorized) return <AccessDenied />;

  return <ApprovalQueue />;
}
```

---

## Testing Scenarios

See `/docs/testing/multi-role-testing-scenarios.md` for comprehensive testing guide covering:

1. **Submission Approval Tests** (5 scenarios)
   - Admin views own submission
   - Admin approves other's submission
   - Manager approves in assigned challenge
   - Manager cannot approve own submission
   - Permission error handling

2. **Enrollment Button Tests** (5 scenarios)
   - Participant enrolls successfully
   - Already enrolled user sees badge
   - Admin can enroll as participant
   - Manager can enroll as participant
   - Enrollment button states

3. **Route Guard Tests** (5 scenarios)
   - Admin accesses admin pages
   - Manager accesses admin pages
   - Participant blocked from admin pages
   - Unauthenticated user redirected
   - Client-side route guards

4. **Integration Tests** (3 workflows)
   - Complete manager workflow
   - Admin participation workflow
   - Permission hierarchy test

---

## Implementation Checklist

- [x] Create `SubmissionApprovalActions` component
- [x] Create `ChallengeEnrollmentButton` component
- [x] Create `AccessDenied` component
- [x] Create `usePermissionGuard` hook
- [x] Create `workspace-guards.ts` utilities
- [x] Update admin layout to support MANAGER role
- [x] Document all components and usage
- [x] Create comprehensive testing scenarios
- [ ] Integrate approval actions in submission pages
- [ ] Integrate enrollment buttons in challenge pages
- [ ] Add client-side guards to management pages
- [ ] Run full test suite
- [ ] Update user documentation

---

## Known Limitations

1. **Enrollment Button Placement:** Currently optimized for detail pages; list card integration pending
2. **Bulk Approvals:** No batch approval UI yet
3. **Approval History:** Limited visibility of approval chain
4. **Permission Caching:** Permissions refetched on each page load

---

## Future Enhancements

1. Add enrollment buttons to challenge list cards
2. Implement batch approval for managers
3. Add approval history timeline
4. Implement permission caching with revalidation
5. Add real-time updates via WebSockets
6. Add audit logs for all permission changes
7. Enhanced role switcher UI

---

**Last Updated:** 2025-11-05
**Version:** 2.0
**Status:** Core components complete, integration in progress
