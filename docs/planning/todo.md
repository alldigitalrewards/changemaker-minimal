# Changemaker Platform - Development Roadmap

## ✅ Completed (v0.3.0 - 2025-10-10)

**PR**: [#44 - Global account, workspace visibility, leaderboard UX, multi-reward model](https://github.com/alldigitalrewards/changemaker-minimal/pull/44)

### Multi-Reward System
- [x] Three reward types: Points, SKU, and Monetary
- [x] RewardIssuance model with status tracking
- [x] TenantSku catalog for workspace SKUs
- [x] ActivityTemplate reward configuration
- [x] Challenge-level reward configuration
- [x] Approval workflow with reward issuance
- [x] Comprehensive seed data with all reward types

### Communications System
- [x] WorkspaceCommunication model
- [x] Multi-scope communications (workspace/challenge/activity)
- [x] Audience targeting (ALL, ENROLLED_ONLY, ADMINS_ONLY)
- [x] Priority levels and scheduling

### Global Account Management
- [x] Global /account route
- [x] Password change flow
- [x] Email change flow with verification
- [x] Session refresh after updates
- [x] Unified header with account dropdown

### Workspace Management
- [x] Multi-workspace memberships
- [x] Primary workspace designation
- [x] Workspace switcher component
- [x] Role-based workspace visibility
- [x] Tenant isolation (removed discovery for non-super-admins)
- [x] Workspace sidebar navigation

### Performance Optimizations
- [x] Single aggregated database query (eliminated N+1)
- [x] Composite indexes on hot paths:
  - [x] Membership_workspaceId_role_idx
  - [x] Membership_userId_isPrimary_idx
  - [x] Workspace_tenantId_active_published_idx
  - [x] Challenge_workspaceId_status_idx
- [x] Connection pooling configuration
- [x] 90% reduction in database queries
- [x] 75% faster page loads (800ms → 200ms)

### UI/UX Improvements
- [x] Dashboard header with conditional workspace switcher
- [x] WorkspaceSwitcher context fix
- [x] Role badges across all cards
- [x] Primary workspace indicator
- [x] Leaderboard "Activities completed" copy
- [x] Removed "My Points" from participant nav
- [x] Unified header styling

---

## 🚀 Current Sprint: Phase 2 - Advanced Features & Polish

### Priority 1: Profile Management
**Goal**: Comprehensive profile pages for admins and participants

#### Admin Profile Management
- [ ] Admin participant detail page (`/w/[slug]/admin/participants/[id]`)
  - [ ] User profile card with role and membership info
  - [ ] Action buttons: email reset, resend invite, role toggle
  - [ ] Enrollments table with quick actions
  - [ ] Points balance and activity stats
  - [ ] Activity timeline (optional v1)
- [ ] Guardrails: prevent last admin removal, block self-demotion

#### Participant Self Profile
- [ ] Participant profile page (`/w/[slug]/participant/profile`)
  - [ ] Profile edit section (full name from Supabase metadata)
  - [ ] Workspace stats (points, enrollments)
  - [ ] Security section (password reset link)
- [ ] Profile API endpoint (`/api/account/profile` or `/api/workspaces/[slug]/profile`)
- [ ] Update Supabase user metadata on profile changes
- [ ] Reflect name changes immediately in DashboardHeader

#### Navigation
- [ ] Add "Profile" to participant sidebar
- [ ] Link from admin participants table to detail page

### Priority 2: Workspace Settings
**Goal**: Actionable workspace configuration for admins

#### Branding & Identity
- [ ] Workspace name and slug editing
- [ ] Logo/brand color configuration
- [ ] Preview of workspace header/sidebar
- [ ] Brand consistency enforcement

#### Roles & Permissions
- [ ] Current admins list
- [ ] Invite admin flow shortcut
- [ ] Last-admin removal guardrails
- [ ] Permission audit log

#### Email Defaults
- [ ] "From" name and email configuration
- [ ] Reply-to address
- [ ] Default footer and brand colors
- [ ] Test send functionality

#### Challenge Defaults
- [ ] Activity approval policy
- [ ] Base points defaults
- [ ] Enrollment policy window
- [ ] Auto-enrollment rules

#### Data Management
- [ ] Export participants CSV
- [ ] Export enrollments CSV
- [ ] Export activities CSV
- [ ] Schedule weekly exports

#### Danger Zone
- [ ] Archive workspace (with clear effects explanation)
- [ ] Transfer ownership
- [ ] Workspace deletion (with confirmation)

### Priority 3: Enhanced Participant Management
**Goal**: Higher-signal participant management UX

#### Filtering & Segments
- [ ] Status filters (invited/enrolled/withdrawn)
- [ ] Challenge participation filters
- [ ] Last activity date range
- [ ] Points range filters
- [ ] Saved segments (WorkspaceParticipantSegment model)

#### Bulk Actions
- [ ] Bulk enroll across selected challenges
- [ ] Bulk unenroll with confirmation
- [ ] Bulk resend invites
- [ ] Bulk role updates (with guardrails)

#### Inline Detail Slide-over
- [ ] Quick profile view without leaving list
- [ ] Show memberships, enrollments, recent events
- [ ] Perform quick actions inline

#### Event Feed
- [ ] Per-participant activity timeline
- [ ] RBAC changes, emails sent, enrollments
- [ ] Helps explain current state

### Priority 4: Activities Restructure
**Goal**: Rename and reorganize activity management

#### Rename "Activity Templates" → "Activities"
- [ ] Update sidebar label and icon
- [ ] Update route (consider `/admin/activities`)
- [ ] Update page titles and breadcrumbs

#### Tabbed Interface
- [ ] **Activities Tab** (default):
  - [ ] List workspace activities across challenges
  - [ ] Filters by status, points, challenge
  - [ ] Link to challenge context
- [ ] **Templates Tab**:
  - [ ] Current template list
  - [ ] Inline create/edit
  - [ ] Template library
- [ ] **Settings Tab** (placeholder):
  - [ ] Activity defaults
  - [ ] Moderation rules
  - [ ] Approval policies

### Priority 5: Email Management
**Goal**: New sidebar entry with comprehensive email configuration

#### Default Emails Tab
- [ ] Read-only preview of system default emails
- [ ] Show dynamic tokens ({{workspace.name}}, {{invite_url}})
- [ ] Test send functionality
- [ ] Email type reference (invite, password reset, enrollment updates)

#### Templates Tab
- [ ] Optional per-workspace email overrides
- [ ] Inline editor (subject/body)
- [ ] Token helper with autocomplete
- [ ] Preview with sample data
- [ ] Diff vs default
- [ ] Enable/disable override toggle

#### Settings Tab
- [ ] From name/email configuration
- [ ] Reply-to address
- [ ] Footer content
- [ ] Brand colors
- [ ] DKIM/SPF guidance
- [ ] Domain verification checklist

#### Data Model
- [ ] WorkspaceEmailSettings table (per-workspace sender/brand)
- [ ] WorkspaceEmailTemplate table (per-workspace overrides)
- [ ] EmailTemplateType enum (INVITE, EMAIL_RESENT, ENROLLMENT_UPDATE, REMINDER, GENERIC)

#### API Endpoints
- [ ] GET `/api/workspaces/[slug]/emails/templates`
- [ ] GET `/api/workspaces/[slug]/emails/templates/[type]`
- [ ] PUT `/api/workspaces/[slug]/emails/templates/[type]`
- [ ] POST `/api/workspaces/[slug]/emails/test-send`
- [ ] GET `/api/workspaces/[slug]/emails/settings`
- [ ] PUT `/api/workspaces/[slug]/emails/settings`

---

## 📋 Backlog: Future Enhancements

### Participant Preferences
**Goal**: Workspace-scoped settings for participants

#### Notifications
- [ ] Frequency settings (real-time, hourly, daily digest)
- [ ] Type toggles (new challenge, enrollment changes, reminders, reviews, points)
- [ ] Quiet hours window (timezone-aware)

#### Privacy & Visibility
- [ ] Show in leaderboards (opt-in)
- [ ] Show department/title to peers
- [ ] Allow DM from admins only

#### Participation Preferences
- [ ] Default landing view (Dashboard, Challenges, Activities)
- [ ] Challenge topics of interest
- [ ] Reminder cadence for incomplete activities

#### Time & Locale
- [ ] Workspace timezone override
- [ ] Week start day
- [ ] 12/24h time format
- [ ] Date format preference

#### Data Controls
- [ ] Export my submissions (CSV/JSON)
- [ ] Leave workspace (with impact warning)

#### Implementation
- [ ] Add WorkspaceMembership.preferences JSONB field
- [ ] API: GET/PUT `/api/workspaces/[slug]/me/preferences`
- [ ] Merge defaults + overrides helper
- [ ] ActivityEvent logs for preference updates

### Advanced Analytics
- [ ] Workspace-level analytics dashboard
- [ ] Challenge performance metrics
- [ ] Participant engagement trends
- [ ] Reward distribution analysis
- [ ] Export analytics reports

### Integration Layer
- [ ] RewardSTACK API integration preparation
- [ ] Adapter pattern for third-party reward providers
- [ ] Webhook system for external integrations
- [ ] API versioning and documentation

### Mobile Optimization
- [ ] Responsive design improvements
- [ ] Touch-friendly interfaces
- [ ] Mobile-specific navigation patterns
- [ ] Progressive Web App (PWA) features

---

## 🔧 Technical Debt

### Testing
- [ ] Integration tests for reward issuance flow
- [ ] E2E tests for multi-workspace scenarios
- [ ] Unit tests for new API endpoints
- [ ] Performance regression tests

### Documentation
- [ ] API endpoint documentation updates
- [ ] Component library documentation
- [ ] Database schema documentation
- [ ] Deployment guide updates

### Code Quality
- [ ] Type safety improvements in queries
- [ ] Error handling standardization
- [ ] Logging infrastructure
- [ ] Monitoring and alerting setup

---

## 📊 Success Metrics

### Performance Targets
- Page load time < 300ms (currently 200ms)
- Database queries per page < 3 (currently 1-2)
- Time to interactive < 500ms (currently 400ms)

### User Experience Targets
- Admin task completion time: 50% reduction
- Participant enrollment flow: < 60 seconds
- Workspace discovery: < 10 seconds to first meaningful workspace
- Zero layout shift on all pages

### Business Targets
- Support 1000+ concurrent users
- Handle 100+ workspaces per tenant
- Process 10,000+ activities per day
- 99.9% uptime SLA

---

## 🎯 Next Steps

1. **Complete Profile Management** (Priority 1) - 1-2 days
2. **Implement Workspace Settings** (Priority 2) - 2-3 days
3. **Enhance Participant Management** (Priority 3) - 3-4 days
4. **Restructure Activities** (Priority 4) - 1-2 days
5. **Add Email Management** (Priority 5) - 2-3 days

**Total estimated time for Phase 2**: 2-3 weeks

---

*Last updated: 2025-10-10*
