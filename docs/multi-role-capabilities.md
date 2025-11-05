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

## UI Guidelines

### Show Role Context
Always display the user's effective role(s) when viewing a challenge:
- Use `<RoleContextBadge permissions={permissions} showDetails />`
- Show "Manager & Participant" when user has both roles

### Contextual Actions
Filter available actions based on permissions:
- Show "Approve Submissions" only if `canApproveSubmissions` is true
- Hide approval button on user's own submissions
- Show "Enroll" only if `canEnroll` is true

### Clear Role Switching
If implementing role switching UI, clearly indicate which "hat" the user is wearing.

## Testing Scenarios

Test these multi-role scenarios:
1. Admin enrolling and submitting in own workspace
2. Manager approving others' submissions but not their own
3. Participant promoted to manager mid-challenge
4. User with multiple workspace memberships
5. Permission resolution for each tier
