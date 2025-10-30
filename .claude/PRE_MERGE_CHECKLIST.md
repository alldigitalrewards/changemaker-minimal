# Pre-Merge Checklist: Manager Role Phase 2 + RLS

**Branch**: `feature/manager-role-phase2-api`
**Target**: `main` → `staging`
**Date Prepared**: 2025-10-27
**Status**: 🔄 In Progress

---

## Overview

This checklist ensures the Manager Role Phase 2 branch (with Row-Level Security policies) is ready for merge to staging without breaking existing functionality.

**Key Changes**:
- Manager role API endpoints (Tasks 16-30)
- Two-step approval workflow (PENDING → MANAGER_APPROVED → APPROVED)
- ChallengeAssignment model for manager-to-challenge assignments
- Row-Level Security (RLS) policies for database-level authorization
- 36 RLS policies across 16 database models
- Performance optimization with composite indexes

**Risk Level**: 🔴 HIGH - Database-level security changes with potential breaking impact

---

## ✅ Completed Tasks

### Phase 2A: Manager Role Core (Tasks 16-30)

- [x] **Task 16**: Manager Role Foundation (API structure, types)
- [x] **Task 17**: ChallengeAssignment Model & Migration
- [x] **Task 18**: Manager Assignment Endpoints (CRUD operations)
- [x] **Task 19**: Manager Queue Endpoint (assigned submissions)
- [x] **Task 20**: Manager Review Endpoint (approval/rejection)
- [x] **Task 21**: Admin Override Endpoint
- [x] **Task 22**: Manager Dashboard Data Endpoint
- [x] **Task 23**: ActivitySubmission Two-Step Status
- [x] **Task 24**: Manager Email Notifications
- [x] **Task 25**: Manager Middleware & Auth Guards
- [x] **Task 26**: Manager Integration Tests
- [x] **Task 27**: Manager UI Components (Placeholder)
- [x] **Task 28**: Manager Documentation
- [x] **Task 29**: Manager Deployment & Monitoring
- [x] **Task 30.1**: RLS Policy Design & Planning
- [x] **Task 30.2**: Core RLS Policies (Workspace Isolation)
- [x] **Task 30.3**: Manager RLS Policies (Assignment-Based Access)
- [x] **Task 30.5**: RLS Performance Optimization Documentation

### RLS Implementation Complete

✅ **36 RLS Policies Implemented**:
- 30 core workspace isolation policies (Task 30.2)
- 6 manager assignment-based access policies (Task 30.3)
- All policies enforce workspace isolation at database level
- Manager can ONLY access assigned challenge data
- Database prevents unauthorized access even if middleware fails

---

## ✅ Recently Completed

### Task 30.4: RLS Testing & Verification

**Status**: ✅ COMPLETE (2025-10-28)

**Completed**:
- ✅ Test suite structure created (800+ lines, 22 test cases)
- ✅ All schema field corrections completed (8 fixes)
- ✅ Test fixtures designed and implemented
- ✅ Supabase test client helper created with auth contexts
- ✅ JWT token generation for admin/manager/participant roles
- ✅ beforeAll fixture setup refactored to create Supabase users
- ✅ All test cases updated to use Supabase client with auth
- ✅ All 22 RLS security tests passing (100% success rate)
- ✅ Diagnostic logging removed, code cleaned
- ✅ Session documentation complete

**Test Results**:
- ✅ Workspace Isolation (3/3 tests passing)
- ✅ Manager Assignment-Based Access (5/5 tests passing)
- ✅ Role-Based Access Control (5/5 tests passing)
- ✅ ActivitySubmission Multi-Role Policy (3/3 tests passing)
- ✅ Service Role Bypass (1/1 test passing)
- ✅ Edge Cases (3/3 tests passing)
- ✅ Performance Verification (2/2 tests passing)

**Execution Time**: 12.9 seconds
**Success Rate**: 100% (22/22 tests passing)

---

## 📋 Pre-Merge Tasks (Task 30.6)

### 1. Complete Task 30.4 (RLS Testing)

- [x] Refactor tests to use Supabase client
- [x] Verify all 22 RLS security tests pass
- [x] Document test results in session file
- [x] Mark Task 30.4 complete

### 2. API Verification with RLS Enabled

- [ ] Test all Phase 2 API endpoints:
  - [ ] `/api/v1/manager/assignments` (GET, POST)
  - [ ] `/api/v1/manager/queue` (GET)
  - [ ] `/api/v1/manager/submissions/:id/review` (POST)
  - [ ] `/api/v1/admin/submissions/:id/override` (POST)
  - [ ] `/api/v1/manager/dashboard` (GET)
- [ ] Verify workspace isolation works correctly
- [ ] Verify manager can only see assigned challenges
- [ ] Verify admin override permissions work
- [ ] Test cross-workspace access prevention

### 3. Full Test Suite Execution

- [ ] Run unit tests: `pnpm test`
- [ ] Run integration tests: `pnpm test:integration`
- [ ] Run RLS security tests: `pnpm test tests/security/rls-policies.spec.ts`
- [ ] Verify all tests pass (0 failures)
- [ ] Check test coverage >90%

### 4. End-to-End Manager Workflow Testing

- [ ] Admin creates challenge in workspace
- [ ] Admin assigns manager to challenge
- [ ] Participant submits activity
- [ ] Manager sees submission in queue
- [ ] Manager approves submission (PENDING → MANAGER_APPROVED)
- [ ] Admin sees submission in queue
- [ ] Admin approves submission (MANAGER_APPROVED → APPROVED)
- [ ] Verify points awarded correctly
- [ ] Test manager cannot see unassigned challenges
- [ ] Test cross-workspace isolation

### 5. Performance Verification

- [ ] Manager queue loads <2 seconds with RLS enabled
- [ ] Test with 100+ submissions
- [ ] Verify RLS indexes are used (EXPLAIN ANALYZE)
- [ ] Check query performance metrics
- [ ] Verify no N+1 query issues

### 6. Breaking Changes Check

- [ ] Verify Phase 1 functionality still works:
  - [ ] Challenge creation/management
  - [ ] Participant enrollment
  - [ ] Activity submissions (participants)
  - [ ] Admin approval workflow
  - [ ] Points system
  - [ ] Reward issuance
- [ ] Verify no API contract changes
- [ ] Verify database migrations are reversible
- [ ] Test rollback procedure

### 7. Documentation Review

- [ ] Review all session files for completeness:
  - [ ] `.claude/sessions/session-20251027-task-30.1-rls-design.md`
  - [ ] `.claude/sessions/session-20251027-task-30.2-rls-core.md`
  - [ ] `.claude/sessions/session-20251027-task-30.3-rls-manager.md`
  - [ ] `.claude/sessions/session-20251027-task-30.4-rls-testing.md`
  - [ ] All Task 16-30 session files
- [ ] Verify PROGRESS.md is up-to-date
- [ ] Check API documentation is current
- [ ] Review RLS policy documentation

### 8. Security Verification

- [ ] No SQL injection vulnerabilities
- [ ] No unauthorized data access possible
- [ ] Manager assignment checks enforced
- [ ] Workspace isolation verified
- [ ] Service role properly scoped
- [ ] No sensitive data leaks in logs

### 9. Staging Deployment Preparation

- [ ] Environment variables documented
- [ ] Database migration plan ready
- [ ] Rollback procedure documented
- [ ] Monitoring alerts configured
- [ ] Performance baselines established

### 10. Final Checklist

- [ ] All Gate 2 criteria met
- [ ] Zero critical bugs
- [ ] Zero security vulnerabilities
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Team review conducted

---

## 🚦 Gate 2 Criteria

**Must ALL be ✅ before merge**:

- [ ] Manager can review assigned submissions end-to-end
- [ ] Two-step approval workflow working (PENDING → MANAGER_APPROVED → APPROVED)
- [ ] Authorization tests passing (100% coverage)
- [ ] Manager queue loads <2 seconds with 100 submissions (with RLS)
- [ ] RLS policies implemented and verified (Tasks 30.1-30.4 complete)
- [ ] RLS security tests passing (Task 30.4 - 22 test cases)
- [ ] Pre-merge verification complete (Task 30.6)
- [ ] Zero critical security issues
- [ ] No breaking changes to Phase 1 functionality

---

## 📊 Migration Impact Assessment

### Database Changes

**New Tables**:
- `ChallengeAssignment` (manager-to-challenge assignments)

**Schema Changes**:
- `ActivitySubmission.status` enum updated (added MANAGER_APPROVED)
- `ActivitySubmission.managerReviewedBy` (new field)
- `ActivitySubmission.managerReviewedAt` (new field)
- `ActivitySubmission.managerNotes` (new field)

**RLS Changes**:
- 36 new RLS policies added
- All tables now have RLS enabled
- Workspace isolation enforced at database level
- Manager assignment-based access enforced

### API Changes

**New Endpoints**:
- `/api/v1/manager/assignments` (GET, POST, DELETE)
- `/api/v1/manager/queue` (GET)
- `/api/v1/manager/submissions/:id/review` (POST)
- `/api/v1/admin/submissions/:id/override` (POST)
- `/api/v1/manager/dashboard` (GET)

**Breaking Changes**: NONE (all additive)

### Performance Impact

**Expected**:
- RLS adds ~10-50ms per query (mitigated with indexes)
- Manager queue optimized with composite indexes
- Target: <2 second page loads maintained

**Monitoring Required**:
- Query performance metrics
- RLS policy evaluation times
- Index usage statistics

---

## 🔄 Rollback Plan

### If Issues Found After Merge

1. **Immediate Rollback** (if critical):
   ```bash
   git revert [merge-commit-hash]
   git push origin main
   vercel deploy --prod
   ```

2. **Database Rollback** (if RLS causes issues):
   ```sql
   -- Disable RLS on all tables
   ALTER TABLE "ActivitySubmission" DISABLE ROW LEVEL SECURITY;
   -- (repeat for all 16 models)
   ```

3. **Partial Rollback** (keep manager features, disable RLS):
   - Environment variable: `FEATURE_RLS_ENABLED=false`
   - Redeploy without RLS

### Rollback Testing

- [ ] Test rollback procedure in staging
- [ ] Verify data integrity after rollback
- [ ] Document rollback steps
- [ ] Ensure team knows rollback process

---

## 📝 Next Steps

1. **Complete Task 30.4**:
   - Refactor RLS tests to use Supabase client
   - Verify all 22 tests pass
   - Document results

2. **Execute Task 30.6**:
   - Run pre-merge verification checklist
   - Test all functionality with RLS enabled
   - Verify performance targets met

3. **Create Merge PR**:
   - Comprehensive description with all changes
   - Link to all session files
   - Include test results
   - Request team review

4. **Post-Merge**:
   - Monitor staging for 24 hours
   - Run smoke tests
   - Check performance metrics
   - Verify no breaking changes

---

**Last Updated**: 2025-10-27
**Updated By**: Claude Code
**Status**: Ready for Task 30.4 completion
