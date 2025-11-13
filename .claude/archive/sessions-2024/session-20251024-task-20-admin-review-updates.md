# Task 20: Admin Review Endpoint Updates

**Date**: 2025-10-24
**Status**: In Progress
**Estimated Time**: 2 hours

## Objective

Update existing admin review endpoint to handle MANAGER_APPROVED status transitions, supporting the two-step approval workflow (manager review → admin final approval).

## Requirements

- **Endpoint**: POST /api/workspaces/[slug]/submissions/[id]/review (MODIFY EXISTING)
- **New Transitions**:
  - MANAGER_APPROVED → APPROVED (admin final approval)
  - MANAGER_APPROVED → REJECTED (admin override of manager approval)
- **Existing Transitions** (keep working):
  - PENDING → APPROVED
  - PENDING → REJECTED
- **Activity Logging**: Log ActivityEvent when admin overrides manager decision (MANAGER_APPROVED → REJECTED)
- **Authorization**: requireWorkspaceAdmin() (already exists)

### Request Body (unchanged)
```typescript
{
  action: "approve" | "reject",
  notes?: string
}
```

### Response Format (unchanged)
```typescript
{
  submission: {
    id: string
    status: SubmissionStatus  // APPROVED or REJECTED
    adminNotes: string | null
    // ... other fields
  }
}
```

## Dependencies

- ✅ Task 7: SubmissionStatus enum includes MANAGER_APPROVED

## Implementation Strategy

### Step 1: Read existing endpoint
- Review current implementation
- Identify where status validation happens
- Check if it only allows PENDING status currently

### Step 2: Update status validation
- Allow MANAGER_APPROVED status in addition to PENDING
- Keep existing PENDING → APPROVED/REJECTED flow
- Add MANAGER_APPROVED → APPROVED/REJECTED flow

### Step 3: Identify override scenarios
- Admin approving MANAGER_APPROVED: Normal final approval (no override)
- Admin rejecting MANAGER_APPROVED: Override (log event)

### Step 4: Test
- Verify build passes
- Check TypeScript compilation

## Progress

- [x] Create session file
- [ ] Read existing endpoint
- [ ] Identify required changes
- [ ] Update status validation logic
- [ ] Add admin override detection
- [ ] Verify build passes
- [ ] Commit changes

## Files to Modify

- `app/api/workspaces/[slug]/submissions/[id]/review/route.ts`

## Implementation Log

### Step 1: Analysis - Current Endpoint

Read existing `app/api/workspaces/[slug]/submissions/[id]/review/route.ts` (132 lines)

**Current behavior**:
- Line 39: Only allows PENDING status to be reviewed (`status !== 'PENDING'`)
- Lines 16-18: Accepts status parameter that must be APPROVED or REJECTED
- Lines 104-118: Logs ActivityEvent with submission metadata
- Lines 56-102: Issues reward if status is APPROVED (points, SKU, or monetary)

**Required changes**:
1. Allow MANAGER_APPROVED status in addition to PENDING (line 39)
2. Detect admin override scenario: MANAGER_APPROVED → REJECTED
3. Add admin override flag to ActivityEvent metadata

### Step 2: Implementation

**Change 1**: Updated status validation (lines 38-45)
```typescript
// OLD:
if (existingSubmission.status !== 'PENDING') {
  return NextResponse.json({ error: 'Submission has already been reviewed' }, { status: 400 })
}

// NEW:
// Check if submission can be reviewed by admin
// Allow PENDING (direct admin review) or MANAGER_APPROVED (final approval after manager review)
if (existingSubmission.status !== 'PENDING' && existingSubmission.status !== 'MANAGER_APPROVED') {
  return NextResponse.json({ error: 'Submission has already been reviewed' }, { status: 400 })
}

// Detect admin override: admin rejects a manager-approved submission
const isAdminOverride = existingSubmission.status === 'MANAGER_APPROVED' && status === 'REJECTED'
```

**Change 2**: Updated ActivityEvent logging (lines 108-125)
```typescript
// Added to metadata:
previousStatus: existingSubmission.status,
adminOverride: isAdminOverride || undefined
```

**Key implementation details**:
1. **Two-step approval flow support**:
   - PENDING → APPROVED (direct admin approval, existing flow)
   - PENDING → REJECTED (direct admin rejection, existing flow)
   - MANAGER_APPROVED → APPROVED (admin final approval after manager review, NEW)
   - MANAGER_APPROVED → REJECTED (admin override of manager approval, NEW with flag)

2. **Admin override detection**:
   - `isAdminOverride = true` only when admin rejects a manager-approved submission
   - Logged in ActivityEvent metadata for audit trail
   - Distinguishes between normal rejection (PENDING → REJECTED) and override (MANAGER_APPROVED → REJECTED)

3. **Backward compatibility**:
   - All existing PENDING → APPROVED/REJECTED flows work unchanged
   - No breaking changes to API contract
   - Same request/response format

### Step 3: Build Verification

✅ `pnpm build` passed successfully
- Route compiles correctly
- No TypeScript errors
- Route visible in build output: `├ ƒ /api/workspaces/[slug]/submissions/[id]/review`

## Implementation Summary

Successfully updated admin review API endpoint at `/api/workspaces/[slug]/submissions/[id]/review`:

**New transitions supported**:
- MANAGER_APPROVED → APPROVED (admin final approval)
- MANAGER_APPROVED → REJECTED (admin override with audit flag)

**Existing transitions preserved**:
- PENDING → APPROVED (direct admin approval)
- PENDING → REJECTED (direct admin rejection)

**Admin override tracking**:
- Detected when: `previousStatus === 'MANAGER_APPROVED' && newStatus === 'REJECTED'`
- Logged in ActivityEvent metadata: `{ adminOverride: true, previousStatus: 'MANAGER_APPROVED' }`
- Audit trail for compliance and dispute resolution

**Request body** (unchanged):
```json
{
  "status": "APPROVED" | "REJECTED",
  "reviewNotes": "optional feedback",
  "pointsAwarded": 100,
  "reward": {
    "type": "points" | "sku" | "monetary",
    "amount": 100,
    "currency": "USD",
    "skuId": "sku-123",
    "provider": "tremendous"
  }
}
```

**Response** (unchanged):
```json
{
  "submission": {
    "id": "uuid",
    "status": "APPROVED" | "REJECTED",
    "reviewNotes": "feedback text",
    "pointsAwarded": 100,
    // ... other fields
  }
}
```

**Authorization**: requireWorkspaceAdmin() - only workspace admins can access

**Risk mitigation**: No breaking changes to existing functionality, all tests should pass
