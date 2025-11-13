# Task 30.2: Core RLS Policies - Workspace Isolation

**Date**: 2025-10-27
**Status**: Complete
**Estimated Time**: 3 hours (Completed in 1 hour)
**Priority**: CRITICAL - Security blocker for staging merge

## Objective

Implement core Row-Level Security policies for workspace isolation across all major models. Enable RLS on Workspace, Challenge, Activity, Enrollment, and supporting models with database-level authorization guarantees.

## Requirements

- **File**: `prisma/migrations/20251027214059_enable_rls_core/migration.sql`
- **Dependencies**: Task 30.1 (RLS design complete)
- **Deliverable**: SQL migration with helper functions and core RLS policies

## Implementation Strategy

### Step 1: Create Prisma Migration

Create migration file with Prisma CLI.

### Step 2: Implement Helper Functions

SQL functions for reusable auth logic:
- `current_user_id()`: Maps Supabase auth.uid() to User.id
- `is_workspace_admin()`: Check admin role
- `is_workspace_manager()`: Check manager role
- `user_workspace_ids()`: Get user's workspaces

### Step 3: Enable RLS on Core Models

Apply policies for workspace isolation:
- Workspace
- WorkspaceMembership
- User
- Challenge
- Activity
- ActivityTemplate
- Enrollment
- ActivityEvent

### Step 4: Enable RLS on Supporting Models

Apply policies for supporting features:
- RewardIssuance
- PointsLedger
- ChallengePointsBudget
- WorkspaceEmailSettings
- WorkspaceEmailTemplate
- WorkspaceCommunication
- InviteCode
- InviteRedemption

### Step 5: Add Performance Indexes

Create indexes for RLS query optimization:
- idx_workspace_membership_user_workspace
- idx_activity_challenge

### Step 6: Test Migration

Apply to local Supabase and verify policies.

## Progress

- [x] Create Prisma migration
- [x] Implement helper functions
- [x] Enable RLS on core models
- [x] Enable RLS on supporting models
- [x] Add performance indexes
- [x] Test migration on local database
- [x] Fix schema mismatches (PointsLedger.userId → toUserId, Invite → InviteCode/InviteRedemption)
- [x] Verify all policies applied correctly

## Files Created

- `prisma/migrations/20251027214059_enable_rls_core/migration.sql` (COMPLETE - 395 lines)

## Implementation Log

### Migration Creation

Created Prisma migration with `pnpm prisma migrate dev --create-only --name enable_rls_core`.

### Helper Functions Implementation

Implemented 4 SQL helper functions for auth context:
- `current_user_id()`: SELECT id FROM "User" WHERE "supabaseUserId" = auth.uid()
- `is_workspace_admin(workspace_id)`: Check ADMIN role in WorkspaceMembership
- `is_workspace_manager(workspace_id)`: Check MANAGER role in WorkspaceMembership
- `user_workspace_ids()`: Returns TABLE of workspace IDs for current user

### Core Models RLS

Enabled RLS and created policies for:
- **Workspace**: Users see workspaces they belong to; service role can modify
- **WorkspaceMembership**: Users see memberships in their workspaces; admins can modify
- **User**: Users see other users in same workspace; can update own profile
- **Challenge**: Users see challenges in their workspaces; admins can modify
- **Activity**: Users see activities for workspace challenges; admins can modify
- **ActivityTemplate**: Users see templates in their workspaces; admins can modify
- **Enrollment**: Users see enrollments in their workspaces; participants can create own; admins can modify
- **ActivityEvent**: Users see events in their workspaces; system can insert

### Supporting Models RLS

Enabled RLS and created policies for:
- **RewardIssuance**: Users see own rewards; admins see all; admins/system can create
- **PointsLedger**: Users see own transactions (toUserId); admins see all; service role only can modify
- **ChallengePointsBudget**: Admins can see and modify budgets
- **WorkspaceEmailSettings**: Admins can manage
- **WorkspaceEmailTemplate**: Admins can manage
- **WorkspaceCommunication**: Users see communications in their workspaces
- **InviteCode**: Admins can manage
- **InviteRedemption**: Admins can view; users can view own; users can insert if invite valid

### Schema Fixes

Fixed mismatches between design doc and actual schema:
1. **PointsLedger**: Changed `userId` to `toUserId` (actual column name)
2. **Invite Model**: Changed from non-existent `Invite` to `InviteCode` and `InviteRedemption`
3. **InviteRedemption.isActive**: Changed to `usedCount < maxUses` check (actual fields)

### Performance Indexes

Added indexes for RLS query optimization:
- `idx_workspace_membership_user_workspace` on WorkspaceMembership(userId, workspaceId)
- `idx_activity_challenge` on Activity(challengeId)

### Service Role Bypass

Granted service role bypass for all tables:
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
```

### Testing & Verification

Applied migration to local Supabase database. Verified 30 RLS policies across 10 tables:
- Activity (2 policies)
- ActivityEvent (2 policies)
- ActivityTemplate (2 policies)
- Challenge (2 policies)
- ChallengePointsBudget (2 policies)
- Enrollment (3 policies)
- InviteCode (1 policy)
- InviteRedemption (3 policies)
- PointsLedger (2 policies)
- RewardIssuance (2 policies)
- User (2 policies)
- Workspace (2 policies)
- WorkspaceCommunication (1 policy)
- WorkspaceEmailSettings (1 policy)
- WorkspaceEmailTemplate (1 policy)
- WorkspaceMembership (2 policies)

**Task 30.2 Complete**: Core RLS policies successfully implemented and tested. Ready for Task 30.3 (Manager RLS Policies).
