# Changemaker Platform (Minimal MVP Refactor)

A lean, production-ready multi-tenant challenges platform built with Next.js 15, using path-based workspaces (/w/[slug]), Supabase for auth/DB, Prisma ORM, and Tailwind/shadcn/ui. Focuses on core logic: workspaces as tenants, simple roles (ADMIN, PARTICIPANT), challenges/enrollment, basic dashboards. Public pages serve as a honeypot for lead generation (waitlist/signups) while the MVP is minimal behind login.

## Prerequisites
- Node.js 18+ and pnpm
- Supabase account (for auth/DB)

## Installation
1. Clone your repo (or this template).
2. Install deps: `pnpm install`
3. Set up .env.local with Supabase vars (e.g., SUPABASE_URL, SUPABASE_ANON_KEY, DATABASE_URL).
4. Generate Prisma client: `pnpm prisma generate`
5. Push schema to DB: `pnpm prisma db push`

## Running the App
- Development: `pnpm dev` (runs on localhost:3000)
- Build: `pnpm build`
- Start: `pnpm start`

Access public honeypot pages at root (e.g., /, /about). Logged-in MVP at /w/[slug]/...

## Project Structure
- /app/: Routes (public honeypots at root, MVP under /w/[slug]/)
- /components/: UI components (common, admin, participant)
- /lib/: Utilities (auth, prisma helpers)
- /prisma/: Schema (4 models: User, Workspace, Challenge, Enrollment)

## Refactor Notes
Follow CLAUDE.md for guiding principles (minimalism, no bloat). Use consolidated agents if needed for tasks.

## Project Evolution Log (Discussion Summaries)
- **Refactor Goals**: Stripping bloat from original repo, adapting Vercel template to path-based multi-tenancy (/w/[slug]), focusing on minimal MVP (Supabase auth, workspaces, challenges/enrollment, 4-model schema). No extras like analytics or Redis.
- **Agent Overhaul**: Consolidated from 13 bloated agents to 5 essentials, with anti-creep rules. Considered full deletion; proposed fresh set of 4 (refactor-guardian, db-minimalist, auth-simplifier, type-enforcer) to prevent overengineering. Agents now tools, not systems.
- **Public Pages Strategy**: Integrate landing pages (home, about, etc.) as static honeypots for lead gen/waitlist. Preserve UI/UX look, strip dynamic bloat, hardcode data, add comments for originals. Execution via refactor-guardian (analysis/refactor) and task-executor (integration).
- **Key Decisions**: Prioritize static public facade for POC/showcase; keep MVP minimal behind login. Use tools like edit_file for precise changes; enforce CLAUDE.md rules to avoid scope creep.

This log tracks discussions for team alignment—update as needed.
