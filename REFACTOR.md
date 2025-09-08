# 🎯 Project Mission (Simplified)

Changemaker is a multi-tenant platform for organizations to run innovation challenges. Core: Inspire participation via challenges; track enrollment/progress; admin management. No extras (e.g., advanced analytics, emails, AI – add later if needed).

**Priorities**: High-quality, DRY, type-safe code; simple for human review; scale to 10k users. Use pnpm for all package management/commands [[memory:3933555]]. Think like a boss: Strategic, efficient; implement like top SF dev: Clean, performant [[memory:3146097]].

## 🌍 Environments (Minimal Setup)

- **Local**: `pnpm dev`. URL: http://localhost:3000. Database: Supabase local (via Docker: `docker compose up -d`).
- **Staging/Prod**: Vercel. Domain: changemaker.im (path-based: /w/acme/dashboard). No subdomains.
- **DB**: Supabase Postgres + Auth. Run `pnpm prisma generate` after schema changes.

## 🏗️ Architecture (Best Path Forward)

Base: Minimal Next.js 15 app with path-based multi-tenancy. Extracted essentials from original repo, resolved conflicts (no super admin, no subdomains).

- **Nixed**: Super admin, subdomains, Redis—use paths (/w/[slug]) and simple ADMIN/PARTICIPANT roles.

### Key Changes from Original/Template

- **Nixed**: Super admin role (conflicting in old schemas) – simplify to ADMIN (manages workspace) and PARTICIPANT. No subdomains (old middleware conflict) – use paths (/w/[slug]/[role]/dashboard).
- **Best Upgrades**: React 19 for async components; Next.js 15 App Router; Prisma for tenant-scoped data; Supabase RLS for perms.
- **Stack**: Next.js 15, React 19, TypeScript 5.8+, Prisma, Supabase Auth/DB, Tailwind/shadcn/ui (Changemaker theme).

### Prisma Schema (Optimized for Paths/Roles)

Best: Minimal, with workspace as tenant, enum roles, RLS-ready.

```prisma
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql" url = env("DATABASE_URL") }

enum Role { ADMIN PARTICIPANT }  // Simplified - no super admin

model Workspace {
  id        String   @id @default(uuid()) @db.Uuid
  slug      String   @unique  // For paths: /w/acme
  name      String
  users     User[]   // Via relation
  challenges Challenge[]
}

model User {
  id             String   @id @default(uuid()) @db.Uuid
  email          String   @unique
  supabaseUserId String?  @unique @db.Uuid
  role           Role     // Global role (extend per workspace if needed)
  workspaceId    String?  @db.Uuid
  workspace      Workspace? @relation(fields: [workspaceId], references: [id])
  enrollments    Enrollment[]
}

model Challenge {
  id          String   @id @default(uuid()) @db.Uuid
  title       String
  description String
  workspaceId String   @db.Uuid
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  enrollments Enrollment[]
}

model Enrollment {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @db.Uuid
  challengeId String  @db.Uuid
  status     String
  user       User     @relation(fields: [userId], references: [id])
  challenge  Challenge @relation(fields: [challengeId], references: [id])
}
```

- **Why Best?**: Tenant isolation via workspaceId; simple roles; scalable for challenges. Add RLS policies in Supabase dashboard (e.g., users can only see own workspace data).

### Routing and Middleware (Path-Based)

Best: Dynamic paths for workspaces; middleware for auth/role checks.

```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const workspaceMatch = pathname.match(/^\/w\/([^\/]+)/);
  if (workspaceMatch) {
    const slug = workspaceMatch[1];
    const supabase = createServerClient(/* config */);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.redirect(new URL('/login', req.url));

    // Verify workspace and role (best: simple check)
    const workspace = await prisma.workspace.findUnique({ where: { slug } });
    if (!workspace || user.workspaceId !== workspace.id || user.role !== 'ADMIN' /* or check perms */) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
    // Proceed
  }
  return NextResponse.next();
}

export const config = { matcher: ['/w/:path*'] };
```

- App structure: /w/[slug]/dashboard/page.tsx (copy your originals, simplify).

### Role Hierarchy and Permissions

Best: Enum-based, checked in middleware/routes. No super admin – admins manage own workspace.

```ts
// lib/auth/rbac.ts
export enum Role { ADMIN = 'ADMIN', PARTICIPANT = 'PARTICIPANT' }

export function hasAccess(userRole: Role, required: Role): boolean {
  return userRole === required;  // Simple for now; add hierarchy if needed
}

// Usage in route: if (!hasAccess(user.role, 'ADMIN')) throw Error('Unauthorized');
```

### Best Path Forward: Quick Functionality Roadmap

To turn the template functional fast (1-2 hours):

1. **Setup DB/Auth**: Add Supabase env vars; run `pnpm prisma db push`.
2. **Seed Data**: Create script for test workspaces/users/challenges.
3. **Integrate Pages/Theme**: Copy your components/globals.css; apply Changemaker colors in tailwind.config.js (coral/terracotta gradients).
4. **Core Flows**:
   - Login: Use Supabase Auth.
   - Create Workspace: Admin form (adapt template's).
   - Challenges: Simple CRUD in /w/[slug]/challenges.
   - Enrollment: User joins via button.
5. **Test**: `pnpm dev`; create workspace, add challenge, enroll as participant.
6. **Self-Improve**: Agents: Use task-orchestrator to hand off (e.g., TypeScript specialist for types). Update this CLAUDE.md if inefficiencies spotted.

**Memories Integrated**: pnpm for all [[memory:3933555]]; high-quality, simple code [[memory:3146097]].

This sets you on the best path – clean, functional, bloat-free. Ready to implement?
