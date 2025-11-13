# workspace-isolation-check

**Purpose:** Validate multi-tenant workspace isolation across all code changes.

## When to Invoke

Invoke this skill after:
- Creating or modifying API routes
- Creating or modifying database queries
- Adding new Prisma models
- Creating new pages or server actions
- Modifying middleware
- Any code that touches workspaceId or workspace context

## What This Skill Checks

### 1. Database Query Validation
- All queries include workspaceId filter
- No queries bypass workspace isolation
- Prisma includes/selects maintain isolation
- Aggregations filter by workspaceId

### 2. API Route Validation
- All routes use requireWorkspaceAccess() or requireWorkspaceAdmin()
- No direct database access without workspace context
- Request handlers validate workspace ownership
- Response data filtered by workspace

### 3. RLS Policy Validation
- All tables have workspace_isolation policy
- Policies use current_setting('app.current_workspace_id')
- No policies allow cross-workspace access
- Foreign key relationships maintain isolation

### 4. Middleware Validation
- Workspace slug extracted from URL path
- Workspace context set in request headers
- Auth checks include workspace membership
- Redirects respect workspace boundaries

### 5. Type Safety Validation
- Types include workspaceId where needed
- No types allow undefined workspaceId
- Query return types enforce workspace filtering

## Workflow Steps

### Step 1: Identify Changed Files
```bash
# Get list of changed files
git diff --name-only
```

### Step 2: Check API Routes
For each route file in `app/api/`:
- [ ] Imports auth helpers from lib/auth/api-auth.ts
- [ ] Uses requireWorkspaceAccess() or requireWorkspaceAdmin()
- [ ] All database queries include workspaceId filter
- [ ] No hardcoded workspace IDs

**Example Check:**
```typescript
// ✅ GOOD
export async function GET(request: NextRequest) {
  const { workspace, user } = await requireWorkspaceAdmin(request);
  const challenges = await prisma.challenge.findMany({
    where: { workspaceId: workspace.id }
  });
  return Response.json({ challenges });
}

// ❌ BAD - Missing auth check
export async function GET(request: NextRequest) {
  const challenges = await prisma.challenge.findMany();
  return Response.json({ challenges });
}
```

### Step 3: Check Database Queries
For each file in `lib/db/`:
- [ ] All query functions accept workspaceId parameter
- [ ] All where clauses include workspaceId
- [ ] No queries bypass workspace filter
- [ ] Aggregations grouped by workspaceId

**Example Check:**
```typescript
// ✅ GOOD
export async function getChallenges(workspaceId: string) {
  return prisma.challenge.findMany({
    where: { workspaceId },
    include: { enrollments: true }
  });
}

// ❌ BAD - Missing workspaceId filter
export async function getChallenges() {
  return prisma.challenge.findMany();
}
```

### Step 4: Check Prisma Schema
For each model in `prisma/schema.prisma`:
- [ ] Has workspaceId field (if not a root model)
- [ ] workspaceId is @db.Uuid type
- [ ] Has relation to Workspace model
- [ ] Has @@index on workspaceId for performance

**Example Check:**
```prisma
// ✅ GOOD
model Challenge {
  id          String    @id @default(uuid()) @db.Uuid
  workspaceId String    @db.Uuid
  workspace   Workspace @relation(fields: [workspaceId], references: [id])

  @@index([workspaceId])
}

// ❌ BAD - Missing workspaceId
model Challenge {
  id    String @id @default(uuid()) @db.Uuid
  title String
}
```

### Step 5: Check RLS Policies
For each Supabase SQL migration:
- [ ] Creates workspace_isolation policy
- [ ] Policy uses current_setting('app.current_workspace_id')
- [ ] Policy applies to ALL operations (SELECT, INSERT, UPDATE, DELETE)
- [ ] No USING (true) policies on workspace-scoped tables

**Example Check:**
```sql
-- ✅ GOOD
CREATE POLICY "workspace_isolation" ON challenges
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id')::uuid);

-- ❌ BAD - No workspace check
CREATE POLICY "allow_all" ON challenges
  FOR ALL
  USING (true);
```

### Step 6: Check Pages and Server Actions
For each page in `app/w/[slug]/`:
- [ ] Uses getCurrentWorkspace(slug) to get workspace context
- [ ] Validates user has access via getUserWorkspaceRole()
- [ ] All data fetching includes workspace context
- [ ] Redirects on unauthorized access

For each server action:
- [ ] Has 'use server' directive
- [ ] Uses requireWorkspaceAccess() or requireWorkspaceAdmin()
- [ ] All mutations include workspaceId
- [ ] Revalidates paths after mutations

### Step 7: Generate Report
Create a checklist of findings:

```markdown
## Workspace Isolation Check Report

Date: [timestamp]
Branch: [branch name]
Changed files: [count]

### API Routes
- ✅ All routes use auth checks
- ✅ All queries filter by workspaceId
- ⚠️  Found 1 route without workspace validation: app/api/foo/route.ts

### Database Queries
- ✅ All queries include workspaceId
- ✅ No bypasses detected

### Prisma Schema
- ✅ All models have workspaceId
- ✅ All relations maintain isolation

### RLS Policies
- ✅ All tables have workspace_isolation policy
- ✅ No overly permissive policies

### Pages & Actions
- ✅ All pages validate workspace access
- ✅ All server actions use auth checks

### Overall: PASS ✅ / FAIL ❌
```

## Tools to Use

- **Serena MCP**: Search for patterns across codebase
  - `search_for_pattern` with `workspaceId` to find all references
  - `find_symbol` to analyze query functions

- **Grep**: Quick pattern matching
  - Search for `prisma.challenge.findMany` without `where: { workspaceId }`
  - Search for API routes without `requireWorkspace`

- **Read**: Inspect specific files for validation

## Integration with Agents

### Invoked by:
- **supabase-agent**: After creating RLS policies
- **prisma-agent**: After schema changes
- **nextjs-agent**: After creating API routes or pages
- All agents before committing changes

### Success Criteria
- Zero workspace isolation violations
- All queries include workspaceId filter
- All API routes have auth checks
- All RLS policies enforce isolation

## Common Violations

### 1. Missing Auth Check
```typescript
// ❌ BAD
export async function GET(request: NextRequest) {
  const challenges = await prisma.challenge.findMany();
  return Response.json({ challenges });
}

// ✅ FIX
export async function GET(request: NextRequest) {
  const { workspace } = await requireWorkspaceAdmin(request);
  const challenges = await prisma.challenge.findMany({
    where: { workspaceId: workspace.id }
  });
  return Response.json({ challenges });
}
```

### 2. Aggregation Without Workspace Filter
```typescript
// ❌ BAD
export async function getChallengeCount() {
  return prisma.challenge.count();
}

// ✅ FIX
export async function getChallengeCount(workspaceId: string) {
  return prisma.challenge.count({
    where: { workspaceId }
  });
}
```

### 3. Include Without Workspace Filter
```typescript
// ❌ BAD
const challenge = await prisma.challenge.findUnique({
  where: { id: challengeId },
  include: { enrollments: true } // Pulls all enrollments regardless of workspace
});

// ✅ FIX
const challenge = await prisma.challenge.findUnique({
  where: {
    id: challengeId,
    workspaceId: workspace.id
  },
  include: {
    enrollments: {
      where: { workspaceId: workspace.id }
    }
  }
});
```

### 4. Server Action Without Auth
```typescript
// ❌ BAD
'use server';
export async function createChallenge(formData: FormData) {
  return prisma.challenge.create({
    data: { title: formData.get('title') }
  });
}

// ✅ FIX
'use server';
import { requireWorkspaceAdmin } from '@/lib/auth/api-auth';
export async function createChallenge(formData: FormData) {
  const { workspace } = await requireWorkspaceAdmin();
  return prisma.challenge.create({
    data: {
      title: formData.get('title'),
      workspaceId: workspace.id
    }
  });
}
```

## Example Invocation

```
User: "I've created a new API route for managing challenges"

Agent workflow:
1. Invoke workspace-isolation-check skill
2. Skill checks:
   - API route has auth check ✅
   - Queries include workspaceId ✅
   - Response data filtered ✅
3. Skill reports: "All checks passed"
4. Agent proceeds with commit
```

---

**Version:** 1.0
**Last Updated:** 2024-11-12
**Maintained By:** Changemaker Development Team
