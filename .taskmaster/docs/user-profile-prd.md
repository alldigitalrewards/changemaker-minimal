# User Profile Implementation PRD

## Overview

Implement comprehensive user profile pages for both admin and participant roles in the Changemaker multi-tenant application. This includes admin participant detail pages, participant self-profile pages, profile API endpoints, and enhanced navigation. The implementation reuses existing participant management patterns and components for consistency.

## Core Features

### 1. Admin Participant Detail Page
- **Location**: `app/w/[slug]/admin/participants/[id]/page.tsx`
- **Purpose**: Allow admins to view and manage any workspace member's profile
- **Access Control**: Require ADMIN role using `getUserWorkspaceRole(slug)`
- **Layout Components**:
  - User header with email, role, and joined date using `participant-detail-card.tsx`
  - Action buttons for email resend, role toggle, challenge assignment, and participant removal
  - Statistics section showing enrollment counts and points balance
  - Enrollments table with quick remove functionality
  - Optional activity timeline for recent events

### 2. Participant Self Profile Page
- **Location**: `app/w/[slug]/participant/profile/page.tsx`
- **Purpose**: Allow participants to view and edit their own profile within workspace context
- **Access Control**: Require authenticated user in workspace (both ADMIN and PARTICIPANT)
- **Layout Components**:
  - Profile header with email, full name, and workspace joined date
  - Editable name field that updates Supabase user metadata
  - Workspace-specific statistics (points balance, enrollment summary)
  - Security section with password reset link

### 3. Profile API Endpoints
- **Admin Routes**: Reuse existing `/api/workspaces/[slug]/participants/[id]` endpoints
- **Self Profile Route**: New `/api/account/profile/route.ts` for participant profile updates
  - GET: Return current profile data (email, name, metadata, workspace stats)
  - PUT: Update full name in Supabase user metadata and User.updatedAt

### 4. Navigation Integration
- **Admin Navigation**: Use existing participants table links to detail pages
- **Participant Navigation**: Add "Profile" entry to participant sidebar with User icon
- **Header Integration**: Maintain existing "Account Settings" link behavior

## Technical Requirements

### Data Models
- Primary entities: `User`, `WorkspaceMembership`, `Enrollment`, `PointsBalance`, `ActivitySubmission`, `ActivityEvent`
- Admin queries: Load User by ID with workspace membership, enrollments, points balance, and activity history
- Participant queries: Load current user with primary workspace membership, enrollments, and statistics

### Component Reuse
- Reuse existing components: `participant-detail-card.tsx`, `InlineProfile`, `ParticipantRoleToggle`, `EmailActions`, `ChallengeAssignment`, `BulkChallengeAssignment`, `RemoveParticipantAction`, `RemoveEnrollmentButton`
- New components needed: `profile-name-form.tsx`, `profile-stats.tsx`, ProfileSection wrappers

### Permission Guards
- Prevent demoting last ADMIN in workspace
- Prevent self-removal while currently admin
- Validate membership presence for participant page access
- Use `isUserId` for ID format validation

### Event Logging
- Create `ActivityEvent` entries for admin actions: `RBAC_ROLE_CHANGED`, `EMAIL_RESENT`, `INVITE_SENT`, `ENROLLED`, `UNENROLLED`
- Display recent events in admin profile timeline

## Enhanced Features (Phase 2)

### 1. Email Management System
- **Email Settings Model**: `WorkspaceEmailSettings` table with fromName, fromEmail, replyTo, footerHtml, brandColor
- **Email Templates Model**: `WorkspaceEmailTemplate` table with type-specific overrides for INVITE, EMAIL_RESENT, ENROLLMENT_UPDATE, REMINDER, GENERIC
- **Admin Email Interface**: New `/admin/emails` page with tabs for Default Emails, Templates, and Settings
- **API Endpoints**: GET/PUT for email templates, test-send functionality

### 2. Activity Templates Rename
- **Navigation Update**: Change "Activity Templates" to "Activities" in admin sidebar
- **Tabbed Interface**: Add Activities, Templates, and Settings tabs to existing page
- **Route Consideration**: Option to move from `/admin/activity-templates` to `/admin/activities`

### 3. Workspace Settings Enhancement
- **Admin Self Profile**: Make admin profile pages more useful with notification preferences, default landing views, timezone settings
- **Workspace Branding**: Name, slug, logo, brand colors with preview functionality
- **Admin Management**: Show current admins, prevent last-admin removal, invite admin shortcuts
- **Data Export**: Downloadable CSVs for participants, enrollments, activities
- **Danger Zone**: Archive workspace, transfer ownership with clear warning copy

### 4. Advanced Participant Management
- **Filtering System**: Status-based filtering (invited/enrolled/withdrawn), challenge participation, activity dates, points ranges
- **Bulk Operations**: Multi-select for enroll/unenroll across challenges, resend invites, role updates with guardrails
- **Inline Detail View**: Slide-over quick view for profiles, memberships, enrollments, recent events
- **Participant Segments**: Saved filter configurations stored as `WorkspaceParticipantSegment` with JSONB filters

### 5. Enhanced Self Profile System
- **Global Identity**: Full name, avatar, pronouns, short bio, skills/interests in Supabase user_metadata
- **Per-Workspace Settings**: Notifications, privacy, participation preferences stored in WorkspaceMembership.preferences JSONB
- **Notification Matrix**: Type and frequency controls with digest preview
- **Privacy Controls**: Leaderboard visibility, profile visibility, DM preferences
- **Accessibility Options**: UI density, reduced motion, color contrast toggles
- **Time & Locale**: Workspace timezone override, date format preferences
- **Data Controls**: Export submissions, leave workspace functionality

## Implementation Phases

### Phase 1: Core Profile Pages
1. Admin participant detail page implementation
2. Participant self profile page with name editing
3. Profile API route for metadata updates
4. Navigation integration and sidebar updates
5. Basic activity timeline for admin view

### Phase 2: Email System
1. Email settings and template data models
2. Email management interface with tabs
3. Template override functionality
4. Test email sending capabilities

### Phase 3: Enhanced Management
1. Activity templates rename and tabbed interface
2. Advanced participant filtering and bulk operations
3. Workspace settings enhancement
4. Participant segments and saved filters

### Phase 4: Advanced Self Profile
1. Enhanced global identity management
2. Per-workspace preferences system
3. Notification matrix and privacy controls
4. Accessibility and localization features

## Data Model Extensions

### Required Models
- `WorkspaceEmailSettings`: Per-workspace email branding and sender configuration
- `WorkspaceEmailTemplate`: Type-specific email template overrides
- `WorkspaceParticipantSegment`: Saved participant filter configurations
- `EmailTemplateType` enum: INVITE, EMAIL_RESENT, ENROLLMENT_UPDATE, REMINDER, GENERIC

### Schema Modifications
- Add `WorkspaceMembership.preferences` JSONB field for per-workspace user preferences
- Extend existing `ActivityEventType` with email and settings related events
- No changes needed to core identity models (handled via Supabase user_metadata)

## API Surface

### Core Profile APIs
- `GET/PUT /api/account/profile` - Global identity management
- `GET/PUT /api/workspaces/[slug]/profile` - Workspace-scoped profile updates
- Extend existing `/api/workspaces/[slug]/participants/[id]` endpoints

### Email Management APIs
- `GET/PUT /api/workspaces/[slug]/emails/settings` - Email configuration
- `GET/PUT /api/workspaces/[slug]/emails/templates/[type]` - Template management
- `POST /api/workspaces/[slug]/emails/test-send` - Test email functionality

### Enhanced Features APIs
- `GET/PUT /api/workspaces/[slug]/me/preferences` - Per-workspace preferences
- `GET/POST/PUT/DELETE /api/workspaces/[slug]/segments` - Participant segments
- `POST /api/workspaces/[slug]/export` - Data export functionality

## Acceptance Criteria

### Core Functionality
- Admin can view any member's profile with full management capabilities
- Admin can change roles, resend emails, manage enrollments, and remove members with proper guardrails
- Participant can view and edit own full name with immediate header reflection
- All actions properly authorized per role with unauthorized access redirects
- Profile statistics display correctly for current workspace context

### Technical Standards
- No breaking changes to existing participant management functionality
- Proper server component usage for data fetching
- Reuse of existing API routes where possible
- Comprehensive error handling and edge case management
- Integration testing for complete user flows

### Enhanced Features
- Email system provides workspace-specific branding and template overrides
- Activity interface provides better organization and management
- Advanced participant management improves admin efficiency
- Workspace settings offer comprehensive customization options
- Self profile system balances global identity with workspace-specific preferences