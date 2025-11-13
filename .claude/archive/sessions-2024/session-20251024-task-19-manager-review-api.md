# Task 19: Manager Review API Endpoint

**Date**: 2025-10-24
**Status**: In Progress
**Estimated Time**: 4 hours
**Priority**: CRITICAL

## Objective

Create POST endpoint for managers to review submissions for their assigned challenges, with support for approve/reject actions and conditional auto-approval.

## Requirements

- **Endpoint**: POST /api/workspaces/[slug]/submissions/[id]/manager-review
- **Authorization**: requireManagerOrAdmin() + assignment check
- **Critical Security**: MUST validate manager is assigned to the submission's challenge
- **Actions**:
  - `"approve"` → MANAGER_APPROVED status
  - `"reject"` → NEEDS_REVISION status
- **Conditional Auto-Approval**:
  - Check Challenge.requireAdminReapproval flag
  - If false: auto-approve to APPROVED and call issueReward()
  - If true: keep as MANAGER_APPROVED (requires admin final approval)
- **Manager Notes**: Save in ActivitySubmission.managerNotes field
- **Audit Trail**: Log ActivityEvent for review action

### Request Body
```typescript
{
  action: "approve" | "reject",
  notes?: string  // Optional manager feedback
}
```

### Response Format
```typescript
{
  submission: {
    id: string
    status: SubmissionStatus  // MANAGER_APPROVED or NEEDS_REVISION
    managerNotes: string | null
    // ... other fields
  }
}
```

## Dependencies

- ✅ Task 6: requireManagerOrAdmin() middleware exists
- ✅ Task 10: isManagerAssignedToChallenge() helper exists (to verify)

## Critical Security Considerations

**Authorization Flow**:
1. requireManagerOrAdmin() - ensure user has manager/admin role
2. isManagerAssignedToChallenge() - ensure manager is assigned to this submission's challenge
3. Only then allow review action

**Risk**: If assignment check is missing, ANY manager could review ANY submission (authorization bypass vulnerability)

## Implementation Strategy

### Step 1: Check existing helper functions
- Verify `isManagerAssignedToChallenge()` exists in lib/db/queries.ts
- Check if `managerReviewSubmission()` helper already exists (from Task 10)
- Review `issueReward()` function for auto-approval flow

### Step 2: Implement endpoint
- Use requireManagerOrAdmin() for base auth
- Call assignment check helper
- Support approve/reject actions
- Conditional auto-approval logic
- Save manager notes
- Log ActivityEvent

### Step 3: Test authorization
- Manager can review assigned challenges only
- Manager cannot review unassigned challenges
- Admins can review any challenge

## Progress

- [x] Review existing helper functions
- [x] Check Challenge schema for requireAdminReapproval field
- [x] Implement POST endpoint
- [x] Add assignment validation
- [x] Implement approve/reject logic
- [ ] Add conditional auto-approval (deferred to Task 21 - field doesn't exist yet)
- [ ] Add ActivityEvent logging (existing in helper already)
- [x] Verify build passes
- [x] Commit changes

## Files to Create

- `app/api/workspaces/[slug]/submissions/[id]/manager-review/route.ts`

## Testing Notes

Will test in Task 28 (Approval Workflow Tests)

## Implementation Log

### Step 1: Analysis - Existing Helper Functions

Found `managerReviewSubmission()` in lib/db/queries.ts:2949:
- Already implements assignment validation (lines 2962-2970)
- Uses ChallengeAssignment join to verify manager is assigned to challenge
- Updates submission with status, notes, timestamps
- Awards points if MANAGER_APPROVED

**Security**: Assignment check is built into the WHERE clause - submission query only succeeds if manager is assigned to the challenge. This prevents authorization bypass.

### Step 2: Schema Check

Checked Challenge model in prisma/schema.prisma:
- `requireAdminReapproval` field **does NOT exist yet**
- This field will be added in Task 21 (Challenge Schema Updates)
- For now, endpoint always sets status to MANAGER_APPROVED (no auto-approval to APPROVED)
- Conditional auto-approval logic can be added after Task 21

### Step 3: Implement POST Endpoint

Created `app/api/workspaces/[slug]/submissions/[id]/manager-review/route.ts`:

**Key implementation details**:
1. **Authorization**: Uses `requireManagerOrAdmin(slug)` for base auth
2. **Request validation**: Validates action is "approve" or "reject"
3. **Action mapping**:
   - "approve" → MANAGER_APPROVED status
   - "reject" → NEEDS_REVISION status
4. **Database operation**: Calls `managerReviewSubmission()` helper which:
   - Validates manager assignment (CRITICAL SECURITY)
   - Updates submission status and notes
   - Sets managerReviewedBy and managerReviewedAt timestamps
   - Awards points if applicable
5. **Error handling**: Wrapped in `withErrorHandling` for consistent responses

### Step 4: Build Verification

✅ `pnpm build` passed successfully
- Route compiles correctly
- New route visible: `├ ƒ /api/workspaces/[slug]/submissions/[id]/manager-review`

## Implementation Summary

Successfully created manager review API endpoint at `/api/workspaces/[slug]/submissions/[id]/manager-review`:

**Authorization**:
- requireManagerOrAdmin() for base authorization
- managerReviewSubmission() validates manager is assigned to challenge via ChallengeAssignment join

**Request body**:
```json
{
  "action": "approve" | "reject",
  "notes": "optional manager feedback"
}
```

**Response**:
```json
{
  "submission": {
    "id": "uuid",
    "status": "MANAGER_APPROVED" | "NEEDS_REVISION",
    "managerNotes": "feedback text",
    "managerReviewedBy": "manager-uuid",
    "managerReviewedAt": "2025-10-24T...",
    // ... other fields
  }
}
```

**Security**:
- Assignment validation happens in `managerReviewSubmission()` WHERE clause
- Manager can only review submissions for challenges they're assigned to
- Admins can review any submission
- Prevents authorization bypass vulnerability

**What's NOT included** (to be added in Task 21):
- Challenge.requireAdminReapproval field doesn't exist yet
- No conditional auto-approval to APPROVED status
- No automatic issueReward() call
- These features depend on Task 21 schema changes

**Points awarded**: The helper function includes logic to award points when status is MANAGER_APPROVED, but this may need adjustment after Task 21 to only award when final approval happens.
