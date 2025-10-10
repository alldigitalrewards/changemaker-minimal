# Manual Testing Checklist
## Preview Deployment: https://preview.changemaker.im

**Date**: _____________
**Tester**: _____________
**Browser**: _____________
**Build**: cdd1a70f65acc21399b50c1bf43068107eda8844

---

## Pre-Test Setup
- [ ] Browser DevTools open (F12)
- [ ] Network tab monitoring
- [ ] Console tab visible
- [ ] Supabase dashboard access ready
- [ ] Test credentials ready

---

## Test Suite 1: Authentication 🔐

### TC1: Login Flow
- [ ] Navigate to https://preview.changemaker.im
- [ ] Click "Sign In"
- [ ] Enter: `jfelke@alldigitalrewards.com` / `Changemaker2025!`
- [ ] ✅ Login successful
- [ ] ✅ Redirected to dashboard/workspaces
- [ ] ✅ User name displayed in header
- [ ] No console errors: Y / N
- [ ] Session cookie set: Y / N

**Notes**: ___________________________________________________

---

### TC2: Session Persistence
- [ ] Refresh page (F5)
- [ ] ✅ Still logged in (no redirect)
- [ ] Open new tab → navigate to site
- [ ] ✅ Session active in new tab

**Notes**: ___________________________________________________

---

### TC3: Logout
- [ ] Click user menu/avatar
- [ ] Click "Sign Out"
- [ ] ✅ Redirected to login/home
- [ ] ✅ Session cookie cleared
- [ ] Try accessing: `/w/alldigitalrewards/admin/challenges`
- [ ] ✅ Access denied (redirects to login)

**Notes**: ___________________________________________________

---

## Test Suite 2: Multi-Reward System 🎁

### TC4: Points Reward Challenge
- [ ] Login as admin
- [ ] Navigate to `/w/alldigitalrewards/admin/challenges`
- [ ] Click "Create Challenge"
- [ ] Fill form:
  - Title: `Points Test [2025-10-07-1615]`
  - Description: `Testing points reward`
  - Reward Type: **Points**
  - Points per Activity: `10`
- [ ] ✅ Challenge created successfully
- [ ] ✅ Shows in list with "Points" type
- [ ] ✅ Detail page displays correctly

**Database Check**:
```sql
SELECT id, title, "rewardType", "rewardConfig"
FROM "Challenge" WHERE title = 'Points Test [2025-10-07-1615]';
```
Result: ___________________________________________________

**Notes**: ___________________________________________________

---

### TC5: SKU Reward Challenge
- [ ] Create new challenge
- [ ] Fill form:
  - Title: `SKU Test [2025-10-07-1615]`
  - Reward Type: **SKU**
  - SKU Code: `GIFT-100`
- [ ] ✅ Challenge created
- [ ] ✅ SKU reward displays correctly

**Notes**: ___________________________________________________

---

### TC6: Monetary Reward Challenge
- [ ] Create new challenge
- [ ] Fill form:
  - Title: `Monetary Test [2025-10-07-1615]`
  - Reward Type: **Monetary**
  - Amount: `25.00`
- [ ] ✅ Challenge created
- [ ] ✅ Amount displays as `$25.00`

**Notes**: ___________________________________________________

---

## Test Suite 3: Email Change 📧

### TC7: Email Change Request
- [ ] Navigate to account settings/profile
- [ ] Enter new email: `test-preview-20251007@example.com`
- [ ] Click "Request Email Change"
- [ ] ✅ Success message shown
- [ ] ✅ Current email still original
- [ ] ✅ "Cancel Email Change" button appears

**Database Check**:
```sql
SELECT email, "emailChangePending"
FROM "User" WHERE email = 'jfelke@alldigitalrewards.com';
```
Result: ___________________________________________________

**Notes**: ___________________________________________________

---

### TC8: Email Change Cancel
- [ ] Click "Cancel Email Change"
- [ ] ✅ Success message shown
- [ ] ✅ Pending indicator removed
- [ ] Database check: `emailChangePending` is NULL

**Notes**: ___________________________________________________

---

## Test Suite 4: Password Reset 🔑

### TC9: Password Reset
- [ ] Navigate to profile/security
- [ ] Click "Reset Password"
- [ ] Enter current: `Changemaker2025!`
- [ ] Enter new: `TestPassword123!`
- [ ] Confirm: `TestPassword123!`
- [ ] ✅ Success message
- [ ] Logout
- [ ] Login with new password
- [ ] ✅ Login successful
- [ ] Reset back to: `Changemaker2025!`
- [ ] ✅ Reset successful

**Notes**: ___________________________________________________

---

## Test Suite 5: Workspaces Dashboard 🏢

### TC10: Workspaces Page
- [ ] Navigate to `/workspaces`
- [ ] ✅ Stat cards display:
  - Your Workspaces: _____
  - Total Members: _____
  - Total Challenges: _____
- [ ] ✅ Gradient styling applied
- [ ] ✅ Workspace cards display correctly
- [ ] ✅ "Discover Workspaces" section visible

**Notes**: ___________________________________________________

---

### TC11: Workspace Visibility
- [ ] ✅ See user's workspace memberships
- [ ] ✅ "Discover Workspaces" shows joinable workspaces
- [ ] ✅ Workspace isolation working (only see tenant workspaces)

**Notes**: ___________________________________________________

---

### TC12: Join Workspace Flow
- [ ] Click "Join Workspace" button
- [ ] ✅ Page scrolls to "Discover Workspaces"
- [ ] ✅ Section highlights
- [ ] Click "Join" on a workspace
- [ ] ✅ Successfully joined
- [ ] ✅ Workspace now in "Your Workspaces"

**Notes**: ___________________________________________________

---

## Test Suite 6: Dynamic Reward Display 💰

### TC13: Reward Labels
- [ ] Navigate to participant view
- [ ] View Points challenge
- [ ] ✅ Displays "Points Earned: X"
- [ ] View SKU challenge
- [ ] ✅ Displays "Rewards Issued: X"
- [ ] View Monetary challenge
- [ ] ✅ Displays "Rewards Earned: $X.XX"

**Notes**: ___________________________________________________

---

## Test Suite 7: Participant Journey (E2E) 👤 **CRITICAL PATH**

### TC14: Complete Flow
**Part 1: Participant Actions**
- [ ] Login as: `john.doe@acme.com` / `Changemaker2025!`
- [ ] Navigate to challenges
- [ ] Enroll in a challenge
- [ ] ✅ Enrollment successful
- [ ] Submit activity
- [ ] ✅ Submission created
- [ ] Logout

**Part 2: Admin Approval**
- [ ] Login as: `jfelke@alldigitalrewards.com`
- [ ] Navigate to submissions
- [ ] Find participant's submission
- [ ] Approve submission
- [ ] ✅ Approval successful

**Part 3: Verification**
- [ ] Check participant's reward balance
- [ ] ✅ Reward status updated

**Database Check**:
```sql
SELECT * FROM "RewardIssuance"
WHERE "userId" = [participant-id]
ORDER BY "createdAt" DESC LIMIT 1;
```
Result: ___________________________________________________

**Expected**: Status = `PENDING`, Type matches challenge

**Notes**: ___________________________________________________

---

## Test Suite 8: Multi-Tenancy & Security 🔒 **HIGH PRIORITY**

### TC15: Workspace Isolation
- [ ] Login as user from Workspace A
- [ ] Navigate to: `/w/[workspace-a]/participant/dashboard`
- [ ] Manually change URL to Workspace B slug
- [ ] ✅ Access denied or redirected
- [ ] ✅ Cannot see Workspace B data
- [ ] Logout, login as Workspace B user
- [ ] ✅ Cannot access Workspace A data

**Notes**: ___________________________________________________

---

### TC16: Role-Based Access (RBAC)
- [ ] Login as participant: `john.doe@acme.com`
- [ ] Try to access: `/w/acme/admin/challenges`
- [ ] ✅ Access denied (redirected or 403)
- [ ] ✅ Admin nav items hidden
- [ ] Try to create challenge via DevTools/API
- [ ] ✅ API returns 403 Forbidden

**Notes**: ___________________________________________________

---

## Test Suite 9: Error Handling ⚠️

### TC17: Form Validation
- [ ] Email change: Enter `invalid-email` (no @)
- [ ] ✅ Error: "Invalid email format"
- [ ] Password reset: Enter `short` (< 8 chars)
- [ ] ✅ Error: "Password must be at least 8 characters"
- [ ] Challenge creation: Leave title empty
- [ ] ✅ Error: "Title is required"

**Notes**: ___________________________________________________

---

### TC18: Network Error Handling
- [ ] Open DevTools → Network tab
- [ ] Set throttling to "Offline"
- [ ] Try to submit a form
- [ ] ✅ User-friendly error message shown
- [ ] ✅ Form data preserved
- [ ] Restore network
- [ ] ✅ Retry successful

**Notes**: ___________________________________________________

---

## Database Verification Queries

Execute `preview-deployment-db-verification.sql` in Supabase:

- [ ] Query 1: Recent Reward Issuances - **Result**: __________
- [ ] Query 2: Test Challenges Created - **Result**: __________
- [ ] Query 3: Tenant Distribution - **Result**: __________
- [ ] Query 4: Email Change Pending - **Result**: __________
- [ ] Query 5: Test User Accounts - **Result**: __________
- [ ] Query 6: Recent Enrollments - **Result**: __________

**Overall Database Status**: ✅ PASS / ❌ FAIL

**Notes**: ___________________________________________________

---

## Critical Issues Found

### Issue 1
**Severity**: Critical / High / Medium / Low
**Description**: ___________________________________________________
**Steps to Reproduce**: ___________________________________________________
**Expected**: ___________________________________________________
**Actual**: ___________________________________________________
**Screenshot**: ___________________________________________________

---

### Issue 2
**Severity**: Critical / High / Medium / Low
**Description**: ___________________________________________________
**Steps to Reproduce**: ___________________________________________________
**Expected**: ___________________________________________________
**Actual**: ___________________________________________________
**Screenshot**: ___________________________________________________

---

## Summary

**Total Test Cases**: 18
**Passed**: _____
**Failed**: _____
**Blocked**: _____
**Pass Rate**: _____%

**Critical Path (TC14)**: ✅ PASS / ❌ FAIL
**Security (TC15, TC16)**: ✅ PASS / ❌ FAIL

---

## Final Decision

**Production Readiness**: ✅ GO / ⚠️ GO WITH ISSUES / ❌ NO-GO

**Blocker Issues**: _____

**Recommendations**: ___________________________________________________

**Next Steps**: ___________________________________________________

---

**Tester Signature**: _____________
**Date Completed**: _____________
**Time Spent**: _____ hours

---

**Reviewed By**: _____________
**Approval**: ✅ APPROVED / ❌ REJECTED / 🔄 NEEDS REVISION
