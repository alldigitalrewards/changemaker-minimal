# Three-Tier Development Workflow

**Status**: ✅ Active (configured 2025-10-21)

This document describes the complete three-tier development workflow for the Changemaker project.

---

## Architecture Overview

```
Development (Local)
    ↓ git push feature/xyz → open PR to staging
Feature Preview (Temporary Supabase Branch)
    ↓ merge PR to staging
Staging (Persistent Integration Testing)
    ↓ git PR staging → main
Production (Live Application)
```

---

## Environment Matrix

| Tier | Git Branch | Database | Supabase URL | Vercel Domain | Lifecycle |
|------|------------|----------|--------------|---------------|-----------|
| **Development** | `feature/*` | Local Supabase | `127.0.0.1:54321` | `localhost:3000` | Local only |
| **Feature Preview** | `feature/*` (PR) | Temp Supabase | `<hash>.supabase.co` | Auto-generated | Auto-deleted on PR close |
| **Staging** | `staging` | Persistent Supabase | `ffivsyhuyathrnnlajjq.supabase.co` | `preview.changemaker.im` | Persistent |
| **Production** | `main` | Production Supabase | `naptpgyrdaoachpmbyaq.supabase.co` | `changemaker.im` | Persistent |

---

## Complete Workflow

### 1. Feature Development (Local)

**Start every feature from main:**

```bash
# 1. Ensure main is up to date
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Develop locally
# - Edit code
# - Create/update migrations (if needed)
# - Test with local Supabase

# 4. Test migration locally (if schema changes)
supabase db reset         # Reset to clean state
pnpm prisma db push      # Apply schema
pnpm test                # Run tests

# 5. Commit and push
git add .
git commit -m "feat: your feature description"
git push -u origin feature/your-feature-name
```

---

### 2. Feature Preview (PR to Staging)

**Open PR targeting staging:**

```bash
# Create PR targeting staging branch
gh pr create --base staging --title "feat: Your Feature Name"
```

**What happens automatically:**

1. **Supabase** (if `supabase/` changes detected):
   - Creates temporary preview branch
   - Runs migrations from `supabase/migrations/`
   - Posts comment on PR with credentials

2. **Vercel**:
   - Builds preview deployment
   - Uses Supabase preview branch credentials (auto-injected)
   - Deploys to auto-generated URL

3. **Testing**:
   - Test migration in isolation
   - Test feature against clean preview database
   - No risk to staging or production data

---

### 3. Merge to Staging (Integration Testing)

**After PR approval:**

```bash
# Merge PR via GitHub UI or CLI
gh pr merge <pr-number> --squash
```

**What happens automatically:**

1. **Supabase**:
   - Runs migration on persistent staging database
   - Accumulates with previous features

2. **Vercel**:
   - Builds and deploys `staging` branch
   - Uses staging Supabase credentials
   - Available at `preview.changemaker.im`

3. **Integration Testing**:
   - Test feature with accumulated changes
   - Test with other merged features
   - Persistent database allows realistic testing

---

### 4. Promote to Production (Staging → Main)

**When staging is tested and stable:**

```bash
# 1. Ensure staging is tested
# Visit: https://preview.changemaker.im

# 2. Create release PR
git checkout staging
git pull origin staging
gh pr create \
  --base main \
  --head staging \
  --title "Release: $(date +%Y-%m-%d) - Production deployment"

# 3. Add release notes to PR description
# - List all features included
# - Note any breaking changes
# - Document migration details

# 4. Get approval and merge
gh pr merge <pr-number> --squash
```

**What happens automatically:**

1. **Supabase**:
   - Creates preview branch for final testing
   - On merge: runs ALL accumulated migrations on production

2. **Vercel**:
   - Builds and deploys to `changemaker.im`
   - Uses production Supabase credentials

3. **Production Deployment**:
   - All features from staging go live
   - Migrations run automatically
   - Zero-downtime deployment

---

## Workflow for Different Types of Changes

### Database Changes (Migrations)

```bash
# 1. Create migration locally
pnpm prisma migrate dev --name descriptive_name

# 2. Test locally
supabase db reset
pnpm prisma db push
pnpm test

# 3. Open PR to staging
gh pr create --base staging

# 4. Supabase creates preview branch automatically
# 5. Test on preview deployment
# 6. Merge to staging → migration runs on staging DB
# 7. Test on preview.changemaker.im
# 8. When ready: staging → main → production
```

### Frontend-Only Changes (No Migrations)

```bash
# 1. Develop locally
# Edit UI components

# 2. Open PR to staging
gh pr create --base staging

# 3. Vercel creates preview (no Supabase preview needed)
# 4. Merge to staging → test on preview.changemaker.im
# 5. When ready: staging → main → production
```

### Hotfixes (Emergency Production Fixes)

```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix

# 2. Fix the issue
# Make minimal changes

# 3. Open PR to STAGING first (maintain workflow)
gh pr create --base staging --label hotfix

# 4. Fast-track review and merge
# 5. Immediately create staging → main PR
# 6. Deploy to production
```

**Note**: Even hotfixes go through staging to maintain consistency and avoid bypassing the tested path.

---

## Branch Protection Rules (Recommended)

### Main Branch Protection

- ✅ Require pull request before merging
- ✅ Require approvals (1 minimum)
- ✅ Require status checks to pass:
  - Vercel deployment
  - Tests (if configured)
- ✅ Require conversation resolution before merging
- ❌ Do not allow force pushes
- ✅ Require linear history (squash merges)

### Staging Branch Protection

- ✅ Require pull request before merging
- ⚠️ Require approvals (optional - can be 0 for faster iteration)
- ✅ Require status checks to pass:
  - Vercel deployment
- ✅ Allow force pushes from maintainers (for rebasing if needed)

**To configure**: Go to GitHub → Settings → Branches → Add rule

---

## Supabase Configuration

### Current Setup

**GitHub Integration**:
- Supabase directory: `/` (root level)
- Production branch: `main`
- Deploy to production: ON
- Automatic branching: ON (creates previews for PRs)
- Supabase changes only: ON

**Vercel Integration**:
- Production: ENABLED (syncs to `main` branch)
- Preview: ENABLED (syncs to PR preview branches)

### Persistent Branches

1. **Production**: `main` branch
   - Database: `naptpgyrdaoachpmbyaq.supabase.co`
   - Auto-deploys on merge to `main`

2. **Staging**: `staging` branch
   - Database: `ffivsyhuyathrnnlajjq.supabase.co`
   - Manually configured in Vercel
   - Persistent for integration testing

---

## Best Practices

### 1. Always Branch from Main

```bash
# ✅ CORRECT
git checkout main
git pull origin main
git checkout -b feature/new-thing

# ❌ WRONG
git checkout staging
git checkout -b feature/new-thing  # Creates merge conflicts later
```

### 2. Keep PRs Small and Focused

- One feature per PR
- Easy to review
- Easy to revert if needed
- Faster to merge

### 3. Test on Staging Before Production

- Merge multiple features to staging
- Test integration on `preview.changemaker.im`
- Batch promote to production weekly (or as needed)

### 4. Use Descriptive Branch Names

```bash
# ✅ GOOD
feature/manager-review-workflow
fix/enrollment-validation-bug
refactor/auth-middleware

# ❌ BAD
feature/new-stuff
fix/bug
update
```

### 5. Write Clear Commit Messages

```bash
# ✅ GOOD
feat: add manager approval workflow (Task 10)
fix: prevent duplicate enrollments
refactor: extract middleware to separate module

# ❌ BAD
changes
fixed stuff
update
```

---

## Troubleshooting

### PR Deployment Failed

**Check**:
1. Vercel logs for build errors
2. Environment variables configured correctly
3. Database connection working

**Fix**:
- Push new commit with fixes
- Vercel will redeploy automatically

### Migration Failed on Staging

**Check**:
1. Supabase PR comment for error details
2. Test migration locally first
3. Check for syntax errors or missing dependencies

**Fix**:
- Fix migration file
- Push update to PR
- Supabase retries automatically

### Staging Out of Sync with Main

**Cause**: Main was updated directly (hotfix or bypass)

**Fix**:
```bash
# Sync staging with main
git checkout staging
git pull origin staging
git merge main
git push origin staging
```

### Need to Revert Feature

**On Staging**:
```bash
git checkout staging
git revert <commit-hash>
git push origin staging
```

**On Production**:
- Create hotfix PR reverting the feature
- Follow normal staging → production flow

---

## Quick Reference Commands

```bash
# Start new feature
git checkout main && git pull && git checkout -b feature/xyz

# Open PR to staging
gh pr create --base staging

# Promote staging to production
gh pr create --base main --head staging

# Check current branch
git branch --show-current

# View remote branches
git branch -r

# Sync staging with main (if needed)
git checkout staging && git merge main && git push

# View Supabase migrations
ls -la supabase/migrations/

# Test migration locally
supabase db reset && pnpm prisma db push
```

---

## Migration Checklist

Before merging migration to production:

- [ ] Migration tested locally (`supabase db reset`)
- [ ] Migration tested on feature preview branch
- [ ] Migration tested on staging (persistent DB)
- [ ] Backward compatible (won't break existing code)
- [ ] No data loss verified
- [ ] Rollback plan documented
- [ ] Team approved via PR review
- [ ] Staging tested at `preview.changemaker.im`

---

**Last Updated**: 2025-10-21
**Status**: Active - Three-tier workflow configured and operational
