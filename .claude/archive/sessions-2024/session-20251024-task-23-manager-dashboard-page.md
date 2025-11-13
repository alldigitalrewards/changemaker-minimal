# Task 23: Manager Dashboard Page

**Date**: 2025-10-24
**Status**: In Progress
**Estimated Time**: 6 hours
**Priority**: CORE UI

## Objective

Create a full-featured manager dashboard page that shows submission queue for challenges assigned to the current manager, with stats, filtering, and intuitive UI.

## Requirements

- **Route**: `/w/[slug]/admin/manager/queue`
- **File**: `app/w/[slug]/admin/manager/queue/page.tsx` (NEW)
- **API**: GET `/api/workspaces/[slug]/manager/queue` (exists from Task 18)
- **Authorization**: Manager or Admin role required
- **Features**:
  - Stats cards: Pending count, Approved today, Avg review time, Total assigned challenges
  - Status filter tabs: ALL/PENDING/MANAGER_APPROVED/NEEDS_REVISION
  - Card-based submission list (not data table)
  - Empty state with helpful message
  - Click card to view submission details

### UI Pattern Reference

Copy pattern from: `app/w/[slug]/admin/challenges/[id]/submissions/page.tsx`

### Stats Cards

1. **Pending Reviews**: Count of submissions with status=PENDING
2. **Approved Today**: Count of submissions approved today (status=MANAGER_APPROVED, managerReviewedAt today)
3. **Avg Review Time**: Average time between submittedAt and managerReviewedAt
4. **Assigned Challenges**: Count of unique challenges in manager's queue

### Status Filter Tabs

- ALL: Show all submissions
- PENDING: Show only PENDING submissions
- MANAGER_APPROVED: Show only MANAGER_APPROVED submissions
- NEEDS_REVISION: Show only NEEDS_REVISION submissions

### Submission Card Format

```
┌─────────────────────────────────────────────┐
│ [Challenge Title] • [Activity Name]        │
│ Submitted by: [User Email]                 │
│ Status: [BADGE]                            │
│ Submitted: [Relative Time]                 │
│ [Action Buttons if PENDING]               │
└─────────────────────────────────────────────┘
```

## Dependencies

- ✅ Task 18: Manager Queue API endpoint exists

## Implementation Strategy

### Step 1: Create Route Structure

Create directory: `app/w/[slug]/admin/manager/queue/`
Create file: `page.tsx`

### Step 2: Implement Server Component

- Fetch workspace and user role
- Verify manager or admin authorization
- Fetch submissions from `/api/workspaces/[slug]/manager/queue`
- Calculate stats from submissions data
- Pass data to client component

### Step 3: Implement Client Component

- Status filter tabs (state management)
- Stats cards display
- Submission cards list
- Empty state
- Loading state

### Step 4: Styling

- Use shadcn/ui components (Card, Badge, Tabs, Button)
- Responsive layout
- Consistent with admin dashboard design

### Step 5: Test

- Verify authorization works
- Test with no submissions (empty state)
- Test with many submissions (performance)
- Test status filtering
- Verify build passes

## Progress

- [x] Create session file
- [ ] Create route directory structure
- [ ] Implement server component
- [ ] Implement client component (stats + filters + list)
- [ ] Add empty state
- [ ] Test authorization
- [ ] Verify build passes
- [ ] Commit changes

## Files to Create

- `app/w/[slug]/admin/manager/queue/page.tsx` (NEW)

## Implementation Log

### Step 1: Analysis - Review Existing Submissions Page Pattern
