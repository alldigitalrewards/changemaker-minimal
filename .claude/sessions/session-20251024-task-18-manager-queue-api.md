# Task 18: Manager Queue API Endpoint

**Date**: 2025-10-24
**Status**: In Progress
**Estimated Time**: 3 hours

## Objective

Create GET endpoint that returns submissions for challenges assigned to the current manager user, with filtering capabilities.

## Requirements

- **Endpoint**: GET /api/workspaces/[slug]/manager/queue
- **Authorization**: requireManagerOrAdmin() - managers see their assigned challenges only
- **Functionality**:
  - Filter submissions by challenges where user is assigned as manager (via ChallengeAssignment)
  - Support status filter via query param (?status=PENDING, MANAGER_APPROVED, etc.)
  - Include challenge, activity, and participant user details in response
  - Optimize query with proper includes to avoid N+1
- **Query Parameters**:
  - `status` (optional): Filter by submission status (PENDING, MANAGER_APPROVED, NEEDS_REVISION, etc.)
- **Response Format**:
```typescript
{
  submissions: [{
    id: string
    status: SubmissionStatus
    submittedAt: Date
    managerNotes: string | null
    User: {
      id: string
      email: string
    }
    Activity: {
      id: string
      title: string
      Challenge: {
        id: string
        title: string
      }
    }
  }]
}
```

## Dependencies

- ✅ Task 10: ChallengeAssignment model and queries exist
- ✅ Task 6: requireManagerOrAdmin() middleware exists

## Implementation Strategy

### Query Logic

The key challenge is filtering submissions to only those for challenges where the current user is assigned as a manager:

1. Get current user ID from requireManagerOrAdmin()
2. Find all ChallengeAssignments where managerId = current user
3. Extract challengeIds from assignments
4. Query ActivitySubmissions where:
   - Activity.challengeId IN (assigned challengeIds)
   - workspaceId matches
   - Optional: status filter if provided
5. Include: User, Activity (with Challenge)

### Authorization Flow

- Use requireManagerOrAdmin() to ensure only managers/admins access this endpoint
- Managers will only see submissions for their assigned challenges
- Admins will see all submissions (no challenge filtering)

## Progress

- [x] Create route directory structure
- [x] Implement GET endpoint
- [x] Add proper query with ChallengeAssignment filtering
- [x] Add status filter support
- [x] Verify build passes
- [x] Commit changes

## Files to Create

- `app/api/workspaces/[slug]/manager/queue/route.ts`

## Testing Notes

Will test in Task 27 (Authorization Tests - Manager Endpoints)

## Implementation Log

### Step 1: Analysis
Reviewed existing submission queries and ChallengeAssignment structure.

Found `getManagerPendingSubmissions()` in lib/db/queries.ts:2888 which implements similar logic but hardcoded to PENDING status only. For the API endpoint, implemented the filtering logic directly inline to support optional status parameter.

### Step 2: Implement GET endpoint
Created `app/api/workspaces/[slug]/manager/queue/route.ts`:

**Key implementation details**:
1. **Authorization**: Uses `requireManagerOrAdmin(slug)` - only managers/admins can access
2. **Manager filtering**:
   - Queries ChallengeAssignment table for current user's assignments
   - Extracts challengeIds
   - Filters submissions to only those for assigned challenges
3. **Status filter**: Optional query parameter `?status=PENDING|MANAGER_APPROVED|etc.`
4. **Response includes**:
   - User (id, email)
   - Activity with ActivityTemplate (id, name, type) and Challenge (id, title)
5. **Ordered by**: submittedAt DESC (newest first)

**Edge cases handled**:
- If manager has no assignments, returns empty array
- Status filter is optional - if not provided, returns all statuses
- Workspace isolation via workspaceId in ChallengeAssignment query

### Step 3: Build verification
✅ `pnpm build` passed successfully
- Route compiles correctly
- New route visible in build output: `├ ƒ /api/workspaces/[slug]/manager/queue`

## Implementation Summary

Successfully created manager queue API endpoint at `/api/workspaces/[slug]/manager/queue`:

**Authorization**: requireManagerOrAdmin() - managers see only their assigned challenges

**Query logic**:
1. Find all ChallengeAssignments for current user
2. Filter ActivitySubmissions where Activity.challengeId IN (assigned challenges)
3. Optional status filter via query param
4. Include User, Activity (with Template and Challenge) details
5. Order by submittedAt DESC

**Query parameters**:
- `status` (optional): Filter by SubmissionStatus (PENDING, MANAGER_APPROVED, NEEDS_REVISION, APPROVED, REJECTED, DRAFT)

**Response format**:
```json
{
  "submissions": [{
    "id": "uuid",
    "status": "PENDING",
    "submittedAt": "2025-10-24T...",
    "managerNotes": null,
    "User": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "Activity": {
      "id": "uuid",
      "title": "Activity Title",
      "ActivityTemplate": {
        "id": "uuid",
        "name": "Template Name",
        "type": "TEXT"
      },
      "Challenge": {
        "id": "uuid",
        "title": "Challenge Title"
      }
    }
  }]
}
```

**Performance considerations**:
- Single query to get assignments
- Single query to get submissions with includes
- No N+1 queries due to proper Prisma includes
- Returns empty array immediately if manager has no assignments
