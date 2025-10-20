# Manager Role Deployment Runbook

**Last Updated**: October 20, 2025
**Audience**: DevOps, Platform Engineers, Workspace Admins
**Status**: Pre-Deployment

---

## Overview

This runbook provides step-by-step deployment procedures, rollback plans, monitoring strategies, and troubleshooting guidance for the Manager Role & RewardSTACK Integration release.

**Release Scope**:
- Add MANAGER role to platform
- Multi-stage submission approval workflow
- Challenge-manager assignment system
- RewardSTACK API integration for SKU/monetary rewards
- Email notifications for manager workflow

**Estimated Deployment Time**: 45-60 minutes (staging), 30-45 minutes (production)
**Rollback Time**: 5-10 minutes (feature flag) or 15-20 minutes (code revert)

---

## Pre-Deployment Checklist

### 1. Environment Variables

**Staging** (`.env.staging`):
```bash
# RewardSTACK Integration
REWARDSTACK_API_KEY=sk_test_... # Staging key from ADR
REWARDSTACK_API_URL=https://admin.stage.alldigitalrewards.com
REWARDSTACK_WEBHOOK_SECRET=whsec_test_... # Provided by ADR

# Feature Flags
ENABLE_MANAGER_WORKFLOW=true # Toggle for gradual rollout
```

**Production** (`.env.production`):
```bash
# RewardSTACK Integration
REWARDSTACK_API_KEY=sk_live_... # Production key from ADR
REWARDSTACK_API_URL=https://admin.alldigitalrewards.com
REWARDSTACK_WEBHOOK_SECRET=whsec_live_... # Provided by ADR

# Feature Flags
ENABLE_MANAGER_WORKFLOW=false # Start disabled, enable after validation
```

**Verification**:
```bash
# Verify environment variables are set
vercel env ls --environment=production
vercel env ls --environment=staging

# Check RewardSTACK API connectivity
curl -H "Authorization: Bearer $REWARDSTACK_API_KEY" \
  $REWARDSTACK_API_URL/api/v2/health
```

---

### 2. Database Backup

**Staging**:
```bash
# Backup staging database
STAGING_DB_URL="postgresql://..." # From Supabase dashboard
pg_dump $STAGING_DB_URL > backups/staging_pre_manager_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backups/staging_pre_manager_*.sql
```

**Production**:
```bash
# Backup production database (CRITICAL)
PROD_DB_URL="postgresql://..." # From Supabase dashboard
pg_dump $PROD_DB_URL > backups/prod_pre_manager_$(date +%Y%m%d_%H%M%S).sql

# Store backup in secure location
aws s3 cp backups/prod_pre_manager_*.sql s3://changemaker-backups/

# Verify backup integrity
pg_restore --list backups/prod_pre_manager_*.sql | head -20
```

---

### 3. Code Review Checklist

- [ ] All PR reviews completed and approved
- [ ] Test suite passing (51/58 minimum, aim for 100%)
- [ ] No console.log statements in production code
- [ ] Environment variables documented
- [ ] Migration files reviewed by DBA
- [ ] API endpoint security reviewed
- [ ] Webhook signature verification implemented
- [ ] Email templates reviewed for branding

---

### 4. Monitoring Setup

**DataDog/New Relic** (if available):
```bash
# Create custom dashboard for manager metrics
# Metrics to track:
# - manager_review_count (by workspace)
# - manager_review_duration_ms
# - manager_assignment_count
# - rewardstack_api_calls (success/failure)
# - rewardstack_webhook_events (by type)
# - email_send_count (by template)
```

**Supabase Dashboard**:
- Enable slow query logging (queries >100ms)
- Set up alerts for database connection pool exhaustion
- Monitor table bloat for new tables (ChallengeAssignment, ApprovalHistory)

**Vercel Analytics**:
- Track `/w/[slug]/manager/*` route performance
- Monitor `/api/workspaces/[slug]/submissions/[id]/manager-review` endpoint response time

---

## Deployment Procedure

### Phase 1: Staging Deployment

**Target Time**: 10:00 AM PST, October 21, 2025

#### Step 1.1: Deploy Database Migrations

```bash
# Connect to staging
cd /path/to/changemaker-template

# Review migration
cat prisma/migrations/XXXXXX_add_manager_role/migration.sql

# Apply migration to staging
DATABASE_URL=$STAGING_DB_URL pnpm prisma migrate deploy

# Verify schema changes
DATABASE_URL=$STAGING_DB_URL pnpm prisma db pull
DATABASE_URL=$STAGING_DB_URL pnpm prisma validate

# Check migration status
DATABASE_URL=$STAGING_DB_URL pnpm prisma migrate status
```

**Expected Output**:
```
✓ Your database is now in sync with your schema.
Database schema is up to date!
```

**Validation Queries**:
```sql
-- Verify Role enum
SELECT enumlabel FROM pg_enum
JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
WHERE pg_type.typname = 'Role';
-- Expected: ADMIN, PARTICIPANT, MANAGER

-- Verify new tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('ChallengeAssignment', 'ApprovalHistory');
-- Expected: 2 rows

-- Verify new columns
SELECT column_name FROM information_schema.columns
WHERE table_name = 'ActivitySubmission'
AND column_name LIKE 'manager%';
-- Expected: managerReviewedBy, managerNotes, managerReviewedAt
```

---

#### Step 1.2: Deploy Application Code

```bash
# Build and deploy to staging (Vercel)
git checkout main
git pull origin main

# Ensure environment variables are set
vercel env pull .env.staging --environment=staging

# Deploy to staging
vercel deploy --prod --env=staging

# Get deployment URL
STAGING_URL=$(vercel ls --environment=staging | grep READY | head -1 | awk '{print $2}')
echo "Staging URL: https://$STAGING_URL"
```

**Smoke Tests**:
```bash
# Test health endpoint
curl https://$STAGING_URL/api/health

# Test manager assignment endpoint (should return 401 without auth)
curl -X POST https://$STAGING_URL/api/workspaces/test/challenges/test-id/managers \
  -H "Content-Type: application/json" \
  -d '{"managerId":"test"}'
# Expected: 401 Unauthorized

# Test RewardSTACK connectivity (internal endpoint)
curl https://$STAGING_URL/api/internal/rewardstack/health
# Expected: 200 OK with {"status":"connected"}
```

---

#### Step 1.3: Configure RewardSTACK Webhook

```bash
# Log into RewardSTACK staging dashboard
# Navigate to: Settings > Webhooks > Add Endpoint

# Configure webhook:
# URL: https://staging.changemaker.im/api/webhooks/rewardstack
# Events: reward.fulfilled, reward.failed, reward.cancelled
# Secret: [Copy from REWARDSTACK_WEBHOOK_SECRET]

# Test webhook
curl -X POST https://staging.changemaker.im/api/webhooks/rewardstack \
  -H "Content-Type: application/json" \
  -H "X-RewardStack-Signature: test" \
  -d '{
    "event": "reward.fulfilled",
    "data": {
      "rewardId": "test-reward-id",
      "status": "fulfilled"
    }
  }'
# Expected: 400 Bad Request (signature verification failed) - this is correct!
```

---

#### Step 1.4: Create Test Manager User

```bash
# Open staging Supabase dashboard
# Navigate to: Authentication > Users > Add User

# Create test manager:
# Email: manager-test@alldigitalrewards.com
# Password: [Generate secure password]
# Email confirm: true
```

**SQL to upgrade to MANAGER role**:
```sql
-- Connect to staging database
-- Update user role
UPDATE "User"
SET role = 'MANAGER'
WHERE email = 'manager-test@alldigitalrewards.com';

-- Create WorkspaceMembership
INSERT INTO "WorkspaceMembership" (
  "userId",
  "workspaceId",
  "role",
  "isPrimary"
)
SELECT
  u.id,
  w.id,
  'MANAGER'::\"Role\",
  false
FROM "User" u
CROSS JOIN "Workspace" w
WHERE u.email = 'manager-test@alldigitalrewards.com'
AND w.slug = 'alldigitalrewards' -- Your test workspace
LIMIT 1;
```

---

#### Step 1.5: End-to-End Testing (Staging)

**Test Script** (`tests/staging-e2e.sh`):
```bash
#!/bin/bash
set -e

STAGING_URL="https://staging.changemaker.im"
ADMIN_EMAIL="admin@alldigitalrewards.com"
MANAGER_EMAIL="manager-test@alldigitalrewards.com"
PARTICIPANT_EMAIL="participant-test@alldigitalrewards.com"

echo "=== Manager Role E2E Test ==="

# 1. Admin assigns manager to challenge
echo "Test 1: Admin assigns manager..."
curl -X POST "$STAGING_URL/api/workspaces/alldigitalrewards/challenges/test-challenge/managers" \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=$ADMIN_TOKEN" \
  -d "{\"managerId\":\"$MANAGER_ID\"}" \
  | jq '.assignment.id'

# 2. Manager views dashboard
echo "Test 2: Manager views dashboard..."
curl "$STAGING_URL/api/workspaces/alldigitalrewards/manager/dashboard" \
  -H "Cookie: sb-access-token=$MANAGER_TOKEN" \
  | jq '.stats.assignedChallenges'

# 3. Participant submits activity
echo "Test 3: Participant submits..."
curl -X POST "$STAGING_URL/api/workspaces/alldigitalrewards/submissions" \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=$PARTICIPANT_TOKEN" \
  -d "{\"activityId\":\"$ACTIVITY_ID\",\"textContent\":\"Test submission\"}" \
  | jq '.submission.id'

# 4. Manager reviews submission
echo "Test 4: Manager approves..."
curl -X POST "$STAGING_URL/api/workspaces/alldigitalrewards/submissions/$SUBMISSION_ID/manager-review" \
  -H "Content-Type: application/json" \
  -H "Cookie: sb-access-token=$MANAGER_TOKEN" \
  -d '{"action":"approve","managerNotes":"Looks good!"}' \
  | jq '.submission.status'

# 5. Verify reward issuance
echo "Test 5: Verify reward..."
curl "$STAGING_URL/api/workspaces/alldigitalrewards/rewards/$REWARD_ID" \
  -H "Cookie: sb-access-token=$ADMIN_TOKEN" \
  | jq '.reward.status'

echo "=== All tests passed! ==="
```

**Run E2E Tests**:
```bash
chmod +x tests/staging-e2e.sh
./tests/staging-e2e.sh
```

**Expected Results**:
- Admin can assign managers ✓
- Manager can view dashboard ✓
- Participant can submit ✓
- Manager can approve ✓
- Reward is issued ✓

---

### Phase 2: Production Deployment

**Target Time**: 2:00 PM PST, October 22, 2025 (off-peak hours)

#### Step 2.1: Final Production Checklist

- [ ] Staging deployment successful (24+ hours running)
- [ ] All E2E tests passing on staging
- [ ] Test manager has reviewed 5+ submissions successfully
- [ ] No critical bugs reported in staging
- [ ] Database backup completed and verified
- [ ] Rollback plan reviewed and understood
- [ ] On-call team notified
- [ ] Customer success team briefed
- [ ] Status page updated (maintenance window)

---

#### Step 2.2: Deploy Database Migrations (Production)

```bash
# STOP: Verify production database backup exists!
ls -lh backups/prod_pre_manager_*.sql

# Apply migration
DATABASE_URL=$PROD_DB_URL pnpm prisma migrate deploy

# Verify migration
DATABASE_URL=$PROD_DB_URL pnpm prisma migrate status

# Run validation queries (same as staging)
psql $PROD_DB_URL -f scripts/validate-manager-schema.sql
```

**Duration**: ~2-3 minutes
**Downtime**: None (migrations are additive)

---

#### Step 2.3: Deploy Application Code (Production)

```bash
# Deploy to production (Vercel)
vercel deploy --prod

# Monitor deployment
vercel logs --follow

# Verify deployment health
curl https://changemaker.im/api/health
```

**Duration**: ~3-5 minutes
**Downtime**: None (zero-downtime deployment)

---

#### Step 2.4: Enable Feature Flag (Gradual Rollout)

**Initial State**: `ENABLE_MANAGER_WORKFLOW=false`

```bash
# Enable for single test workspace only
vercel env add ENABLE_MANAGER_WORKFLOW_WORKSPACES="alldigitalrewards"

# Verify test workspace can access manager features
curl https://changemaker.im/api/workspaces/alldigitalrewards/manager/dashboard \
  -H "Cookie: sb-access-token=$TEST_MANAGER_TOKEN"
# Expected: 200 OK

# Verify other workspaces cannot access (feature disabled)
curl https://changemaker.im/api/workspaces/other-workspace/manager/dashboard \
  -H "Cookie: sb-access-token=$OTHER_MANAGER_TOKEN"
# Expected: 403 Forbidden (feature disabled)
```

**After 4 hours of monitoring**:
```bash
# Enable for all workspaces
vercel env add ENABLE_MANAGER_WORKFLOW=true
vercel deploy --prod
```

---

#### Step 2.5: Configure Production RewardSTACK Webhook

```bash
# Log into RewardSTACK production dashboard
# Navigate to: Settings > Webhooks > Add Endpoint

# Configure webhook:
# URL: https://changemaker.im/api/webhooks/rewardstack
# Events: reward.fulfilled, reward.failed, reward.cancelled
# Secret: [Copy from production REWARDSTACK_WEBHOOK_SECRET]

# Test webhook delivery (wait for actual event)
# Monitor: https://changemaker.im/api/internal/rewardstack/webhook-logs
```

---

## Post-Deployment Validation

### Immediate Checks (0-15 minutes)

```bash
# 1. Health check
curl https://changemaker.im/api/health
# Expected: {"status":"ok","timestamp":"..."}

# 2. Database connection pool
psql $PROD_DB_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'changemaker';"
# Expected: <100 connections (normal)

# 3. Error rate (DataDog/New Relic)
# Check: 5xx errors <0.1%

# 4. Response time
# Check: p95 <500ms for manager dashboard

# 5. Email delivery (Resend dashboard)
# Check: No bounces or failures
```

---

### Functional Checks (15-60 minutes)

**Test Workflow**:
1. Admin assigns manager to test challenge ✓
2. Manager logs in and sees dashboard ✓
3. Participant submits activity ✓
4. Manager receives email notification ✓
5. Manager reviews and approves ✓
6. Participant receives approval email ✓
7. Reward is issued (check RewardIssuance table) ✓
8. RewardSTACK webhook received and processed ✓

**SQL Validation**:
```sql
-- Check ChallengeAssignment records created
SELECT COUNT(*) FROM "ChallengeAssignment";
-- Expected: >0

-- Check manager reviews happening
SELECT COUNT(*) FROM "ActivitySubmission"
WHERE "managerReviewedBy" IS NOT NULL
AND "managerReviewedAt" > NOW() - INTERVAL '1 hour';
-- Expected: >0 (if any reviews occurred)

-- Check webhook events processed
SELECT COUNT(*) FROM "ActivityEvent"
WHERE type IN ('SUBMISSION_MANAGER_APPROVED', 'REWARD_FULFILLED')
AND "createdAt" > NOW() - INTERVAL '1 hour';
-- Expected: >0 (if events occurred)
```

---

### Monitoring (1-24 hours)

**Key Metrics**:
- Manager dashboard load time: <500ms p95
- Manager review API response time: <300ms p95
- RewardSTACK API success rate: >99%
- Webhook processing time: <100ms p95
- Email delivery rate: >99%
- Error rate: <0.5%

**Alerts** (configure in monitoring tool):
- Manager API errors >10/minute
- RewardSTACK API failures >5/minute
- Webhook signature failures >1/minute
- Database slow queries >50ms (manager queries)
- Email send failures >10/hour

---

## Rollback Procedures

### Option 1: Feature Flag Rollback (Recommended)

**Duration**: ~5 minutes
**Impact**: Manager features disabled, existing data preserved

```bash
# Disable manager workflow
vercel env remove ENABLE_MANAGER_WORKFLOW
vercel env add ENABLE_MANAGER_WORKFLOW=false
vercel deploy --prod

# Verify rollback
curl https://changemaker.im/api/workspaces/test/manager/dashboard
# Expected: 403 Forbidden or feature disabled message
```

**Advantages**:
- Instant rollback
- No data loss
- No code revert needed
- Can re-enable when issue is fixed

**Disadvantages**:
- Existing manager assignments remain in database (no harm)
- Managers see "Feature disabled" message

---

### Option 2: Code Rollback

**Duration**: ~15-20 minutes
**Impact**: Full feature removal, previous version restored

```bash
# Find previous deployment
vercel ls --prod | head -5

# Rollback to previous deployment
vercel rollback [previous-deployment-url]

# Verify rollback
curl https://changemaker.im/api/health
git log -1 --oneline
```

**Advantages**:
- Complete removal of new code
- Proven stable version
- No feature flag logic

**Disadvantages**:
- Database schema changes remain (safe, not used)
- Requires redeployment to re-enable
- Takes longer than feature flag

---

### Option 3: Database Rollback (AVOID)

**⚠️ LAST RESORT ONLY - Data loss will occur**

```bash
# This will DELETE all manager assignments, reviews, etc.
# Only use if database corruption occurs

# Restore from backup
pg_restore --clean --if-exists -d $PROD_DB_URL backups/prod_pre_manager_*.sql

# Re-run migrations to current state (minus manager changes)
git checkout [commit-before-manager-feature]
pnpm prisma migrate deploy
```

**This is NOT RECOMMENDED** unless there is critical database corruption.

---

## Troubleshooting

### Issue 1: Manager Dashboard Not Loading

**Symptoms**: Manager sees 500 error on dashboard

**Diagnosis**:
```bash
# Check logs
vercel logs --prod | grep "manager/dashboard"

# Check database connection
psql $PROD_DB_URL -c "SELECT 1;"

# Check for slow queries
SELECT query, mean_exec_time
FROM pg_stat_statements
WHERE query LIKE '%ChallengeAssignment%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**Solutions**:
1. Check database connection pool (may be exhausted)
2. Verify indexes exist on ChallengeAssignment
3. Check for N+1 query issues
4. Restart application pods/functions

---

### Issue 2: RewardSTACK API Calls Failing

**Symptoms**: Rewards stuck in PENDING status

**Diagnosis**:
```bash
# Check RewardSTACK API health
curl -H "Authorization: Bearer $REWARDSTACK_API_KEY" \
  https://admin.alldigitalrewards.com/api/v2/health

# Check failed rewards
SELECT COUNT(*) FROM "RewardIssuance"
WHERE status = 'FAILED'
AND "createdAt" > NOW() - INTERVAL '1 hour';

# Check error logs
vercel logs --prod | grep "rewardstack" | grep "error"
```

**Solutions**:
1. Verify API key is correct
2. Check IP allowlist (if RewardSTACK has one)
3. Verify API URL is correct (staging vs production)
4. Check rate limiting
5. Use manual retry endpoint: `/api/workspaces/[slug]/rewards/[id]/retry`

---

### Issue 3: Webhook Events Not Processing

**Symptoms**: Rewards stay in PENDING_FULFILLMENT

**Diagnosis**:
```bash
# Check webhook signature verification
vercel logs --prod | grep "webhook" | grep "signature"

# Check webhook secret matches
echo $REWARDSTACK_WEBHOOK_SECRET

# Test webhook manually
curl -X POST https://changemaker.im/api/webhooks/rewardstack \
  -H "Content-Type: application/json" \
  -H "X-RewardStack-Signature: [test-signature]" \
  -d '{"event":"reward.fulfilled","data":{"rewardId":"test"}}'
```

**Solutions**:
1. Verify webhook secret is correct
2. Check webhook signature verification logic
3. Whitelist RewardSTACK IPs (if firewall enabled)
4. Check webhook endpoint is publicly accessible
5. Review RewardSTACK webhook logs in their dashboard

---

### Issue 4: Email Notifications Not Sending

**Symptoms**: Managers/participants not receiving emails

**Diagnosis**:
```bash
# Check Resend dashboard for failures
# https://resend.com/dashboard/logs

# Check email queue (if using queue)
SELECT COUNT(*) FROM "EmailQueue"
WHERE status = 'FAILED';

# Check logs
vercel logs --prod | grep "email" | grep "error"
```

**Solutions**:
1. Verify SMTP credentials are correct
2. Check email rate limits
3. Verify sender domain is verified
4. Check for bounces/spam reports
5. Review email template rendering (test locally)

---

### Issue 5: Admin Cannot Assign Managers

**Symptoms**: POST /managers returns 422

**Diagnosis**:
```bash
# Check user role
SELECT id, email, role FROM "User"
WHERE email = 'manager@example.com';

# Check WorkspaceMembership
SELECT wm.role FROM "WorkspaceMembership" wm
JOIN "User" u ON wm."userId" = u.id
WHERE u.email = 'manager@example.com';
```

**Solutions**:
1. Verify user has MANAGER role in WorkspaceMembership
2. Check User.role is MANAGER (for compatibility)
3. Verify workspace membership exists
4. Check admin has ADMIN role

---

## Monitoring Dashboard Setup

**Recommended Metrics** (DataDog/Grafana/New Relic):

```yaml
Manager Workflow Dashboard:
  - manager_reviews_per_hour (by workspace)
  - manager_avg_review_time_minutes
  - manager_approval_rate (approved / total reviews)
  - pending_submissions_count (by manager)
  - admin_overrides_count (by workspace)

RewardSTACK Integration:
  - rewardstack_api_calls_total (by endpoint)
  - rewardstack_api_errors (by error type)
  - rewardstack_api_latency_ms (p50, p95, p99)
  - webhook_events_processed (by event type)
  - rewards_pending_fulfillment_count
  - rewards_failed_count

Email Notifications:
  - emails_sent_total (by template)
  - emails_failed (by error reason)
  - email_delivery_time_seconds
```

**Alert Rules**:
```yaml
Critical:
  - manager_api_error_rate > 5% (last 5 minutes)
  - rewardstack_api_error_rate > 10% (last 5 minutes)
  - database_connection_pool_usage > 90%

Warning:
  - manager_avg_review_time > 24 hours
  - pending_submissions_count > 100 (per manager)
  - email_delivery_rate < 95%
  - webhook_processing_time > 500ms
```

---

## Security Checklist

Post-deployment security validation:

- [ ] Webhook signature verification is working
- [ ] Manager cannot access non-assigned challenges
- [ ] Manager cannot assign other managers
- [ ] Manager cannot access admin endpoints
- [ ] RBAC permissions correctly enforced
- [ ] SQL injection tests pass (parameterized queries)
- [ ] XSS tests pass (email templates)
- [ ] CSRF protection enabled on all POST endpoints
- [ ] Rate limiting functional (if implemented)
- [ ] API keys stored in environment variables (not code)

**Security Testing**:
```bash
# Test manager isolation
curl https://changemaker.im/api/workspaces/workspace-a/challenges/challenge-b/submissions \
  -H "Cookie: sb-access-token=$MANAGER_A_TOKEN"
# Expected: 403 Forbidden (manager A not assigned to challenge B)

# Test privilege escalation
curl -X POST https://changemaker.im/api/workspaces/test/challenges/test/managers \
  -H "Cookie: sb-access-token=$MANAGER_TOKEN" \
  -d '{"managerId":"other-manager"}'
# Expected: 403 Forbidden (only admins can assign)
```

---

## Customer Communication

### Pre-Deployment Announcement

**To**: All workspace admins
**Subject**: New Feature: Manager Role for Submission Review
**Date**: October 20, 2025

> Hi [Admin Name],
>
> We're excited to announce a new feature launching on October 22, 2025: **Manager Role**.
>
> **What's New**:
> - Assign managers to specific challenges
> - Managers can review and approve submissions
> - Optional two-stage approval (manager + admin)
> - Email notifications for all workflow steps
>
> **Action Required**:
> - Review the [Manager Review Guide](https://docs.changemaker.im/guides/manager-review-guide)
> - Identify which challenges would benefit from manager review
> - Assign managers after deployment (we'll send instructions)
>
> **No Impact** to existing workflows - this is an optional feature.
>
> Questions? Reply to this email or contact support.
>
> — The Changemaker Team

### Post-Deployment Announcement

**To**: All users
**Subject**: Manager Role is Now Live!
**Date**: October 22, 2025

> The Manager Role feature is now available for all workspaces!
>
> **Admins**: Visit [Workspace Settings > Managers] to assign managers to challenges.
>
> **Managers**: Check out the [Manager Review Guide](https://docs.changemaker.im/guides/manager-review-guide) to get started.
>
> **Participants**: No changes to how you submit activities. You'll receive faster feedback from assigned managers!
>
> — The Changemaker Team

---

## Success Criteria

Deployment is considered successful if:

- [ ] Zero critical bugs reported in first 24 hours
- [ ] Manager dashboard loads <500ms for all users
- [ ] At least 5 workspaces have assigned managers
- [ ] At least 20 submissions reviewed by managers
- [ ] Email delivery rate >99%
- [ ] RewardSTACK API success rate >99%
- [ ] Zero database rollbacks required
- [ ] Customer feedback >4/5 stars (if surveyed)

---

## Related Documentation

- [Manager Role Schema](../schema/manager-role.md) - Database schema details
- [Manager API Endpoints](../api/manager-endpoints.md) - API documentation
- [Manager Review Guide](../guides/manager-review-guide.md) - User guide
- `.claude/plans/implementation-roadmap.md` - Full implementation plan

---

## Appendix: SQL Scripts

### A. Create Test Manager User

```sql
-- Create user in Supabase Auth first, then run:
UPDATE "User"
SET role = 'MANAGER'
WHERE email = 'manager-test@example.com';

INSERT INTO "WorkspaceMembership" ("userId", "workspaceId", "role", "isPrimary")
SELECT u.id, w.id, 'MANAGER'::\"Role\", false
FROM "User" u, "Workspace" w
WHERE u.email = 'manager-test@example.com'
AND w.slug = 'test-workspace';
```

### B. Assign Manager to All Active Challenges

```sql
-- Useful for testing
INSERT INTO "ChallengeAssignment" (
  "challengeId",
  "managerId",
  "workspaceId",
  "assignedBy"
)
SELECT
  c.id,
  (SELECT id FROM "User" WHERE email = 'manager@example.com' LIMIT 1),
  c."workspaceId",
  (SELECT id FROM "User" WHERE role = 'ADMIN' LIMIT 1)
FROM "Challenge" c
WHERE c.status = 'ACTIVE'
ON CONFLICT ("challengeId", "managerId") DO NOTHING;
```

### C. Data Cleanup (if needed)

```sql
-- Remove all manager assignments (CAREFUL!)
DELETE FROM "ChallengeAssignment";

-- Remove all manager reviews (CAREFUL!)
UPDATE "ActivitySubmission"
SET
  "managerReviewedBy" = NULL,
  "managerNotes" = NULL,
  "managerReviewedAt" = NULL
WHERE "managerReviewedBy" IS NOT NULL;

-- Downgrade all managers to participants (CAREFUL!)
UPDATE "User"
SET role = 'PARTICIPANT'
WHERE role = 'MANAGER';

UPDATE "WorkspaceMembership"
SET role = 'PARTICIPANT'
WHERE role = 'MANAGER';
```

---

## Change Log

| Date | Version | Change | Author |
|------|---------|--------|--------|
| 2025-10-20 | 1.0 | Initial runbook | Claude Code |

---

*This runbook is maintained in `docs/deployment/manager-role-runbook.md` and should be updated after each deployment.*
