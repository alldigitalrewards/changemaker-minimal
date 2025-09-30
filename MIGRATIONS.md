# Database Migrations

This document tracks all database migrations, their purpose, and deployment considerations.

## Migration: `20250930164003_multi_reward_tenancy_and_email_updates`

**Date**: 2025-09-30
**Status**: Applied to local development

### What Changed

#### New Tables
- **RewardIssuance**: Tracks all reward issuances to users
  - Links to User, Workspace, and optionally Challenge
  - Supports multiple reward types: points, SKU, monetary
  - Status tracking: PENDING, ISSUED, FAILED, CANCELLED
  - Metadata field for provider-specific data
- **TenantSku**: Maps SKU identifiers to tenant-specific configurations
  - Unique constraint on (tenantId, skuId)
  - Provider field for integration details

#### New Enums
- `RewardType`: points, sku, monetary
- `RewardStatus`: PENDING, ISSUED, FAILED, CANCELLED

#### Schema Updates

**User Table**
- `tenantId` (TEXT, default 'default'): Multi-tenancy support
- `permissions` (TEXT[], default []): User-level permissions array
- `emailChangePending` (JSONB, nullable): Tracks pending email change requests
- `lastWorkspaceId` (UUID, nullable): Last accessed workspace for UX

**Workspace Table**
- `tenantId` (TEXT, default 'default'): Multi-tenancy support
- `active` (BOOLEAN, default true): Workspace activation status
- `published` (BOOLEAN, default true): Workspace visibility status

**Challenge Table**
- `rewardType` (RewardType, nullable): Type of reward for challenge
- `rewardConfig` (JSONB, nullable): Reward configuration details
- `emailEditAllowed` (BOOLEAN, default true): Allow email editing during enrollment

**Activity Table**
- `rewardRules` (JSONB[], default []): Array of reward rules for activity completion

**ActivitySubmission Table**
- `rewardIssuanceId` (UUID, nullable, unique): Links to RewardIssuance record
- `rewardIssued` (BOOLEAN, default false): Quick check if reward was issued

#### Indexes Created
- `User_tenantId_idx`: Speed up tenant-based user queries
- `Workspace_tenantId_idx`: Speed up tenant-based workspace queries
- `RewardIssuance_userId_idx`: Speed up user reward lookups
- `RewardIssuance_workspaceId_idx`: Speed up workspace reward queries
- `RewardIssuance_challengeId_idx`: Speed up challenge reward queries
- `RewardIssuance_status_idx`: Speed up status-based filtering
- `TenantSku_tenantId_idx`: Speed up tenant SKU lookups

### Why

This migration enables three critical features:

1. **Multi-Reward System**: Support for points, SKU codes, and monetary rewards with proper tracking and audit trail
2. **Multi-Tenancy**: Prepare for tenant isolation with tenantId on User/Workspace
3. **Email Management**: Track pending email changes with verification workflow

### Backfills Required

1. **Default TenantId**: All existing users and workspaces get 'default' tenantId automatically via schema default
2. **Seed Data Update**: Updated seed.ts includes TenantSku examples for testing

### Deploy Steps

⚠️ **IMPORTANT**: Preview (preview.changemaker.im) and Production (changemaker.im) share the same Supabase database. Always test migrations before creating a PR.

#### Development (Local)
```bash
# 1. Generate and apply migration to LOCAL database
pnpm prisma migrate dev --name descriptive_name

# 2. Seed test data
pnpm prisma db seed

# 3. Test locally with local Supabase
pnpm dev

# 4. Verify everything works: http://localhost:3000
```

#### Production Database (Before Merge to Main)
⚠️ **Critical Step**: Test migration on production database before PR

```bash
# Use the interactive migration script
./scripts/migrate-production.sh

# This applies migration to production Supabase
# Both preview.changemaker.im AND changemaker.im will use this migrated schema

# After migration:
# 1. Verify preview: https://preview.changemaker.im/api/health
# 2. Verify production: https://changemaker.im/api/health
# 3. Test critical flows on both domains
# 4. If good → create PR and merge
```

#### CI/CD (After Merge to Main)
Workflow runs automatically as verification:
```bash
# Automated steps in .github/workflows/database-migration.yml
# 1. Backup (logged)
# 2. prisma migrate deploy (may be no-op if already applied)
# 3. Health checks
# 4. E2E smoke tests

# Vercel auto-deploys changemaker.im
```

#### Environment Clarification

| Environment | Database | When Migrations Applied |
|-------------|----------|------------------------|
| Local (`localhost:3000`) | Local Supabase (127.0.0.1:54322) | During development with `prisma migrate dev` |
| Preview (`preview.changemaker.im`) | **Production Supabase** | Before PR with `./scripts/migrate-production.sh` |
| Production (`changemaker.im`) | **Production Supabase** | Same migration from preview step |

### Rollback Strategy

If issues arise:
```bash
# Revert to previous migration
pnpm prisma migrate resolve --rolled-back 20250930164003_multi_reward_tenancy_and_email_updates

# Drop new tables manually if needed
psql $DATABASE_URL -c "DROP TABLE IF EXISTS \"TenantSku\" CASCADE;"
psql $DATABASE_URL -c "DROP TABLE IF EXISTS \"RewardIssuance\" CASCADE;"
psql $DATABASE_URL -c "DROP TYPE IF EXISTS \"RewardType\" CASCADE;"
psql $DATABASE_URL -c "DROP TYPE IF EXISTS \"RewardStatus\" CASCADE;"

# Remove new columns
psql $DATABASE_URL -c "ALTER TABLE \"User\" DROP COLUMN IF EXISTS \"tenantId\", DROP COLUMN IF EXISTS \"permissions\", DROP COLUMN IF EXISTS \"emailChangePending\", DROP COLUMN IF EXISTS \"lastWorkspaceId\";"
psql $DATABASE_URL -c "ALTER TABLE \"Workspace\" DROP COLUMN IF EXISTS \"tenantId\", DROP COLUMN IF EXISTS \"active\", DROP COLUMN IF EXISTS \"published\";"
# ... etc for other tables
```

### Testing Checklist

- [ ] Verify default tenantId applied to existing records
- [ ] Test reward issuance creation and status updates
- [ ] Test tenant SKU mapping and lookups
- [ ] Test email change pending workflow
- [ ] Verify indexes improve query performance
- [ ] Test cascade deletions work correctly
- [ ] Verify seed data populates correctly

### Notes

- Migration is additive and safe - no data loss risk
- All new columns have safe defaults
- Foreign keys use CASCADE for proper cleanup
- Unique constraint on ActivitySubmission.rewardIssuanceId enforces 1:1 relationship