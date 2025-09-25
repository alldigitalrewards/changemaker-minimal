
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
