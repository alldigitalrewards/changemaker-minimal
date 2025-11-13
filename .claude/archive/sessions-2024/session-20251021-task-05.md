# Session: Task 5 - Update Database Query Helpers

**Date:** 2025-10-21
**Task:** Update /lib/db/queries.ts to support manager role operations
**Status:** In Progress

## Objective
Add query functions and type definitions for manager role operations including challenge assignments and submission reviews.

## Requirements
Update `/lib/db/queries.ts` to support manager role operations.

**Changes Needed:**
1. Add type definitions for ChallengeAssignment (use existing pattern from lib/db/types.ts)
2. Add query functions:
   - `getChallengeAssignments(challengeId, workspaceId)`
   - `assignManagerToChallenge(data)`
   - `removeManagerFromChallenge(challengeId, managerId)`
   - `getManagerChallenges(managerId, workspaceId)`
3. Update submission queries to handle MANAGER_APPROVED and NEEDS_REVISION statuses
4. Add manager review functions for submissions

**Pattern to Follow:**
Look at existing query patterns in the file for consistency.

**Success Criteria:**
- New query functions added
- TypeScript compiles
- Functions follow existing patterns
- Error handling consistent with other queries

## Implementation Steps

### Step 1: Review existing query patterns in /lib/db/queries.ts

### Step 2: Add ChallengeAssignment types

### Step 3: Implement manager-specific query functions

### Step 4: Update submission query functions for manager statuses

### Step 5: Verify TypeScript compilation

## Progress Log

### Step 1: Review existing query patterns ✅
- Reviewed `/lib/db/queries.ts` to understand existing patterns
- Noted file is 2681 lines with established error handling via DatabaseError, ResourceNotFoundError, WorkspaceAccessError
- Identified existing submission functions: createActivitySubmission, getWorkspaceSubmissionsForReview, reviewActivitySubmission

### Step 2: Add ChallengeAssignment types ✅
Added `ChallengeAssignmentWithDetails` type definition following existing patterns:
```typescript
export type ChallengeAssignmentWithDetails = {
  id: string
  challengeId: string
  managerId: string
  workspaceId: string
  assignedBy: string
  assignedAt: Date
  Manager: Pick<User, 'id' | 'email'>
  Challenge: Pick<Challenge, 'id' | 'title' | 'description'>
}
```

### Step 3: Implement manager-specific query functions ✅
Added five manager-specific functions:

1. **getChallengeAssignments(challengeId, workspaceId)**
   - Returns all manager assignments for a challenge
   - Includes Manager and Challenge details
   - Workspace-isolated with workspaceId filter

2. **assignManagerToChallenge(data)**
   - Validates challenge belongs to workspace
   - Verifies user has MANAGER role
   - Prevents duplicate assignments
   - Returns assignment with includes

3. **removeManagerFromChallenge(challengeId, managerId, workspaceId)**
   - Verifies challenge ownership
   - Removes assignment
   - Proper error handling for not found

4. **getManagerChallenges(managerId, workspaceId)**
   - Verifies manager role in workspace
   - Returns challenges assigned to manager
   - Workspace-isolated

5. **getManagerPendingSubmissions(managerId, workspaceId)**
   - Fetches submissions for assigned challenges
   - Only returns PENDING status submissions
   - Includes User, Activity, Template, and Challenge details

### Step 4: Add manager review function ✅
Added **managerReviewSubmission(data)**:
- Verifies manager has access to submission via ChallengeAssignment
- Updates submission with MANAGER_APPROVED, NEEDS_REVISION, or REJECTED status
- Uses manager-specific fields: managerNotes, managerReviewedBy, managerReviewedAt
- Awards points on MANAGER_APPROVED status
- Proper PointsBalance upsert with id field

### Step 5: Fixed Prisma relation names ✅
Corrected field names to match schema:
- `userId` → `managerId` in ChallengeAssignment
- `user` → `Manager` (capitalized relation)
- `challenge` → `Challenge` (capitalized relation)
- `activity` → `Activity` (capitalized relation)
- Added `id` field to PointsBalance.create

### Step 6: Verify TypeScript compilation ✅
```bash
pnpm tsc --noEmit
```
- Only 2 unrelated errors in test file about missing 'segment' properties
- All manager query functions compile successfully
- No breaking changes to existing functionality

## Success Criteria Checklist
- [x] New query functions added (5 manager-specific functions)
- [x] TypeScript compiles (except unrelated test errors)
- [x] Functions follow existing patterns (error handling, workspace isolation, includes)
- [x] Error handling consistent with other queries (DatabaseError, ResourceNotFoundError, WorkspaceAccessError)

## Decisions Made
1. Used manager-specific fields (managerNotes, managerReviewedBy, managerReviewedAt) instead of generic review fields
2. Manager review awards points immediately on MANAGER_APPROVED status
3. getManagerPendingSubmissions only returns PENDING submissions (not NEEDS_REVISION)
4. All functions are workspace-isolated for security
5. Challenge assignment verification checks MANAGER role in workspace

## Challenges Encountered
- Initial field name mismatches with Prisma schema (userId vs managerId)
- Relation names needed to be capitalized (Challenge, Manager, Activity)
- PointsBalance.create requires id field (crypto.randomUUID())

## Next Steps
Proceed to Task 6: Update RBAC System (already partially complete in Task 4)

