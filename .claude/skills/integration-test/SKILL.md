# integration-test

**Purpose:** Run and validate integration tests for implemented features.

## When to Invoke

Invoke this skill after:
- Implementing new API routes
- Creating new features
- Modifying existing functionality
- Before committing code
- After fixing bugs

## Test Types

### 1. API Integration Tests
- Test API routes with Playwright request fixture
- Validate request/response formats
- Test authentication and authorization
- Verify workspace isolation
- Check error handling

### 2. UI Integration Tests
- Test user flows with Playwright
- Verify component interactions
- Test form submissions
- Validate navigation and routing
- Check loading and error states

### 3. Database Integration Tests
- Test Prisma queries
- Verify RLS policies
- Test workspace isolation
- Check data integrity
- Validate relationships

## Workflow Steps

### Step 1: Identify Test Scope

Determine what needs testing:
- New API endpoints
- New UI components
- Modified business logic
- Database changes
- Auth flows

### Step 2: Run Relevant Tests

```bash
# Run all tests
pnpm playwright test

# Run specific test file
pnpm playwright test tests/api/challenges.spec.ts

# Run tests matching pattern
pnpm playwright test -g "enrollment"

# Run with UI
pnpm playwright test --ui

# Run in debug mode
pnpm playwright test --debug
```

### Step 3: Analyze Results

Check test output for:
- Passed tests ✅
- Failed tests ❌
- Skipped tests ⊘
- Test duration
- Error messages

### Step 4: Fix Failures

If tests fail:
1. Read error message and stack trace
2. Identify root cause
3. Fix implementation
4. Re-run tests
5. Repeat until all pass

### Step 5: Add Missing Tests

If coverage gaps identified:
1. Consult playwright-agent
2. Create new test files
3. Add test cases
4. Verify tests pass

## Test Patterns

### API Route Test

```typescript
// tests/api/challenges.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Challenge API', () => {
  test('should create challenge with workspace isolation', async ({ request }) => {
    // Create workspace
    const workspace = await createTestWorkspace();

    // Create challenge
    const response = await request.post('/api/challenges', {
      headers: { 'X-Workspace-Id': workspace.id },
      data: {
        title: 'Test Challenge',
        description: 'Test description'
      }
    });

    expect(response.ok()).toBeTruthy();
    const { challenge } = await response.json();
    expect(challenge.workspaceId).toBe(workspace.id);
    expect(challenge.title).toBe('Test Challenge');
  });

  test('should not see challenges from other workspace', async ({ request }) => {
    const workspace1 = await createTestWorkspace();
    const workspace2 = await createTestWorkspace();

    // Create challenge in workspace1
    await request.post('/api/challenges', {
      headers: { 'X-Workspace-Id': workspace1.id },
      data: { title: 'Challenge 1' }
    });

    // List challenges in workspace2
    const response = await request.get('/api/challenges', {
      headers: { 'X-Workspace-Id': workspace2.id }
    });

    const { challenges } = await response.json();
    expect(challenges).toHaveLength(0);
  });
});
```

### UI Flow Test

```typescript
// tests/ui/enrollment.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Challenge Enrollment Flow', () => {
  test('participant can enroll in challenge', async ({ page }) => {
    // Setup
    const workspace = await createTestWorkspace();
    const challenge = await createTestChallenge(workspace.id);
    const participant = await createTestParticipant(workspace.id);

    // Login
    await page.goto(`/auth/login`);
    await page.fill('[name="email"]', participant.email);
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to challenges
    await page.goto(`/w/${workspace.slug}/participant/challenges`);

    // Find challenge
    await expect(page.locator('text=' + challenge.title)).toBeVisible();

    // Click enroll
    await page.click(`[data-challenge-id="${challenge.id}"] button:has-text("Enroll")`);

    // Verify enrollment
    await expect(page.locator('text=Enrolled')).toBeVisible();

    // Check dashboard
    await page.goto(`/w/${workspace.slug}/participant/dashboard`);
    await expect(page.locator('text=' + challenge.title)).toBeVisible();
  });
});
```

### Database Test

```typescript
// tests/db/workspace-isolation.spec.ts
import { test, expect } from '@playwright/test';
import { prisma } from '@/lib/db';

test.describe('Workspace Isolation', () => {
  test('queries filter by workspaceId', async () => {
    const workspace1 = await createTestWorkspace();
    const workspace2 = await createTestWorkspace();

    // Create challenges in both workspaces
    await createTestChallenge(workspace1.id, { title: 'Challenge 1' });
    await createTestChallenge(workspace2.id, { title: 'Challenge 2' });

    // Query workspace1 challenges
    const workspace1Challenges = await prisma.challenge.findMany({
      where: { workspaceId: workspace1.id }
    });

    expect(workspace1Challenges).toHaveLength(1);
    expect(workspace1Challenges[0].title).toBe('Challenge 1');

    // Query workspace2 challenges
    const workspace2Challenges = await prisma.challenge.findMany({
      where: { workspaceId: workspace2.id }
    });

    expect(workspace2Challenges).toHaveLength(1);
    expect(workspace2Challenges[0].title).toBe('Challenge 2');
  });
});
```

## Common Test Scenarios

### 1. Authentication
```typescript
test('requires authentication', async ({ request }) => {
  const response = await request.get('/api/challenges');
  expect(response.status()).toBe(401);
});
```

### 2. Authorization
```typescript
test('requires admin role', async ({ request }) => {
  const participant = await createTestParticipant();
  const response = await request.post('/api/challenges', {
    headers: { 'Authorization': `Bearer ${participant.token}` },
    data: { title: 'Test' }
  });
  expect(response.status()).toBe(403);
});
```

### 3. Validation
```typescript
test('validates required fields', async ({ request }) => {
  const response = await request.post('/api/challenges', {
    data: { description: 'Missing title' }
  });
  expect(response.status()).toBe(400);
  const { error } = await response.json();
  expect(error).toContain('title');
});
```

### 4. Not Found
```typescript
test('returns 404 for non-existent resource', async ({ request }) => {
  const response = await request.get('/api/challenges/00000000-0000-0000-0000-000000000000');
  expect(response.status()).toBe(404);
});
```

### 5. Workspace Isolation
```typescript
test('cannot access other workspace resource', async ({ request }) => {
  const workspace1 = await createTestWorkspace();
  const workspace2 = await createTestWorkspace();
  const challenge = await createTestChallenge(workspace1.id);

  const response = await request.get(`/api/challenges/${challenge.id}`, {
    headers: { 'X-Workspace-Id': workspace2.id }
  });

  expect(response.status()).toBe(404);
});
```

## Test Fixtures

Use test factories from `tests/fixtures/factories.ts`:

```typescript
// Create test workspace
const workspace = await createTestWorkspace({
  name: 'Test Workspace',
  slug: 'test-ws'
});

// Create test challenge
const challenge = await createTestChallenge(workspace.id, {
  title: 'Test Challenge',
  description: 'Test description'
});

// Create test participant
const participant = await createTestParticipant(workspace.id, {
  email: 'test@example.com'
});

// Create test enrollment
const enrollment = await createTestEnrollment(
  participant.id,
  challenge.id
);
```

## Test Reports

### Generate HTML Report

```bash
# Run tests and generate report
pnpm playwright test --reporter=html

# Open report
pnpm playwright show-report
```

### Generate JSON Report

```bash
# Run with JSON reporter
pnpm playwright test --reporter=json

# View results
cat playwright-report/results.json
```

## Integration with Agents

### Invoked by:
- All agents after implementation
- All agents before committing
- playwright-agent when running tests

### Success Criteria
- All tests pass
- No failing tests
- Coverage maintained or improved
- Workspace isolation validated

## Troubleshooting

### Tests Failing Locally

```bash
# Clean database
pnpm prisma migrate reset --force

# Regenerate Prisma client
pnpm prisma generate

# Re-run tests
pnpm playwright test
```

### Timeout Issues

```typescript
// Increase timeout for slow operations
test('slow operation', async ({ request }) => {
  test.setTimeout(60000); // 60 seconds

  const response = await request.post('/api/slow-operation');
  expect(response.ok()).toBeTruthy();
});
```

### Flaky Tests

```typescript
// Use retry for flaky tests
test('potentially flaky test', async ({ page }) => {
  test.setTimeout(30000);

  await expect(async () => {
    await page.goto('/some-page');
    await expect(page.locator('text=Loaded')).toBeVisible();
  }).toPass({
    intervals: [1000, 2000, 3000],
    timeout: 10000
  });
});
```

---

**Version:** 1.0
**Last Updated:** 2024-11-12
**Maintained By:** Changemaker Development Team
