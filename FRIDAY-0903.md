# TODAY'S BUILD FOCUS (Minimal MVP)

## Core Implementation Path:

### Simple Supabase Auth (2 components only)

- Login page with email/password
- Signup page with role selection
- No JWT complexity, no Redis, just Supabase sessions

### Basic Middleware (50 lines max)

- Check if user is logged in
- Check user role (ADMIN or PARTICIPANT)
- Redirect to login if not authenticated

### Workspace Flow (3 pages)

- /workspaces - Simple list of user's workspaces
- Create workspace button (admins only)
- Click to enter workspace → /w/[slug]

### Admin Features (Already have challenge creation)

- View participants list
- That's it for MVP

### Participant Features (2 pages)

- /w/[slug]/participant/dashboard - Show enrolled challenges
- /w/[slug]/participant/challenges - Browse & enroll

### Single API for Enrollment

- POST /api/workspaces/[slug]/enrollments - Enroll in challenge
- GET to fetch user's enrollments

## What We're NOT Building:

- No analytics
- No email notifications (except Supabase auth emails)
- No gamification/points/rewards
- No audit logging
- No A/B testing
- No Redis caching
- No complex permissions
- No billing
- No content management
- No help documentation
- No command palette
- No global search
- No performance monitoring

### Database Stays Simple:

```typescript
model User {
    id, email, role, workspaceId, supabaseUserId
  }
  model Workspace {
    id, slug, name
  }
  model Challenge {
    id, title, description, workspaceId
  }
  model Enrollment {
    id, userId, challengeId, status
  }
```

  *That's it. 4 models, not 30+.*

### The Result:

  A working multi-tenant challenge platform that:

- Admins can create workspaces and challenges
- Participants can join and enroll
- Everything is properly authenticated
- Zero unnecessary complexity

  This is achievable in a day, maintainable by one person, and provides the core business value without the 2000+ files of bloat from the
  original.

## Recent Updates and Immediate Actions (From Discussions)
- **Agent Overhaul**: Consolidated agents to 5 essentials (refactor-guardian, db-minimalist, auth-simplifier, type-enforcer, task-coordinator) for minimalism. Considered full deletion; proposed new set of 4 if restarting. Action: Use refactor-guardian for page extraction/refactor.
- **Public Pages Honeypot Integration**: Extract/refactor landing pages (home, about, how-it-works, etc.) from old repo as static UI/UX honeypots for lead gen. Preserve look/feel, strip bloat (dynamic logic, state), hardcode data, add comments for original dynamics. Action: Follow execution plan—analyze with refactor-guardian, implement with task-executor.
- **Next Steps**: Prioritize auth (2 components), middleware (<50 lines), then integrate static public pages as facade. Test UI match and CTAs (e.g., to /login).
