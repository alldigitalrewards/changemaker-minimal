# Test Suite Quick Start Guide

## Prerequisites

1. **Dev server running:**
   ```bash
   pnpm dev
   # Server should be at http://localhost:3000
   ```

2. **Database seeded:**
   ```bash
   pnpm db:push
   pnpm db:seed
   ```

3. **Dependencies installed:**
   ```bash
   pnpm install
   ```

## Running Tests

### All Tests (Recommended for CI)
```bash
pnpm test
```

### By Category

#### API Tests Only (~5 min)
```bash
pnpm test tests/api
```

#### E2E Flow Tests (~3 min)
```bash
pnpm test tests/e2e/flows
```

#### Integration Tests (~2 min)
```bash
pnpm test tests/integration
```

#### Existing E2E Tests
```bash
pnpm test tests/e2e --ignore=tests/e2e/flows
```

### Individual Test Files

#### Email Change Tests
```bash
pnpm test tests/api/email-change.spec.ts
```

#### Reward System Tests
```bash
pnpm test tests/api/reward-issuance.spec.ts
```

#### Challenge CRUD Tests
```bash
pnpm test tests/api/challenge-crud.spec.ts
```

#### Complete Participant Journey
```bash
pnpm test tests/e2e/flows/participant-journey.spec.ts
```

#### Database Integration
```bash
pnpm test tests/integration/database.spec.ts
```

#### Multi-Tenancy
```bash
pnpm test tests/integration/multi-tenancy.spec.ts
```

## Test Modes

### UI Mode (Interactive)
```bash
pnpm test --ui
```
Opens browser for interactive debugging

### Debug Mode
```bash
pnpm test --debug
```
Step through tests line by line

### Headed Mode (See Browser)
```bash
pnpm test --headed
```
Watch tests run in actual browser

### Single Browser
```bash
pnpm test --project=chromium
pnpm test --project=firefox
pnpm test --project=webkit
```

## Quick Checks

### Run Fastest Tests First
```bash
# Integration tests are fastest (~2 min)
pnpm test tests/integration

# Then API tests (~5 min)
pnpm test tests/api

# Finally E2E flows (~3 min)
pnpm test tests/e2e/flows
```

### Smoke Test (Critical Paths Only)
```bash
pnpm test tests/api/email-change.spec.ts tests/api/reward-issuance.spec.ts tests/integration/multi-tenancy.spec.ts
```

## Troubleshooting

### Tests Failing?

1. **Check dev server is running:**
   ```bash
   curl http://localhost:3000/api/health
   # Should return 200 OK
   ```

2. **Check database connection:**
   ```bash
   pnpm prisma studio
   # Should open successfully
   ```

3. **Reset database:**
   ```bash
   pnpm db:push --force-reset
   pnpm db:seed
   ```

4. **Clear test artifacts:**
   ```bash
   rm -rf test-results playwright-report
   ```

### Common Issues

**"Cannot connect to localhost:3000"**
- Start dev server: `pnpm dev`

**"User not found" errors**
- Re-seed database: `pnpm db:seed`

**"Port already in use"**
- Kill existing process: `lsof -ti:3000 | xargs kill -9`

**Flaky tests**
- Run with retries: `pnpm test --retries=2`

## Test Data

### Seed Users
- **Admin:** `jfelke@alldigitalrewards.com` / `Changemaker2025!`
- **Participant:** `john.doe@acme.com` / `Changemaker2025!`

### Workspaces
- **Primary:** `alldigitalrewards`
- **Secondary:** `acme`

### Test Data Cleanup
All tests clean up after themselves. If you see orphaned data:
```sql
-- Clean test data (optional, tests do this automatically)
DELETE FROM "User" WHERE email LIKE '%test%' OR email LIKE '%@test.com';
DELETE FROM "Workspace" WHERE slug LIKE '%test%';
```

## Coverage Reports

### Generate Coverage
```bash
pnpm test --coverage
```

### View HTML Report
```bash
pnpm test
# Opens playwright-report/index.html automatically
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm db:push
      - run: pnpm db:seed
      - run: pnpm build
      - run: pnpm start &
      - run: pnpm test
```

## Performance

### Test Execution Times (Approximate)
- Integration tests: ~2 min (17 tests)
- API tests: ~5 min (57 tests)
- E2E flows: ~3 min (12 tests)
- **Total:** ~10 min (86+ tests)

### Parallel Execution
Tests run in parallel across 4 workers by default.
Adjust in `playwright.config.ts`:
```typescript
workers: process.env.CI ? 1 : 4
```

## Best Practices

1. **Run tests before committing:**
   ```bash
   pnpm test
   ```

2. **Run related tests during development:**
   ```bash
   # Working on challenges?
   pnpm test tests/api/challenge-crud.spec.ts --headed --debug
   ```

3. **Check specific feature:**
   ```bash
   pnpm test --grep "reward"
   ```

4. **Watch mode (not recommended, tests modify DB):**
   ```bash
   pnpm test --watch  # Use cautiously
   ```

## Quick Reference

| Command | What it does |
|---------|--------------|
| `pnpm test` | Run all tests |
| `pnpm test tests/api` | API tests only |
| `pnpm test tests/e2e/flows` | E2E flows only |
| `pnpm test tests/integration` | Integration only |
| `pnpm test --ui` | Interactive mode |
| `pnpm test --headed` | Show browser |
| `pnpm test --debug` | Debug mode |
| `pnpm test --grep "email"` | Tests matching "email" |

## Help

### View all options:
```bash
pnpm test --help
```

### Playwright docs:
https://playwright.dev/docs/intro

### Test files location:
```
tests/
├── api/                    # API endpoint tests
├── e2e/flows/             # User journey tests
├── integration/           # Database & schema tests
├── e2e/                   # Existing E2E tests
└── support/               # Helper utilities
```

---

**Ready to test? Start here:**
```bash
pnpm test tests/api/email-change.spec.ts --ui
```

This will open an interactive UI where you can see tests run and debug failures.

**Questions?** Check `TEST_SUITE_SUMMARY.md` for detailed documentation.
