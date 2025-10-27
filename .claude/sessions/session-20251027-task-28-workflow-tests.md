# Task 28: Approval Workflow Tests

**Date**: 2025-10-27
**Status**: In Progress
**Estimated Time**: 4 hours
**Priority**: HIGH - Testing two-step approval workflow

## Objective

Create comprehensive tests for the two-step approval workflow to ensure state transitions work correctly and edge cases are handled.

## Requirements

- **File**: `tests/api/manager-workflow.spec.ts` (NEW)
- **Dependencies**: Tasks 19 (Manager Review API), 20 (Approval Notify API)
- **Test Coverage**:
  - Manager review updates status to MANAGER_APPROVED
  - MANAGER_APPROVED submission ready for final approval
  - Final approval updates status to APPROVED and awards points
  - Rejection by manager updates status to REJECTED
  - Rejection by admin from MANAGER_APPROVED updates status to REJECTED
  - Cannot final-approve a submission that's not MANAGER_APPROVED
  - Points only awarded once on final approval
  - Additional edge cases (status transitions, point calculation)

## Implementation Strategy

### Step 1: Review Existing Workflow
- Review Tasks 19 and 20 API implementations
- Check status enum values in Prisma schema
- Understand point calculation logic
- Review existing workflow test patterns

### Step 2: Create Test File Structure
- Set up Playwright test file
- Import necessary helpers and types
- Define test data (challenges, activities, submissions)
- Set up beforeAll/afterAll hooks

### Step 3: Implement Test Cases
1. Manager review approval flow (PENDING → MANAGER_APPROVED)
2. Final admin approval flow (MANAGER_APPROVED → APPROVED + points)
3. Manager rejection flow (PENDING → REJECTED)
4. Admin rejection from manager-approved (MANAGER_APPROVED → REJECTED)
5. Invalid state transitions (e.g., final approve PENDING)
6. Point calculation validation
7. Duplicate approval attempts
8. Edge cases (deleted challenge, inactive user)

### Step 4: Run Tests & Verify
- Run test suite
- Fix any failing tests
- Verify proper state transitions
- Ensure cleanup between tests

## Progress

- [x] Create session file
- [ ] Review workflow implementation
- [ ] Set up test file structure
- [ ] Implement workflow test cases
- [ ] Run tests and verify passing
- [ ] Commit changes

## Files to Create

- `tests/api/manager-workflow.spec.ts` (NEW)

## Implementation Log

### Step 1: Review Workflow Implementation
