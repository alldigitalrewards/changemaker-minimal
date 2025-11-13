# Task 21: Challenge Schema Updates - Manager Config

**Date**: 2025-10-24
**Status**: In Progress
**Estimated Time**: 1 hour

## Objective

Add manager approval configuration fields to the Challenge model to support flexible approval workflows (manager-only vs two-step manager→admin approval).

## Requirements

- **Schema Changes**:
  - Add `requireManagerApproval: Boolean @default(false)` to Challenge model
  - Add `requireAdminReapproval: Boolean @default(true)` to Challenge model
- **Migration**: Generate and test migration
- **Seed Data**: Update seed data to set defaults for existing challenges
- **Dependencies**: Phase 1 complete ✅

### Field Meanings

- `requireManagerApproval`: When true, submissions must go through manager review before admin can approve
- `requireAdminReapproval`: When true, manager-approved submissions still require final admin approval. When false, manager approval auto-approves to APPROVED status

### Approval Workflow Logic

| requireManagerApproval | requireAdminReapproval | Workflow |
|------------------------|------------------------|----------|
| false | N/A | Direct admin review (PENDING → APPROVED/REJECTED) |
| true | true | Two-step: Manager review → Admin final approval |
| true | false | Manager-only: Manager approval auto-approves |

## Implementation Strategy

### Step 1: Update Prisma Schema
- Add two boolean fields to Challenge model
- Set appropriate defaults

### Step 2: Generate Migration
- Run `pnpm prisma migrate dev --name challenge_manager_config`
- Review generated SQL

### Step 3: Update Seed Data
- Add default values for existing test challenges
- Ensure backward compatibility

### Step 4: Test
- Verify migration applies cleanly
- Check build passes
- Verify Prisma client regenerates correctly

## Progress

- [x] Create session file
- [ ] Update Challenge model in schema.prisma
- [ ] Generate migration
- [ ] Update seed data
- [ ] Test migration
- [ ] Verify build passes
- [ ] Commit changes

## Files to Modify

- `prisma/schema.prisma`
- `prisma/seed.ts` (possibly)

## Implementation Log

### Step 1: Update Challenge Model

Updated `prisma/schema.prisma` to add two boolean fields to the Challenge model:

```prisma
model Challenge {
  // ... existing fields ...
  emailEditAllowed       Boolean                  @default(true)
  requireManagerApproval Boolean                  @default(false)  // NEW
  requireAdminReapproval Boolean                  @default(true)   // NEW
  rewardConfig           Json?
  rewardType             RewardType?
  // ... relations ...
}
```

**Field placement**: Added after `emailEditAllowed` and before `rewardConfig` to keep approval-related fields grouped together.

### Step 2: Generate Migration

Ran `pnpm prisma migrate dev --name challenge_manager_config`

**Migration generated**: `prisma/migrations/20251024170005_challenge_manager_config/migration.sql`

```sql
-- AlterTable
ALTER TABLE "public"."Challenge"
  ADD COLUMN "requireAdminReapproval" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "requireManagerApproval" BOOLEAN NOT NULL DEFAULT false;
```

**Migration details**:
- Clean ALTER TABLE statement
- Both columns added with NOT NULL constraint
- Proper defaults ensure backward compatibility
- Existing challenges will have: `requireManagerApproval=false`, `requireAdminReapproval=true` (opt-in to manager workflow)
- Prisma Client regenerated automatically (v6.15.0)

### Step 3: Seed Data Review

Checked `prisma/seed.ts` - no changes needed:
- New fields have sensible defaults (`requireManagerApproval=false`, `requireAdminReapproval=true`)
- Existing seed challenges will inherit defaults automatically
- No explicit seed data update required for MVP (can add in Task 22 when adding UI)

### Step 4: Build Verification

✅ `pnpm build` passed successfully
- Prisma Client regenerated with new fields
- No TypeScript compilation errors
- All routes compile correctly
- Next.js build completed in 7.0s

## Implementation Summary

Successfully added manager approval configuration fields to Challenge model:

**Schema changes**:
- `requireManagerApproval: Boolean @default(false)` - Opt-in to manager review workflow
- `requireAdminReapproval: Boolean @default(true)` - When manager workflow enabled, require final admin approval

**Migration**: `20251024170005_challenge_manager_config`
- Applied cleanly to local database
- Adds two NOT NULL columns with proper defaults
- Backward compatible (existing challenges get safe defaults)

**Approval workflow configurations**:

| requireManagerApproval | requireAdminReapproval | Workflow |
|------------------------|------------------------|----------|
| false (default) | N/A | Direct admin review (PENDING → APPROVED/REJECTED) |
| true | true (default) | Two-step: PENDING → MANAGER_APPROVED → APPROVED/REJECTED |
| true | false | Manager-only: PENDING → MANAGER_APPROVED (auto-approves) |

**Default behavior** (backward compatible):
- New challenges default to `requireManagerApproval=false` (direct admin review, current behavior)
- When manager workflow enabled, defaults to `requireAdminReapproval=true` (two-step approval, safer default)

**Next steps** (Task 22):
- Add UI controls to challenge create/edit forms
- Update POST /api/workspaces/[slug]/challenges to accept new fields
- Add UI explanations for what each flag means
- Update challenge detail pages to show manager settings

**Database state**:
- Local database: ✅ Migration applied
- Staging: Will be applied during Task 22 deployment
- Production: Will be applied during Phase 2 deployment
