# Task 25: Assignment Management UI - Admin

**Date**: 2025-10-24
**Status**: In Progress
**Estimated Time**: 5 hours
**Priority**: CORE UI

## Objective

Create admin UI for managing challenge manager assignments, allowing admins to view current assignments, add new managers, and remove existing assignments.

## Requirements

- **Component**: ChallengeManagersDialog (client component)
- **File**: `components/admin/challenge-managers-dialog.tsx` (NEW)
- **API Endpoints**: 
  - GET `/api/workspaces/[slug]/challenges/[id]/managers` (Task 17)
  - POST `/api/workspaces/[slug]/challenges/[id]/managers` (Task 16)
  - DELETE `/api/workspaces/[slug]/challenges/[id]/managers/[managerId]` (Task 17)
- **Integration Point**: Challenge details page (`app/w/[slug]/admin/challenges/[id]/page.tsx`)
- **Features**:
  - "Manage Managers" button on challenge details page
  - Dialog showing current assignments (list with remove buttons)
  - Dropdown to add new managers (filter WorkspaceMembership where role=MANAGER)
  - Remove button for each assigned manager (with confirmation)
  - Loading states and error handling
  - Toast notifications

### UI Flow

1. **Challenge Details Page**: Add "Manage Managers" button
2. **Click Button**: Opens ChallengeManagersDialog
3. **Dialog Content**:
   - Header: "Manage Challenge Managers"
   - Current Assignments: List of assigned managers with remove buttons
   - Add Manager: Dropdown with available managers + Add button
4. **Add Manager**:
   - Select from dropdown (only unassigned managers shown)
   - Click "Add" button
   - Call POST endpoint
   - Refresh list
5. **Remove Manager**:
   - Click remove button
   - Confirm dialog: "Remove [manager name]? They will no longer be able to review submissions."
   - Call DELETE endpoint
   - Refresh list

## Dependencies

- ✅ Task 16: Assignment API Create exists
- ✅ Task 17: Assignment API List/Delete exists

## Implementation Strategy

### Step 1: Create Dialog Component

Create file: `components/admin/challenge-managers-dialog.tsx`
- Use shadcn/ui Dialog
- State management for assignments, available managers, loading

### Step 2: Implement API Integration

- Fetch current assignments on dialog open
- Fetch workspace managers (filter by role=MANAGER)
- POST to add assignment
- DELETE to remove assignment
- Handle errors and loading states

### Step 3: Add Confirmation Dialog

- Use AlertDialog for remove confirmation
- Show manager name and warning about pending reviews

### Step 4: Integrate into Challenge Details Page

- Add "Manage Managers" button
- Import and render ChallengeManagersDialog
- Pass challenge ID and workspace slug

### Step 5: Test & Build

- Verify dialog opens
- Test add manager flow
- Test remove manager flow
- Verify error handling
- Run build

## Progress

- [x] Create session file
- [ ] Create dialog component structure
- [ ] Implement API fetch logic (list managers)
- [ ] Implement add manager functionality
- [ ] Implement remove manager functionality
- [ ] Add confirmation dialog for removal
- [ ] Integrate into challenge details page
- [ ] Test all flows
- [ ] Verify build passes
- [ ] Commit changes

## Files to Create

- `components/admin/challenge-managers-dialog.tsx` (NEW)

## Files to Modify

- `app/w/[slug]/admin/challenges/[id]/page.tsx` (add button + dialog)

## Implementation Log

### Step 1: Review Challenge Details Page Pattern
