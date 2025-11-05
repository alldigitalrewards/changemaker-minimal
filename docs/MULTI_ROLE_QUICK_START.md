# Multi-Role Capabilities Quick Start Guide

## 5-Minute Setup

### 1. Add Submission Approval to Any Page

```tsx
import { SubmissionApprovalActions } from '@/components/submissions/submission-approval-actions';

// In your component:
<SubmissionApprovalActions
  submission={{
    id: submission.id,
    userId: submission.userId,
    status: submission.status,
    challengeId: submission.challengeId
  }}
  workspaceSlug={workspaceSlug}
  currentUserId={currentUser.id}
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

**What it does:**
- Shows "Your Submission" badge for own submissions (no approve buttons)
- Shows Approve/Reject buttons for others' submissions (if authorized)
- Prevents self-approval automatically

---

### 2. Add Enrollment Button to Challenge Pages

```tsx
import { ChallengeEnrollmentButton } from '@/components/challenges/challenge-enrollment-button';

// In your component:
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
  size="lg"  // or "sm" or "default"
/>
```

**What it does:**
- Shows "Enroll in Challenge" button when user can enroll
- Shows green "Enrolled" badge when already enrolled
- Automatically handles loading states

---

### 3. Protect Server Components

```tsx
import { requireWorkspaceAdmin } from '@/lib/auth/workspace-guards';

export default async function AdminPage({ params }: { params: { slug: string } }) {
  // This automatically redirects unauthorized users
  const { user, workspace, membership } = await requireWorkspaceAdmin(params.slug);

  // Your admin page content here
  return <div>Admin Dashboard</div>;
}
```

**Options:**
- `requireWorkspaceAdmin(slug)` - ADMIN or MANAGER only
- `requireWorkspaceAccess(slug)` - Any workspace member

---

### 4. Protect Client Components

```tsx
'use client';
import { useChallengePermissions } from '@/hooks/use-challenge-permissions';
import { usePermissionGuard } from '@/hooks/use-permission-guard';
import { AccessDenied } from '@/components/auth/access-denied';
import { Loader2 } from 'lucide-react';

export default function ManagementPage({ params }) {
  const { permissions, isLoading } = useChallengePermissions(
    params.slug,
    params.id
  );

  const { isAuthorized } = usePermissionGuard({
    permissions,
    isLoading,
    requireCanManage: true  // or requireAdmin, requireManager, etc.
  });

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin" />;
  if (!isAuthorized) return <AccessDenied />;

  return <div>Protected Content</div>;
}
```

---

## Permission Options

### usePermissionGuard Options

```tsx
{
  permissions: ChallengePermissions | null;
  isLoading: boolean;
  requireAdmin?: boolean;           // Workspace ADMIN only
  requireManager?: boolean;          // ADMIN or MANAGER
  requireCanManage?: boolean;        // Can manage this challenge
  requireCanApprove?: boolean;       // Can approve submissions
  requireCanEnroll?: boolean;        // Can enroll in challenge
  redirectUrl?: string;              // Auto-redirect on unauthorized
  onUnauthorized?: () => void;       // Custom callback
}
```

---

## Common Patterns

### Pattern 1: Submission List with Approval

```tsx
{submissions.map(submission => (
  <Card key={submission.id}>
    <CardHeader>
      <CardTitle>{submission.activity.name}</CardTitle>
    </CardHeader>
    <CardContent>
      <SubmissionApprovalActions
        submission={submission}
        workspaceSlug={workspaceSlug}
        currentUserId={currentUser.id}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </CardContent>
  </Card>
))}
```

---

### Pattern 2: Challenge Card with Enrollment

```tsx
<Card>
  <CardHeader>
    <CardTitle>{challenge.title}</CardTitle>
    <CardDescription>{challenge.description}</CardDescription>
  </CardHeader>
  <CardContent>
    <ChallengeEnrollmentButton
      challengeId={challenge.id}
      workspaceSlug={workspaceSlug}
      onEnroll={handleEnroll}
      size="sm"
    />
  </CardContent>
</Card>
```

---

### Pattern 3: Protected Admin Layout

```tsx
// app/w/[slug]/admin/layout.tsx
import { getUserWorkspaceRole } from '@/lib/workspace-context';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children, params }) {
  const { slug } = await params;
  const role = await getUserWorkspaceRole(slug);

  if (!role || (role !== 'ADMIN' && role !== 'MANAGER')) {
    redirect('/workspaces');
  }

  return <>{children}</>;
}
```

---

### Pattern 4: Permission-Aware UI

```tsx
'use client';
import { useChallengePermissions } from '@/hooks/use-challenge-permissions';

export default function ChallengeActions({ challengeId, workspaceSlug }) {
  const { permissions, isLoading } = useChallengePermissions(
    workspaceSlug,
    challengeId
  );

  if (isLoading) return <Loader2 />;

  return (
    <div>
      {permissions?.canManage && (
        <Button onClick={handleManage}>Manage Challenge</Button>
      )}
      {permissions?.canApproveSubmissions && (
        <Button onClick={handleApprove}>Review Submissions</Button>
      )}
      {permissions?.canEnroll && (
        <ChallengeEnrollmentButton
          challengeId={challengeId}
          workspaceSlug={workspaceSlug}
          onEnroll={handleEnroll}
        />
      )}
    </div>
  );
}
```

---

## Critical Business Rules

### Rule 1: Self-Approval Prevention 🚫
Users can NEVER approve their own submissions.

**Enforced:**
- UI: `SubmissionApprovalActions` component
- API: `canApproveSubmission()` utility
- Backend: Submission review routes

**How it works:**
```tsx
// Automatically handled by SubmissionApprovalActions
const isOwnSubmission = currentUserId === submission.userId;
if (isOwnSubmission) {
  return <Badge>Your Submission</Badge>; // No approve buttons
}
```

---

### Rule 2: Enrollment Independence
Admins and managers can enroll as participants.

**Example:**
```tsx
// Admin can both manage and participate
const permissions = await fetchUserChallengeContext(adminId, challengeId, workspaceId);
// permissions.canManage === true
// permissions.canEnroll === true
// permissions.isParticipant === true (after enrollment)
```

---

### Rule 3: Permission Hierarchy
1. **Workspace Admin** → Full control
2. **Challenge Manager** → Manage this challenge
3. **Enrolled Participant** → Participate in this challenge
4. **Workspace Role** → Fallback permissions

---

## Testing Checklist

### Before Committing

- [ ] Can user approve others' submissions?
- [ ] Is self-approval blocked?
- [ ] Do enrollment buttons work?
- [ ] Are route guards active?
- [ ] Do loading states appear?
- [ ] Are error messages clear?

### Quick Tests

```bash
# Test 1: Self-Approval Prevention
# Sign in as admin → Enroll → Submit → Check queue → Should see "Your Submission"

# Test 2: Manager Approval
# Assign manager → Participant submits → Manager reviews → Should approve

# Test 3: Route Guards
# Sign in as participant → Try /admin → Should redirect
```

---

## Troubleshooting

### Issue: Approve buttons not showing
**Check:**
1. Is `currentUserId` passed correctly?
2. Does user have `canApproveSubmissions` permission?
3. Is it the user's own submission?

### Issue: Enrollment button stuck on loading
**Check:**
1. Is `onEnroll` callback defined?
2. Does enrollment API return success?
3. Is `router.refresh()` called after enrollment?

### Issue: Route guard not working
**Check:**
1. Is guard in layout or page component?
2. Is role check logic correct?
3. Are awaiting async functions properly?

---

## API Endpoints

### Enrollment
```
POST /api/workspaces/[slug]/enrollments
Body: { challengeId: string }
```

### Submission Review
```
POST /api/workspaces/[slug]/submissions/[id]/review
Body: { status: 'APPROVED' | 'REJECTED', reviewNotes?: string }
```

### Manager Review
```
POST /api/workspaces/[slug]/submissions/[id]/manager-review
Body: { action: 'approve' | 'reject', notes?: string }
```

---

## Component Props Reference

### SubmissionApprovalActions

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| submission | SubmissionData | Yes | Submission object with id, userId, status, challengeId |
| workspaceSlug | string | Yes | Workspace slug |
| currentUserId | string | No | Current user ID (for self-approval check) |
| onApprove | (id: string) => Promise<void> | No | Approval callback |
| onReject | (id: string) => Promise<void> | No | Rejection callback |

### ChallengeEnrollmentButton

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| challengeId | string | Yes | Challenge ID |
| workspaceSlug | string | Yes | Workspace slug |
| onEnroll | () => Promise<void> | No | Enrollment callback |
| size | 'sm' \| 'default' \| 'lg' | No | Button size (default: 'default') |
| variant | 'default' \| 'outline' | No | Button variant (default: 'default') |

### AccessDenied

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| message | string | No | Custom error message |
| returnUrl | string | No | URL for return button (default: '/') |
| returnLabel | string | No | Label for return button (default: 'Return Home') |

---

## Need Help?

- **Full Documentation:** `/docs/multi-role-capabilities.md`
- **Testing Guide:** `/docs/testing/multi-role-testing-scenarios.md`
- **Implementation Summary:** `/IMPLEMENTATION_SUMMARY.md`

---

**Last Updated:** 2025-11-05
**Version:** 1.0
