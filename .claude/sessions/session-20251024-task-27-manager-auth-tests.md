# Task 27: Authorization Tests - Manager Endpoints

**Date**: 2025-10-24
**Status**: In Progress
**Estimated Time**: 4 hours
**Priority**: CRITICAL - Authorization testing

## Objective

Create comprehensive authorization tests for manager endpoints to ensure proper access control and prevent security vulnerabilities.

## Requirements

- **File**: `tests/api/manager-auth.spec.ts` (NEW)
- **Dependencies**: Tasks 18 (Manager Queue API), 19 (Manager Review API)
- **Test Coverage**:
  - Manager can only see submissions for assigned challenges
  - Manager cannot review submissions for unassigned challenges (403)
  - PARTICIPANT cannot access manager queue endpoint (403)
  - ADMIN can access all manager endpoints
  - Cross-workspace assignment attempts fail
  - Additional edge cases (deleted assignments, inactive users)

## Implementation Strategy

### Step 1: Review Existing Test Patterns
- Check existing API tests structure (e.g., participants.spec.ts, challenge-crud.spec.ts)
- Identify authentication helpers and test fixtures
- Understand workspace isolation test patterns

### Step 2: Create Test File Structure
- Set up Playwright test file
- Import necessary helpers and types
- Define test data (workspaces, users, challenges, assignments)

### Step 3: Implement Test Cases
1. Manager can only see assigned challenge submissions
2. Manager blocked from unassigned challenge submissions (403)
3. PARTICIPANT role blocked from manager endpoints (403)
4. ADMIN has full access to manager endpoints
5. Cross-workspace assignment validation
6. Edge case: deleted assignment
7. Edge case: inactive/suspended manager

### Step 4: Run Tests & Verify
- Run test suite
- Fix any failing tests
- Ensure proper cleanup between tests

## Progress

- [x] Create session file
- [x] Review existing test patterns
- [x] Set up test file structure
- [x] Implement authorization test cases
- [x] Run tests and verify passing (requires dev server)
- [x] Commit changes

## Files to Create

- `tests/api/manager-auth.spec.ts` (NEW)

## Implementation Log

### Step 1: Review Existing Test Patterns
