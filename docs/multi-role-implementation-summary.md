# Multi-Role Capability System - Implementation Summary

## Overview

The multi-role capability system has been successfully implemented for the Changemaker platform. This allows users to simultaneously hold multiple roles:
- Workspace admin (ownership level)
- Challenge manager (for specific challenges)
- Challenge participant (enrolling in challenges)

## Files Created

### 1. Core Permission Logic
**Location:** `/lib/auth/challenge-permissions.ts`

This file contains the core permission resolver that determines a user's effective role and permissions for a specific challenge.

**Key Functions:**
- `getUserChallengePermissions()` - Determines effective role based on workspace membership, challenge assignment, and enrollment
- `canApproveSubmission()` - Business rule enforcement to prevent self-approval
- `fetchUserChallengeContext()` - Helper to fetch all permission-related data for a user and challenge

**Permission Hierarchy:**
1. Workspace Admin Override - full control
2. Challenge-Specific Management - manager for this challenge
3. Challenge-Specific Participation - participant in this challenge
4. Workspace Role Fallback - default workspace permissions

### 2. UI Component
**Location:** `/components/ui/role-context-badge.tsx`

A React component that displays the user's effective role(s) in a challenge with appropriate visual styling.

**Features:**
- Shows combined role when user is both manager and participant
- Color-coded badges (admin = default, manager = secondary, participant = outline)
- Optional details display showing enrollment and management status

### 3. API Route
**Location:** `/app/api/workspaces/[slug]/challenges/[id]/permissions/route.ts`

New endpoint to fetch user's permissions for a specific challenge.

**Endpoint:** `GET /api/workspaces/[slug]/challenges/[id]/permissions`

**Response:**
```typescript
{
  permissions: ChallengePermissions,
  enrollment: Enrollment | null,
  assignment: ChallengeAssignment | null
}
```

### 4. Documentation
**Locations:**
- `/docs/multi-role-capabilities.md` - Comprehensive documentation of the system
- `/docs/multi-role-implementation-summary.md` - This file

### 5. Test Script
**Location:** `/scripts/test-multi-role.ts`

Script to test the permission resolution system with various scenarios.

## Files Modified

### 1. Enrollment Route
**Location:** `/app/api/workspaces/[slug]/enrollments/route.ts`

**Changes:**
- Added import for `fetchUserChallengeContext`
- Added permission check before enrollment
- Validates user can enroll using permission resolver
- Prevents duplicate enrollments

### 2. Admin Review Route
**Location:** `/app/api/workspaces/[slug]/submissions/[id]/review/route.ts`

**Changes:**
- Added imports for permission system
- Added self-approval prevention check
- Uses `canApproveSubmission()` to enforce business rules

### 3. Manager Review Route
**Location:** `/app/api/workspaces/[slug]/submissions/[id]/manager-review/route.ts`

**Changes:**
- Added imports for permission system
- Fetches submission to check ownership
- Added self-approval prevention check
- Prevents managers from approving their own submissions

## Database Architecture

The system leverages three existing Prisma models (no schema changes needed):

### 1. WorkspaceMembership
```prisma
model WorkspaceMembership {
  userId      String
  workspaceId String
  role        Role  // ADMIN, MANAGER, or PARTICIPANT
}
```
Defines workspace-level role

### 2. ChallengeAssignment
```prisma
model ChallengeAssignment {
  challengeId String
  managerId   String
  workspaceId String
}
```
Defines challenge-specific manager assignments

### 3. Enrollment
```prisma
model Enrollment {
  userId      String
  challengeId String
  status      EnrollmentStatus
}
```
Defines challenge-specific participation

## Business Rules Implemented

### 1. Self-Approval Prevention
Users cannot approve their own submissions, regardless of their role (admin, manager, or challenge manager).

**Implementation:** `canApproveSubmission()` function checks if submission user ID matches current user ID.

### 2. Leaderboard Eligibility
Users enrolled via Enrollment appear in leaderboards, even if they are also managers or admins.

### 3. Manager Visibility
Managers (both workspace-level and challenge-specific) can view all enrollments and submissions in challenges they manage.

### 4. Enrollment Requirements
To submit activities, users must be enrolled via Enrollment, even if they are admins or managers.

## Testing Scenarios

The system supports these multi-role scenarios:

### Scenario 1: Admin as Participant
- User has ADMIN role in workspace
- User enrolls as participant in a challenge
- Can manage challenge AND submit activities
- Cannot approve own submissions

### Scenario 2: Manager of One, Participant in Another
- User has MANAGER role in workspace
- Assigned as manager to Challenge A
- Enrolled as participant in Challenge B
- Can approve submissions in Challenge A (except own)
- Can only submit in Challenge B

### Scenario 3: Participant Promoted to Manager
- User starts as PARTICIPANT with enrollment
- Gets assigned as challenge manager
- Gains approval rights while remaining enrolled
- Cannot approve own submissions

## API Usage Examples

### Get User Permissions
```typescript
const response = await fetch(
  `/api/workspaces/${slug}/challenges/${challengeId}/permissions`
);
const { permissions, enrollment, assignment } = await response.json();

if (permissions.canApproveSubmissions) {
  // Show approval UI
}
```

### Check Before Enrollment
```typescript
const context = await fetchUserChallengeContext(
  userId,
  challengeId,
  workspaceId
);

if (context.enrollment) {
  // Already enrolled
  return;
}

if (!context.permissions.canEnroll) {
  // Permission denied
  return;
}

// Proceed with enrollment
```

### Prevent Self-Approval
```typescript
const canApprove = canApproveSubmission(
  permissions,
  submission.userId,
  currentUser.id
);

if (!canApprove) {
  // Hide approval button or show message
}
```

## UI Integration

### Display Role Context
```tsx
import { RoleContextBadge } from '@/components/ui/role-context-badge';

<RoleContextBadge
  permissions={permissions}
  showDetails={true}
/>
```

### Conditional Actions
```tsx
{permissions.canApproveSubmissions && (
  <Button onClick={handleApprove}>
    Approve Submission
  </Button>
)}

{permissions.canEnroll && (
  <Button onClick={handleEnroll}>
    Enroll in Challenge
  </Button>
)}
```

## Build Status

✅ Project builds successfully with no TypeScript errors
✅ All routes compile correctly
✅ Permission system is fully type-safe

## Next Steps

1. **UI Integration** - Add RoleContextBadge to challenge pages to show user's role(s)
2. **Testing** - Run test script on staging database with real users
3. **Frontend Updates** - Update challenge pages to conditionally show actions based on permissions
4. **Workspace Switcher** - Show user's role in each workspace they're a member of

## Notes

- No database migrations required - leverages existing schema
- Backwards compatible with existing permission checks
- Adds defense-in-depth to prevent self-approval
- Provides clear API for UI components to check permissions
