# End-to-End Testing

This directory contains Playwright tests for the Changemaker application.

## Configuration

Tests are configurable to run against different environments using the `BASE_URL` environment variable.

## Usage

### Local Development (Default)
```bash
# Uses http://localhost:3000 (starts local server automatically)
pnpm test:e2e
pnpm test:e2e:local
```

### Production Environment
```bash
# Tests against https://changemaker.im (no local server started)
pnpm test:e2e:prod
```

### Custom Environment
```bash
# Test against any URL
BASE_URL=https://staging.changemaker.im pnpm test:e2e
BASE_URL=https://your-domain.com pnpm test:e2e
```

### Interactive Mode
```bash
# Run tests with Playwright UI
pnpm test:ui
```

## Test Files

- `complete-challenge-flow.spec.ts` - Full end-to-end test covering:
  - Admin creates challenge with activities
  - Participants enroll and submit activities
  - Admin reviews and approves submissions
  - Participants view results and leaderboard

## Environment Requirements

### Local Testing
- Local development server running on port 3000
- Seeded database with test users:
  - `krobinson@alldigitalrewards.com` (Admin)
  - `mike.chen@alldigitalrewards.com` (Participant)
  - `lisa.taylor@alldigitalrewards.com` (Participant)
  - `john.doe@alldigitalrewards.com` (Reviewer)
  - `sarah.jones@alldigitalrewards.com` (Reviewer)

### Production Testing
- Deployed application with same test users
- Database seeded with activity templates

## Debugging

### Screenshots and Videos
- Failures automatically capture screenshots and videos
- Traces available on retry failures
- Reports generated in `playwright-report/`

### Headless vs Headed
```bash
# Run in headed mode (see browser)
BASE_URL=https://changemaker.im npx playwright test --headed

# Debug specific test
BASE_URL=https://changemaker.im npx playwright test --debug
```