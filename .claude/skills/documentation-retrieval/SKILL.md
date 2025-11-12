# documentation-retrieval

**Purpose:** Fetch relevant documentation from official sources using MCP tools.

## When to Invoke

Invoke this skill when:
- Learning about a new technology or API
- Implementing a feature from a framework (Next.js, React, etc.)
- Using a library for the first time (Prisma, shadcn/ui, etc.)
- Debugging framework-specific issues
- Verifying syntax or API signatures
- Need examples or best practices

## Available Documentation Sources

### 1. Context7 MCP
Access documentation for major libraries and frameworks:
- Next.js
- React
- Prisma
- React Email
- shadcn/ui (via Radix UI docs)
- TypeScript
- Tailwind CSS

### 2. Supabase MCP
Access Supabase-specific documentation:
- Auth
- Database
- RLS policies
- Client libraries
- Management API

### 3. Web Search (via Zen MCP)
For documentation not available via Context7:
- RewardSTACK API
- Resend API
- Specific npm packages
- Blog posts and tutorials

## Workflow Steps

### Step 1: Identify Documentation Need

Determine what type of documentation is needed:
- API reference
- Component documentation
- Configuration guide
- Best practices
- Migration guide
- Troubleshooting

### Step 2: Choose Appropriate Tool

**Use Context7 for:**
- Next.js App Router patterns
- React 19 features
- Prisma schema and queries
- React Email components
- shadcn/ui component APIs
- TypeScript syntax

**Use Supabase MCP for:**
- Supabase Auth setup
- RLS policy syntax
- Database migrations
- Supabase client methods

**Use Zen MCP (web search) for:**
- Third-party APIs (RewardSTACK, Resend)
- Specific error messages
- Community solutions
- Recent updates not in docs

### Step 3: Construct Query

**For Context7:**
```typescript
// Resolve library ID first
mcp__context7__resolve-library-id({
  libraryName: "next.js"
})

// Then get docs
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/vercel/next.js",
  topic: "server actions",
  tokens: 5000
})
```

**For Supabase MCP:**
```graphql
{
  searchDocs(query: "row level security policies", limit: 5) {
    nodes {
      title
      href
      content
    }
  }
}
```

**For Zen MCP (web search):**
```typescript
mcp__zen__apilookup({
  prompt: "RewardSTACK API order creation endpoint"
})
```

### Step 4: Extract Relevant Information

From the documentation response:
1. Identify the relevant API signatures
2. Extract code examples
3. Note best practices
4. Record common gotchas
5. Save to agent memory if needed

### Step 5: Apply to Implementation

Use the retrieved documentation to:
- Write code following official patterns
- Avoid deprecated APIs
- Use proper type definitions
- Implement error handling
- Follow framework conventions

## Documentation Queries by Agent

### supabase-agent

**Common queries:**
- "Supabase Auth setup with Next.js"
- "RLS policy syntax for multi-tenant"
- "Supabase client initialization"
- "Row level security best practices"

**Example:**
```graphql
{
  searchDocs(query: "row level security current_setting", limit: 3) {
    nodes {
      title
      content
    }
  }
}
```

### prisma-agent

**Common queries:**
- "Prisma schema relationships"
- "Prisma migration workflow"
- "Prisma client queries"
- "Prisma transaction API"

**Example:**
```typescript
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/prisma/prisma",
  topic: "relations and foreign keys",
  tokens: 3000
})
```

### nextjs-agent

**Common queries:**
- "Next.js 15 App Router patterns"
- "Server actions with revalidation"
- "Route handler authentication"
- "Middleware configuration"

**Example:**
```typescript
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/vercel/next.js",
  topic: "route handlers authentication",
  tokens: 5000
})
```

### shadcn-agent

**Common queries:**
- "shadcn/ui Dialog component"
- "shadcn/ui Form with validation"
- "Radix UI accessibility"
- "shadcn/ui theme customization"

**Example:**
```typescript
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/shadcn/ui",
  topic: "dialog component props",
  tokens: 3000
})
```

### resend-agent

**Common queries:**
- "React Email component library"
- "Resend API send email"
- "Email template best practices"
- "React Email Button component"

**Example:**
```typescript
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/resendlabs/react-email",
  topic: "email components",
  tokens: 4000
})
```

### playwright-agent

**Common queries:**
- "Playwright API testing"
- "Playwright selectors"
- "Playwright fixtures"
- "Playwright assertions"

**Example:**
```typescript
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/microsoft/playwright",
  topic: "api testing request fixture",
  tokens: 4000
})
```

### rewardstack-agent

**Common queries:**
- "RewardSTACK API documentation"
- "RewardSTACK order creation"
- "RewardSTACK tracking API"
- "RewardSTACK webhook handling"

**Example:**
```typescript
mcp__zen__apilookup({
  prompt: "RewardSTACK API complete documentation for order management"
})
```

## Example Workflows

### Example 1: Implement Server Action

**Need:** How to properly implement a Next.js server action with revalidation

**Workflow:**
1. Query Context7 for Next.js server actions:
```typescript
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/vercel/next.js",
  topic: "server actions revalidatePath",
  tokens: 5000
})
```

2. Extract pattern from docs:
```typescript
'use server'
import { revalidatePath } from 'next/cache'

export async function createItem(formData: FormData) {
  // ... create item
  revalidatePath('/items')
  return { success: true }
}
```

3. Apply to Changemaker context:
```typescript
'use server'
import { requireWorkspaceAdmin } from '@/lib/auth/api-auth'
import { revalidatePath } from 'next/cache'

export async function createChallenge(formData: FormData) {
  const { workspace } = await requireWorkspaceAdmin()

  const challenge = await prisma.challenge.create({
    data: {
      workspaceId: workspace.id,
      title: formData.get('title') as string
    }
  })

  revalidatePath(`/w/${workspace.slug}/admin/challenges`)
  return { success: true, challenge }
}
```

### Example 2: Create React Email Template

**Need:** How to structure a React Email template with proper components

**Workflow:**
1. Query Context7 for React Email:
```typescript
mcp__context7__get-library-docs({
  context7CompatibleLibraryID: "/resendlabs/react-email",
  topic: "button component and container",
  tokens: 4000
})
```

2. Extract component pattern from docs:
```tsx
import { Html, Body, Container, Button, Text } from '@react-email/components'

export function Email() {
  return (
    <Html>
      <Body>
        <Container>
          <Text>Hello!</Text>
          <Button href="https://example.com">Click me</Button>
        </Container>
      </Body>
    </Html>
  )
}
```

3. Apply Changemaker theme:
```tsx
import { Html, Body, Container, Button, Text } from '@react-email/components'

interface ShippingConfirmationProps {
  participantName: string
  trackingNumber: string
}

export function ShippingConfirmation({
  participantName,
  trackingNumber
}: ShippingConfirmationProps) {
  return (
    <Html>
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>Your reward is on the way!</Text>
          <Text>Hi {participantName},</Text>
          <Text>Tracking: {trackingNumber}</Text>
          <Button
            href={`https://track.example.com/${trackingNumber}`}
            style={button}
          >
            Track Package
          </Button>
        </Container>
      </Body>
    </Html>
  )
}

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
}

const container = {
  backgroundColor: '#ffffff',
  padding: '20px'
}

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#EF6F53' // coral-500
}

const button = {
  backgroundColor: '#EF6F53', // coral-500
  color: '#fff',
  padding: '12px 20px',
  borderRadius: '8px',
  textDecoration: 'none'
}
```

### Example 3: Set Up RLS Policy

**Need:** Correct syntax for Supabase RLS policy with workspace isolation

**Workflow:**
1. Query Supabase docs:
```graphql
{
  searchDocs(query: "row level security current_setting", limit: 3) {
    nodes {
      title
      content
    }
  }
}
```

2. Extract policy pattern:
```sql
CREATE POLICY "policy_name" ON table_name
  FOR ALL
  USING (user_id = auth.uid());
```

3. Adapt for workspace isolation:
```sql
CREATE POLICY "workspace_isolation" ON challenges
  FOR ALL
  USING (workspace_id = current_setting('app.current_workspace_id')::uuid);
```

## Best Practices

### Query Optimization
- Use specific topics rather than broad queries
- Limit token usage to 3000-5000 for most queries
- Query once and reuse information across similar tasks
- Save common patterns to memory files

### Context Management
- Read documentation incrementally
- Extract only relevant code examples
- Don't copy entire documentation pages
- Reference official docs in comments

### Error Handling
- If docs not found via Context7, try Zen MCP web search
- Check library version compatibility
- Verify API hasn't been deprecated
- Look for migration guides if upgrading

## Integration with Agents

### Invoked by:
- All agents when implementing new features
- All agents when encountering errors
- All agents when using unfamiliar APIs

### Success Criteria
- Retrieved documentation is relevant and current
- Code examples extracted correctly
- Patterns applied to Changemaker context
- No deprecated APIs used

---

**Version:** 1.0
**Last Updated:** 2024-11-12
**Maintained By:** Changemaker Development Team
