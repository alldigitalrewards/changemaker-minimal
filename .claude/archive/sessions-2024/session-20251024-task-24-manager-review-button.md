# Task 24: Manager Review Button Component

**Date**: 2025-10-24
**Status**: In Progress
**Estimated Time**: 4 hours
**Priority**: CORE UI

## Objective

Create a reusable ManagerReviewButton client component that allows managers to approve submissions for admin review or request changes from participants.

## Requirements

- **Component**: ManagerReviewButton (client component)
- **File**: `app/w/[slug]/admin/manager/queue/manager-review-button.tsx` (NEW)
- **API**: POST `/api/workspaces/[slug]/submissions/[id]/manager-review` (exists from Task 19)
- **Features**:
  - Dialog with two action buttons: "Approve for Admin" and "Request Changes"
  - Text area for manager notes (optional for approve, required for reject)
  - Loading states during API call
  - Toast notifications on success/error
  - router.refresh() to reload page data after success
  - Proper error handling

### UI Flow

1. **Initial State**: Button displays "Review" (or similar text)
2. **Click**: Opens dialog with two options
3. **Approve Path**:
   - Button: "Approve for Admin Review" (green/primary)
   - Optional notes field
   - Submits with action="approve"
4. **Reject Path**:
   - Button: "Request Changes" (orange/warning)
   - Required notes field with validation
   - Submits with action="reject"
5. **After Submit**:
   - Show loading spinner
   - Call API endpoint
   - Show success toast
   - Refresh page to update submission list

## Dependencies

- ✅ Task 19: Manager review API endpoint exists

## Implementation Strategy

### Step 1: Create Component File

Create directory if needed: `app/w/[slug]/admin/manager/queue/`
Create file: `manager-review-button.tsx`

### Step 2: Implement Dialog Structure

- Use shadcn/ui Dialog component
- Two-column button layout (Approve | Request Changes)
- Textarea for notes
- Form validation (notes required for reject)

### Step 3: API Integration

- Fetch call to `/api/workspaces/[slug]/submissions/[id]/manager-review`
- Handle loading state
- Handle success/error responses
- Toast notifications

### Step 4: Integrate into Queue Page

- Import component in `app/w/[slug]/admin/manager/queue/page.tsx`
- Add to submission cards (only for PENDING status)
- Pass submission ID and workspace slug as props

### Step 5: Test & Build

- Verify dialog opens
- Test approve flow
- Test reject flow with/without notes
- Verify toast notifications
- Verify page refresh
- Run build

## Progress

- [x] Create session file
- [ ] Create component file with dialog structure
- [ ] Implement form state management
- [ ] Implement API call logic
- [ ] Add loading states and error handling
- [ ] Add toast notifications
- [ ] Integrate into queue page
- [ ] Test both approve and reject flows
- [ ] Verify build passes
- [ ] Commit changes

## Files to Create

- `app/w/[slug]/admin/manager/queue/manager-review-button.tsx` (NEW)

## Files to Modify

- `app/w/[slug]/admin/manager/queue/page.tsx` (add ManagerReviewButton)

## Implementation Log

### Step 1: Review Existing Pattern
