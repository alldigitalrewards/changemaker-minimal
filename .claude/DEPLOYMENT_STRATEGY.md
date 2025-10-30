# Changemaker Deployment Strategy

## Overview

This document outlines the GitHub → Vercel → Supabase deployment workflow for the Changemaker platform.

**Last Updated**: 2025-10-27
**Strategy Owner**: Jack Felke (@TerminalGravity)

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Branches                          │
├─────────────────────────────────────────────────────────────┤
│  feature/* branches → staging → main                        │
│                          ↓           ↓                       │
│                      Vercel       Vercel                     │
│                      Preview      Production                 │
│                          ↓           ↓                       │
│                    Supabase      Supabase                    │
│                     Staging      Production                  │
└─────────────────────────────────────────────────────────────┘
```

## Environment Configuration

### Production Environment
- **GitHub Branch**: `main`
- **Vercel Project**: `changemaker-minimal` (ID: `prj_VpPfrlx8Ii1klXE0zt6qnASS8mEc`)
- **Vercel Domains**:
  - `changemaker.im` (primary)
  - `www.changemaker.im`
  - `changemaker-minimal.vercel.app`
- **Supabase Project**:
  - Ref: `naptpgyrdaoachpmbyaq`
  - URL: `https://naptpgyrdaoachpmbyaq.supabase.co`
  - Branch: `main` (default)
- **Deployment**: Automatic on push to `main`

### Staging Environment
- **GitHub Branch**: `staging`
- **Vercel Project**: Same project, preview deployment
- **Vercel Domain**: `preview.changemaker.im` (configured)
- **Supabase Project**:
  - Ref: `ffivsyhuyathrnnlajjq`
  - URL: `https://ffivsyhuyathrnnlajjq.supabase.co`
  - Branch: `staging` (persistent)
  - Parent: Production project
- **Deployment**: Automatic on push to `staging`
- **CI/CD**: GitHub Actions runs migrations automatically

### Feature Branch Previews
- **GitHub Branch**: `feature/*` (any feature branch)
- **Vercel Project**: Same project, ephemeral preview deployments
- **Vercel Domain**: Auto-generated URLs (e.g., `changemaker-minimal-{hash}-alldigitalrewards.vercel.app`)
- **Supabase Project**: Uses **staging** Supabase (`ffivsyhuyathrnnlajjq`)
- **Deployment**: Automatic on push to any feature branch
- **Note**: All feature branches share the staging database for testing

## Workflow: Feature Development to Production

### Phase 1: Feature Development

**Current Example**: `feature/manager-role-phase2-api`

1. **Create feature branch from staging**
   ```bash
   git checkout staging
   git pull origin staging
   git checkout -b feature/my-new-feature
   ```

2. **Develop and commit**
   - Write code following project patterns
   - Add tests (Playwright for API, unit tests for utilities)
   - Update documentation in `.claude/` directory

3. **Push to feature branch**
   ```bash
   git push origin feature/my-new-feature
   ```
   - **Auto-triggers**: Vercel preview deployment
   - **Uses**: Staging Supabase database
   - **Result**: Preview URL generated for testing

4. **Verify in preview environment**
   - Check auto-generated preview URL
   - Run manual QA
   - Verify database migrations (if any)

### Phase 2: Staging Integration

5. **Create PR to staging**
   ```bash
   gh pr create --base staging --head feature/my-new-feature \
     --title "feat: My New Feature" \
     --body "Description of changes..."
   ```

6. **Code review**
   - Team reviews PR
   - CI checks pass (if configured)
   - Address feedback

7. **Merge to staging**
   ```bash
   gh pr merge <PR-number> --squash
   ```
   - **Auto-triggers**:
     - Vercel deployment to preview.changemaker.im
     - GitHub Action: `deploy-staging-migrations.yml`
   - **Actions**:
     - Runs `prisma migrate deploy` on staging database
     - Conditionally seeds database if empty
     - Verifies migration success

8. **QA in staging environment**
   - Access `preview.changemaker.im`
   - Run full QA checklist
   - Run automated Playwright tests
   - Verify with stakeholders

### Phase 3: Production Release

9. **Create release PR: staging → main**
   ```bash
   gh pr create --base main --head staging \
     --title "Release: [Date] - [Feature Summary]" \
     --body "Includes features: ..."
   ```

10. **Final review**
    - Review all changes since last production release
    - Verify staging is stable
    - Get approval from tech lead

11. **Merge to main**
    ```bash
    gh pr merge <PR-number> --merge  # Use merge commit for releases
    ```
    - **Auto-triggers**: Vercel production deployment
    - **Deploys to**: `changemaker.im`, `www.changemaker.im`
    - **Manual step**: Apply migrations to production (see below)

12. **Production database migrations**
    ```bash
    # Set production database URL
    export DATABASE_URL="postgresql://postgres.naptpgyrdaoachpmbyaq:..."

    # Check migration status
    pnpm prisma migrate status

    # Deploy migrations
    pnpm prisma migrate deploy

    # Verify
    pnpm prisma migrate status
    ```

13. **Post-deployment verification**
    - Smoke test production
    - Monitor error logs
    - Check database performance

## Database Migration Strategy

### Staging Migrations (Automated)
**Trigger**: Push to `staging` branch
**GitHub Action**: `.github/workflows/deploy-staging-migrations.yml`

**Process**:
1. Checkout code
2. Install dependencies (`pnpm install`)
3. Generate Prisma client
4. Check migration status
5. Deploy pending migrations (`prisma migrate deploy`)
6. Check if database is empty (count users)
7. If empty: Run `prisma/seed-staging.ts`
8. Verify deployment

**Configuration**: Uses GitHub Secrets
- `STAGING_DATABASE_URL`
- `STAGING_DIRECT_URL`
- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_ANON_KEY`
- `STAGING_SUPABASE_SERVICE_ROLE_KEY`

### Production Migrations (Manual)
**Why manual**: Deliberate gate to prevent accidental production changes

**Process**:
1. Verify staging migrations worked
2. Create migration script if needed
3. Schedule maintenance window if breaking changes
4. Run migrations (see step 12 above)
5. Document in release notes

### Creating New Migrations

1. **Develop locally**
   ```bash
   # Modify prisma/schema.prisma
   pnpm prisma migrate dev --name descriptive_migration_name
   ```

2. **Test migration**
   - Verify generated SQL in `prisma/migrations/`
   - Test locally
   - Push to feature branch

3. **Staging deployment**
   - Merge to staging
   - GitHub Action auto-applies migration
   - Verify in staging environment

4. **Production deployment**
   - Merge to main
   - Manually apply migration
   - Verify in production

## Vercel Configuration

### Environment Variables

**Production** (from `main` branch):
- `DATABASE_URL`: Production Supabase pooled connection
- `DIRECT_URL`: Production Supabase direct connection
- `NEXT_PUBLIC_SUPABASE_URL`: `https://naptpgyrdaoachpmbyaq.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Production anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Production service role key

**Preview** (from `staging` and feature branches):
- `DATABASE_URL`: Staging Supabase pooled connection
- `DIRECT_URL`: Staging Supabase direct connection
- `NEXT_PUBLIC_SUPABASE_URL`: `https://ffivsyhuyathrnnlajjq.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Staging anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Staging service role key

**Shared** (all environments):
- `EMAIL_FROM`, `EMAIL_FROM_NAME`: Email configuration
- `SMTP_*`: Resend SMTP settings
- `INNGEST_*`: Async job processing keys

### Branch Configuration

**Git Branch Tracking**:
- Production deploys from: `main`
- Staging deploys from: `staging`
- All other branches: Preview deployments using staging database

## Current State Analysis

### Active Deployments (as of 2025-10-27)

**Latest Production**: Not shown (main branch not recently updated)
- Last staging merge: f3de758 (Manager Role Phase 1)

**Latest Staging**: `dpl_9qfFj5x3ghetPjfsTeM2949AsQed`
- Commit: f3de758 (Merge PR #46 - Manager Role Phase 1)
- URL: `changemaker-minimal-biqo4jtqx-alldigitalrewards.vercel.app`
- Status: READY
- Branch: `staging`

**Active Feature Branch**: `feature/manager-role-phase2-api`
- Latest deployment: `dpl_DFEiicm5UPWwJie3vMaWDVjJ5zAY` (BUILDING)
- Commits: 34 ahead of main, 21,578 additions
- Preview URL: Auto-generated per commit
- Uses: Staging database

### Pending Work

**Not yet in staging**:
- Manager Role Phase 2 (Tasks 16-30)
  - Assignment API routes
  - Manager queue and review endpoints
  - Manager dashboard UI
  - Assignment management dialog
  - Manager authorization tests
  - Approval workflow tests
  - Challenge assignment tests

**Not yet in production**:
- Manager Role Phase 1 (merged to staging)
- Manager Role Phase 2 (in feature branch)

## Best Practices

### Branch Hygiene
1. Always branch from `staging`, not `main`
2. Keep feature branches short-lived (< 2 weeks)
3. Delete feature branches after merge
4. Squash commits when merging to staging
5. Use merge commits for staging → main (preserves history)

### Testing Requirements
- **Before merging to staging**: Manual QA in preview environment
- **Before merging to main**: Full Playwright test suite passes
- **After production deploy**: Smoke tests on production

### Database Changes
- Always test migrations in staging first
- Include rollback scripts for complex migrations
- Document breaking changes in PR description
- Schedule production migrations during low-traffic periods

### Communication
- Announce staging deployments in team channel
- Announce production deployments with release notes
- Document breaking changes in CHANGELOG.md
- Update version in package.json for production releases

## Rollback Procedures

### Vercel Rollback
```bash
# List recent deployments
vercel ls changemaker-minimal

# Promote previous deployment to production
vercel promote <deployment-url> --prod
```

### Database Rollback
**Option 1**: Manual rollback SQL
```bash
# Run custom rollback script
psql $DATABASE_URL -f scripts/rollback-<migration-name>.sql
```

**Option 2**: Prisma migrate resolve
```bash
# Mark migration as rolled back
pnpm prisma migrate resolve --rolled-back <migration-name>
```

## Monitoring & Alerts

### Current Setup
- Vercel deployment notifications in team email
- GitHub PR/commit notifications
- Manual monitoring of error logs

### Recommended Additions
- [ ] Sentry error tracking
- [ ] Database performance monitoring (Supabase dashboard)
- [ ] Uptime monitoring (UptimeRobot or similar)
- [ ] Slack notifications for production deployments
- [ ] Automated smoke tests post-deployment

## Common Issues & Solutions

### Issue: Preview deployment fails to build
**Cause**: Missing environment variables or database connection issues
**Solution**: Check Vercel project settings, verify preview environment variables

### Issue: Migration fails in staging
**Cause**: Schema conflicts or data integrity issues
**Solution**: Check migration SQL, test locally first, verify staging data state

### Issue: Feature branch uses wrong database
**Cause**: Environment variable configuration in Vercel
**Solution**: Verify preview environment variables point to staging Supabase

### Issue: Staging and production out of sync
**Cause**: Direct commits to main or staging
**Solution**: Always use the feature → staging → main flow

## Next Steps

### Immediate (Week 1)
- [x] Document current deployment strategy
- [ ] Create PR: `feature/manager-role-phase2-api` → `staging`
- [ ] QA Manager Role Phase 2 in staging
- [ ] Clean up old feature branches (35+ is too many)

### Short-term (Month 1)
- [ ] Add production deployment GitHub Action (with approval gate)
- [ ] Implement automated smoke tests post-deployment
- [ ] Set up error tracking (Sentry)
- [ ] Document rollback procedures with examples

### Long-term (Quarter 1)
- [ ] Implement database branch strategy for feature branches
- [ ] Add automated performance testing
- [ ] Set up monitoring dashboards
- [ ] Create release automation (version bumping, changelogs)

## References

- GitHub Repository: https://github.com/alldigitalrewards/changemaker-minimal
- Vercel Project: https://vercel.com/alldigitalrewards/changemaker-minimal
- Supabase Production: https://supabase.com/dashboard/project/naptpgyrdaoachpmbyaq
- Supabase Staging: https://supabase.com/dashboard/project/ffivsyhuyathrnnlajjq
- Production URL: https://changemaker.im
- Staging URL: https://preview.changemaker.im
