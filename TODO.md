# Goals

- Implement per-user profile pages for:
  - Admin view: inspect/manage any workspace member.
  - Participant view: inspect/update own profile within workspace context.
- Reuse existing participant management patterns (`/admin/participants`) and utilities.

### URLs and Routing

- Admin profile detail:
  - `app/w/[slug]/admin/participants/[id]/page.tsx`
- Participant self profile:
  - `app/w/[slug]/participant/profile/page.tsx`
- Global account settings (already linked in header):
  - `app/account/settings/page.tsx` (optional now, can defer if not needed)

### Access Control

- Admin page:
  - Use `getUserWorkspaceRole(slug)`; require `"ADMIN"`.
  - Restrict destructive actions (remove, demote) with guardrails.
- Participant page:
  - Require authenticated user in workspace; allow both `"ADMIN"` and `"PARTICIPANT"`.
  - Only allow editing own profile fields.

### Data Model and Queries

- Prisma entities used: `User`, `WorkspaceMembership`, `Enrollment`, `PointsBalance`, `ActivitySubmission`, `ActivityEvent`.
- Admin profile page query:
  - Load `User` by `[id]`, membership in current `workspace`, enrollments in `workspace` challenges (include `Challenge.title/status`), points balance in `workspace`, last activity/events.
- Participant profile page query:
  - Load current `user` (Supabase) + matching `User` row, primary membership in `workspace`, own enrollments and points balance, latest submissions summary.
- Prefer server components for data fetch in `page.tsx` files; reuse `createClient`, `getCurrentWorkspace`.

### Admin Profile Page (server page)

- Location: `app/w/[slug]/admin/participants/[id]/page.tsx`
- Layout:
  - Header: user email + role + joined date using `components/ui/participant-detail-card.tsx` (pass `slug` to enable inline role editing via `InlineProfile`).
  - Actions row:
    - `EmailActions` (send password reset, resend invite).
    - `ParticipantRoleToggle` (admin<->participant).
    - `ChallengeAssignment` + `BulkChallengeAssignment`.
    - `RemoveParticipantAction`.
  - Stats:
    - Total enrollments, active vs withdrawn counts.
    - Points balance from `PointsBalance` in current workspace.
  - Enrollments table:
    - Challenge, status, joined date, quick “Remove” using `RemoveEnrollmentButton`.
  - Activity timeline (optional v1):
    - Recent `ActivityEvent` rows for this user in workspace.
- Behavior:
  - Use existing API routes used by current admin participants UI:
    - PUT `/api/workspaces/[slug]/participants/[id]` for role changes.
    - POST `/api/workspaces/[slug]/participants/[id]` for actions (resend invite/password reset).
    - DELETE `/api/workspaces/[slug]/participants/[id]`.
    - POST `/api/workspaces/[slug]/participants/[id]/enrollments` for enrollment adds.
    - DELETE `/api/workspaces/[slug]/participants/[id]/enrollments/[enrollmentId]`.
  - Show “Pending” label when `user.isPending` is true; disable password reset for pending if not provisioned.

### Participant Self Profile Page (server page)

- Location: `app/w/[slug]/participant/profile/page.tsx`
- Layout:
  - Header card: email, full name (from Supabase `user_metadata.full_name`), joined date for current workspace.
  - Profile edit section:
    - Editable full name field; write to Supabase `auth.user` metadata and reflect immediately in `DashboardHeader` (already derives name from metadata).
    - Optional avatar (defer if no upload infra yet).
  - Workspace stats:
    - Points balance in current workspace.
    - Enrollment summary with statuses.
  - Security section:
    - Link/button to trigger password reset to self via Supabase or direct portal (no server-side changes if using Supabase UI).
- Behavior:
  - API endpoint for profile updates:
    - `app/api/account/profile/route.ts` or `app/api/workspaces/[slug]/profile/route.ts`:
      - GET: current profile (email, name, metadata, workspace stats).
      - PUT: update `full_name` in Supabase user metadata; update `User.updatedAt`.
  - No email change flow in v1 (email change involves Supabase verification; defer).

### Sidebar and Navigation

- Admin:
  - No new sidebar item needed; admin reaches detail via existing `Participants` table links (`/w/[slug]/admin/participants/[id]` already used).
- Participant:
  - Add “Profile” entry in `components/navigation/participant-sidebar.tsx`:
    - `{ name: 'Profile', href: '/participant/profile', icon: User }`
  - Keep `DashboardHeader` “Account Settings” link; can route to workspace profile or global settings.

### UI Components Reuse and Additions

- Reuse:
  - `components/ui/participant-detail-card.tsx` (admin context; pass `slug` for inline role edit).
  - `InlineProfile`, `ParticipantRoleToggle`, `EmailActions`, `ChallengeAssignment`, `BulkChallengeAssignment`, `RemoveParticipantAction`, `RemoveEnrollmentButton`.
- Add:
  - `components/ui/profile-name-form.tsx` (client) for participant name update.
  - `components/ui/profile-stats.tsx` to show points/enrollments compactly.
  - Minimal `ProfileSection` wrappers for consistent layout.

### API Surface

- Confirm/extend existing participant management handlers:
  - `/api/workspaces/[slug]/participants` (POST bulk/add already exists).
  - `/api/workspaces/[slug]/participants/[id]` supports:
    - PUT role update.
    - POST action: `send_password_reset`, `resend_invite`.
    - DELETE removal.
  - `/api/workspaces/[slug]/participants/[id]/enrollments`:
    - POST create enrollment.
  - `/api/workspaces/[slug]/participants/[id]/enrollments/[enrollmentId]`:
    - DELETE unenroll.
- New for self profile:
  - `/api/account/profile` (workspace-agnostic) or `/api/workspaces/[slug]/profile` (workspace-scoped):
    - PUT `{ fullName: string }` updates Supabase metadata and returns updated profile.

### Permissions and Guardrails

- Prevent:
  - Demoting last `"ADMIN"` in a workspace.
  - Removing self while currently admin (extra confirmation or block).
- Validate:
  - Membership presence for participant page; redirect otherwise.
  - ID format using `isUserId`.

### Event Logging

- On admin actions, create `ActivityEvent` rows:
  - `RBAC_ROLE_CHANGED`, `EMAIL_RESENT`, `INVITE_SENT`, `ENROLLED`, `UNENROLLED`.
- Show recent events in admin profile page (optional v1).

### Error States and Edge Cases

- Pending users with `isPending = true`:
  - Show invite status; prefer “Resend invite” over password reset.
- Users without points/enrollments:
  - Empty state cards.
- Multi-workspace users:
  - Stats limited to current `workspace` context.

### Testing

- Add e2e to navigate:
  - Admin: table -> participant detail, change role, resend invite, enroll/unenroll, remove.
  - Participant: open profile, update name, see stats.
- Unit tests for new profile API route (PUT guardrails).

### Incremental Deliverables

1. Admin participant detail page at `app/w/[slug]/admin/participants/[id]/page.tsx` using existing components.
2. Participant profile page at `app/w/[slug]/participant/profile/page.tsx` with name edit and stats.
3. Sidebar link for participant profile.
4. New profile API route for name updates.
5. Optional admin timeline block using `ActivityEvent`.

### Acceptance Criteria

- Admin can view a member’s profile, change role, resend emails, add/remove enrollments, and remove member, with guards.
- Participant can view and edit own full name; header reflects changes; stats display correctly for current workspace.
- All actions authorized per role; unauthorized access redirects to `/workspaces`.
- No breaking changes to existing participants list and actions.
- Completed investigation of existing layouts and participant management components; produced a concrete, file-level plan with reuse points and minimal API additions.

* Self profile (admin): make it feel useful
* Add notification preferences: review queue updates, enrollment changes, invite events (toggle groups; store in Supabase user_metadata).
* Default landing view: choose which admin page opens by default (Dashboard, Participants, Activities, Emails).
* Default workspace selector: pick the workspace to land on when switching contexts.
* Personal timezone and date format affecting all admin timestamps.
* Quick security actions: “Send password reset”, “Sign out other sessions” (if available).
* Accessibility: UI density, reduced motion, and keyboard hints toggle.
* Workspace settings: actionable and contextual
* Branding: name, slug, logo/brand color; preview of workspace header/sidebar.
* Roles & permissions: show current admins; guardrails to prevent last-admin removal; invite admin flow shortcut.
* Emails defaults: “from” name/email, reply-to, default footer, brand colors (used by all templates), test send.
* Challenge defaults: activity approval policy, base points defaults, enrollment policy window.
* Data export: downloadable CSVs for participants, enrollments, activities; schedule weekly exports.
* Danger zone: archive workspace, transfer ownership; clear copy explaining effects.
* Participant management: higher-signal management UX
* Filtering and segments: status (invited/enrolled/withdrawn), challenge participation, last activity date, points range.
* Bulk actions: enroll/unenroll across selected challenges; resend invites; role updates with guardrails.
* Inline detail slide-over: quick view of profile, memberships, enrollments, recent events; perform quick actions without leaving the list.
* Event feed per participant: RBAC changes, emails sent, enrollments; helps explain state.
* Safeguards: confirm dialogs with context (“x active enrollments will be removed”), block last-admin demotion.
* Activities: rename and add nested tabs
* Rename “Activity Templates” to “Activities”.
* Tabs:
* Activities (default): list workspace activities (across challenges) with filters, status, points; link to challenge context.
* Templates: current template list with inline create/edit.
* Settings (TBD placeholder): defaults for activities, moderation rules.
* Implementation:
* Update components/navigation/admin-sidebar.tsx item: label to “Activities”, href stays /admin/activity-templates (or move route to /admin/activities now if you prefer).
* In app/w/[slug]/admin/activity-templates/page.tsx, render a tabbed UI:
* Tab 1 “Activities”: aggregate getChallengeActivities per workspace; filters and quick links.
* Tab 2 “Templates”: reuse existing templates grid + form.
* Tab 3 “Settings”: scaffold with TODO placeholders.
* Emails: new sidebar entry with nested tabs
* Sidebar: add “Emails” under Activities.
* Tabs:
* Default Emails: read-only preview of system default emails used by the workspace (invite, password reset info/redirects, enrollment updates). Show dynamic tokens like {{workspace.name}}, {{invite_url}}; test send.
* Templates: optional overrides per email type stored at workspace level; inline editor (subject/body), token helper, preview, diff vs default, enable/disable override.
* Settings: from-name/email, reply-to, footer, brand colors, DKIM/SPF guidance link; test domain verification checklist (doc link).
* Data model:
* Keep defaults in code; store overrides in a WorkspaceEmailTemplate table (workspaceId, type, subject, html, updatedBy, updatedAt).
* Use existing SMTP sender; add API endpoints to fetch/update workspace email templates and to test-send.
* Implementation plan:
* New route app/w/[slug]/admin/emails/page.tsx with Tabs: Default | Templates | Settings.
* APIs:
* GET /api/workspaces/[slug]/emails/templates list overrides
* GET /api/workspaces/[slug]/emails/templates/[type]
* PUT /api/workspaces/[slug]/emails/templates/[type]
* POST /api/workspaces/[slug]/emails/test-send (to user email)
* Reuse renderInviteEmail pattern; add renderers for other types with brand variables.
* Must-have Prisma additions for Emails
* WorkspaceEmailSettings: per-workspace sender/brand defaults used by all emails
* id, workspaceId (unique), fromName, fromEmail, replyTo, footerHtml (text), brandColor (string), updatedBy (User), createdAt/updatedAt
* WorkspaceEmailTemplate: per-workspace overrides for specific email types
* id, workspaceId, type (EmailTemplateType), subject, html (text), enabled (boolean), updatedBy (User), createdAt/updatedAt
* enum EmailTemplateType: INVITE, EMAIL_RESENT, ENROLLMENT_UPDATE, REMINDER, GENERIC
* Queries to add in lib/db/queries:
* getWorkspaceEmailSettings, upsertWorkspaceEmailSettings
* listWorkspaceEmailTemplates, getWorkspaceEmailTemplate(type), upsertWorkspaceEmailTemplate(type)
* sendWorkspaceTestEmail(settings, template, to)
* Nice-to-have Prisma changes (high value, low risk)
* WorkspaceParticipantSegment (saved filters for participant management)
* id, workspaceId, name, description, filterJson (JSONB), createdBy, createdAt/updatedAt
* Queries: listSegments, create/update/delete, resolveSegment(filterJson) → where clause
* WorkspaceMembership.preferences (JSONB) for per-workspace admin/user prefs (notification toggles, default landing for that workspace)
* Keeps global identity in Supabase metadata, workspace-specific prefs in Prisma
* Queries: get/updateMembershipPreferences(userId, workspaceId)
* ActivityEvent audit extensions (optional but useful)
* Add ActivityEventType: EMAIL_TEMPLATE_UPDATED, WORKSPACE_SETTINGS_UPDATED, PARTICIPANT_SEGMENT_CREATED/UPDATED/DELETED
* Log on updates to email settings/templates and segment CRUD
* Session/middleware impacts
* Not required. Optional micro-optimization: include x-user-timezone header (derived from Supabase metadata) for server rendering date formatting; safe to skip initially.
* Existing schema stays the source of truth for:
* Identity (full name, avatar, email) in Supabase user_metadata (global across workspaces). No Prisma change needed there.
* Points/Enrollments/Activities already workspace-scoped; no changes needed.
* Why these changes
* Emails require durable, workspace-scoped configuration and overrides → Prisma tables with clear audit and sharing.
* Participant management benefits from saved segments without recomputing complex filters → JSONB-based segments with server-side resolution.
* Per-workspace prefs belong with membership, not global identity.


* Self profile (global identity)
* Fields: full name, avatar, pronouns, short bio. Optional skills/interests to improve challenge recommendations.
* Security: “Send password reset” shortcut; recent sessions list (if available) and “Sign out all other sessions.”
* Accessibility: UI density, reduced motion, color-contrast toggle, date/number locale.
* UX: inline autosave with optimistic updates, profile completeness meter, preview avatar crop.
* Per-workspace participant settings (scoped to current workspace)
* Notifications
* Frequency: real-time, hourly, daily digest.
* Types: new challenge published, enrollment changes, activity reminders, review outcomes, points changes.
* Quiet hours window in workspace timezone.
* Privacy & visibility
* Show in leaderboards (opt-in), show department/title to peers, allow DM from admins only.
* Participation preferences
* Default landing view (Dashboard, Challenges, Activities).
* Challenge topics of interest (to influence “Recommended for you”).
* Reminder cadence for incomplete activities (e.g., 24h before deadline).
* Time & locale
* Workspace timezone override; week start day; 12/24h time.
* Data controls
* Export my submissions (CSV/JSON) for this workspace; leave workspace (with clear impact).
* UX polish
* Tabbed layout: Profile | Notifications | Privacy | Data.
* Preview cards: “this is how your name/avatar appears to others” and “sample reminder email.”
* Skeletons + empty states; undo snackbars for toggles.
* Participant dashboard tie-ins
* Inline nudges using profile completeness and interests (e.g., “Set your interests to get better challenge matches”).
* Quiet-hours aware reminders and localized dates using the stored workspace timezone.
* Leaderboard opt-in respected everywhere; explain impact before enabling.
* Data model/queries (minimal, high value)
* Add WorkspaceMembership.preferences JSONB (per-user, per-workspace) for: notifications, privacy flags, default view, timezone, quiet hours, interests.
* Keep global identity in Supabase user_metadata; don’t duplicate in Prisma.
* Queries: get/update membership preferences; helper to merge defaults + overrides; guard reads by workspaceId.
* Optional ActivityEvent logs: PREFERENCES_UPDATED to audit changes.
* API surface (participant)
* GET /api/workspaces/[slug]/me/preferences returns merged prefs + defaults.
* PUT /api/workspaces/[slug]/me/preferences partial updates with validation (e.g., quiet hours).
* Reuse existing global PUT /api/account/profile for identity edits.
* UI components to build
* NotificationMatrix (type × frequency with digest preview).
* QuietHoursPicker (timezone-aware).
* VisibilityToggles with live preview (leaderboard/profile card).
* InterestsTagInput (chips).
* DataExportButton (streams signed URL/download).

This keeps identity global, makes participant controls meaningfully workspace-scoped, and adds tangible UX value (notifications, privacy, reminders, localization) without straying into out-of-scope features.
