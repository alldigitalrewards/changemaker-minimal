# API Route Generator Skill

## Description

Generate new API routes following Changemaker's established patterns for authentication, workspace isolation, error handling, and response formatting. Ensures consistency across all endpoints with proper RLS integration, type safety, and testing structure.

**When to use this skill:**
- User says: "create API endpoint", "add API route", "build new API", "generate route handler", "create REST endpoint", "add CRUD endpoints"
- When implementing new features requiring API access
- When adding new database models that need endpoints
- When creating specialized operations (bulk actions, aggregations)
- NOT for Git operations, testing, or general code refactoring (other skills handle those)

## Instructions

### Core Principles

1. **Consistency first** - Follow established patterns exactly
2. **Security by default** - Always require auth and workspace validation
3. **Type safety** - Use proper TypeScript types throughout
4. **Error handling** - Comprehensive error catching and meaningful messages
5. **Workspace isolation** - Never expose cross-workspace data
6. **Testing included** - Generate tests alongside routes

### API Route Pattern Architecture

**Standard route structure:**
```
app/api/w/[slug]/[resource]/
├── route.ts                    # GET (list), POST (create)
├── [id]/
│   ├── route.ts               # GET (read), PATCH (update), DELETE
│   └── [action]/
│       └── route.ts           # Custom actions (e.g., enroll, submit)
```

**Example for challenges:**
```
app/api/w/[slug]/challenges/
├── route.ts                    # GET /api/w/:slug/challenges, POST /api/w/:slug/challenges
└── [id]/
    ├── route.ts               # GET/PATCH/DELETE /api/w/:slug/challenges/:id
    └── enroll/
        └── route.ts           # POST /api/w/:slug/challenges/:id/enroll
```

### Route Template - List & Create

**File: `app/api/w/[slug]/[resource]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Validation schema
const createResourceSchema = z.object({
  field1: z.string().min(1).max(255),
  field2: z.string().optional(),
  field3: z.number().int().positive().optional(),
});

// GET /api/w/:slug/resources - List resources
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { workspace, user } = await requireWorkspaceAccess(params.slug);

    // Query with workspace filter
    const resources = await prisma.resource.findMany({
      where: {
        workspaceId: workspace.id,
      },
      include: {
        // Include related data as needed
        relatedModel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ resources });
  } catch (error) {
    console.error('Error fetching resources:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch resources' },
      { status: 500 }
    );
  }
}

// POST /api/w/:slug/resources - Create resource
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { workspace, user } = await requireWorkspaceAccess(params.slug);

    // For admin-only routes, add role check:
    // if (user.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createResourceSchema.parse(body);

    // Create resource with workspace association
    const resource = await prisma.resource.create({
      data: {
        ...validatedData,
        workspaceId: workspace.id,
        // Add created by user if tracked
        // createdById: user.id,
      },
      include: {
        // Include relations as needed
        relatedModel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      { resource },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating resource:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Resource already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create resource' },
      { status: 500 }
    );
  }
}
```

### Route Template - Read, Update, Delete

**File: `app/api/w/[slug]/[resource]/[id]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Validation schema for updates
const updateResourceSchema = z.object({
  field1: z.string().min(1).max(255).optional(),
  field2: z.string().optional(),
  field3: z.number().int().positive().optional(),
});

// GET /api/w/:slug/resources/:id - Get single resource
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { workspace, user } = await requireWorkspaceAccess(params.slug);

    // Find with workspace filter (critical for security)
    const resource = await prisma.resource.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id, // REQUIRED - workspace isolation
      },
      include: {
        // Include related data
        relatedModel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ resource });
  } catch (error) {
    console.error('Error fetching resource:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch resource' },
      { status: 500 }
    );
  }
}

// PATCH /api/w/:slug/resources/:id - Update resource
export async function PATCH(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { workspace, user } = await requireWorkspaceAccess(params.slug);

    // For admin-only routes:
    // if (user.role !== 'ADMIN') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    // }

    // Verify resource exists in workspace
    const existingResource = await prisma.resource.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
    });

    if (!existingResource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateResourceSchema.parse(body);

    // Update resource
    const resource = await prisma.resource.update({
      where: {
        id: params.id,
      },
      data: validatedData,
      include: {
        // Include relations
        relatedModel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({ resource });
  } catch (error) {
    console.error('Error updating resource:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update resource' },
      { status: 500 }
    );
  }
}

// DELETE /api/w/:slug/resources/:id - Delete resource
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { workspace, user } = await requireWorkspaceAccess(params.slug);

    // Usually admin-only
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Verify exists in workspace
    const existingResource = await prisma.resource.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
    });

    if (!existingResource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Delete resource
    await prisma.resource.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json(
      { message: 'Resource deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting resource:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Handle foreign key constraint errors
    if (error instanceof Error && error.message.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'Cannot delete resource with existing references' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete resource' },
      { status: 500 }
    );
  }
}
```

### Route Template - Custom Action

**File: `app/api/w/[slug]/[resource]/[id]/[action]/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/api-auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// Validation schema for action
const actionSchema = z.object({
  param1: z.string(),
  param2: z.number().optional(),
});

// POST /api/w/:slug/resources/:id/action - Perform custom action
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { workspace, user } = await requireWorkspaceAccess(params.slug);

    // Verify resource exists in workspace
    const resource = await prisma.resource.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
    });

    if (!resource) {
      return NextResponse.json(
        { error: 'Resource not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body (if needed)
    const body = await request.json();
    const validatedData = actionSchema.parse(body);

    // Perform action (example: create related record)
    const result = await prisma.relatedModel.create({
      data: {
        resourceId: resource.id,
        userId: user.id,
        ...validatedData,
      },
    });

    return NextResponse.json(
      { result },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error performing action:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}
```

### Test Template

**File: `tests/api/[resource].spec.ts`**

```typescript
import { test, expect } from '@playwright/test';
import { createTestWorkspace, createTestUser, cleanupTestData } from '../helpers/test-helpers';

test.describe('Resource API', () => {
  let workspace: any;
  let adminUser: any;
  let participantUser: any;
  let authToken: string;

  test.beforeAll(async () => {
    // Setup test data
    workspace = await createTestWorkspace();
    adminUser = await createTestUser(workspace.id, 'ADMIN');
    participantUser = await createTestUser(workspace.id, 'PARTICIPANT');
  });

  test.afterAll(async () => {
    // Cleanup
    await cleanupTestData(workspace.id);
  });

  test.describe('POST /api/w/:slug/resources', () => {
    test('admin can create resource', async ({ request }) => {
      const response = await request.post(
        `/api/w/${workspace.slug}/resources`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminUser.token}`,
          },
          data: {
            field1: 'Test Resource',
            field2: 'Description',
            field3: 100,
          },
        }
      );

      expect(response.status()).toBe(201);
      const { resource } = await response.json();
      expect(resource.field1).toBe('Test Resource');
      expect(resource.workspaceId).toBe(workspace.id);
    });

    test('participant cannot create resource', async ({ request }) => {
      const response = await request.post(
        `/api/w/${workspace.slug}/resources`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${participantUser.token}`,
          },
          data: {
            field1: 'Test Resource',
          },
        }
      );

      expect(response.status()).toBe(403);
    });

    test('validates required fields', async ({ request }) => {
      const response = await request.post(
        `/api/w/${workspace.slug}/resources`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminUser.token}`,
          },
          data: {
            // Missing field1
            field2: 'Description',
          },
        }
      );

      expect(response.status()).toBe(400);
      const { error } = await response.json();
      expect(error).toContain('Invalid request data');
    });
  });

  test.describe('GET /api/w/:slug/resources', () => {
    test('returns resources for workspace', async ({ request }) => {
      const response = await request.get(
        `/api/w/${workspace.slug}/resources`,
        {
          headers: {
            'Authorization': `Bearer ${adminUser.token}`,
          },
        }
      );

      expect(response.status()).toBe(200);
      const { resources } = await response.json();
      expect(Array.isArray(resources)).toBe(true);
      // All resources should belong to workspace
      resources.forEach((r: any) => {
        expect(r.workspaceId).toBe(workspace.id);
      });
    });
  });

  test.describe('PATCH /api/w/:slug/resources/:id', () => {
    test('admin can update resource', async ({ request }) => {
      // First create a resource
      const createRes = await request.post(
        `/api/w/${workspace.slug}/resources`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminUser.token}`,
          },
          data: { field1: 'Original' },
        }
      );
      const { resource: created } = await createRes.json();

      // Update it
      const updateRes = await request.patch(
        `/api/w/${workspace.slug}/resources/${created.id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminUser.token}`,
          },
          data: { field1: 'Updated' },
        }
      );

      expect(updateRes.status()).toBe(200);
      const { resource: updated } = await updateRes.json();
      expect(updated.field1).toBe('Updated');
    });
  });

  test.describe('Workspace Isolation', () => {
    test('cannot access resources from other workspace', async ({ request }) => {
      const otherWorkspace = await createTestWorkspace();
      const otherUser = await createTestUser(otherWorkspace.id, 'ADMIN');

      // Create resource in original workspace
      const createRes = await request.post(
        `/api/w/${workspace.slug}/resources`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminUser.token}`,
          },
          data: { field1: 'Test' },
        }
      );
      const { resource } = await createRes.json();

      // Try to access from other workspace
      const getRes = await request.get(
        `/api/w/${otherWorkspace.slug}/resources/${resource.id}`,
        {
          headers: {
            'Authorization': `Bearer ${otherUser.token}`,
          },
        }
      );

      expect(getRes.status()).toBe(404);

      await cleanupTestData(otherWorkspace.id);
    });
  });
});
```

### Generation Workflow

#### 1. Analyze Requirements

**Before generating routes:**
1. Identify resource name and database model
2. Determine CRUD operations needed
3. Check role-based access requirements
4. Identify custom actions needed
5. Review related models for includes

#### 2. Generate Route Files

**Create directory structure:**
```bash
mkdir -p app/api/w/[slug]/[resource]
mkdir -p app/api/w/[slug]/[resource]/[id]
```

**Generate routes based on needs:**
- List + Create: `app/api/w/[slug]/[resource]/route.ts`
- Read + Update + Delete: `app/api/w/[slug]/[resource]/[id]/route.ts`
- Custom actions: `app/api/w/[slug]/[resource]/[id]/[action]/route.ts`

#### 3. Customize for Resource

**Adapt templates:**
1. Replace `resource` with actual model name (lowercase plural)
2. Update validation schemas with actual fields
3. Add appropriate includes for relations
4. Implement role checks if admin-only
5. Add custom business logic as needed

#### 4. Generate Tests

**Create test file:**
```bash
touch tests/api/[resource].spec.ts
```

**Test coverage:**
- Create operation (with/without permission)
- List operation (with workspace filter)
- Read single (with/without access)
- Update (with/without permission)
- Delete (with/without permission)
- Validation errors
- Workspace isolation

#### 5. Verify Integration

**After generation:**
1. TypeScript compilation: `npx tsc --noEmit`
2. Run tests: `npx playwright test tests/api/[resource].spec.ts`
3. Manual API testing (if needed)
4. Update documentation

### Common Patterns

#### Pattern 1: Admin-Only Endpoint

```typescript
export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { workspace, user } = await requireWorkspaceAccess(params.slug);

    // Require admin role
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ... rest of logic
  } catch (error) {
    // ... error handling
  }
}
```

#### Pattern 2: Participant-Only Endpoint

```typescript
export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { workspace, user } = await requireWorkspaceAccess(params.slug);

    // Require participant role
    if (user.role !== 'PARTICIPANT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ... rest of logic
  } catch (error) {
    // ... error handling
  }
}
```

#### Pattern 3: Conditional Logic Based on Role

```typescript
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { workspace, user } = await requireWorkspaceAccess(params.slug);

    const resources = await prisma.resource.findMany({
      where: {
        workspaceId: workspace.id,
        // Participants only see their own
        ...(user.role === 'PARTICIPANT' ? { userId: user.id } : {}),
      },
    });

    return NextResponse.json({ resources });
  } catch (error) {
    // ... error handling
  }
}
```

#### Pattern 4: Pagination

```typescript
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { workspace, user } = await requireWorkspaceAccess(params.slug);

    // Get query params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where: { workspaceId: workspace.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.resource.count({
        where: { workspaceId: workspace.id },
      }),
    ]);

    return NextResponse.json({
      resources,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    // ... error handling
  }
}
```

#### Pattern 5: Search/Filtering

```typescript
export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { workspace, user } = await requireWorkspaceAccess(params.slug);

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const status = searchParams.get('status');

    const resources = await prisma.resource.findMany({
      where: {
        workspaceId: workspace.id,
        ...(query ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
          ],
        } : {}),
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json({ resources });
  } catch (error) {
    // ... error handling
  }
}
```

### Best Practices

**Do:**
- ✅ Always use `requireWorkspaceAccess` for auth
- ✅ Always filter by `workspaceId` in queries
- ✅ Use `findFirst` with workspace filter, not `findUnique`
- ✅ Validate input with Zod schemas
- ✅ Return meaningful error messages
- ✅ Include appropriate relations
- ✅ Add TypeScript types for params
- ✅ Generate tests alongside routes

**Don't:**
- ❌ Skip workspace filtering in queries
- ❌ Use `findUnique` for resources (use `findFirst` with workspace)
- ❌ Return raw Prisma errors to client
- ❌ Skip validation on user input
- ❌ Forget role checks for admin operations
- ❌ Include sensitive data in responses
- ❌ Allow cross-workspace access
- ❌ Skip error handling

## Examples

### Example 1: Generate Submission CRUD

```typescript
// Request: "Create API endpoints for Submission model"

// Generated files:
// 1. app/api/w/[slug]/submissions/route.ts (List & Create)
// 2. app/api/w/[slug]/submissions/[id]/route.ts (Read, Update, Delete)
// 3. tests/api/submissions.spec.ts (Test suite)

// Submission model has:
// - challengeId (relation)
// - userId (relation)
// - content (text)
// - submittedAt (timestamp)

// Custom patterns applied:
// - Participants can only see/edit own submissions
// - Admins can see all submissions in workspace
// - Workspace isolation enforced
```

### Example 2: Generate Custom Enrollment Action

```typescript
// Request: "Add enroll endpoint to Challenge API"

// Generated file: app/api/w/[slug]/challenges/[id]/enroll/route.ts

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; id: string } }
) {
  try {
    const { workspace, user } = await requireWorkspaceAccess(params.slug);

    // Only participants can enroll
    if (user.role !== 'PARTICIPANT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get challenge with participant limit check
    const challenge = await prisma.challenge.findFirst({
      where: {
        id: params.id,
        workspaceId: workspace.id,
      },
      include: {
        _count: {
          select: { enrollments: true },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    // Check participant limit
    if (challenge.maxParticipants && challenge._count.enrollments >= challenge.maxParticipants) {
      return NextResponse.json({ error: 'Challenge is full' }, { status: 409 });
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findFirst({
      where: {
        challengeId: challenge.id,
        userId: user.id,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'Already enrolled' }, { status: 409 });
    }

    // Create enrollment
    const enrollment = await prisma.enrollment.create({
      data: {
        challengeId: challenge.id,
        userId: user.id,
        status: 'active',
      },
      include: {
        challenge: true,
      },
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    console.error('Error enrolling in challenge:', error);
    return NextResponse.json({ error: 'Failed to enroll' }, { status: 500 });
  }
}
```

## Success Criteria

After using this skill, verify:

- [ ] Route files created in correct directory structure
- [ ] Authentication using `requireWorkspaceAccess`
- [ ] Workspace filtering in all queries
- [ ] Input validation with Zod schemas
- [ ] Proper error handling and status codes
- [ ] TypeScript types for params and responses
- [ ] Test file created with coverage
- [ ] TypeScript compiles without errors
- [ ] Tests pass

## Related Skills

- **Database Schema Migration Skill** - Create model before routes
- **Test Suite Runner Skill** - Verify route tests pass
- **Multi-Tenant Validation Skill** - Ensure workspace isolation

---

*This skill ensures consistent, secure, and maintainable API routes across the Changemaker application.*
