# Test Coverage Analysis

## Summary
- **Total API Routes**: 36
- **Total UI Pages**: 27
- **Existing Tests**: 8 test files
- **Coverage Status**: Partial - Critical gaps identified

## Current Test Files

### E2E Tests
1. ✅ **admin-crawl.spec.ts** - Comprehensive admin route testing (PASSING)
2. ⚠️ **challenges-reward-config.spec.ts** - Reward system API testing
3. ⚠️ **complete-challenge-flow.spec.ts** - End-to-end challenge flow (NEEDS FIX)
4. ❓ **invite-flow.spec.ts** - Invite system testing
5. ❓ **review-approval-ui.spec.ts** - Review/approval UI testing
6. ❓ **rewards-approvals.spec.ts** - Rewards approval flow
7. ❓ **simple-button-test.spec.ts** - Button testing
8. ✅ **smoke/reward-system.spec.ts** - Basic smoke tests (PASSING)

## API Routes Coverage

### ✅ Tested Routes (via admin-crawl and smoke tests)
- `/api/health` ✅
- `/api/workspaces` (indirect via UI) ✅

### ❌ UNTESTED Critical API Routes

#### Account Management (UNTESTED)
- `/api/account/email/cancel` - Cancel email change
- `/api/account/email/confirm` - Confirm email change
- `/api/account/email/start-change` - Start email change
- `/api/account/password` - Password management
- `/api/account/password/change` - Change password
- `/api/account/profile` - Profile updates

#### Authentication (UNTESTED)
- `/api/auth/sync-user` - Sync user with Supabase
- `/api/invites/accept` - Accept workspace invite
- `/api/user/workspaces` - Get user workspaces
- `/api/workspace/switch` - Switch active workspace

#### Workspace Core (PARTIALLY TESTED)
- `/api/workspaces/[slug]/budget` ❌
- `/api/workspaces/[slug]/points` ❌
- `/api/workspaces/[slug]/profile` ❌
- `/api/workspaces/[slug]/enrollments` ❌

#### Challenge Management (PARTIALLY TESTED)
- ✅ `/api/workspaces/[slug]/challenges` (GET tested via UI)
- ❌ `/api/workspaces/[slug]/challenges` (POST/PUT untested)
- ❌ `/api/workspaces/[slug]/challenges/[id]` (DELETE untested)
- ❌ `/api/workspaces/[slug]/challenges/[id]/budget`
- ❌ `/api/workspaces/[slug]/challenges/[id]/activities`
- ❌ `/api/workspaces/[slug]/challenges/[id]/activities/[activityId]`

#### Activity Templates (UNTESTED)
- `/api/workspaces/[slug]/activity-templates` ❌
- `/api/workspaces/[slug]/activity-templates/[id]` ❌

#### Participant Management (PARTIALLY TESTED)
- ✅ `/api/workspaces/[slug]/participants` (GET tested via UI)
- ❌ `/api/workspaces/[slug]/participants` (POST/PUT untested)
- ❌ `/api/workspaces/[slug]/participants/[id]`
- ❌ `/api/workspaces/[slug]/participants/[id]/enrollments`
- ❌ `/api/workspaces/[slug]/participants/[id]/enrollments/[enrollmentId]`
- ❌ `/api/workspaces/[slug]/participants/bulk` - Bulk operations
- ❌ `/api/workspaces/[slug]/participants/export` - Export data
- ❌ `/api/workspaces/[slug]/participants/segments`
- ❌ `/api/workspaces/[slug]/participants/segments/[id]`

#### Email System (UNTESTED)
- `/api/workspaces/[slug]/emails/settings` ❌
- `/api/workspaces/[slug]/emails/templates` ❌
- `/api/workspaces/[slug]/emails/templates/[type]` ❌
- `/api/workspaces/[slug]/emails/test-send` ❌

#### Invites (UNTESTED)
- `/api/workspaces/[slug]/invites` ❌

#### Submissions/Reviews (UNTESTED)
- `/api/workspaces/[slug]/submissions/[id]/review` ❌

## UI Pages Coverage

### ✅ Tested Pages (via admin-crawl)
- `/workspaces` ✅
- `/w/[slug]/admin/dashboard` ✅
- `/w/[slug]/admin/challenges` ✅
- `/w/[slug]/admin/challenges/new` ✅
- `/w/[slug]/admin/participants` ✅
- `/w/[slug]/admin/settings` ✅
- `/w/[slug]/admin/profile` ✅
- `/w/[slug]/admin/emails` ✅
- `/w/[slug]/admin/invites` ✅
- `/w/[slug]/admin/points` ✅
- `/w/[slug]/admin/activity-templates` ✅
- `/account` ✅

### ❌ UNTESTED UI Pages

#### Challenge Detail Pages (UNTESTED)
- `/w/[slug]/admin/challenges/[id]` ❌
- `/w/[slug]/admin/challenges/[id]/edit` ❌
- `/w/[slug]/admin/challenges/[id]/activities` ❌
- `/w/[slug]/admin/challenges/[id]/activities/new` ❌
- `/w/[slug]/admin/challenges/[id]/activities/[activityId]/edit` ❌
- `/w/[slug]/admin/challenges/[id]/leaderboard` ❌
- `/w/[slug]/admin/challenges/[id]/participants` ❌
- `/w/[slug]/admin/challenges/[id]/points` ❌
- `/w/[slug]/admin/challenges/[id]/settings` ❌
- `/w/[slug]/admin/challenges/[id]/timeline` ❌

#### Participant Detail (UNTESTED)
- `/w/[slug]/admin/participants/[id]` ❌

#### Participant/User Views (UNTESTED)
- `/w/[slug]/participant/activities` ❌
- `/w/[slug]/participant/challenges` ❌
- `/w/[slug]/participant/challenges/[id]` ❌
- `/w/[slug]/participant/dashboard` ❌
- `/w/[slug]/participant/leaderboard` ❌
- `/w/[slug]/participant/profile` ❌

## Critical Missing Tests

### Priority 1 - Core Functionality (MUST TEST)
1. **Email Change Flow** - New feature, zero coverage
   - Start change → Confirm → Cancel
   - Email validation
   - Token expiration

2. **Multi-Reward System** - New feature, partial coverage
   - Reward issuance API
   - Reward types (points, SKU, monetary)
   - Reward status tracking
   - Activity reward rules

3. **Challenge CRUD Operations**
   - Create challenge with rewards
   - Update challenge config
   - Delete challenge
   - Challenge with activities

4. **Participant Enrollment Flow**
   - Enroll in challenge
   - Submit activities
   - Track progress
   - Earn rewards

5. **Review/Approval System**
   - Submit for review
   - Admin approve/reject
   - Reward issuance on approval

### Priority 2 - Admin Features (SHOULD TEST)
1. **Bulk Participant Operations**
   - Bulk import
   - Bulk export
   - Segment management

2. **Email System**
   - Template management
   - Test send
   - Settings

3. **Activity Templates**
   - Create template
   - Use template
   - Update template

4. **Points/Budget Management**
   - Workspace budget
   - Challenge budget
   - Points allocation

### Priority 3 - User Experience (NICE TO TEST)
1. **Participant Dashboard**
   - View challenges
   - View activities
   - View rewards

2. **Leaderboards**
   - Challenge leaderboard
   - Workspace leaderboard

3. **Notifications/Activity Feed**
   - Recent activities
   - Notifications

## Test Gaps by Feature

### New Features (Migration) - ZERO Coverage
- ✅ TenantId multi-tenancy (schema only)
- ❌ Email change pending workflow (0% coverage)
- ❌ Workspace active/published flags (0% coverage)
- ❌ Last workspace tracking (0% coverage)
- ❌ User permissions array (0% coverage)

### Reward System - 20% Coverage
- ✅ RewardIssuance model exists (schema)
- ✅ TenantSku model exists (schema)
- ⚠️ Reward config API (partial - challenges-reward-config.spec.ts)
- ❌ Reward issuance flow (0%)
- ❌ SKU mapping (0%)
- ❌ Reward status tracking (0%)

### Challenge System - 40% Coverage
- ✅ Challenge list page
- ✅ Challenge creation page
- ❌ Challenge CRUD API (0%)
- ❌ Challenge detail pages (0%)
- ❌ Activity submission (0%)

### Participant System - 30% Coverage
- ✅ Participant list page
- ❌ Participant CRUD API (0%)
- ❌ Enrollment flow (0%)
- ❌ Bulk operations (0%)
- ❌ Export functionality (0%)

## Recommended Test Plan

### Phase 1: Critical API Tests (IMMEDIATE)
```typescript
// tests/api/account-email.spec.ts
- POST /api/account/email/start-change
- POST /api/account/email/confirm
- POST /api/account/email/cancel

// tests/api/rewards.spec.ts
- POST /api/workspaces/[slug]/challenges (with rewardType)
- GET /api/workspaces/[slug]/challenges/[id] (verify rewardConfig)
- POST /api/workspaces/[slug]/submissions/[id]/review (trigger reward)

// tests/api/participants.spec.ts
- POST /api/workspaces/[slug]/participants
- GET /api/workspaces/[slug]/participants/[id]/enrollments
- POST /api/workspaces/[slug]/participants/bulk
```

### Phase 2: E2E Flow Tests (HIGH PRIORITY)
```typescript
// tests/e2e/email-change-flow.spec.ts
- Complete email change workflow
- Token validation
- Error handling

// tests/e2e/reward-issuance-flow.spec.ts
- Create challenge with rewards
- Participant enrolls
- Submit activity
- Admin approves
- Reward issued
- Verify RewardIssuance record

// tests/e2e/participant-journey.spec.ts
- Signup → Invite → Enroll → Submit → Earn
```

### Phase 3: Integration Tests (MEDIUM PRIORITY)
```typescript
// tests/integration/database.spec.ts
- Migration verification
- Schema constraints
- RLS policies
- Indexes performance

// tests/integration/email.spec.ts
- Email sending
- Template rendering
- Settings management
```

### Phase 4: UI Component Tests (LOW PRIORITY)
```typescript
// tests/unit/components/*.spec.ts
- Button components
- Form components
- Modal components
```

## Coverage Metrics

**Current Coverage:**
- API Routes: ~8% (3/36 routes tested)
- UI Pages: ~44% (12/27 pages tested)
- New Features: ~10% (schema only, no functionality)

**Target Coverage:**
- API Routes: 80%+ (critical paths 100%)
- UI Pages: 70%+ (critical paths 100%)
- New Features: 90%+ (all new migration features)

## Action Items

1. ✅ Fix existing E2E tests (COMPLETED)
2. ❌ Create email change flow test (CRITICAL)
3. ❌ Create reward issuance flow test (CRITICAL)
4. ❌ Create participant enrollment test (HIGH)
5. ❌ Create API test suite for untested routes (HIGH)
6. ❌ Add integration tests for database (MEDIUM)
7. ❌ Add unit tests for components (LOW)

## Notes
- Smoke tests provide basic health checks ✅
- Admin crawl provides route existence validation ✅
- Missing: Functional testing of core business logic ❌
- Missing: Error handling and edge cases ❌
- Missing: Performance and load testing ❌
