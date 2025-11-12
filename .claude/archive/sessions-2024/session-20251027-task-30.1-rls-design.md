# Task 30.1: RLS Policy Design & Planning

**Date**: 2025-10-27
**Status**: In Progress
**Estimated Time**: 2 hours
**Priority**: CRITICAL - Security blocker for staging merge

## Objective

Design comprehensive Row-Level Security (RLS) policies for all models to provide database-level authorization guarantees, complementing application-level middleware.

## Requirements

- **File**: `docs/security/rls-policies.md` (NEW)
- **Dependencies**: Phase 2 complete
- **Deliverable**: Complete RLS policy specification document

## Implementation Strategy

### Step 1: Analyze Current Authorization Model
- Review middleware functions (requireWorkspaceAdmin, requireManagerOrAdmin)
- Identify all authorization checks in application code
- Map authorization rules to database policies
- Identify gaps where RLS provides additional security

### Step 2: Design Policy Architecture
- Define auth.uid() mapping (Supabase user ID to User.supabaseUserId)
- Create helper functions for common patterns
- Design policies for each model
- Plan policy testing approach

### Step 3: Document All Policies
- Workspace isolation policies
- Manager assignment-based access policies
- Role-based access policies (ADMIN, MANAGER, PARTICIPANT)
- Participant data access policies

### Step 4: Review & Validate
- Security review of policy design
- Performance impact assessment
- Edge case identification

## Progress

- [x] Create session file
- [x] Analyze current authorization
- [x] Design policy architecture
- [x] Document all policies
- [x] Review and validate

## Files Created

- `docs/security/rls-policies.md` (COMPLETE - 400+ lines)

## Implementation Log

### Step 1: Analyze Current Authorization Model

Reviewed existing middleware and authorization patterns:
- `lib/auth/api-auth.ts`: requireWorkspaceAdmin, requireManagerOrAdmin
- Application-level checks but no database-level enforcement
- Identified RLS as critical missing security layer

### Step 2: Design Policy Architecture

Created helper functions for auth context:
- `current_user_id()`: Maps Supabase auth.uid() to User.id
- `is_workspace_admin()`: Check admin role
- `is_workspace_manager()`: Check manager role
- `is_assigned_to_challenge()`: Check manager assignment
- `user_workspace_ids()`: Get user's workspaces

### Step 3: Document All Policies

Created comprehensive policy specifications for all models:
- Workspace isolation policies
- Manager assignment-based access
- Role-based access (ADMIN, MANAGER, PARTICIPANT)
- Complex multi-role ActivitySubmission policy
- Performance indexes identified

### Step 4: Review and Validate

Completed design review:
- All models covered
- Migration plan defined
- Testing strategy outlined
- Performance considerations documented
- Rollback plan included

**Task 30.1 Complete**: Ready to implement SQL migrations in Task 30.2
