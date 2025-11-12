# Manager Challenge Assignment Strategy

## Decision Summary

**Chosen Approach**: **Option B - Join Table (ChallengeAssignment)**

**Rationale**:
1. Fast bidirectional queries (get managers by challenge, get challenges by manager)
2. Built-in audit trail (assignedAt, assignedBy)
3. Extensible (can add permissions, roles, delegation)
4. Automatic cascade deletes
5. Normalized schema (follows relational best practices)

## Evaluated Options

### Option A: Array Field in WorkspaceMembership ❌
```prisma
model WorkspaceMembership {
  userId              String   @db.Uuid
  workspaceId         String   @db.Uuid
  role                Role
  assignedChallengeIds String[] @default([]) @db.Uuid
}
```

**Pros**:
- Simple to implement (single field addition)
- No new table

**Cons**:
- ❌ Slow reverse lookup (find all managers for challenge X)
- ❌ No audit trail (when assigned? by whom?)
- ❌ Array queries less efficient in Postgres
- ❌ Hard to extend (can't add assignment-specific metadata)
- ❌ Manual cascade delete logic required

**Query Examples**:
```typescript
// Get manager's assigned challenges
const membership = await prisma.workspaceMembership.findUnique({
  where: { userId_workspaceId: { userId, workspaceId } },
  select: { assignedChallengeIds: true }
})

// Get managers for challenge ⚠️ INEFFICIENT
const managers = await prisma.workspaceMembership.findMany({
  where: {
    workspaceId,
    assignedChallengeIds: { has: challengeId }  // ← Array contains query (slower)
  }
})
```

**Verdict**: Acceptable for MVP, poor for production scale

---

### Option B: Join Table (ChallengeAssignment) ✅ CHOSEN
```prisma
model ChallengeAssignment {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  challengeId String    @db.Uuid
  managerId   String    @db.Uuid
  workspaceId String    @db.Uuid
  assignedAt  DateTime  @default(now())
  assignedBy  String    @db.Uuid

  Challenge   Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  Manager     User      @relation("ManagerAssignments", fields: [managerId], references: [id], onDelete: Cascade)
  AssignedBy  User      @relation("AssignmentCreator", fields: [assignedBy], references: [id])
  Workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([challengeId, managerId])
  @@index([managerId, workspaceId])
  @@index([challengeId])
}
```

**Pros**:
- ✅ Fast bidirectional queries (indexed)
- ✅ Built-in audit trail (assignedAt, assignedBy)
- ✅ Automatic cascade deletes
- ✅ Extensible (add permissions, delegation, etc.)
- ✅ Normalized schema
- ✅ Supports many-to-many (multiple managers per challenge)

**Cons**:
- Additional table (minor complexity)
- Slightly more code to manage

**Query Examples**:
```typescript
// Get manager's assigned challenges (FAST)
const assignments = await prisma.challengeAssignment.findMany({
  where: { managerId, workspaceId },
  include: { Challenge: true }
})

// Get managers for challenge (FAST)
const managers = await prisma.challengeAssignment.findMany({
  where: { challengeId },
  include: { Manager: true }
})

// Assign manager to challenge
await prisma.challengeAssignment.create({
  data: {
    challengeId,
    managerId,
    workspaceId,
    assignedBy: adminUserId
  }
})

// Remove assignment
await prisma.challengeAssignment.delete({
  where: {
    challengeId_managerId: { challengeId, managerId }
  }
})
```

**Verdict**: Best for production, scalable, maintainable

---

### Option C: Array Field in Challenge ❌
```prisma
model Challenge {
  id                  String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  title               String
  workspaceId         String   @db.Uuid
  assignedManagerIds  String[] @default([]) @db.Uuid
}
```

**Pros**:
- Simple to implement
- Fast forward lookup (get managers for challenge)

**Cons**:
- ❌ Slow reverse lookup (find all challenges for manager X)
- ❌ No audit trail
- ❌ Array queries less efficient
- ❌ Hard to extend
- ❌ Manual cascade delete logic

**Query Examples**:
```typescript
// Get managers for challenge
const challenge = await prisma.challenge.findUnique({
  where: { id: challengeId },
  select: { assignedManagerIds: true }
})

// Get manager's challenges ⚠️ INEFFICIENT
const challenges = await prisma.challenge.findMany({
  where: {
    workspaceId,
    assignedManagerIds: { has: managerId }  // ← Array contains query (slower)
  }
})
```

**Verdict**: Similar drawbacks to Option A, not recommended

---

## Implementation Plan

### Schema Migration

**Step 1: Create Migration**
```bash
npx prisma migrate dev --name add_challenge_assignment
```

**Step 2: Migration SQL** (prisma/migrations/XXXXXX_add_challenge_assignment/migration.sql)
```sql
-- Create ChallengeAssignment table
CREATE TABLE "ChallengeAssignment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "challengeId" UUID NOT NULL,
  "managerId" UUID NOT NULL,
  "workspaceId" UUID NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedBy" UUID NOT NULL,

  CONSTRAINT "ChallengeAssignment_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys
ALTER TABLE "ChallengeAssignment" ADD CONSTRAINT "ChallengeAssignment_challengeId_fkey"
  FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChallengeAssignment" ADD CONSTRAINT "ChallengeAssignment_managerId_fkey"
  FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ChallengeAssignment" ADD CONSTRAINT "ChallengeAssignment_assignedBy_fkey"
  FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChallengeAssignment" ADD CONSTRAINT "ChallengeAssignment_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique constraint (one assignment per manager-challenge pair)
CREATE UNIQUE INDEX "ChallengeAssignment_challengeId_managerId_key"
  ON "ChallengeAssignment"("challengeId", "managerId");

-- Create indexes for fast lookups
CREATE INDEX "ChallengeAssignment_managerId_workspaceId_idx"
  ON "ChallengeAssignment"("managerId", "workspaceId");

CREATE INDEX "ChallengeAssignment_challengeId_idx"
  ON "ChallengeAssignment"("challengeId");
```

### API Routes

**Assign Manager** (POST `/api/workspaces/[slug]/challenges/[id]/managers`)
```typescript
import { requireWorkspaceAdmin } from '@/lib/auth/api-auth'
import { prisma } from '@/lib/prisma'

export const POST = withErrorHandling(async (req, { params }) => {
  const { slug, id: challengeId } = await params
  const { workspace, user } = await requireWorkspaceAdmin(slug)
  const { managerId } = await req.json()

  // Verify manager belongs to workspace
  const manager = await prisma.user.findFirst({
    where: {
      id: managerId,
      workspaceId: workspace.id
    }
  })

  if (!manager) {
    return NextResponse.json({ error: 'Manager not found in workspace' }, { status: 404 })
  }

  // Verify manager has MANAGER role
  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      userId_workspaceId: { userId: managerId, workspaceId: workspace.id }
    }
  })

  if (membership.role !== 'MANAGER' && membership.role !== 'ADMIN') {
    return NextResponse.json({ error: 'User must be a manager' }, { status: 400 })
  }

  // Create assignment
  const assignment = await prisma.challengeAssignment.create({
    data: {
      challengeId,
      managerId,
      workspaceId: workspace.id,
      assignedBy: user.dbUser.id
    },
    include: {
      Manager: { select: { email: true, id: true } },
      Challenge: { select: { title: true } }
    }
  })

  // Log activity event
  await logActivityEvent({
    workspaceId: workspace.id,
    challengeId,
    userId: managerId,
    actorUserId: user.dbUser.id,
    type: 'MANAGER_ASSIGNED',
    metadata: {
      managerEmail: assignment.Manager.email,
      challengeTitle: assignment.Challenge.title
    }
  })

  // Send notification email
  await sendManagerAssignedEmail({
    to: assignment.Manager.email,
    workspaceName: workspace.name,
    challengeTitle: assignment.Challenge.title,
    assignedBy: user.dbUser.email
  })

  return NextResponse.json({ assignment })
})
```

**Remove Manager** (DELETE `/api/workspaces/[slug]/challenges/[id]/managers/[managerId]`)
```typescript
export const DELETE = withErrorHandling(async (req, { params }) => {
  const { slug, id: challengeId, managerId } = await params
  const { workspace, user } = await requireWorkspaceAdmin(slug)

  await prisma.challengeAssignment.delete({
    where: {
      challengeId_managerId: { challengeId, managerId }
    }
  })

  return NextResponse.json({ success: true })
})
```

**List Managers** (GET `/api/workspaces/[slug]/challenges/[id]/managers`)
```typescript
export const GET = withErrorHandling(async (req, { params }) => {
  const { slug, id: challengeId } = await params
  const { workspace } = await requireWorkspaceAccess(slug)

  const assignments = await prisma.challengeAssignment.findMany({
    where: { challengeId, workspaceId: workspace.id },
    include: {
      Manager: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      }
    },
    orderBy: { assignedAt: 'desc' }
  })

  return NextResponse.json({ managers: assignments.map(a => a.Manager) })
})
```

### Helper Functions (lib/db/queries.ts)

```typescript
export async function assignChallengeManager(
  challengeId: string,
  managerId: string,
  workspaceId: string,
  assignedByUserId: string
) {
  return await prisma.challengeAssignment.create({
    data: {
      challengeId,
      managerId,
      workspaceId,
      assignedBy: assignedByUserId
    }
  })
}

export async function removeManagerAssignment(
  challengeId: string,
  managerId: string
) {
  return await prisma.challengeAssignment.delete({
    where: {
      challengeId_managerId: { challengeId, managerId }
    }
  })
}

export async function getManagerAssignments(
  managerId: string,
  workspaceId: string
) {
  return await prisma.challengeAssignment.findMany({
    where: { managerId, workspaceId },
    include: {
      Challenge: {
        include: {
          _count: {
            select: {
              Enrollment: true,
              Activity: {
                where: {
                  ActivitySubmission: {
                    some: { status: 'PENDING' }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
}

export async function getChallengeManagers(challengeId: string) {
  return await prisma.challengeAssignment.findMany({
    where: { challengeId },
    include: {
      Manager: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true
        }
      }
    }
  })
}

export async function isManagerAssignedToChallenge(
  managerId: string,
  challengeId: string
): Promise<boolean> {
  const assignment = await prisma.challengeAssignment.findUnique({
    where: {
      challengeId_managerId: { challengeId, managerId }
    }
  })

  return !!assignment
}
```

### UI Component (Challenge Edit Page)

**File**: app/w/[slug]/admin/challenges/[id]/edit/manager-assignment.tsx
```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserPlus, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRouter } from 'next/navigation'

interface Manager {
  id: string
  email: string
  firstName?: string
  lastName?: string
}

export function ManagerAssignment({
  challengeId,
  workspaceSlug,
  initialManagers
}: {
  challengeId: string
  workspaceSlug: string
  initialManagers: Manager[]
}) {
  const [managers, setManagers] = useState(initialManagers)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()

  const handleAssign = async (managerId: string) => {
    const res = await fetch(`/api/workspaces/${workspaceSlug}/challenges/${challengeId}/managers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ managerId })
    })

    if (res.ok) {
      const { assignment } = await res.json()
      setManagers([...managers, assignment.Manager])
      setIsOpen(false)
      router.refresh()
    }
  }

  const handleRemove = async (managerId: string) => {
    const res = await fetch(`/api/workspaces/${workspaceSlug}/challenges/${challengeId}/managers/${managerId}`, {
      method: 'DELETE'
    })

    if (res.ok) {
      setManagers(managers.filter(m => m.id !== managerId))
      router.refresh()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Assigned Managers</h3>
        <Button size="sm" onClick={() => setIsOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Assign Manager
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {managers.length === 0 ? (
          <p className="text-sm text-gray-500">No managers assigned</p>
        ) : (
          managers.map(manager => (
            <Badge key={manager.id} variant="outline" className="flex items-center gap-2 pr-1">
              {manager.email}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-1"
                onClick={() => handleRemove(manager.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Manager</DialogTitle>
          </DialogHeader>
          {/* Manager selection UI - could use ParticipantSelector component */}
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

## Authorization Logic

### Manager Permission Check
```typescript
// lib/auth/manager-auth.ts
export async function requireManagerAccess(
  slug: string,
  challengeId: string
) {
  const { workspace, user } = await requireWorkspaceAccess(slug)

  // Admins can always access
  if (user.role === 'ADMIN') {
    return { workspace, user, challenge: await getChallenge(challengeId) }
  }

  // Verify manager is assigned to this challenge
  const isAssigned = await isManagerAssignedToChallenge(user.dbUser.id, challengeId)

  if (!isAssigned && user.role !== 'MANAGER') {
    throw NextResponse.json({ error: 'Manager access required' }, { status: 403 })
  }

  return { workspace, user, challenge: await getChallenge(challengeId) }
}
```

### Submission Query with Manager Scoping
```typescript
// Get submissions for manager's assigned challenges only
export async function getManagerSubmissions(
  managerId: string,
  workspaceId: string,
  status?: SubmissionStatus
) {
  // Get manager's assigned challenges
  const assignments = await prisma.challengeAssignment.findMany({
    where: { managerId, workspaceId },
    select: { challengeId: true }
  })

  const challengeIds = assignments.map(a => a.challengeId)

  // Get submissions for those challenges
  return await prisma.activitySubmission.findMany({
    where: {
      Activity: {
        challengeId: { in: challengeIds }
      },
      workspaceId,
      status: status || undefined
    },
    include: {
      User: { select: { email: true } },
      Activity: {
        include: {
          Challenge: { select: { title: true } },
          ActivityTemplate: { select: { name: true } }
        }
      }
    },
    orderBy: { submittedAt: 'asc' }
  })
}
```

## Edge Cases & Validation

1. **Manager Removed Mid-Review**
   - Submissions in PENDING state remain assigned
   - Admin receives notification to reassign or review directly
   - UI shows "Previously assigned manager removed"

2. **Challenge Deleted**
   - Cascade delete removes all ChallengeAssignment records
   - Audit trail preserved in ApprovalHistory

3. **Manager Role Removed**
   - Delete all ChallengeAssignment records for that user
   - Activity logged for audit

4. **Duplicate Assignment Prevention**
   - Unique constraint: `@@unique([challengeId, managerId])`
   - Database enforces uniqueness
   - API returns 409 Conflict if duplicate attempted

5. **Self-Assignment**
   - Allow: Admins can assign themselves as managers
   - Use case: Small teams where admin is also manager

6. **Cross-Workspace Assignment**
   - Prevented: `workspaceId` required in assignment
   - Manager must be member of workspace

## Performance Optimization

1. **Index Strategy**
   - Primary: `challengeId_managerId` (unique constraint)
   - Secondary: `managerId_workspaceId` (manager dashboard queries)
   - Tertiary: `challengeId` (challenge detail page)

2. **Query Patterns**
   ```typescript
   // GOOD: Single query with include
   const assignments = await prisma.challengeAssignment.findMany({
     where: { managerId },
     include: {
       Challenge: {
         include: {
           _count: { select: { Enrollment: true } }
         }
       }
     }
   })

   // BAD: N+1 query pattern
   const assignments = await prisma.challengeAssignment.findMany({ where: { managerId } })
   for (const assignment of assignments) {
     const challenge = await prisma.challenge.findUnique({ where: { id: assignment.challengeId } })
   }
   ```

3. **Caching Considerations**
   - Cache manager assignments (30 second TTL)
   - Invalidate on assignment/removal
   - Use `revalidatePath()` in Server Actions

## Testing Checklist

- [ ] Manager can only view assigned challenges
- [ ] Manager can review submissions for assigned challenges only
- [ ] Admin can assign/remove managers
- [ ] Cascade delete removes assignments when challenge deleted
- [ ] Duplicate assignments prevented (DB constraint)
- [ ] Cross-workspace assignments prevented
- [ ] Manager removed mid-review handled gracefully
- [ ] Audit trail tracks all assignments
- [ ] Notification sent when manager assigned
- [ ] UI updates in real-time after assignment changes
