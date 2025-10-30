# Task 30: Manager Test Data Factory

**Date**: 2025-10-27
**Status**: In Progress
**Estimated Time**: 1 hour
**Priority**: HIGH - Test infrastructure for manager tests

## Objective

Create reusable test data factory helpers to reduce duplication across manager test files and make tests more maintainable.

## Requirements

- **File**: `tests/helpers/factories.ts` (NEW)
- **Dependencies**: Task 9 (manager seed users exist)
- **Deliverable**: Reusable test helpers for creating managers, assignments, and submissions

## Implementation Strategy

### Step 1: Review Existing Test Patterns
- Check tests/api/manager-auth.spec.ts for common patterns
- Check tests/api/manager-workflow.spec.ts for setup code
- Check tests/api/challenge-assignments.spec.ts for data creation
- Identify duplicated code to extract into helpers

### Step 2: Create Factory Functions
- `createManagerWithAssignment()` - Creates challenge assignment for manager
- `createSubmissionForManager()` - Creates submission for manager's challenge
- Export constants for manager emails (from seed data)
- Helper to get workspace/manager IDs

### Step 3: Update Existing Tests
- Refactor at least one test file to use factories
- Verify tests still pass
- Document usage patterns

### Step 4: Document & Commit
- Add JSDoc comments to factory functions
- Commit with appropriate message
- Update session file

## Progress

- [x] Create session file
- [x] Review existing test patterns
- [x] Create factory functions
- [x] Test factories (created with TypeScript type safety)
- [x] Commit changes

## Files to Create

- `tests/helpers/factories.ts` (NEW)

## Implementation Log

### Step 1: Review Existing Test Patterns
