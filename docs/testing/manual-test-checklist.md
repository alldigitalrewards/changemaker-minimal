# Manual Testing Checklist - Changemaker Application

**URL**: http://localhost:3000
**Date**: __________
**Tester**: __________

## Pre-Test Setup

- [ ] Dev server running on port 3000 (`pnpm dev`)
- [ ] Supabase running on port 54322
- [ ] Database seeded with test data
- [ ] Browser console open (F12)
- [ ] Network tab open

## Test Credentials

**Admin Account**:
- Email: jfelke@alldigitalrewards.com
- Password: Changemaker2025!
- Workspace: AllDigitalRewards

**Participant Account**:
- Email: john.doe@acme.com
- Password: Changemaker2025!
- Workspace: ACME Corporation

---

## 1. Authentication Flow

### 1.1 Login (Admin)
- [ ] Navigate to http://localhost:3000
- [ ] Redirects to /auth/login
- [ ] Enter admin credentials
- [ ] Click "Sign In"
- [ ] **VERIFY**: Redirects to /workspaces
- [ ] **VERIFY**: No errors in console
- [ ] **TIME**: How long did redirect take? ______ seconds

**Result**: ✅ PASS / ❌ FAIL
**Notes**: ___________________________________

### 1.2 Logout
- [ ] Click user menu or logout button
- [ ] Click "Sign Out"
- [ ] **VERIFY**: Redirects to /auth/login
- [ ] **VERIFY**: Cannot access /workspaces without login

**Result**: ✅ PASS / ❌ FAIL

### 1.3 Login (Participant)
- [ ] Login with participant credentials
- [ ] **VERIFY**: Redirects to /workspaces or dashboard
- [ ] **VERIFY**: Can see joined workspaces

**Result**: ✅ PASS / ❌ FAIL

---

## 2. Workspaces Dashboard

### 2.1 Dashboard Stats
- [ ] Navigate to /workspaces (if not already there)
- [ ] **VERIFY**: See "Your Workspaces" stat card
- [ ] **VERIFY**: See "Total Members" stat
- [ ] **VERIFY**: See "Total Challenges" stat
- [ ] **VERIFY**: Numbers look accurate (compare with database)
- [ ] **VERIFY**: Gradient styling applied

**Your Workspaces Count**: ______
**Total Members Count**: ______
**Total Challenges Count**: ______

**Result**: ✅ PASS / ❌ FAIL
**Notes**: ___________________________________

### 2.2 Workspace List
- [ ] **VERIFY**: See list of workspaces user belongs to
- [ ] **VERIFY**: Each workspace card shows name, slug, member count
- [ ] Click on a workspace card
- [ ] **VERIFY**: Navigates to workspace dashboard (/w/[slug]/admin or /w/[slug]/participant)

**Result**: ✅ PASS / ❌ FAIL

### 2.3 Discover Workspaces
- [ ] Scroll down to "Discover Workspaces" section
- [ ] **VERIFY**: See workspaces user hasn't joined
- [ ] **VERIFY**: Only see workspaces from same tenant
- [ ] **VERIFY**: "Join Workspace" button visible

**Unjoined Workspaces Shown**: ______

**Result**: ✅ PASS / ❌ FAIL
**Notes**: ___________________________________

### 2.4 Join Workspace Flow
- [ ] Click "Join Workspace" on discover section
- [ ] **VERIFY**: Page scrolls to discover section
- [ ] **VERIFY**: Section highlights (if implemented)
- [ ] Click on a workspace to join
- [ ] **VERIFY**: Successfully joins workspace
- [ ] **VERIFY**: Workspace now appears in "Your Workspaces"

**Result**: ✅ PASS / ❌ FAIL

### 2.5 Create Workspace (Admin Only)
- [ ] Login as admin
- [ ] Navigate to /workspaces
- [ ] Click "Create Workspace" button
- [ ] Enter workspace name
- [ ] Enter unique slug
- [ ] Submit form
- [ ] **VERIFY**: Workspace created successfully
- [ ] **VERIFY**: Redirects to new workspace dashboard

**Result**: ✅ PASS / ❌ FAIL / ⊘ N/A (not admin)

---

## 3. Challenge Management (Admin)

### 3.1 View Challenges
- [ ] Login as admin
- [ ] Navigate to /w/alldigitalrewards/admin/challenges
- [ ] **VERIFY**: See list of challenges
- [ ] **VERIFY**: Challenge cards show title, description, reward info
- [ ] **VERIFY**: Can see enrollment counts

**Challenge Count**: ______

**Result**: ✅ PASS / ❌ FAIL

### 3.2 Create Challenge - Points Reward
- [ ] Click "Create Challenge" or "New Challenge"
- [ ] Enter title: "Test Points Challenge"
- [ ] Enter description: "Testing points reward system"
- [ ] Select "Points" as reward type
- [ ] Enter points per activity: 100
- [ ] Set start and end dates (optional)
- [ ] Submit form
- [ ] **VERIFY**: Challenge created successfully
- [ ] **VERIFY**: Shows "100 Points Earned" or similar
- [ ] **VERIFY**: Challenge appears in list

**Challenge ID**: ______

**Result**: ✅ PASS / ❌ FAIL
**Notes**: ___________________________________

### 3.3 Create Challenge - SKU Reward
- [ ] Create new challenge
- [ ] Select "SKU" as reward type
- [ ] Enter SKU: "TEST-SKU-001"
- [ ] Enter quantity: 1
- [ ] Submit form
- [ ] **VERIFY**: Challenge created with SKU reward
- [ ] **VERIFY**: Shows "Rewards Issued" label

**Challenge ID**: ______

**Result**: ✅ PASS / ❌ FAIL

### 3.4 Create Challenge - Monetary Reward
- [ ] Create new challenge
- [ ] Select "Monetary" as reward type
- [ ] Enter amount: 50.00
- [ ] Submit form
- [ ] **VERIFY**: Challenge created with monetary reward
- [ ] **VERIFY**: Shows "Rewards Earned: $50.00" (formatted with dollar sign)

**Challenge ID**: ______

**Result**: ✅ PASS / ❌ FAIL

### 3.5 Edit Challenge
- [ ] Click on an existing challenge
- [ ] Click "Edit" button
- [ ] Modify title or description
- [ ] Save changes
- [ ] **VERIFY**: Changes saved successfully
- [ ] **VERIFY**: Updated info displayed correctly

**Result**: ✅ PASS / ❌ FAIL

---

## 4. Enrollment & Participation

### 4.1 View Available Challenges (Participant)
- [ ] Login as participant
- [ ] Navigate to /w/acme/participant/challenges
- [ ] **VERIFY**: See list of available challenges
- [ ] **VERIFY**: Can see challenge details
- [ ] **VERIFY**: Reward info displayed correctly

**Available Challenges**: ______

**Result**: ✅ PASS / ❌ FAIL

### 4.2 Enroll in Challenge
- [ ] Click on a challenge
- [ ] Click "Enroll" or "Join Challenge"
- [ ] **VERIFY**: Enrollment successful
- [ ] **VERIFY**: Status changes to "Enrolled"
- [ ] **VERIFY**: Challenge appears in participant dashboard

**Enrolled Challenge ID**: ______

**Result**: ✅ PASS / ❌ FAIL

### 4.3 Submit Activity
- [ ] Open enrolled challenge
- [ ] Find submission form
- [ ] Enter submission details
- [ ] Upload proof (if required)
- [ ] Submit
- [ ] **VERIFY**: Submission created
- [ ] **VERIFY**: Status shows "Pending Review" or similar

**Submission ID**: ______

**Result**: ✅ PASS / ❌ FAIL

---

## 5. Reward Approval Flow (Admin)

### 5.1 View Pending Submissions
- [ ] Login as admin
- [ ] Navigate to submissions/reviews page
- [ ] **VERIFY**: See pending submissions
- [ ] **VERIFY**: Can see submission details
- [ ] **VERIFY**: Reward info displayed

**Pending Submissions**: ______

**Result**: ✅ PASS / ❌ FAIL

### 5.2 Approve Submission - Points Reward
- [ ] Find submission for points challenge
- [ ] Click "Approve" or review button
- [ ] Enter approval comments (if required)
- [ ] Submit approval
- [ ] **VERIFY**: Submission status changes to "Approved"
- [ ] **VERIFY**: Check database for RewardIssuance record:
  ```sql
  SELECT * FROM "RewardIssuance" WHERE type = 'points' ORDER BY "createdAt" DESC LIMIT 1;
  ```
- [ ] **VERIFY**: Status is PENDING or ISSUED
- [ ] **VERIFY**: Amount matches challenge config

**RewardIssuance ID**: ______
**Status**: ______

**Result**: ✅ PASS / ❌ FAIL
**Notes**: ___________________________________

### 5.3 Approve Submission - SKU Reward
- [ ] Approve submission for SKU challenge
- [ ] **VERIFY**: RewardIssuance created with type 'sku'
- [ ] **VERIFY**: SKU matches challenge configuration
- [ ] **VERIFY**: Quantity is correct

**RewardIssuance ID**: ______

**Result**: ✅ PASS / ❌ FAIL

### 5.4 Approve Submission - Monetary Reward
- [ ] Approve submission for monetary challenge
- [ ] **VERIFY**: RewardIssuance created with type 'monetary'
- [ ] **VERIFY**: Amount matches ($50.00)
- [ ] **VERIFY**: Formatted with dollar sign in UI

**RewardIssuance ID**: ______
**Amount**: $______

**Result**: ✅ PASS / ❌ FAIL

### 5.5 Reject Submission
- [ ] Find a pending submission
- [ ] Click "Reject" button
- [ ] Enter rejection reason
- [ ] Submit
- [ ] **VERIFY**: Status changes to "Rejected"
- [ ] **VERIFY**: NO RewardIssuance created
- [ ] **VERIFY**: Participant sees rejection reason

**Result**: ✅ PASS / ❌ FAIL

---

## 6. Email Change Flow

### 6.1 Request Email Change
- [ ] Login as admin or participant
- [ ] Navigate to profile/account settings
- [ ] Find email change section
- [ ] Click "Change Email"
- [ ] Enter new email: test-change@example.com
- [ ] Enter password for confirmation
- [ ] Submit request
- [ ] **VERIFY**: Success message displayed
- [ ] **VERIFY**: Check database:
  ```sql
  SELECT email, "emailChangePending" FROM "User" WHERE email = 'jfelke@alldigitalrewards.com';
  ```
- [ ] **VERIFY**: emailChangePending contains token

**Token Stored**: ✅ YES / ❌ NO

**Result**: ✅ PASS / ❌ FAIL
**Notes**: ___________________________________

### 6.2 Cancel Email Change
- [ ] Click "Cancel" on email change request
- [ ] **VERIFY**: Request cancelled
- [ ] **VERIFY**: emailChangePending set to null

**Result**: ✅ PASS / ❌ FAIL

### 6.3 Confirm Email Change (if confirmation flow exists)
- [ ] Request new email change
- [ ] Open email confirmation link (if sent)
- [ ] Click confirmation link
- [ ] **VERIFY**: Email updated in database
- [ ] **VERIFY**: emailChangePending cleared
- [ ] **VERIFY**: Can login with new email

**Result**: ✅ PASS / ❌ FAIL / ⊘ N/A (no confirmation flow)

---

## 7. Password Reset Flow

### 7.1 Reset Password
- [ ] Login
- [ ] Navigate to profile → security
- [ ] Click "Reset Password" or "Change Password"
- [ ] Enter current password
- [ ] Enter new password: TestPassword123!
- [ ] Confirm new password
- [ ] Submit
- [ ] **VERIFY**: Success message
- [ ] **VERIFY**: Modal closes or redirects

**Result**: ✅ PASS / ❌ FAIL
**Notes**: ___________________________________

### 7.2 Login with New Password
- [ ] Logout
- [ ] Login with new password: TestPassword123!
- [ ] **VERIFY**: Login successful
- [ ] Change password back to original

**Result**: ✅ PASS / ❌ FAIL

---

## 8. Multi-Tenancy Verification

### 8.1 Tenant Isolation
- [ ] Login as admin in tenant "default"
- [ ] Navigate to /workspaces
- [ ] **VERIFY**: Only see workspaces from "default" tenant
- [ ] Check database:
  ```sql
  SELECT "tenantId", name FROM "Workspace" WHERE published = true;
  ```
- [ ] **VERIFY**: Workspaces shown match user's tenant

**Result**: ✅ PASS / ❌ FAIL

### 8.2 Cross-Tenant Access (should fail)
- [ ] Try to access workspace from different tenant
- [ ] Example: /w/tenant1-workspace/admin/dashboard
- [ ] **VERIFY**: Access denied or redirected
- [ ] **VERIFY**: No data leakage

**Result**: ✅ PASS / ❌ FAIL

---

## 9. Responsive Design

### 9.1 Mobile View (< 768px)
- [ ] Resize browser to 375px width
- [ ] **VERIFY**: Workspaces dashboard responsive
- [ ] **VERIFY**: Challenge cards stack vertically
- [ ] **VERIFY**: Navigation menu accessible
- [ ] **VERIFY**: All buttons clickable

**Result**: ✅ PASS / ❌ FAIL

### 9.2 Tablet View (768px - 1024px)
- [ ] Resize to 768px width
- [ ] **VERIFY**: Layout adapts appropriately
- [ ] **VERIFY**: No horizontal scroll

**Result**: ✅ PASS / ❌ FAIL

---

## 10. Error Handling

### 10.1 Invalid Form Submission
- [ ] Try creating challenge with empty title
- [ ] **VERIFY**: Validation error shown
- [ ] **VERIFY**: Form doesn't submit

**Result**: ✅ PASS / ❌ FAIL

### 10.2 Network Error
- [ ] Open network tab in DevTools
- [ ] Throttle network to "Offline"
- [ ] Try submitting a form
- [ ] **VERIFY**: Appropriate error message
- [ ] **VERIFY**: User notified of network issue

**Result**: ✅ PASS / ❌ FAIL

### 10.3 Unauthorized Access
- [ ] Logout
- [ ] Try accessing /w/alldigitalrewards/admin/dashboard directly
- [ ] **VERIFY**: Redirects to login
- [ ] **VERIFY**: After login, redirects to original destination

**Result**: ✅ PASS / ❌ FAIL

---

## 11. Performance Check

### 11.1 Page Load Times
- [ ] Open DevTools → Network tab
- [ ] Navigate to /workspaces
- [ ] **Record**: Page load time: ______ ms
- [ ] Navigate to /w/alldigitalrewards/admin/dashboard
- [ ] **Record**: Dashboard load time: ______ ms

**Result**: ✅ PASS (< 3s) / ⚠️ SLOW (3-5s) / ❌ FAIL (> 5s)

### 11.2 Console Errors
- [ ] Check console throughout all tests
- [ ] **Record**: Total errors: ______
- [ ] **Record**: Total warnings: ______

**Critical Errors**: ______
**Result**: ✅ PASS (0 errors) / ⚠️ WARNING (< 5 errors) / ❌ FAIL (5+ errors)

---

## Test Summary

**Date Completed**: __________
**Total Tests**: 50+
**Passed**: ______ (✅)
**Failed**: ______ (❌)
**N/A**: ______ (⊘)
**Pass Rate**: ______%

### Critical Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Minor Issues Found
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Recommendations
_______________________________________________
_______________________________________________
_______________________________________________

### Overall Assessment
☐ Ready for Production
☐ Ready for Staging
☐ Needs More Work

**Tester Signature**: _________________ **Date**: _________

---

## Database Verification Queries

Run these queries to verify data integrity:

```sql
-- Reward issuance distribution
SELECT type, status, COUNT(*) FROM "RewardIssuance" GROUP BY type, status;

-- Multi-tenancy check
SELECT "tenantId", COUNT(*) FROM "User" GROUP BY "tenantId";

-- Email change pending
SELECT email, "emailChangePending" IS NOT NULL as has_pending
FROM "User" WHERE "emailChangePending" IS NOT NULL;

-- Challenge reward types
SELECT "rewardType", COUNT(*) FROM "Challenge"
WHERE "rewardType" IS NOT NULL GROUP BY "rewardType";

-- Active enrollments
SELECT status, COUNT(*) FROM "Enrollment" GROUP BY status;
```

---

**Note**: This checklist should take approximately 4-6 hours to complete thoroughly. Document all findings and attach screenshots for any failures.
