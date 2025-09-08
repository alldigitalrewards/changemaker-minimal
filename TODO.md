# TODO for Complete Local Development with Core Business Logic

The application structure is solid, but these missing pieces are essential for a functional multi-tenant challenge platform. Each component
  builds on the previous one, so following this order ensures a stable implementation.

## Authentication System (Critical - Nothing works without this)

- Supabase Auth Setup:
  - Create auth helper utilities for client/server
  - Set up session management
  - Configure auth redirects and callbacks
- Login/Signup Pages:
  - /auth/login - Email/password login
  - /auth/signup - Registration with role selection
  - /auth/logout - Logout flow

## Middleware Enhancement (Required for protection)

- Update middleware.ts to:
  - Check authentication status
  - Validate user's workspace access
  - Enforce role-based permissions (ADMIN vs PARTICIPANT)
  - Redirect unauthenticated users to login

## Workspace Management (Core multi-tenancy)

- Workspace Selection:
  - /workspaces - List user's workspaces
  - Create new workspace (for admins)
  - Join existing workspace (invite flow)
- Workspace Context:
  - Store current workspace in session/context
  - Handle workspace switching

## Participant Features (Core user experience)

- Dashboard: /w/[slug]/participant/dashboard
  - View enrolled challenges
  - See progress and points
  - Upcoming challenges
- Challenge Browsing: /w/[slug]/participant/challenges
  - View all available challenges
  - Filter by status/category
  - Enroll in challenges
- Enrollment API: /api/workspaces/[slug]/enrollments
  - POST: Enroll in challenge
  - GET: Get user's enrollments
  - PUT: Update enrollment status

## Admin Features (Already partially done)

- ### Challenge creation
- Still needed:
  - Edit/delete challenges
  - View participants
  - User management
  - Workspace settings

## Home & Navigation

- Landing Page (/):

  - Public page with login/signup links
  - Workspace selector for authenticated users
- Navigation Components:

  - Top navbar with user menu
  - Sidebar for workspace navigation
  - Role-based menu items

  ## Data Relationships (Database integrity)
- Link Supabase auth users to Prisma User model
- Ensure workspace isolation in queries
- Handle cascade deletes properly

## Testing Flows

- Admin Flow:
  a. Sign up → Create workspace → Create challenge → View participants
- Participant Flow:
  a. Sign up → Join workspace → Browse challenges → Enroll → View dashboard

 *Next Immediate Steps (Priority Order):*

1. Supabase Auth - Without this, nothing else works
2. Protected Routes - Secure the application
3. Workspace Flow - Enable multi-tenancy
4. Participant Dashboard - Complete the user experience
5. Home Page - Entry point for users

## Agent Management (New Section)
- Review and test the 5 consolidated agents; delete if they introduce complexity.
- If restarting agents, implement the proposed 4 new ones (refactor-guardian.md, etc.) and update CLAUDE.md to remove old references.
- Monitor for scope creep: Ensure agents stay limited to MVP support.

## Public Pages Honeypot (New Section)
- Analyze old repo pages with refactor-guardian: Extract UI/UX context, identify bloat.
- Refactor each page to static (hardcode data, remove dynamics, add comments).
- Integrate refactored pages into /app/ using task-executor.
- Verify visual match with old repo; test CTAs for lead gen (e.g., sign-up links).
- Document any dynamic remnants in code comments for future reference.

## General Tracking
- Update README.md with summaries of discussions (e.g., agent overhauls, page strategies) for team reference.
- Schedule weekly review of TODO.md/TODAY.md to memorize progress and prevent overengineering.
