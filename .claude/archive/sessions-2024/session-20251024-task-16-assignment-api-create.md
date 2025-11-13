# Task 16: Assignment API Endpoints - Create

**Date**: 2025-10-24
**Status**: In Progress
**Estimated Time**: 3 hours

## Objective

Create POST endpoint for assigning managers to challenges with proper authorization and error handling.

## Requirements

- **Endpoint**: POST /api/workspaces/[slug]/challenges/[id]/managers
- **Authorization**: requireWorkspaceAdmin() - only ADMINs can assign managers
- **Functionality**:
  - Validate requester is ADMIN
  - Create ChallengeAssignment via helper function (assignManagerToChallenge from Task 10)
  - Return assignment with manager user details
  - Handle errors:
    - Manager not in workspace
    - Manager already assigned
    - Challenge not found
    - User not a manager

## Dependencies

- ✅ Task 10: ChallengeAssignment helper functions (lib/db/queries.ts:2732)
- ✅ Task 6: requireWorkspaceAdmin middleware (lib/auth/api-auth.ts:124)

## Implementation Details

### API Route Pattern
Following existing pattern from /api/workspaces/[slug]/challenges/route.ts:
- Use withErrorHandling wrapper for consistent error responses
- Extract params from context.params (async)
- Call requireWorkspaceAdmin for authorization
- Use helper function for database operations
- Return standardized response format

### Request Body
```typescript
{
  managerId: string  // UUID of user to assign as manager
}
```

### Response Format
```typescript
{
  assignment: {
    id: string
    challengeId: string
    managerId: string
    assignedBy: string
    workspaceId: string
    Manager: {
      id: string
      email: string
    }
    Challenge: {
      id: string
      title: string
      description: string
    }
  }
}
```

### Error Handling
- 400: Invalid request body
- 401: Not authenticated
- 403: Not workspace admin or manager not in workspace
- 404: Challenge not found
- 409: Manager already assigned to challenge
- 500: Database error

## Progress

- [x] Read Task 10 helper functions
- [x] Read requireWorkspaceAdmin middleware
- [x] Reviewed existing API route patterns
- [x] Create route.ts file
- [x] Implement POST handler
- [x] Verify build passes
- [x] Commit changes

## Files Created
- `app/api/workspaces/[slug]/challenges/[id]/managers/route.ts`

## Testing Notes
Will test in Task 29 (Assignment Tests)

## Build Verification
✅ `pnpm build` passed successfully
- No TypeScript errors
- Route compiled correctly
- All existing routes still functional

## Implementation Summary

Created POST endpoint at `/api/workspaces/[slug]/challenges/[id]/managers`:

1. **Authorization**: Uses `requireWorkspaceAdmin(slug)` - only workspace ADMINs can assign managers
2. **Request validation**: Validates `managerId` is present and is a string
3. **Database operation**: Calls `assignManagerToChallenge` helper from Task 10 with:
   - challengeId (from route params)
   - managerId (from request body)
   - assignedBy (authenticated admin user ID)
   - workspaceId (from workspace context)
4. **Error handling**: Wrapped in `withErrorHandling` for consistent error responses
5. **Response**: Returns 201 with assignment object including manager and challenge details

Error cases properly handled:
- 400: Missing/invalid managerId
- 401: Not authenticated (via requireWorkspaceAdmin)
- 403: Not workspace admin or manager not in workspace (via helper function)
- 404: Challenge not found (via helper function)
- 409: Manager already assigned (via helper function)
- 500: Database errors
