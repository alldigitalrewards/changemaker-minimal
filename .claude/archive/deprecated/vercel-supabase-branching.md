# Vercel + Supabase Branching Workflow

## Setup (One-Time Configuration)

### 1. Supabase GitHub Integration
**Location**: Supabase Dashboard → Settings → Integrations → GitHub

Current Configuration ✅:
- **Supabase directory**: `/` (root level - where `supabase/` folder lives)
- **Production branch**: `main`
- **Deploy to production**: ON (auto-applies migrations on merge to main)
- **Automatic branching**: ON (creates preview branches for PRs)
- **Branch limit**: 50
- **Supabase changes only**: ON (only creates branches if Supabase files change)

### 2. Vercel Integration ✅ CONFIGURED
**Location**: Supabase Dashboard → Settings → Integrations → Vercel

**Current Configuration**:
```
Production:   ✅ ENABLED  (syncs to Vercel production)
Preview:      ✅ ENABLED  (syncs to Vercel preview deployments)
Development:  ❌ DISABLED (optional - only if you want local dev branch)
```

### 3. Staging Branch Setup

**Persistent Staging Branch** (for integration testing before production):

Created persistent Supabase branch named `staging`:
- **Branch Type**: Persistent (long-lived, not auto-deleted)
- **Git Branch**: `staging` (tracks feature branches before main)
- **Vercel Domain**: `preview.changemaker.im`
- **Supabase URL**: `https://ffivsyhuyathrnnlajjq.supabase.co`

**How to Configure Staging in Vercel** (Step-by-Step):

**Step 1: Add Environment Variables**

Go to Vercel Dashboard → Your Project → Settings → Environment Variables, then add each variable below with these settings:
- **Scope**: Preview
- **Git Branch**: `staging` (exact match)

Add the following 5 variables:

```bash
# Variable 1
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://ffivsyhuyathrnnlajjq.supabase.co
Environment: Preview
Git Branch: staging

# Variable 2
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaXZzeWh1eWF0aHJubmxhampxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzI5NzIsImV4cCI6MjA3NjY0ODk3Mn0.YLk6vRDSmiP_i6-X1AIKuzVy4KNkChi7HEgsg345eyM
Environment: Preview
Git Branch: staging

# Variable 3
Name: DATABASE_URL
Value: postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
Environment: Preview
Git Branch: staging

# Variable 4
Name: DIRECT_URL
Value: postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:5432/postgres
Environment: Preview
Git Branch: staging

# Variable 5
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaXZzeWh1eWF0aHJubmxhampxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3Mjk3MiwiZXhwIjoyMDc2NjQ4OTcyfQ.ALSR4iKBN3GAPT2WwGN2EjrwtKIA2InfGxtW6-omvEU
Environment: Preview
Git Branch: staging
```

**Step 2: Configure Git Branch Settings**

Go to Vercel Dashboard → Your Project → Settings → Git:
- Production Branch: `main`
- Preview Deployments: Enable "Automatic Deployments" for `staging` branch

**Step 3: Configure Custom Domain (Optional)**

Go to Vercel Dashboard → Your Project → Settings → Domains:
- Add domain: `preview.changemaker.im`
- Set as Preview branch domain for `staging`

**Step 4: Deploy Staging**

```bash
# Push to staging branch to trigger deployment
git checkout staging
git push origin staging
```

### 4. Environment Variables

**Production** (changemaker.im):
```bash
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

**Staging** (preview.changemaker.im via `staging` branch):
```bash
# Manually configured in Vercel for staging branch
DATABASE_URL="postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://ffivsyhuyathrnnlajjq.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaXZzeWh1eWF0aHJubmxhampxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzI5NzIsImV4cCI6MjA3NjY0ODk3Mn0.YLk6vRDSmiP_i6-X1AIKuzVy4KNkChi7HEgsg345eyM"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaXZzeWh1eWF0aHJubmxhampxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3Mjk3MiwiZXhwIjoyMDc2NjQ4OTcyfQ.ALSR4iKBN3GAPT2WwGN2EjrwtKIA2InfGxtW6-omvEU"
```

**Preview Branches** (temporary PR previews):
```bash
# Auto-injected by Supabase → Vercel integration
DATABASE_URL="postgresql://postgres.[preview-ref]:[password]@aws-0-us-east-2.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[preview-ref].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
```

**Local Development**:
```bash
# From .env.local (not committed to git)
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..." # Local Supabase key
```

---

## Professional Development Workflow (Three-Tier Architecture)

### Scenario 1: Feature Development with Database Changes

**Example**: Adding manager role (Phase 1 PR #46)

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/manager-role-phase1-clean

# 2. Make Prisma schema changes
# Edit: prisma/schema.prisma

# 3. Generate migration locally
pnpm prisma migrate dev --name add_manager_role_schema

# 4. Test migration locally
supabase db reset         # Reset local DB
pnpm prisma db push      # Apply to local Supabase
pnpm test                # Run tests

# 5. Commit and push
git add prisma/
git commit -m "feat: add manager role schema"
git push -u origin feature/manager-role-phase1-clean

# 6. Open PR targeting STAGING (not main)
gh pr create --base staging --title "feat: Manager Role Foundation (Phase 1)"
```

**What Happens Automatically (Feature → Staging PR)**:

1. **Supabase GitHub Integration**:
   - Detects `supabase/` changes in PR
   - Creates preview branch: `feature-manager-role-phase1-clean`
   - Runs migrations from `supabase/migrations/`
   - Posts comment on PR with preview branch details

2. **Supabase → Vercel Integration**:
   - Injects preview branch credentials into Vercel
   - `DATABASE_URL` → preview branch DB
   - `NEXT_PUBLIC_SUPABASE_URL` → preview branch API

3. **Vercel**:
   - Detects new commit on PR
   - Builds preview deployment
   - Uses Supabase preview branch env vars
   - Deploys to: `https://changemaker-minimal-git-<branch>-alldigitalrewards.vercel.app`

4. **On Merge to Staging**:
   - Migration runs on persistent staging database (`ffivsyhuyathrnnlajjq`)
   - Vercel redeploys `staging` branch
   - Available at: `https://preview.changemaker.im`
   - Integration testing on persistent DB with accumulated features

5. **Result**:
   - ✅ Isolated preview for testing migration
   - ✅ Persistent staging for integration testing
   - ✅ No impact on production data

---

### Scenario 2: Frontend-Only Changes

**Example**: UI polish, no database changes

```bash
git checkout -b feature/polish-dashboard
# Edit: src/app/dashboard/page.tsx
git commit -m "feat: improve dashboard UI"
git push
gh pr create --base staging
```

**What Happens**:
- **Supabase**: Does nothing (no `supabase/` changes detected)
- **Vercel**: Builds preview using staging Supabase credentials
- **Result**: Preview deployment works immediately with staging data

---

### Scenario 3: Promoting Staging to Production

**Example**: After testing features on staging, promote to production

```bash
# 1. Ensure staging is tested and stable
# Test at: https://preview.changemaker.im

# 2. Create PR from staging to main
git checkout staging
git pull origin staging
gh pr create --base main --head staging --title "Release: Promote staging to production"

# 3. Review changes (all merged features since last release)
# Supabase creates preview branch from production schema
# Vercel creates preview deployment

# 4. Merge to main
# Migrations run on production database
# Vercel deploys to changemaker.im
```

**What Happens**:
1. **Supabase**: Creates preview testing all accumulated migrations
2. **Vercel**: Preview deployment with production credentials
3. **On Merge**: Migrations run on production, deploy to `changemaker.im`

---

## Database Branch Lifecycle

### When Preview Branches Are Created

Supabase creates a preview branch when:
1. PR is opened
2. `supabase/` directory has changes
3. "Supabase changes only" is ON (recommended)

### Preview Branch Contents

**Created fresh from production**:
- ✅ Schema (all tables, indexes, RLS policies)
- ❌ Data (empty - no production data copied)
- ✅ Migrations (applied from `supabase/migrations/`)

### Testing with Data

If you need test data in preview branch:

```bash
# Option 1: Use seed script (recommended)
# Preview branch auto-runs: supabase/seed.sql (if exists)

# Option 2: Manual seeding via API
# Your app's seed endpoint runs on first preview deployment
# Example: POST /api/seed (protected by auth)

# Option 3: Copy production data (use carefully!)
# Via Supabase Dashboard → Database → Migrations
# "Copy data from production" (available in Supabase Pro)
```

### When Branches Are Deleted

Supabase auto-deletes preview branch when:
- PR is merged
- PR is closed
- Branch limit reached (keeps 50 most recent)

---

## Migration Strategy

### Development Flow (Three-Tier)

```
Local Dev              Feature Preview         Staging                Production
─────────────────────────────────────────────────────────────────────────────────
1. Create migration    2. Test on preview   →  3. Merge to staging  → 4. Merge to main
   (supabase migrate)    (Supabase PR branch)    (persistent DB)       (auto-deploy)

   ↓                     ↓                       ↓                     ↓
   Local DB              Temp Preview DB         Staging DB            Production DB
   (127.0.0.1:54322)     (temp-abc.supabase.co)  (ffivsyhuyathrnnl...) (naptpgyrdao...)
```

**Flow Explanation:**
1. **Local**: Develop and test migration locally
2. **Feature Preview**: PR to staging creates temporary Supabase preview branch
3. **Staging**: Merge runs migration on persistent staging DB for integration testing
4. **Production**: PR from staging → main, merge deploys to production

### Migration Files

**Location**: `supabase/migrations/`

```
supabase/
├── migrations/
│   ├── 20251021092322_add_manager_role_schema/
│   │   └── migration.sql          # Phase 1 migration
│   └── 20251028120000_add_manager_apis/
│       └── migration.sql          # Phase 2 migration (future)
├── config.toml                    # Supabase config
└── seed.sql                       # Test data (optional)
```

### Safe Migration Checklist

Before merging to main:

- [ ] Migration tested locally (`supabase db reset`)
- [ ] Migration tested on preview branch (via PR)
- [ ] Backward compatible (won't break existing code)
- [ ] No data loss (verified on preview)
- [ ] Rollback plan documented
- [ ] Team approved (PR review)

---

## Troubleshooting

### Issue: "Supabase ignored PR"

**Cause**: Supabase didn't find changes in the directory it expects.

**Solutions**:
1. Check "Supabase directory" setting: Should be `/` (root)
2. Verify `supabase/` folder exists in repo root
3. Ensure PR has changes in `supabase/migrations/` or `supabase/config.toml`
4. Try toggling "Supabase changes only" to OFF temporarily

### Issue: "Vercel preview deployment failed"

**Cause**: Preview environment not enabled in Vercel integration.

**Solution**:
1. Go to: Supabase Dashboard → Settings → Integrations → Vercel
2. Click "Manage" on your project
3. Enable "Preview" toggle
4. Save changes
5. Redeploy on Vercel (or push new commit to PR)

### Issue: "Preview branch has no data"

**Expected Behavior**: Preview branches start empty.

**Solution**: Add `supabase/seed.sql` for test data:

```sql
-- supabase/seed.sql
INSERT INTO "Workspace" (id, name, slug)
VALUES
  ('...', 'Test Workspace', 'test');

INSERT INTO "User" (id, email, role, "workspaceId")
VALUES
  ('...', 'test@example.com', 'ADMIN', '...');
```

Or run your app's seed script:
```bash
pnpm prisma db seed
```

### Issue: "Migration failed on preview branch"

**Debugging**:
1. Check Supabase PR comment for error details
2. Common causes:
   - Syntax error in SQL
   - Missing dependencies (trying to reference non-existent table)
   - RLS policy conflict
3. Fix locally, push update to PR
4. Supabase will retry migration automatically

---

## Best Practices

### 1. Always Test Migrations on Preview First
```bash
# DON'T do this:
git push origin main  # Directly to production ❌

# DO this:
git push origin feature/new-schema
gh pr create
# Wait for preview branch to succeed ✅
# Then merge PR
```

### 2. Keep Migrations Small and Focused
```
✅ GOOD: One migration = One feature
- 20251021092322_add_manager_role_schema/

❌ BAD: One migration = Multiple features
- 20251021092322_add_everything/
```

### 3. Use Seed Data for Testing
```sql
-- supabase/seed.sql
-- Auto-runs on preview branches
INSERT INTO "User" ...
INSERT INTO "Challenge" ...
```

### 4. Document Breaking Changes
```sql
-- migration.sql

-- BREAKING CHANGE: Removes deprecated field
-- Migration path:
--   1. Deploy new code (reads new field)
--   2. Run migration (adds new field, copies data)
--   3. Deploy cleanup (removes old field reads)

ALTER TABLE "ActivitySubmission"
  ADD COLUMN "managerReviewedBy" UUID;
```

### 5. Monitor Production Migrations
```bash
# After merging to main, watch Supabase Dashboard
# Ensure migration completes successfully
# Check for errors in Database → Migrations
```

---

## Environment Architecture

### Three-Tier Deployment Strategy

```
Development (Local)
    ↓ git push feature branch → open PR
Feature Preview (Temporary)
    ↓ merge to staging
Staging (Persistent)
    ↓ merge to main
Production (Live)
```

### Environment Cheat Sheet

| Environment | Git Branch | Database | API URL | Vercel Domain | Lifecycle |
|-------------|------------|----------|---------|---------------|-----------|
| **Local** | Any | `127.0.0.1:54322` | `http://127.0.0.1:54321` | localhost:3000 | Local only |
| **Feature Preview** | `feature/*` | `preview-<hash>.supabase.co` | `https://preview-<hash>.supabase.co` | Auto-generated | Auto-deleted on PR close |
| **Staging** | `staging` | `ffivsyhuyathrnnlajjq.supabase.co` | `https://ffivsyhuyathrnnlajjq.supabase.co` | `preview.changemaker.im` | Persistent |
| **Production** | `main` | `naptpgyrdaoachpmbyaq.supabase.co` | `https://naptpgyrdaoachpmbyaq.supabase.co` | `changemaker.im` | Persistent |

### Workflow Summary

1. **Develop locally** → Test with local Supabase
2. **Open PR** → Supabase creates temporary preview branch + Vercel deploys preview
3. **Merge to `staging`** → Persistent staging environment for integration testing
4. **Merge to `main`** → Production deployment with migration auto-apply

---

## Quick Reference Commands

```bash
# Local Development
supabase start                    # Start local Supabase
supabase db reset                 # Reset local DB to migrations
pnpm prisma migrate dev           # Create new migration
pnpm prisma db push              # Quick schema changes (no migration)

# Preview Branch Testing
gh pr create                      # Opens PR → creates Supabase preview branch
# (Wait for Supabase PR comment with preview branch details)

# Production Deployment
git checkout main
git merge feature/my-branch       # Merge PR
git push origin main             # Auto-runs migration on production
```

---

**Last Updated**: 2025-10-21
**Status**: Production-ready after enabling Preview in Vercel integration
