# Multi-Role Testing Scenarios

This document outlines comprehensive test scenarios for the multi-role capability features implemented in the Changemaker platform.

## Overview

The multi-role system supports three roles with distinct permissions:
- **ADMIN** - Full workspace control
- **MANAGER** - Challenge management and approval permissions
- **PARTICIPANT** - Challenge participation

Key features being tested:
1. Submission approval UI with self-approval prevention
2. Smart enrollment buttons based on permissions
3. Permission-based route guards

## Test Environment Setup

### Prerequisites
- Three test user accounts with different roles
- At least one published challenge
- Test workspace with all three users as members

### Test Users
```
Admin: admin@test.com (ADMIN role)
Manager: manager@test.com (MANAGER role, assigned to test challenge)
Participant: participant@test.com (PARTICIPANT role)
```

## Feature 1: Submission Approval Actions

### Scenario 1.1: Admin Views Own Submission
**Setup:**
1. Admin enrolls in challenge
2. Admin submits activity

**Expected Behavior:**
- Approval UI shows "Your Submission" badge
- Approve/Reject buttons are NOT shown
- Status badge shows current submission status
- Self-approval is prevented

**Test Steps:**
1. Sign in as admin@test.com
2. Navigate to manager queue
3. Locate own submission
4. Verify "Your Submission" badge is displayed
5. Verify no action buttons appear
6. Verify status badge is visible

**Pass Criteria:**
- ✅ "Your Submission" badge appears
- ✅ No approve/reject buttons
- ✅ Status badge reflects current state

---

### Scenario 1.2: Admin Approves Another User's Submission
**Setup:**
1. Participant submits activity
2. Admin reviews submission

**Expected Behavior:**
- Approve and "Request Revision" buttons appear
- Buttons trigger API calls successfully
- UI updates after action
- Prevents double-submission

**Test Steps:**
1. Sign in as participant@test.com
2. Enroll and submit activity
3. Sign out, sign in as admin@test.com
4. Navigate to manager queue
5. Find participant's submission
6. Click "Approve" button
7. Verify loading state appears
8. Verify success and page refresh

**Pass Criteria:**
- ✅ Both action buttons visible
- ✅ Loading spinner during action
- ✅ Submission status updates to APPROVED
- ✅ Page refreshes after action

---

### Scenario 1.3: Manager Approves in Assigned Challenge
**Setup:**
1. Create challenge
2. Assign manager to challenge
3. Participant submits activity

**Expected Behavior:**
- Manager sees pending submissions
- Approval buttons work correctly
- Manager can only approve in assigned challenges

**Test Steps:**
1. Sign in as admin@test.com
2. Create challenge
3. Assign manager@test.com to challenge
4. Sign out, sign in as participant@test.com
5. Submit activity
6. Sign out, sign in as manager@test.com
7. Navigate to manager queue
8. Verify submission appears
9. Approve submission

**Pass Criteria:**
- ✅ Submission appears in manager queue
- ✅ Approve/Reject buttons visible
- ✅ Action succeeds
- ✅ Status changes to MANAGER_APPROVED

---

### Scenario 1.4: Manager Cannot Approve Own Submission
**Setup:**
1. Manager is assigned to challenge
2. Manager enrolls as participant
3. Manager submits activity

**Expected Behavior:**
- Manager sees own submission in queue
- "Your Submission" badge appears
- No action buttons shown
- Self-approval is prevented

**Test Steps:**
1. Sign in as manager@test.com
2. Enroll in assigned challenge
3. Submit activity
4. Navigate to manager queue
5. Find own submission

**Pass Criteria:**
- ✅ "Your Submission" badge displayed
- ✅ No approve/reject buttons
- ✅ Status badge shows PENDING

---

### Scenario 1.5: Permission Error Handling
**Setup:**
1. API returns 403 error

**Expected Behavior:**
- Error message displayed
- UI shows graceful degradation
- No action buttons if no permission

**Test Steps:**
1. Sign in as participant@test.com (no approval permission)
2. Navigate to any submission view
3. Verify no approval UI appears

**Pass Criteria:**
- ✅ No approval buttons for participants
- ✅ Only status badges visible
- ✅ No console errors

---

## Feature 2: Challenge Enrollment Button

### Scenario 2.1: Participant Successfully Enrolls
**Setup:**
1. Participant not enrolled in challenge

**Expected Behavior:**
- "Enroll in Challenge" button visible
- Click triggers enrollment
- Button changes to "Enrolled" badge
- Page updates to show activities

**Test Steps:**
1. Sign in as participant@test.com
2. Navigate to challenge detail page
3. Verify "Enroll in Challenge" button appears
4. Click button
5. Verify loading state
6. Verify "Enrolled" badge appears
7. Verify activities tab is accessible

**Pass Criteria:**
- ✅ Enrollment button visible
- ✅ Loading state during enrollment
- ✅ Button changes to badge after enrollment
- ✅ Activities become accessible

---

### Scenario 2.2: Already Enrolled User Sees Badge
**Setup:**
1. Participant already enrolled in challenge

**Expected Behavior:**
- Green "Enrolled" badge with checkmark
- No enrollment button
- Activities are accessible

**Test Steps:**
1. Sign in as enrolled participant
2. Navigate to challenge detail page
3. Verify badge appears
4. Verify no enrollment button
5. Verify activities tab works

**Pass Criteria:**
- ✅ "Enrolled" badge displayed
- ✅ Green color with checkmark icon
- ✅ No duplicate enrollment button
- ✅ Activities accessible

---

### Scenario 2.3: Admin Can Enroll as Participant
**Setup:**
1. Admin user viewing challenge

**Expected Behavior:**
- Admin sees enrollment button
- Admin can enroll successfully
- Admin can participate in activities
- Admin retains admin permissions

**Test Steps:**
1. Sign in as admin@test.com
2. Navigate to challenge detail
3. Click "Enroll in Challenge"
4. Verify enrollment succeeds
5. Verify admin can submit activities
6. Verify admin still has admin dashboard access

**Pass Criteria:**
- ✅ Enrollment button available to admin
- ✅ Enrollment succeeds
- ✅ Admin can participate
- ✅ Admin permissions unchanged

---

### Scenario 2.4: Manager Can Enroll as Participant
**Setup:**
1. Manager assigned to challenge

**Expected Behavior:**
- Manager sees enrollment button
- Manager can enroll and participate
- Manager retains management permissions

**Test Steps:**
1. Sign in as manager@test.com
2. Navigate to assigned challenge
3. Enroll in challenge
4. Verify manager can submit activities
5. Verify manager can still approve others' submissions

**Pass Criteria:**
- ✅ Manager can enroll
- ✅ Manager can participate
- ✅ Manager can approve others (not self)
- ✅ Dual role works correctly

---

### Scenario 2.5: Enrollment Button States
**Setup:**
1. Various enrollment states

**Expected Behavior:**
- Different states show appropriate UI
- Tooltips explain disabled states
- Loading states during actions

**Test States to Verify:**
1. **Not Enrolled** - Shows blue "Enroll" button
2. **Already Enrolled** - Shows green badge
3. **Enrolling** - Shows loading spinner
4. **Enrollment Failed** - Shows error message

**Test Steps:**
1. Test each state above
2. Verify appropriate visual feedback
3. Test tooltip hovers
4. Test error recovery

**Pass Criteria:**
- ✅ All states display correctly
- ✅ Tooltips provide context
- ✅ Loading states prevent double-clicks
- ✅ Errors are user-friendly

---

## Feature 3: Permission-Based Route Guards

### Scenario 3.1: Admin Accesses Admin Pages
**Setup:**
1. User with ADMIN role

**Expected Behavior:**
- Full access to /w/[slug]/admin/*
- Dashboard loads correctly
- All admin features accessible

**Test Steps:**
1. Sign in as admin@test.com
2. Navigate to /w/test-workspace/admin/dashboard
3. Verify page loads
4. Test navigation to all admin pages
5. Verify no access denied messages

**Pass Criteria:**
- ✅ Admin dashboard loads
- ✅ All admin pages accessible
- ✅ No redirect to unauthorized page

---

### Scenario 3.2: Manager Accesses Admin Pages
**Setup:**
1. User with MANAGER role

**Expected Behavior:**
- Access to /w/[slug]/admin/* pages
- Manager queue accessible
- Challenge management accessible (for assigned challenges)

**Test Steps:**
1. Sign in as manager@test.com
2. Navigate to /w/test-workspace/admin/manager/queue
3. Verify page loads
4. Navigate to assigned challenge management
5. Verify access granted

**Pass Criteria:**
- ✅ Manager queue accessible
- ✅ Assigned challenge pages load
- ✅ Manager tools work correctly

---

### Scenario 3.3: Participant Blocked from Admin Pages
**Setup:**
1. User with PARTICIPANT role

**Expected Behavior:**
- Redirect from /w/[slug]/admin/*
- Access denied message shown
- Redirected to participant dashboard

**Test Steps:**
1. Sign in as participant@test.com
2. Attempt to navigate to /w/test-workspace/admin/dashboard
3. Verify redirect occurs
4. Verify redirected to participant area

**Pass Criteria:**
- ✅ Immediate redirect on access attempt
- ✅ No admin content briefly visible
- ✅ Redirect to appropriate participant page

---

### Scenario 3.4: Unauthenticated User Redirected
**Setup:**
1. No user signed in

**Expected Behavior:**
- Redirect to login page
- Return URL preserved
- After login, return to intended page

**Test Steps:**
1. Sign out completely
2. Navigate to /w/test-workspace/admin/dashboard
3. Verify redirect to /auth/signin
4. Sign in
5. Verify return to intended page

**Pass Criteria:**
- ✅ Redirect to login
- ✅ Return URL in query params
- ✅ Post-login redirect works

---

### Scenario 3.5: Client-Side Route Guard
**Setup:**
1. Challenge management page with guard

**Expected Behavior:**
- Loading spinner while checking permissions
- Access denied UI if unauthorized
- Normal content if authorized

**Test Steps:**
1. Sign in as participant@test.com
2. Navigate to challenge management page
3. Verify loading state appears briefly
4. Verify access denied component shows
5. Verify "Return" button works

**Pass Criteria:**
- ✅ Loading state visible during check
- ✅ Access denied component renders
- ✅ Shield icon and message display
- ✅ Return button navigates correctly

---

## Integration Tests: Combined Features

### Integration 1: Complete Manager Workflow
**Scenario:** Manager reviews and approves submission

**Steps:**
1. Participant enrolls in challenge
2. Participant submits activity
3. Manager views queue
4. Manager approves submission
5. Admin reviews final approval

**Verify:**
- ✅ Enrollment button works
- ✅ Submission appears in manager queue
- ✅ Manager can approve
- ✅ Status updates correctly
- ✅ Admin can see manager approval

---

### Integration 2: Admin Participation Workflow
**Scenario:** Admin enrolls and participates

**Steps:**
1. Admin views challenge
2. Admin enrolls via button
3. Admin submits activity
4. Admin cannot approve own submission
5. Another admin approves it

**Verify:**
- ✅ Admin can enroll
- ✅ Admin can submit
- ✅ Self-approval blocked
- ✅ Other admin can approve
- ✅ Points awarded correctly

---

### Integration 3: Permission Hierarchy Test
**Scenario:** Test all three roles accessing same challenge

**Steps:**
1. Admin creates and publishes challenge
2. Manager assigned to challenge
3. Participant enrolls
4. All three submit activities
5. Test who can approve whose submissions

**Verify:**
- ✅ Admin can approve all (except own)
- ✅ Manager can approve participant (not own)
- ✅ Participant cannot approve any
- ✅ Self-approval always blocked

---

## Performance Tests

### Load Test: Rapid Button Clicks
**Test:** Click enrollment button rapidly
**Expected:** Only one enrollment created
**Verify:** Loading state prevents double-clicks

### Load Test: Concurrent Approvals
**Test:** Two managers approve same submission
**Expected:** First approval succeeds, second fails gracefully
**Verify:** No duplicate approvals

---

## Accessibility Tests

### Keyboard Navigation
- ✅ All buttons accessible via Tab
- ✅ Enter/Space triggers actions
- ✅ Focus visible on all elements

### Screen Reader
- ✅ Button labels descriptive
- ✅ Status badges announced
- ✅ Loading states announced
- ✅ Error messages announced

### Color Contrast
- ✅ All badges meet WCAG AA
- ✅ Buttons have sufficient contrast
- ✅ Disabled states clearly visible

---

## Error Scenarios

### Network Errors
- ✅ Enrollment fails gracefully
- ✅ Approval failure shows error
- ✅ Retry mechanism works

### API Errors
- ✅ 403 shows appropriate message
- ✅ 404 handles missing resources
- ✅ 500 shows generic error

### State Management
- ✅ Optimistic updates rollback on failure
- ✅ Stale data refreshed after action
- ✅ Race conditions handled

---

## Regression Tests

After each deployment, verify:
1. Existing enrollments still work
2. Historical approvals intact
3. Permission checks still function
4. No breaking changes to API

---

## Test Data Cleanup

After testing, clean up:
- Test enrollments
- Test submissions
- Test approvals
- Test challenge assignments

SQL cleanup script:
```sql
-- Run in development only!
DELETE FROM "Enrollment" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE '%@test.com');
DELETE FROM "ActivitySubmission" WHERE "userId" IN (SELECT id FROM "User" WHERE email LIKE '%@test.com');
DELETE FROM "ChallengeAssignment" WHERE "managerId" IN (SELECT id FROM "User" WHERE email LIKE '%@test.com');
```

---

## Test Sign-Off

| Scenario | Tested By | Date | Status | Notes |
|----------|-----------|------|--------|-------|
| 1.1 - Admin Own Submission | | | | |
| 1.2 - Admin Approves Other | | | | |
| 1.3 - Manager Approves | | | | |
| 1.4 - Manager Self Block | | | | |
| 2.1 - Participant Enrolls | | | | |
| 2.2 - Already Enrolled | | | | |
| 2.3 - Admin Enrolls | | | | |
| 2.4 - Manager Enrolls | | | | |
| 3.1 - Admin Access | | | | |
| 3.2 - Manager Access | | | | |
| 3.3 - Participant Block | | | | |
| Integration 1 | | | | |
| Integration 2 | | | | |
| Integration 3 | | | | |

---

## Known Limitations

1. **Enrollment Button in Lists**: Currently only implemented in detail pages, not challenge list cards
2. **Bulk Approvals**: No batch approval UI yet
3. **Approval History**: Limited visibility of approval chain
4. **Permission Caching**: Permissions refetched on each page load

---

## Future Enhancements

1. Add enrollment buttons to challenge list cards
2. Implement batch approval for managers
3. Add approval history timeline
4. Implement permission caching
5. Add real-time updates via WebSockets
6. Add audit logs for all permission changes

---

**Last Updated:** 2025-11-05
**Version:** 1.0
**Status:** Ready for Testing
