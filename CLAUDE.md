# Changemaker - Multi-Tenant Challenge Platform

This is the context file for Claude Code working on the Changemaker project.

## Project Overview

Building a minimal multi-tenant challenge platform with path-based workspaces (/w/[slug]).

**Stack:**
- Next.js 15 (App Router), React 19, TypeScript 5.8+
- Prisma + Supabase (Auth + PostgreSQL)
- Tailwind CSS + shadcn/ui (Changemaker theme)
- Local development: Supabase Local, pnpm

**Core Models:** User, Workspace, Challenge, Enrollment, Reward, Participant, Submission

**Key Principles:**
- DRY: Don't Repeat Yourself
- YAGNI: You Aren't Gonna Need It
- Type-safe: Strict TypeScript everywhere
- Tested: Playwright tests for critical flows
- Minimal: ~300-400 files target

## Development Commands

```bash
# Local development
pnpm dev                          # Start dev server (localhost:3000)
pnpm db:push                      # Push Prisma schema to local Supabase
pnpm prisma:generate              # Generate Prisma client
pnpm prisma:studio               # Open Prisma Studio

# Testing
pnpm test                         # Run all tests
pnpm test:api                     # API tests only
pnpm test:ui                      # UI tests only
pnpm playwright test <file>       # Run specific test

# Build & Type Check
pnpm build                        # Production build
pnpm tsc                          # Type check

# Database
psql $DATABASE_URL                # Connect to local Supabase
```

## Project Structure

```
app/
├── (public)/                     # Public routes (landing, auth)
├── w/[slug]/                     # Workspace routes
│   ├── admin/                    # Admin role routes
│   ├── manager/                  # Manager role routes
│   └── participant/              # Participant role routes
lib/
├── auth/                         # Auth utilities & middleware
├── db/                           # Database queries & utilities
├── email/                        # Email templates & sending
└── theme/                        # Theme configuration
components/                       # Shared UI components
prisma/
└── schema.prisma                 # Database schema
```

## Core Patterns

### Authentication & Authorization
- Always use `requireWorkspaceAccess()` or `requireWorkspaceAdmin()` from `/lib/auth/api-auth.ts`
- Check user role via `getUserWorkspaceRole()` in page components
- Workspace isolation enforced via middleware and RLS policies

### Database Queries
- Import from `/lib/db/queries.ts` (standardized, workspace-isolated)
- Always include `workspaceId` filter
- Use typed includes: `ChallengeWithDetails`, `EnrollmentWithDetails`
- Wrap in try/catch with typed exceptions

### API Routes
- Use `withErrorHandling()` wrapper
- Return structured responses: `{ challenge }`, `{ challenges }`, etc.
- Validate with type guards from `/lib/types.ts`

### UI Components
- Use shadcn/ui components consistently
- Primary actions: `bg-coral-500 hover:bg-coral-600`
- Cards: `Card`, `CardHeader`, `CardTitle`, `CardContent`
- Forms: Controlled inputs with validation and loading states

### Testing Philosophy
- Test critical user flows end-to-end
- API tests for all CRUD operations
- UI tests for complex interactions
- "Would I bet $100 this works?" standard

## Quality Standards

**The 30-Second Reality Check** - Must answer YES to ALL:
1. Did I run/build the code?
2. Did I trigger the exact feature I changed?
3. Did I see the expected result with my own observation?
4. Did I check for error messages?
5. Would I bet $100 this works?

**Avoid these phrases:**
- "This should work now"
- "I've fixed the issue" (without verification)
- "The logic is correct so..."

## Development Workflow

1. Read task or requirement
2. Understand existing patterns via code search
3. Implement following established patterns
4. Test the actual feature (not just build)
5. Verify in browser/GUI if applicable
6. Run tests if they exist for the area
7. Commit with clear message

## File Naming

- No prefixes like "Simple", "Enhanced", "New"
- Name for purpose: `challenge-list.tsx`, not `enhanced-challenge-list.tsx`
- One component per file (except small related types)

## Tech Stack Details

**Database:**
- Prisma schema in `prisma/schema.prisma`
- Migrations: Use `pnpm db:push` for local dev
- RLS policies in Supabase for row-level security

**Email:**
- Resend for transactional emails
- Templates in `lib/email/`
- Preview with `pnpm email:preview`

**Rewards:**
- RewardSTACK integration for SKU fulfillment
- Points tracking in database
- Shipping confirmations for physical rewards

## Task Master Integration

Task Master AI is available via MCP server for task management.

**Quick commands:**
```bash
task-master list                  # List all tasks
task-master next                  # Get next task
task-master show <id>             # Task details
task-master set-status --id=<id> --status=done
```

See `.taskmaster/CLAUDE.md` for complete documentation.

## Migration Standards

1. Use `pnpm db:push` for local schema changes
2. Never manually edit migration tables
3. Test migrations on staging before production
4. Always backup before schema changes

## Minimalism Rules

- Before adding ANY file: "Does this align with core models?"
- Before adding ANY dependency: "Is this already solved?"
- Before adding ANY abstraction: "Do we have 3+ uses?"
- Target: ~300-400 files total

## Current Focus

Working on email templates and reward issuance flows. See `docs/planning/todo.md` for detailed roadmap.

---
**Last Updated:** 2024-11-12
