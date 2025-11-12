# Sprint Workflow (Multi-Phase Features)

**Use Case**: Implementing large features broken into multiple phases (e.g., Manager Role Phases 1-5)

---

## Overview

This workflow allows you to:
- Test each phase independently on `preview.changemaker.im`
- Accumulate changes on staging before production
- Get final Supabase preview when promoting to production
- Keep `preview.changemaker.im` always pointing to staging

---

## Architecture

```
Phase 1 Feature Branch
    ↓ PR to staging (no Supabase preview)
    ↓ Merge + Manual Migration
    ↓ Test on preview.changemaker.im
    ↓
Phase 2 Feature Branch (from staging)
    ↓ PR to staging (no Supabase preview)
    ↓ Merge + Manual Migration
    ↓ Test on preview.changemaker.im
    ↓
... Phases 3, 4, 5 ...
    ↓
All phases tested on staging
    ↓
staging → main PR (Supabase preview ✅)
    ↓ Merge (auto-migrations ✅)
    ↓
Production deployment
```

---

## Phase Implementation Workflow

### Step 1: Implement Phase

```bash
# Start from staging (or main for Phase 1)
git checkout staging
git pull origin staging

# Create feature branch
git checkout -b feature/manager-role-phase-N

# Develop feature
# - Edit code
# - Create/update migrations
# - Test locally

# Generate migration (if schema changes)
pnpm prisma migrate dev --name phase_N_description

# Test locally
supabase db reset
pnpm prisma db push
pnpm test
```

---

### Step 2: Open PR to Staging

```bash
# Commit and push
git add .
git commit -m "feat: phase N - description"
git push -u origin feature/manager-role-phase-N

# Open PR targeting staging
gh pr create --base staging --title "feat: Manager Role Phase N"
```

**Expected Behavior**:
- ❌ Supabase: No preview branch (expected - staging is not production)
- ⚠️ Vercel: May fail (no Supabase credentials auto-injected)
- ✅ This is OK! Testing happens after merge.

---

### Step 3: Merge to Staging

```bash
# Get PR approved and merge via GitHub UI
# Or via CLI:
gh pr merge <pr-number> --squash
```

**What happens**:
- ✅ Code merged to staging branch
- ✅ Vercel deploys staging branch to `preview.changemaker.im`
- ✅ GitHub Actions automatically deploys migrations to staging database

---

### Step 4: Verify Migration Deployment (Automatic)

**Migrations are automatically deployed via GitHub Actions** (`.github/workflows/deploy-staging-migrations.yml`)

**What happens automatically**:
1. GitHub Actions workflow triggers on push to `staging`
2. Installs dependencies and generates Prisma client
3. Checks migration status
4. Deploys pending migrations
5. Verifies successful deployment

**Monitor deployment**:
```bash
# View workflow run in GitHub Actions
# Go to: https://github.com/alldigitalrewards/changemaker-minimal/actions

# Or check via CLI
gh run list --workflow="Deploy Staging Migrations" --limit 5
gh run watch  # Watch the latest run
```

**Manual deployment** (if needed):
```bash
# Only use if GitHub Actions fails
export DATABASE_URL="postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
pnpm prisma migrate deploy
```

**Troubleshooting**:
- Check GitHub Actions logs if deployment fails
- Verify `STAGING_DATABASE_URL` secret is configured in GitHub
- Ensure migration files are committed to the staging branch
- Manual deployment available as fallback

---

### Step 5: Test on Staging

**Access**: https://preview.changemaker.im

**Testing Checklist**:
- [ ] Migration applied correctly (check schema)
- [ ] New features work as expected
- [ ] No regressions from previous phases
- [ ] Integration with existing features works
- [ ] Authorization and workspace isolation work
- [ ] Performance acceptable

**Seed Test Data** (if needed):

```bash
# Create test data for demos/QA
export DATABASE_URL="postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
pnpm prisma db seed
```

---

### Step 6: Start Next Phase

```bash
# Pull latest staging (includes merged phase)
git checkout staging
git pull origin staging

# Create branch for next phase
git checkout -b feature/manager-role-phase-N+1

# Continue development...
```

---

## Final Promotion to Production

After all 5 phases are tested on staging:

### Step 1: Create Production PR

```bash
git checkout staging
git pull origin staging

# Create PR from staging to main
gh pr create \
  --base main \
  --head staging \
  --title "Release: Manager Role Sprint (Phases 1-5)"
```

**Add to PR description**:
```markdown
## Sprint Summary

This release includes all 5 phases of the Manager Role feature:

- Phase 1: Schema foundation (Tasks 1-9)
- Phase 2: Manager APIs (Tasks 10-15)
- Phase 3: Manager UI (Tasks 16-21)
- Phase 4: Review workflow (Tasks 22-27)
- Phase 5: Polish & testing (Tasks 28-33)

## Migrations Included

- 20251021092322_add_manager_role_schema
- [list other migrations]

## Testing

All phases tested on staging:
- URL: https://preview.changemaker.im
- Database: staging (persistent)
- Status: ✅ All tests passing

## Breaking Changes

[List any breaking changes or migration notes]
```

---

### Step 2: Supabase Preview (Automatic)

**What happens automatically**:

1. **Supabase**:
   - Creates temporary preview branch
   - Runs ALL accumulated migrations (Phases 1-5)
   - Tests full migration path from production schema

2. **Vercel**:
   - Builds preview deployment
   - Uses Supabase preview credentials
   - Deploys to auto-generated URL

3. **Review**:
   - Check Supabase preview branch logs
   - Ensure all migrations succeed
   - Test preview deployment

---

### Step 3: Merge to Production

```bash
# After approval, merge PR
gh pr merge <pr-number> --squash
```

**What happens automatically**:

1. **Supabase**:
   - Runs ALL migrations on production database
   - Migrations: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

2. **Vercel**:
   - Builds production deployment
   - Uses production Supabase credentials
   - Deploys to `changemaker.im`

3. **Verification**:
   - Check Supabase migration logs
   - Monitor production deployment
   - Verify features work in production

---

## Environment Configuration

| Environment | Branch | Database | Domain | Migrations |
|-------------|--------|----------|--------|------------|
| **Local** | `feature/*` | Local Supabase | `localhost:3000` | `prisma migrate dev` |
| **Staging** | `staging` | Persistent staging | `preview.changemaker.im` | **Automatic** (via GitHub Actions) |
| **Production** | `main` | Production | `changemaker.im` | **Automatic** (via Supabase) |

---

## GitHub Actions Setup

### Required Secret Configuration

Before the automated migration deployment will work, configure this GitHub secret:

**Navigate to**: GitHub → Settings → Secrets and variables → Actions → New repository secret

```
Name: STAGING_DATABASE_URL
Value: postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:5432/postgres
```

**To configure via CLI**:
```bash
gh secret set STAGING_DATABASE_URL --body "postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
```

**Verify secret is configured**:
```bash
gh secret list | grep STAGING_DATABASE_URL
```

---

## Manual Migration Commands Reference

**Note**: These commands are now rarely needed, as GitHub Actions handles staging migrations automatically. Use only for troubleshooting.

### Check Migration Status

```bash
export DATABASE_URL="postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
pnpm prisma migrate status
```

### Deploy Pending Migrations

```bash
export DATABASE_URL="postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
pnpm prisma migrate deploy
```

### Reset Staging Database (Careful!)

```bash
# Only if you need to start fresh
export DATABASE_URL="postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
pnpm prisma migrate reset
```

### Seed Test Data

```bash
export DATABASE_URL="postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
pnpm prisma db seed
```

---

## Best Practices

### 1. Always Pull Staging Before New Phase

```bash
# ✅ CORRECT
git checkout staging
git pull origin staging
git checkout -b feature/phase-N

# ❌ WRONG
git checkout main
git checkout -b feature/phase-N  # Missing previous phases!
```

### 2. Test Migrations Locally First

```bash
# Before opening PR:
supabase db reset
pnpm prisma db push
pnpm test
```

### 3. Manual Migration After Each Merge

Don't forget to run `prisma migrate deploy` after merging each phase!

### 4. Keep Staging in Sync

If main gets hotfixes or other changes:

```bash
git checkout staging
git merge main
git push origin staging
```

### 5. Document Migration Notes

For complex migrations, add notes to PR:
- What tables/columns changed
- Data migration steps (if any)
- Rollback plan
- Performance impact

---

## Troubleshooting

### Migration Failed on Staging

**Symptoms**: `prisma migrate deploy` errors

**Fix**:
1. Check error message
2. Fix migration file
3. Create new migration to correct issues
4. Deploy again

### Staging Out of Sync with Main

**Symptoms**: Merge conflicts when creating staging → main PR

**Fix**:
```bash
git checkout staging
git merge main
# Resolve conflicts
git push origin staging
```

### Need to Rollback Phase on Staging

**Symptoms**: Phase N broke something on staging

**Fix**:
```bash
# Revert the merge commit
git checkout staging
git revert <merge-commit-hash>
git push origin staging

# Re-deploy migrations (may need to create rollback migration)
export DATABASE_URL="..."
pnpm prisma migrate deploy
```

---

## Quick Reference

```bash
# Start new phase
git checkout staging && git pull && git checkout -b feature/phase-N

# Open PR
gh pr create --base staging

# After merge: Deploy migration
export DATABASE_URL="postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
pnpm prisma migrate deploy

# Test
open https://preview.changemaker.im

# Final release
gh pr create --base main --head staging
```

---

**Last Updated**: 2025-10-21
**Status**: Active workflow for multi-phase sprint development
