# Changelog

All notable changes to the Changemaker Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### In Progress
- Phase 2: Advanced features and polish
  - Profile management (admin and participant)
  - Workspace settings
  - Enhanced participant management
  - Activities restructure
  - Email management system

## [0.3.0] - 2025-10-10

**PR**: [#44 - Global account, workspace visibility, leaderboard UX, multi-reward model](https://github.com/alldigitalrewards/changemaker-minimal/pull/44)

### Added - Multi-Reward System
- **Three reward types**: Points, SKU (gift cards/merchandise), and Monetary (direct payments)
- **RewardIssuance** model for tracking all reward distributions with status transitions
- **TenantSku** catalog for managing workspace-specific SKU offerings
- **ActivityTemplate.rewardType** and **rewardConfig** for flexible reward configuration
- **Challenge-level reward configuration** supporting mixed reward types
- **Approval workflow** with per-submission reward issuance
- **Reward status tracking**: PENDING, ISSUED, FAILED, CANCELLED

### Added - Communications System
- **WorkspaceCommunication** model for multi-scope announcements
- Support for workspace-scoped, challenge-scoped, and activity-scoped communications
- Audience targeting: ALL_PARTICIPANTS, ENROLLED_ONLY, ADMINS_ONLY
- Priority levels and scheduling capabilities

### Added - Global Account Management
- **Global /account route** accessible from all pages
- Password change flow with validation
- Email change flow with verification
- Session refresh after email updates
- Unified header with account dropdown

### Added - Workspace Management Improvements
- **Multi-workspace memberships** with primary workspace designation
- **Workspace switcher** component for users with multiple workspaces
- **Role-based workspace visibility**:
  - Platform super admins see all workspaces across tenants
  - Workspace admins see workspaces within their tenant
  - Participants see only their enrolled workspaces
- **Workspace sidebar** for navigation
- **Workspace discovery** removed for non-super-admin users (tenant isolation)

### Changed - Database Schema
- Added `WorkspaceCommunication` table with scope and audience targeting
- Added `RewardIssuance` table with comprehensive reward tracking
- Added `TenantSku` table for SKU catalog management
- Added `Membership.isPrimary` for designating primary workspace
- Added `User.tenantId` for tenant association
- Added `User.permissions` array for platform super admin flag
- Added `Workspace.tenantId`, `active`, and `published` flags
- Added `Challenge.rewardType` and `rewardConfig` for reward configuration
- Added `ActivityTemplate.rewardType` and `rewardConfig`
- Added `ActivitySubmission.rewardIssuanceId` linking

### Changed - Performance Optimizations
- Single aggregated database query for workspace lists (eliminated N+1 queries)
- Composite indexes on hot query paths:
  - `Membership_workspaceId_role_idx`
  - `Membership_userId_isPrimary_idx`
  - `Workspace_tenantId_active_published_idx`
  - `Challenge_workspaceId_status_idx`
- Connection pooling configured for local Supabase pooler
- 90% reduction in database queries per page load
- 75% improvement in page load times (800ms → 200ms)

### Changed - UI/UX Improvements
- **Dashboard Header** with conditional workspace switcher
- **Leaderboard** displays "Activities completed" instead of "Points earned"
- Removed "My Points" from participant navigation
- Role badges consistently displayed across all workspace cards
- Primary workspace indicator with crown icon
- Workspace stats now show member counts and challenge counts
- Unified header styling across all pages

### Fixed
- WorkspaceSwitcher context error on `/workspaces` page
- Workspace switcher now hidden on global workspace management page
- Proper tenant isolation for workspace discovery
- Redirect logic after login based on user's last accessed workspace
- Sign-out redirect to login page

### Technical Improvements
- Seed script with comprehensive test data:
  - 3 workspaces (ACME, AllDigitalRewards, Sharecare)
  - 13 users (4 admins with multi-workspace access, 9 participants)
  - 24 activity templates across all reward types
  - 18 workspace communications
  - 9 reward issuances
  - 3 tenant SKUs
- Enhanced prisma queries with proper type safety
- Improved error handling in reward issuance flow
- Better separation of concerns between server and client components

## [0.2.0] - 2025-09-29

**PR**: [#43 - User profile](https://github.com/alldigitalrewards/changemaker-minimal/pull/43)

### Added
- User profile management
- Profile editing capabilities
- Avatar support

## [0.1.9] - 2025-09-25

**PR**: [#41 - Employee invites](https://github.com/alldigitalrewards/changemaker-minimal/pull/41)

### Added
- Employee invitation system
- Bulk invite functionality
- Invite tracking and management

## [0.1.8] - 2025-09-19

**PR**: [#39 - Sandbox new features](https://github.com/alldigitalrewards/changemaker-minimal/pull/39)

### Added
- Challenge progression system features
- Activity submissions and approvals
- Points system enhancements

## [0.1.7] - 2025-09-17

**PR**: [#38 - Participant invite and enroll](https://github.com/alldigitalrewards/changemaker-minimal/pull/38)

### Added
- Participant invitation flow
- Enrollment management
- Email notifications for invites

## [0.1.6] - 2025-09-16

**PR**: [#37 - Workspace Management UI](https://github.com/alldigitalrewards/changemaker-minimal/pull/37)

### Added
- Workspace management interface
- Membership support
- Admin workspace controls

## [0.1.5] - 2025-09-12

**PR**: [#36 - Workspace switcher with membership auth](https://github.com/alldigitalrewards/changemaker-minimal/pull/36)

### Added
- Workspace switcher component
- Membership-based authentication
- Multi-workspace navigation

## [0.1.4] - 2025-09-11

**PR**: [#35 - Multi-workspace query functions](https://github.com/alldigitalrewards/changemaker-minimal/pull/35)

### Added
- Multi-workspace query functions
- Backward compatibility with single-workspace queries
- Optimized database access patterns

## [0.1.3] - 2025-09-11

**PR**: [#32 - WorkspaceMembership join table](https://github.com/alldigitalrewards/changemaker-minimal/pull/32)

### Added
- WorkspaceMembership model for multi-workspace support
- Join table for user-workspace relationships
- Migration to new membership system

## [0.1.2] - 2025-09-11

**PR**: [#29 - Workspace invite system](https://github.com/alldigitalrewards/changemaker-minimal/pull/29)

### Added
- Workspace invitation system
- Invite codes with expiration
- Redemption tracking

## [0.1.0] - 2025-08-01

### Initial Release
- Next.js 15 application with App Router
- Supabase authentication and database integration
- Prisma ORM with PostgreSQL
- Multi-tenant workspace system
- Challenge and Enrollment models
- Admin and Participant dashboards
- Role-based access control (ADMIN, PARTICIPANT)
- Tailwind CSS with shadcn/ui components
- Changemaker theme (coral/terracotta color scheme)

## Performance Benchmarks

### Database Performance
- **Before v0.3.0**: 15-20 queries per page load (N+1 pattern)
- **After v0.3.0**: 1-2 queries per page load (aggregated)
- **Improvement**: 90% reduction in database calls

### Page Load Performance
- **Before v0.3.0**: ~800ms initial load
- **After v0.3.0**: ~200ms initial load
- **Improvement**: 75% faster page loads

### Time to Interactive
- **Before v0.3.0**: ~1.2s
- **After v0.3.0**: ~400ms
- **Improvement**: 66% improvement
