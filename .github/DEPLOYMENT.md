# Deployment & Environment Configuration

## Environment Overview

| Environment | URL | Database | Vercel | Purpose |
|-------------|-----|----------|--------|---------|
| **Local Dev** | `localhost:3000` | Local Supabase (`127.0.0.1:54322`) | - | Development & testing |
| **Preview** | `preview.changemaker.im` | Production Supabase | Feature branches | Pre-production testing |
| **Production** | `changemaker.im` | Production Supabase | `main` branch | Live application |

### Important Notes

⚠️ **Preview and Production share the same database**
- Preview deployments use production Supabase instance
- Database changes from preview affect production
- **Always test migrations locally first**
- Use `./scripts/migrate-production.sh` to test on production DB before merging

## Environment Variables

### Local Development (`.env.local`)
```bash
# Local Supabase via Docker
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<local-key>"
SUPABASE_SERVICE_ROLE_KEY="<local-key>"

# Email (Resend)
RESEND_API_KEY="<your-key>"
EMAIL_FROM="team@updates.changemaker.im"
```

### Production/Preview (`.env.production` → Vercel)
```bash
# Production Supabase (shared by both)
DATABASE_URL="postgresql://postgres.naptpgyrdaoachpmbyaq:***@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.naptpgyrdaoachpmbyaq:***@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://naptpgyrdaoachpmbyaq.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<prod-key>"
SUPABASE_SERVICE_ROLE_KEY="<prod-service-key>"

# Email (Resend)
RESEND_API_KEY="<your-key>"
EMAIL_FROM="team@updates.changemaker.im"
```

## Vercel Configuration

### Project Settings

1. **Environment Variables** (Settings → Environment Variables)
   - Add all variables from `.env.production`
   - Select environments: Production ✓, Preview ✓, Development ✗

2. **Domains** (Settings → Domains)
   - Production: `changemaker.im`
   - Preview: `preview.changemaker.im` (custom preview domain)

3. **Git** (Settings → Git)
   - Production Branch: `main`
   - All other branches → Preview deployments

### GitHub Secrets

Configure in: `Settings` → `Secrets and variables` → `Actions`

**Environment: production** (for GitHub Actions)
```
PRODUCTION_DATABASE_URL
PRODUCTION_DIRECT_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Deployment Workflows

### Local Development
```bash
# Start local Supabase
supabase start

# Generate and apply migrations
pnpm prisma migrate dev --name feature_name

# Seed test data
pnpm prisma db seed

# Run dev server
pnpm dev

# Access: http://localhost:3000
```

### Feature Branch (Preview)
```bash
# 1. Develop locally with local DB
pnpm dev

# 2. Test migration on production DB (shared with preview!)
./scripts/migrate-production.sh

# 3. Push feature branch
git push origin feature-branch

# 4. Vercel auto-deploys to preview.changemaker.im
# 5. Preview uses production DB with your new migration

# 6. Create PR → PR checks run
gh pr create

# 7. Merge when checks pass
```

### Production (Main Branch)
```bash
# After PR merge to main:

# 1. GitHub Actions runs (database-migration.yml):
#    - Backup (logged)
#    - prisma migrate deploy
#    - Health checks
#    - E2E smoke tests

# 2. Vercel auto-deploys to changemaker.im

# 3. Verify production:
curl https://changemaker.im/api/health
```

## Migration Strategy

### Safe Migration Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Local Development                                    │
│    - Develop with local Supabase                        │
│    - prisma migrate dev                                 │
│    - Test thoroughly                                    │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Test on Production DB (before merge!)               │
│    - ./scripts/migrate-production.sh                    │
│    - Verify: https://preview.changemaker.im            │
│    - Verify: https://changemaker.im                    │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Create PR                                            │
│    - PR checks run (build, types, tests)               │
│    - Review required                                    │
└──────────────────┬──────────────────────────────────────┘
                   ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Merge to Main                                        │
│    - GitHub Actions runs migration workflow            │
│    - Vercel deploys to production                      │
└─────────────────────────────────────────────────────────┘
```

### Why This Works

Since preview and production share the same DB:
- ✅ Migration tested on real production data before merge
- ✅ Preview deployment validates app works with migrated schema
- ✅ Production deployment is safe (migration already applied)
- ✅ Post-merge CI provides final verification

### Rollback Strategy

If migration causes issues after deployment:

1. **Immediate Fix**
   ```bash
   # Revert the migration locally
   git revert <commit-hash>
   git push origin main

   # Or apply hotfix migration
   pnpm prisma migrate dev --name rollback_feature
   ./scripts/migrate-production.sh
   git push origin main
   ```

2. **Database Rollback** (if needed)
   - Supabase Dashboard → Database → Backups
   - Restore from pre-migration backup
   - Redeploy previous working commit

## Health Monitoring

### Health Endpoint
```bash
# Check application + database health
curl https://changemaker.im/api/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-09-30T...",
  "database": "connected"
}
```

### Supabase Dashboard
- Monitor: https://supabase.com/dashboard/project/naptpgyrdaoachpmbyaq
- Logs, metrics, query performance
- Database backups and restore

### Vercel Dashboard
- Deployments: https://vercel.com/dashboard
- Function logs, analytics
- Deployment status and history

## Troubleshooting

### Preview Deployment Issues

**Problem:** Preview shows old schema
```bash
# Cause: Migration not applied to production DB yet
# Solution: Run ./scripts/migrate-production.sh
```

**Problem:** Preview 500 errors after migration
```bash
# Check health endpoint
curl https://preview.changemaker.im/api/health

# Check Vercel function logs
vercel logs --follow

# Verify migration applied
psql $PRODUCTION_DATABASE_URL -c "\dt"
```

### Production Deployment Issues

**Problem:** Post-merge CI fails
```bash
# Check GitHub Actions logs
gh run view --log-failed

# Common causes:
# - Migration already applied (from preview testing)
# - Schema drift
# - Missing environment variables
```

## Best Practices

1. **Always test migrations locally first**
   - Use local Supabase for initial development
   - Never test destructive migrations on production first

2. **Use the production migration script**
   - `./scripts/migrate-production.sh` before creating PR
   - Validates migration on real data

3. **Monitor deployments**
   - Watch Vercel deployment logs
   - Check health endpoint after deploy
   - Monitor Supabase logs for errors

4. **Keep environments in sync**
   - Same Node.js version (20.x)
   - Same package versions (pnpm lockfile)
   - Same environment variable names

5. **Document breaking changes**
   - Update MIGRATIONS.md for schema changes
   - Note any required manual steps
   - Communicate with team before major changes
