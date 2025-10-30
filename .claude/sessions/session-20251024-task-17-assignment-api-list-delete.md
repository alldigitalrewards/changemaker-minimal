# Task 17: Assignment API Endpoints - List & Delete

**Date**: 2025-10-24
**Status**: In Progress
**Estimated Time**: 2 hours

## Objective

Add GET and DELETE methods to the managers assignment endpoint for complete CRUD functionality.

## Requirements

### GET Endpoint
- **Endpoint**: GET /api/workspaces/[slug]/challenges/[id]/managers
- **Authorization**: requireManagerOrAdmin() - managers can view their assignments
- **Functionality**:
  - List all managers assigned to a challenge
  - Include manager user details (email, name)
  - Return array of assignments with Manager and Challenge details
- **Response Format**:
```typescript
{
  assignments: [{
    id: string
    managerId: string
    challengeId: string
    assignedBy: string
    workspaceId: string
    createdAt: Date
    Manager: {
      id: string
      email: string
    }
  }]
}
```

### DELETE Endpoint
- **Endpoint**: DELETE /api/workspaces/[slug]/challenges/[id]/managers/[managerId]
- **Authorization**: requireWorkspaceAdmin() - only ADMINs can remove assignments
- **Functionality**:
  - Remove manager assignment from challenge
  - Validate assignment exists
  - Handle cascade implications (submissions with manager reviews)
- **Response Format**:
```typescript
{
  success: true,
  message: "Manager unassigned from challenge"
}
```

## Dependencies

- ✅ Task 16: POST endpoint created
- ✅ Task 10: getChallengeManagers() and removeManagerFromChallenge() helpers (lib/db/queries.ts)
- ✅ Task 6: requireManagerOrAdmin() and requireWorkspaceAdmin() middleware

## Implementation Details

### Helper Functions Available (Task 10)

From lib/db/queries.ts:

**getChallengeManagers()**:
```typescript
export async function getChallengeManagers(challengeId: string): Promise<ChallengeAssignmentWithDetails[]>
```
- Returns all assignments for a challenge
- Includes Manager user details
- Includes Challenge details

**removeManagerFromChallenge()**:
```typescript
export async function removeManagerFromChallenge(data: {
  challengeId: string
  managerId: string
  workspaceId: string
}): Promise<void>
```
- Validates assignment exists
- Validates workspace match for security
- Deletes assignment
- Throws ResourceNotFoundError if not found
- Throws WorkspaceAccessError if workspace mismatch

### File Structure

Add to existing file: `app/api/workspaces/[slug]/challenges/[id]/managers/route.ts`

Current exports:
- ✅ POST (Task 16)

Add:
- GET
- Dynamic DELETE route at managers/[managerId]

Wait - DELETE needs dynamic route for managerId. Need to create:
`app/api/workspaces/[slug]/challenges/[id]/managers/[managerId]/route.ts`

## Progress

- [x] Review Task 16 implementation
- [x] Review helper functions from Task 10
- [x] Review middleware from Task 6
- [x] Implement GET endpoint in existing route.ts
- [x] Create new [managerId]/route.ts for DELETE
- [x] Verify build passes
- [x] Commit changes

## Files to Modify

- `app/api/workspaces/[slug]/challenges/[id]/managers/route.ts` - Add GET export

## Files to Create

- `app/api/workspaces/[slug]/challenges/[id]/managers/[managerId]/route.ts` - DELETE endpoint

## Testing Notes

Will test in Task 29 (Assignment Tests)

## Implementation Log

### Step 1: Read existing route.ts
Reading current POST implementation to understand patterns...

### Step 2: Implement GET endpoint
Added GET export to `app/api/workspaces/[slug]/challenges/[id]/managers/route.ts`:
- Uses `requireManagerOrAdmin()` - both managers and admins can view assignments
- Calls `getChallengeAssignments(challengeId, workspaceId)` helper from Task 10
- Returns `{ assignments }` array with Manager and Challenge details
- Proper error handling via `withErrorHandling` wrapper

### Step 3: Create DELETE endpoint
Created `app/api/workspaces/[slug]/challenges/[id]/managers/[managerId]/route.ts`:
- Uses `requireWorkspaceAdmin()` - only ADMINs can remove assignments
- Calls `removeManagerFromChallenge(challengeId, managerId, workspaceId)` helper from Task 10
- Returns `{ success: true, message: "..." }` on success
- Proper error handling for ResourceNotFoundError, WorkspaceAccessError, DatabaseError

### Step 4: Fix function signature
Initial implementation had wrong signature for `removeManagerFromChallenge`. The helper takes three separate arguments, not an object:
```typescript
// Wrong
await removeManagerFromChallenge({ challengeId, managerId, workspaceId })

// Correct
await removeManagerFromChallenge(challengeId, managerId, workspaceId)
```

### Step 5: Build verification
✅ `pnpm build` passed successfully
- Both routes compile correctly
- New routes visible in build output:
  - `├ ƒ /api/workspaces/[slug]/challenges/[id]/managers` (GET, POST)
  - `├ ƒ /api/workspaces/[slug]/challenges/[id]/managers/[managerId]` (DELETE)

## Implementation Summary

Successfully added GET and DELETE endpoints to complete the Assignment API CRUD operations:

### GET Endpoint
- **Route**: `/api/workspaces/[slug]/challenges/[id]/managers`
- **Authorization**: `requireManagerOrAdmin(slug)` - managers and admins can view
- **Functionality**: Lists all manager assignments for a challenge
- **Response**: `{ assignments: ChallengeAssignmentWithDetails[] }`

### DELETE Endpoint
- **Route**: `/api/workspaces/[slug]/challenges/[id]/managers/[managerId]`
- **Authorization**: `requireWorkspaceAdmin(slug)` - only admins can remove
- **Functionality**: Removes a manager assignment
- **Response**: `{ success: true, message: "Manager unassigned from challenge" }`

Both endpoints:
- Use helper functions from Task 10 (getChallengeAssignments, removeManagerFromChallenge)
- Wrapped in `withErrorHandling` for consistent error responses
- Handle typed errors appropriately (ResourceNotFoundError, WorkspaceAccessError, DatabaseError)
- Include workspace validation for multi-tenant security
