# Test Suite Runner Skill

## Description

Execute and analyze Playwright tests for the Changemaker application with proper configuration, intelligent test selection, and detailed failure analysis. Automatically handles test execution, interprets results, and provides actionable feedback for fixing failures.

**When to use this skill:**
- User says: "run tests", "check tests", "validate changes", "test the API", "run playwright", "verify functionality"
- After implementing new features
- After making database schema changes
- Before committing code changes
- When debugging test failures
- During code review or validation

## Instructions

### Core Principles

1. **Run tests strategically** - Don't always run the full suite; select relevant tests based on changes
2. **Analyze failures systematically** - Understand why tests fail, not just that they fail
3. **Verify test environment** - Ensure database is in correct state before running tests
4. **Interpret results clearly** - Provide actionable feedback, not just raw output
5. **Track test coverage** - Note which areas lack tests when implementing new features

### Standard Workflow

#### 1. Pre-Test Checks

Before running tests, verify:

```bash
# 1. Check TypeScript compilation
npx tsc --noEmit

# 2. Ensure Prisma client is up to date
npx prisma generate

# 3. Verify environment variables (if needed)
# Check .env.local or .env.test exists with required vars
```

If TypeScript errors exist, fix them before running tests.

#### 2. Test Selection Strategy

Choose the appropriate test scope:

**Full Suite** (use sparingly, takes ~2-5 minutes):
```bash
npx playwright test --reporter=list
```

**Specific Test File** (recommended for focused work):
```bash
npx playwright test tests/api/challenge-crud.spec.ts --reporter=list
```

**Specific Test Case** (fastest, for debugging):
```bash
npx playwright test tests/api/challenge-crud.spec.ts:353 --reporter=list
```

**By Test Name Pattern** (useful for related tests):
```bash
npx playwright test -g "create challenge" --reporter=list
```

**By Directory** (for feature area):
```bash
npx playwright test tests/api/ --reporter=list
npx playwright test tests/security/ --reporter=list
```

#### 3. Test Execution

Execute tests with appropriate timeout and reporter:

```bash
# Standard execution (2 minute timeout)
timeout 120 npx playwright test [test-path] --reporter=list

# Extended timeout for slow tests (5 minutes)
timeout 300 npx playwright test [test-path] --reporter=list

# JSON output for parsing
npx playwright test [test-path] --reporter=json > test-results.json

# Verbose output for debugging
npx playwright test [test-path] --reporter=line --debug
```

**Reporter Options:**
- `--reporter=list` - Detailed list of tests (default, most useful)
- `--reporter=line` - One line per test (concise)
- `--reporter=dot` - Minimal dots (least verbose)
- `--reporter=json` - Machine-readable JSON output

#### 4. Result Analysis

After test execution, analyze results:

**Parse Output:**
```
✓ test-name (123ms)
✗ test-name (456ms)
  Error: Expected 200, received 401
    at apiRoute.test.ts:45:23
```

**Categorize Failures:**
1. **Authentication failures** (401, 403) - Check auth setup, Supabase connection
2. **Database errors** (500, unique constraint) - Check schema, RLS policies
3. **Assertion failures** - Check test expectations vs. actual implementation
4. **Timeout errors** - Increase timeout or investigate slow queries
5. **Setup/teardown failures** - Check test fixture creation/cleanup

**Extract Key Information:**
- Which tests passed/failed
- Error messages and stack traces
- Affected API routes or features
- Common patterns in failures (e.g., all auth tests failing)

#### 5. Failure Investigation

When tests fail, investigate systematically:

1. **Read the test file** to understand what it's testing:
```bash
# Use Read tool on the test file
tests/api/challenge-crud.spec.ts
```

2. **Check the implementation** being tested:
```bash
# Read the API route or component
app/api/w/[slug]/challenges/route.ts
```

3. **Verify test fixtures** are correct:
```bash
# Check fixture setup
tests/fixtures/test-data.ts
tests/helpers/auth-context.ts
```

4. **Run isolated test** with debug output:
```bash
npx playwright test [specific-test] --reporter=line --debug
```

5. **Check recent changes** that might have broken tests:
```bash
git diff HEAD~1 -- [relevant-files]
```

### Common Test Scenarios

#### Scenario 1: After Schema Change

```bash
# 1. Regenerate Prisma client
npx prisma generate

# 2. Run database-related tests
npx playwright test tests/api/ --reporter=list

# 3. If failures, check:
#    - Field names match schema
#    - Queries include new required fields
#    - Test fixtures include new fields
```

#### Scenario 2: After API Route Changes

```bash
# 1. Run affected API tests
npx playwright test tests/api/[resource].spec.ts --reporter=list

# 2. If failures, verify:
#    - Request/response formats match
#    - Status codes are correct
#    - Error handling works
```

#### Scenario 3: After Authentication Changes

```bash
# 1. Run auth-related tests
npx playwright test -g "auth" --reporter=list

# 2. Check test helpers
tests/utils/supabase-auth-test.ts
tests/helpers/auth-context.ts

# 3. Verify Supabase configuration
# Check .env.local has correct SUPABASE_* vars
```

#### Scenario 4: RLS Policy Validation

```bash
# 1. Run security tests
npx playwright test tests/security/ --reporter=list

# 2. Run RLS-specific tests
npx playwright test tests/security/rls-*.spec.ts --reporter=list

# 3. If failures, check policies in database
psql "$DATABASE_URL" -c "\d+ \"TableName\""
```

#### Scenario 5: Full Pre-Commit Validation

```bash
# 1. TypeScript check
npx tsc --noEmit

# 2. Run all API tests
timeout 180 npx playwright test tests/api/ --reporter=list

# 3. Run security tests
timeout 120 npx playwright test tests/security/ --reporter=list

# 4. Check for flaky tests (run twice)
npx playwright test --reporter=list --retries=1
```

### Test File Organization

**Understand the test structure:**

```
tests/
├── api/                           # API route tests
│   ├── challenge-crud.spec.ts    # Challenge CRUD operations
│   ├── enrollment.spec.ts        # Enrollment operations
│   ├── manager-auth.spec.ts      # Manager role tests
│   └── participants.spec.ts      # Participant operations
├── security/                      # Security & RLS tests
│   ├── rls-fixture-test.spec.ts  # RLS policy validation
│   └── test-auth-creation.spec.ts # Auth setup tests
├── fixtures/                      # Test data
│   ├── test-data.ts              # Fixture definitions
│   └── rls-test-data.ts          # RLS-specific fixtures
├── helpers/                       # Test utilities
│   ├── auth-context.ts           # Auth helpers
│   └── supabase-client.ts        # Supabase test client
└── utils/                         # Utility functions
    └── supabase-auth-test.ts     # Auth testing utilities
```

### Error Pattern Recognition

**Common Error Patterns:**

1. **"Error: Timed out 30000ms waiting for expect(received).toBe(expected)"**
   - Test timeout - increase with `timeout` prefix
   - Slow query - optimize database query or add indexes
   - API not responding - check server is running

2. **"Error: expect(received).toBe(expected) - Expected: 200, Received: 401"**
   - Authentication failure
   - Check: Test auth setup, Supabase connection, session handling
   - Fix: Verify auth helpers in tests/helpers/auth-context.ts

3. **"Error: Unique constraint failed on the fields: (slug)"**
   - Test data collision
   - Check: Fixture cleanup between tests
   - Fix: Use unique values in test data (timestamps, UUIDs)

4. **"Error: Foreign key constraint failed"**
   - Missing related records
   - Check: Test fixture creation order
   - Fix: Ensure parent records created before children

5. **"Error: RLS policy blocks query"**
   - Service role not being used
   - Check: API route uses correct Supabase client
   - Fix: Use service role client for server operations

6. **"Error: Cannot read properties of undefined (reading 'id')"**
   - Missing data in response
   - Check: API response structure matches test expectations
   - Fix: Update test assertions or fix API response

### Reporting Test Results

**Format test results for user:**

```markdown
## Test Results: [Feature/Area]

**Summary:** X/Y tests passed (Z failures)

**Passed Tests:**
- ✓ Test description 1
- ✓ Test description 2

**Failed Tests:**
- ✗ Test description (Line X)
  - Error: [error message]
  - Likely cause: [analysis]
  - Suggested fix: [action]

**Next Steps:**
1. [Specific action to fix failure 1]
2. [Specific action to fix failure 2]
```

### Integration with Development Workflow

**With Database Schema Migration Skill:**
```bash
# After schema changes
1. Database Migration Skill runs
2. Test Suite Runner validates changes
3. Report any breaking changes detected
```

**With Task Master:**
```bash
# Before marking task complete
task-master update-subtask --id=X.X --prompt="Tests run: [results]. Failures: [none/details]"
```

**With Git Workflow:**
```bash
# Pre-commit hook workflow
1. Run affected tests
2. Block commit if critical tests fail
3. Allow commit with warnings for non-critical failures
```

### Test Environment Management

**Local Testing:**
```bash
# Uses local Supabase
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
```

**Staging Testing:**
```bash
# Test against staging database
DATABASE_URL="<staging-url>"
# Be careful - tests may affect staging data
```

**Production Testing:**
```bash
# NEVER run tests against production
# Tests create/delete data - will corrupt production
```

### Performance Optimization

**Speed up test execution:**

1. **Run tests in parallel** (Playwright default):
```bash
npx playwright test --workers=4
```

2. **Skip slow tests during development:**
```bash
npx playwright test --grep-invert "@slow"
```

3. **Use focused tests:**
```bash
# Only run changed tests
npx playwright test --only-changed
```

4. **Cache test results:**
```bash
# Skip passed tests if code unchanged
npx playwright test --cache
```

### Debugging Failed Tests

**Step-by-step debugging:**

1. **Isolate the failure:**
```bash
npx playwright test tests/api/file.spec.ts:123 --reporter=line
```

2. **Add console logging:**
```typescript
console.log('Response:', response.status, await response.json());
```

3. **Check database state:**
```bash
psql "$DATABASE_URL" -c "SELECT * FROM \"Challenge\" WHERE id='...';"
```

4. **Inspect network requests:**
```bash
npx playwright test --debug  # Opens browser with dev tools
```

5. **Verify test assumptions:**
- Check fixture data is created
- Verify auth tokens are valid
- Confirm API route exists

### Best Practices

1. **Always specify reporter** - Use `--reporter=list` for readable output
2. **Use timeouts** - Prefix with `timeout 120` to prevent hanging
3. **Run focused tests first** - Test specific changes before full suite
4. **Check TypeScript first** - Fix compilation errors before running tests
5. **Read test failures carefully** - Error messages usually indicate the issue
6. **Update tests with code** - Keep tests in sync with implementation changes
7. **Don't ignore flaky tests** - Fix root cause, don't just retry
8. **Test locally before CI** - Catch failures early in development

### CI/CD Integration

**For continuous integration:**

```yaml
# .github/workflows/test.yml
- name: Run API Tests
  run: timeout 180 npx playwright test tests/api/ --reporter=list

- name: Run Security Tests
  run: timeout 120 npx playwright test tests/security/ --reporter=list

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-results
    path: test-results/
```

## Examples

### Example 1: Run Tests After Adding Challenge Field

```bash
# 1. Check TypeScript compiles
npx tsc --noEmit

# 2. Run challenge tests
npx playwright test tests/api/challenge-crud.spec.ts --reporter=list

# 3. Analyze results
# All tests passed → Ready to commit
# Tests failed → Investigate and fix
```

### Example 2: Debug Authentication Failure

```bash
# 1. Run failing test in isolation
npx playwright test tests/api/manager-auth.spec.ts:42 --reporter=line

# 2. Read test to understand expectations
# Read tests/api/manager-auth.spec.ts

# 3. Check auth helper implementation
# Read tests/utils/supabase-auth-test.ts

# 4. Verify Supabase connection
# Check .env.local has correct credentials

# 5. Re-run after fixes
npx playwright test tests/api/manager-auth.spec.ts:42 --reporter=list
```

### Example 3: Validate RLS Policies

```bash
# 1. Run RLS test suite
npx playwright test tests/security/rls-fixture-test.spec.ts --reporter=list

# 2. If failures, check policies
psql "$DATABASE_URL" -c "SELECT tablename, policyname FROM pg_policies WHERE schemaname='public';"

# 3. Fix policies using Database Migration Skill

# 4. Re-run tests
npx playwright test tests/security/ --reporter=list
```

## Success Criteria

After using this skill, verify:

- [ ] Test execution completed (no hangs or crashes)
- [ ] Results are clearly interpreted and explained
- [ ] Failures are categorized and analyzed
- [ ] Actionable fixes are provided for failures
- [ ] Test coverage gaps are identified (if any)
- [ ] Results are documented (for Task Master or commit)

## Related Skills

- **Database Schema Migration Skill** - Run tests after schema changes
- **Multi-Tenant Validation Skill** - Verify workspace isolation via tests
- **Git Workflow Skill** - Integrate test results into commit workflow

---

*This skill ensures thorough, efficient testing that maintains code quality and catches regressions early.*
