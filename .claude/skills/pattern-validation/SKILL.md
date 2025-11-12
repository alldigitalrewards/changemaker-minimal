# pattern-validation

**Purpose:** Validate code follows Changemaker patterns, conventions, and best practices.

## When to Invoke

Invoke this skill after:
- Creating new components
- Creating new API routes
- Creating new pages
- Modifying existing patterns
- Before committing any code

## What This Skill Checks

### 1. Component Patterns
- Uses shadcn/ui components as base
- Applies Changemaker theme (coral-500, terracotta-500)
- No duplicate components
- Follows naming conventions
- Proper TypeScript types
- Accessibility standards

### 2. API Route Patterns
- Uses Next.js 15 App Router conventions
- Proper auth checks from lib/auth/api-auth.ts
- Structured response format
- Error handling with typed exceptions
- Workspace context in all operations

### 3. Page Patterns
- Uses Next.js 15 App Router patterns
- Proper auth and role validation
- Suspense for loading states
- Server components by default
- Client components only when needed

### 4. Server Action Patterns
- 'use server' directive
- Auth checks
- Path revalidation after mutations
- Proper error handling

### 5. Code Organization
- DRY principles
- YAGNI principles
- Single Responsibility Principle
- Proper file naming
- Clear directory structure

## Workflow Steps

### Step 1: Identify Code Type
Determine what type of code is being validated:
- UI Component
- API Route
- Page Component
- Server Action
- Database Query
- Type Definition

### Step 2: Apply Relevant Checks

#### For UI Components

**Theme Application:**
- [ ] Primary buttons use `bg-coral-500 hover:bg-coral-600`
- [ ] Secondary buttons use `variant="outline"`
- [ ] Cards use shadcn/ui Card components
- [ ] Consistent spacing with Tailwind utilities

**Component Structure:**
- [ ] Uses existing shadcn/ui components
- [ ] No duplicate functionality exists
- [ ] Descriptive name (no "Simple" or "Enhanced" prefix)
- [ ] Proper TypeScript interface for props
- [ ] Exports component with named export

**Accessibility:**
- [ ] All inputs have labels
- [ ] Buttons have descriptive text
- [ ] Dialogs have proper titles
- [ ] Forms have validation feedback
- [ ] Keyboard accessible

**Example Check:**
```tsx
// ✅ GOOD
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

interface ChallengeCardProps {
  challenge: Challenge;
  onEnroll?: () => void;
}

export function ChallengeCard({ challenge, onEnroll }: ChallengeCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{challenge.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {onEnroll && (
          <Button
            onClick={onEnroll}
            className="bg-coral-500 hover:bg-coral-600"
          >
            Enroll
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ❌ BAD
export default function SimpleChallengeCard(props: any) {
  return (
    <div style={{ backgroundColor: '#EF6F53' }}>
      <h3>{props.title}</h3>
      <button onClick={props.onClick}>Click</button>
    </div>
  );
}
```

#### For API Routes

**Structure:**
- [ ] Uses Next.js 15 route handler pattern
- [ ] Auth check from lib/auth/api-auth.ts
- [ ] Workspace context validation
- [ ] Proper HTTP methods (GET, POST, PATCH, DELETE)
- [ ] Structured response format

**Response Format:**
- [ ] Returns `{ resource }` not `{ data: { resource } }`
- [ ] Consistent error format
- [ ] Proper HTTP status codes

**Example Check:**
```typescript
// ✅ GOOD
import { requireWorkspaceAdmin } from '@/lib/auth/api-auth';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { workspace, user } = await requireWorkspaceAdmin(request);

  const challenges = await getChallengesByWorkspace(workspace.id);

  return Response.json({ challenges });
}

// ❌ BAD
export async function GET(request: NextRequest) {
  const challenges = await prisma.challenge.findMany();
  return Response.json({ data: { challenges } });
}
```

#### For Pages

**Structure:**
- [ ] Async Server Component by default
- [ ] Auth and role validation
- [ ] Workspace context from getCurrentWorkspace()
- [ ] Proper redirects on unauthorized access
- [ ] Uses Suspense for async operations

**Example Check:**
```typescript
// ✅ GOOD
import { getCurrentWorkspace, getUserWorkspaceRole } from '@/lib/workspace-context';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

export default async function ChallengesPage({
  params
}: {
  params: { slug: string }
}) {
  const workspace = await getCurrentWorkspace(params.slug);
  const role = await getUserWorkspaceRole(params.slug);

  if (role !== 'ADMIN') {
    redirect(`/w/${params.slug}/participant`);
  }

  return (
    <div>
      <h1>Challenges</h1>
      <Suspense fallback={<div>Loading...</div>}>
        <ChallengeList workspaceId={workspace.id} />
      </Suspense>
    </div>
  );
}

// ❌ BAD
export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    fetch('/api/challenges').then(r => r.json()).then(setChallenges);
  }, []);

  return <div>{challenges.map(...)}</div>;
}
```

#### For Server Actions

**Structure:**
- [ ] Has 'use server' directive
- [ ] Auth check from requireWorkspaceAccess()
- [ ] Revalidates paths after mutations
- [ ] Returns structured result
- [ ] Proper error handling

**Example Check:**
```typescript
// ✅ GOOD
'use server';

import { requireWorkspaceAdmin } from '@/lib/auth/api-auth';
import { revalidatePath } from 'next/cache';

export async function createChallenge(formData: FormData) {
  const { workspace } = await requireWorkspaceAdmin();

  const challenge = await prisma.challenge.create({
    data: {
      workspaceId: workspace.id,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
    }
  });

  revalidatePath(`/w/${workspace.slug}/admin/challenges`);
  return { success: true, challenge };
}

// ❌ BAD
export async function createChallenge(formData: FormData) {
  await prisma.challenge.create({
    data: {
      title: formData.get('title') as string,
    }
  });
}
```

### Step 3: Check File Naming

**Component Files:**
- [ ] kebab-case naming (e.g., challenge-card.tsx)
- [ ] Descriptive name matching purpose
- [ ] No "Simple" or "Enhanced" prefix
- [ ] .tsx extension for components with JSX
- [ ] .ts extension for utilities

**API Routes:**
- [ ] route.ts for route handlers
- [ ] [id]/route.ts for dynamic routes
- [ ] Located in app/api/ directory

**Pages:**
- [ ] page.tsx for page components
- [ ] layout.tsx for layouts
- [ ] Located in app/w/[slug]/ directory

**Example Check:**
```
✅ GOOD
components/challenges/challenge-card.tsx
components/rewards/reward-selection-dialog.tsx
app/api/challenges/route.ts
app/w/[slug]/admin/challenges/page.tsx

❌ BAD
components/SimpleChallengeCard.tsx
components/EnhancedRewardDialog.tsx
app/api/challenges.ts
app/admin/page.tsx
```

### Step 4: Check for Duplication

Use Serena MCP to search for similar functionality:
- [ ] No duplicate components
- [ ] No duplicate utility functions
- [ ] No duplicate API routes
- [ ] Reuses existing patterns

**Example Search:**
```typescript
// Search for existing dialog components
serena.search_for_pattern({
  substring_pattern: "Dialog.*Props",
  relative_path: "components/"
});

// If found, reuse or extend instead of creating new
```

### Step 5: Validate TypeScript Types

- [ ] All props have proper interfaces
- [ ] No `any` types (use `unknown` if truly needed)
- [ ] Imports types from lib/types.ts
- [ ] Return types specified on functions
- [ ] Proper null/undefined handling

**Example Check:**
```typescript
// ✅ GOOD
import type { Challenge, Workspace } from '@/lib/types';

interface ChallengeCardProps {
  challenge: Challenge;
  workspace: Workspace;
  onEnroll?: () => void;
}

export function ChallengeCard({
  challenge,
  workspace,
  onEnroll
}: ChallengeCardProps): JSX.Element {
  // ...
}

// ❌ BAD
export function ChallengeCard(props: any) {
  // ...
}
```

### Step 6: Generate Report

Create a validation report:

```markdown
## Pattern Validation Report

Date: [timestamp]
File: [file path]
Type: [Component/Route/Page/etc]

### Theme & Styling
- ✅ Uses coral-500 for primary actions
- ✅ Uses shadcn/ui components
- ⚠️  Custom CSS found - should use Tailwind

### Structure
- ✅ Follows Next.js 15 patterns
- ✅ Proper auth checks
- ✅ TypeScript types defined

### DRY/YAGNI
- ✅ No duplicate functionality
- ✅ Minimal dependencies
- ✅ Single responsibility

### Accessibility
- ✅ All inputs labeled
- ⚠️  Missing ARIA attributes on dialog

### Overall: PASS ✅ / NEEDS IMPROVEMENT ⚠️
```

## Common Pattern Violations

### 1. Wrong Response Format
```typescript
// ❌ BAD
return Response.json({ data: { challenges } });

// ✅ GOOD
return Response.json({ challenges });
```

### 2. Missing Theme Colors
```tsx
// ❌ BAD
<Button className="bg-blue-500">Submit</Button>

// ✅ GOOD
<Button className="bg-coral-500 hover:bg-coral-600">Submit</Button>
```

### 3. Duplicate Components
```tsx
// ❌ BAD - Creating new button component
export function SubmitButton() {
  return <button className="...">Submit</button>;
}

// ✅ GOOD - Using shadcn Button
import { Button } from '@/components/ui/button';
<Button className="bg-coral-500 hover:bg-coral-600">Submit</Button>
```

### 4. Client Component Overuse
```tsx
// ❌ BAD - Unnecessary client component
'use client';
export default function Page() {
  return <div>Static content</div>;
}

// ✅ GOOD - Server component by default
export default function Page() {
  return <div>Static content</div>;
}
```

### 5. Missing Path Revalidation
```typescript
// ❌ BAD
'use server';
export async function createChallenge(formData: FormData) {
  await prisma.challenge.create({...});
  return { success: true };
}

// ✅ GOOD
'use server';
import { revalidatePath } from 'next/cache';
export async function createChallenge(formData: FormData) {
  await prisma.challenge.create({...});
  revalidatePath('/w/[slug]/admin/challenges');
  return { success: true };
}
```

## Integration with Agents

### Invoked by:
- **shadcn-agent**: After creating UI components
- **nextjs-agent**: After creating routes/pages
- **prisma-agent**: After creating query functions
- All agents before committing

### Success Criteria
- All patterns match Changemaker conventions
- No DRY/YAGNI violations
- Proper TypeScript types
- Accessibility standards met
- No duplicate functionality

---

**Version:** 1.0
**Last Updated:** 2024-11-12
**Maintained By:** Changemaker Development Team
