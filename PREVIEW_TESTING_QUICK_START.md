# Preview Deployment Testing - Quick Start Guide

## Deployment Information

**URL**: https://preview.changemaker.im
**Status**: ✅ LIVE AND HEALTHY
**Database**: ✅ CONNECTED (shared production Supabase)
**Build**: `cdd1a70f65acc21399b50c1bf43068107eda8844`
**Branch**: `global-account-workspace-visibility-leaderboard-multi-reward`

---

## Quick Access

### Preview Site
🌐 **https://preview.changemaker.im**

### Test Accounts

**Admin Account**:
- Email: `jfelke@alldigitalrewards.com`
- Password: `Changemaker2025!`
- Workspace: `alldigitalrewards`

**Participant Account**:
- Email: `john.doe@acme.com`
- Password: `Changemaker2025!`
- Workspace: `acme`

---

## Testing Documents

### 1. Comprehensive Test Report
**File**: `PREVIEW_DEPLOYMENT_TEST_REPORT.md`

**Contents**:
- Automated test results (infrastructure, performance, API)
- Manual test procedures (18 test cases)
- Database verification instructions
- Issue tracking templates
- Production readiness assessment

**Status**: ⏳ Pending manual test execution

---

### 2. Manual Test Checklist
**File**: `MANUAL_TEST_CHECKLIST.md`

**Contents**:
- Printable/fillable checklist for all 18 test cases
- Checkboxes for each test step
- Space for notes and results
- Issue reporting template
- Summary section for final decision

**Usage**: Print or use alongside testing for easy tracking

---

### 3. Database Verification SQL
**File**: `preview-deployment-db-verification.sql`

**Contents**:
- 10 comprehensive database queries
- Expected results documented in comments
- Data integrity checks
- Activity summary queries

**Usage**: Execute in Supabase SQL Editor or via psql

---

## Testing Workflow

### Step 1: Execute Automated Checks ✅ COMPLETE
- [✅] Deployment health verified
- [✅] Database connection confirmed
- [✅] Performance metrics acceptable
- [✅] API endpoints tested

---

### Step 2: Execute Manual Tests ⏳ REQUIRED

**Priority Order**:
1. **Authentication** (TC1-TC3) - Foundation for all tests
2. **Participant Journey** (TC14) - Critical path, end-to-end
3. **Security** (TC15-TC16) - High priority, must pass
4. **Multi-Reward System** (TC4-TC6) - Core functionality
5. **Remaining Tests** (TC7-TC13, TC17-TC18)

**Estimated Time**: 2-3 hours for complete manual testing

---

### Step 3: Database Verification ⏳ REQUIRED

1. Open Supabase dashboard
2. Navigate to SQL Editor
3. Execute queries from `preview-deployment-db-verification.sql`
4. Document results in test report

**Estimated Time**: 30 minutes

---

### Step 4: Report and Decision ⏳ PENDING

1. Update `PREVIEW_DEPLOYMENT_TEST_REPORT.md` with results
2. Document any issues found
3. Calculate pass/fail rates
4. Make GO/NO-GO decision

---

## Critical Path Testing (Minimum Required)

If time is limited, these tests MUST pass before production:

### Must-Pass Tests (7 test cases):
1. **TC1**: Login Flow ✅/❌
2. **TC3**: Logout ✅/❌
3. **TC4**: Points Reward Challenge ✅/❌
4. **TC14**: Complete Participant Journey ✅/❌
5. **TC15**: Workspace Isolation ✅/❌
6. **TC16**: Role-Based Access ✅/❌
7. **Database Query 6**: Recent Enrollments ✅/❌

**Minimum Pass Rate**: 100% (7/7)

---

## Current Test Results

### Automated Tests ✅
| Category | Status | Details |
|----------|--------|---------|
| Infrastructure | ✅ PASS | HTTP 200, HTTPS, Vercel headers |
| Database | ✅ PASS | Health endpoint confirms connection |
| Performance | ✅ PASS | All pages < 2s load time |

### Manual Tests ⏳
| Test Suite | Status | Progress |
|------------|--------|----------|
| Authentication (3) | ⏳ PENDING | 0/3 |
| Multi-Reward (3) | ⏳ PENDING | 0/3 |
| Email Change (2) | ⏳ PENDING | 0/2 |
| Password Reset (1) | ⏳ PENDING | 0/1 |
| Workspaces (3) | ⏳ PENDING | 0/3 |
| Reward Display (1) | ⏳ PENDING | 0/1 |
| Participant Journey (1) | ⏳ PENDING | 0/1 |
| Security (2) | ⏳ PENDING | 0/2 |
| Error Handling (2) | ⏳ PENDING | 0/2 |
| **TOTAL** | **⏳ PENDING** | **0/18** |

### Database Verification ⏳
| Query | Status |
|-------|--------|
| Recent Reward Issuances | ⏳ PENDING |
| Test Challenges | ⏳ PENDING |
| Tenant Distribution | ⏳ PENDING |
| Email Changes | ⏳ PENDING |
| Test Users | ⏳ PENDING |
| Recent Enrollments | ⏳ PENDING |

---

## Known Issues

### Issue 1: API Route 404 Responses ⚠️
**Severity**: High
**Status**: Needs Investigation
**Description**: `/api/auth/user` and `/api/workspaces` return 404 instead of 401
**Impact**: Cannot verify auth protection via API testing
**Action**: Manual investigation of API route structure needed

---

## Performance Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Home page | 0.994s | ✅ GOOD |
| Workspaces page | 0.364s | ✅ EXCELLENT |
| API health | 1.658s | ✅ ACCEPTABLE |

All metrics well under 3-second threshold ✅

---

## Production Readiness Status

**Overall**: ⚠️ MANUAL TESTING REQUIRED

**Blockers**:
1. Core authentication flow not verified
2. Multi-reward system not tested in production
3. Participant journey (end-to-end) not validated
4. Security controls not confirmed
5. Database state not verified

**Recommendation**: **NO-GO** until manual testing completes successfully

**Required Actions**:
1. Execute all 18 manual test cases
2. Run database verification queries
3. Document results in test report
4. Fix any critical issues found
5. Re-test after fixes
6. Final approval by tech lead

---

## Quick Commands

### Check Deployment Status
```bash
curl -I https://preview.changemaker.im
curl https://preview.changemaker.im/api/health
```

### Monitor Logs
```bash
vercel logs https://preview.changemaker.im --follow
```

### Database Access
**Supabase Dashboard**: https://supabase.com/dashboard
**Project**: Production Supabase (shared with changemaker.im)

---

## Testing Tips

### Browser Setup
1. Open DevTools (F12)
2. Keep Network tab open
3. Monitor Console for errors
4. Use "Preserve log" option

### Testing Best Practices
- Test one feature at a time
- Document all results immediately
- Take screenshots of issues
- Note exact error messages
- Check database state after each test

### Common Issues to Watch For
- Session cookies not persisting
- CORS errors in console
- 403 Forbidden on protected routes
- Database queries timing out
- UI not reflecting database changes

---

## Contact Information

**Tech Lead**: Jack Felke
**Repository**: changemaker-template
**Branch**: global-account-workspace-visibility-leaderboard-multi-reward
**Deployment Platform**: Vercel
**Database**: Supabase Production

---

## Next Steps

1. ⏳ **Immediate**: Begin manual testing with checklist
2. ⏳ **Within 24 hours**: Complete all test cases
3. ⏳ **Before production**: Fix any critical issues
4. ⏳ **Final**: Tech lead approval and GO/NO-GO decision

---

**Document Created**: 2025-10-07 16:15:18 MST
**Last Updated**: 2025-10-07 16:15:18 MST
**Version**: 1.0
