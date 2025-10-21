# Role System Architecture (Current State)

## Role Enumeration

### Database Schema (prisma/schema.prisma:519-522)
```prisma
enum Role {
  ADMIN
  PARTICIPANT
  // MANAGER - TO BE ADDED
}
```

**Platform Super Admin**: NOT in Role enum
- Implemented via email allowlist + permissions array
- Bypass logic in `isPlatformSuperAdmin()` (lib/auth/rbac.ts)
- Allowlist emails:
  - krobinson@alldigitalrewards.com
  - jhoughtelin@alldigitalrewards.com
  - kfelke@alldigitalrewards.com
  - jfelke@alldigitalrewards.com

## Data Model

### Modern System: WorkspaceMembership (lib/db/workspace-membership.ts)
```typescript
model WorkspaceMembership {
  userId      String   @db.Uuid
  workspaceId String   @db.Uuid
  role        Role
  isPrimary   Boolean  @default(false)
  joinedAt    DateTime @default(now())

  @@unique([userId, workspaceId])
}
```

**Features**:
- Many-to-many: Users can belong to multiple workspaces
- Role per workspace (same user can be ADMIN in workspace A, PARTICIPANT in workspace B)
- `isPrimary`: Marks user's default workspace

### Legacy System: User.workspaceId + User.role
```typescript
model User {
  workspaceId String? @db.Uuid  // ← Legacy, single workspace only
  role        Role              // ← Legacy, global role
  Workspace   Workspace?        // ← Legacy relation
}
```

**Migration Status**:
- ~15-20 files still use `User.workspaceId` pattern
- Production will use WorkspaceMembership exclusively
- Compatibility layer exists in lib/db/workspace-compatibility.ts

## Role Resolution Logic

**Priority Order** (lib/db/workspace-compatibility.ts:59-85):
1. **WorkspaceMembership.role** (HIGHEST PRIORITY)
   - Query: `getMembership(userId, workspaceId).role`
   - Returns workspace-specific role
2. **User.role** (FALLBACK if workspaceId matches)
   - Only if `User.workspaceId === workspace.id`
   - Legacy compatibility
3. **Global User.role** (LAST RESORT)
   - Used in `requireWorkspaceAccess()` when no membership found
   - ⚠️ Security risk: Allows global role to override workspace scoping

**Critical Issue**: Global fallback in requireWorkspaceAccess()
```typescript
// lib/auth/api-auth.ts:35-36
return {
  workspace,
  user,
  role: role || user.dbUser.role  // ← PROBLEM: Falls back to global role
}
```

**Recommendation**: Remove global fallback after WorkspaceMembership migration complete

## Access Control Functions

### Authentication
**requireAuth()** (lib/auth/api-auth.ts:10-25)
- Verifies Supabase session
- Returns `{ supabaseUser, dbUser }`
- Throws 401 if not authenticated

### Authorization
**requireWorkspaceAccess(slug)** (lib/auth/api-auth.ts:27-48)
- Enforces workspace membership
- Returns `{ workspace, user, role }`
- Throws 403 if access denied
- Uses: Any API route that needs workspace data

**requireWorkspaceAdmin(slug)** (lib/auth/api-auth.ts:50-61)
- Enforces ADMIN role
- Returns `{ workspace, user }`
- Throws 403 if not admin
- Uses: Challenge creation, participant management, approval

**canAccessWorkspace()** (lib/auth/api-auth.ts:63-75)
- Platform super admin bypass
- Checks membership existence
- Used internally by requireWorkspaceAccess()

## Permission Mappings

**ROLE_PERMISSIONS** (lib/auth/rbac.ts:34-55)
```typescript
const ROLE_PERMISSIONS = {
  ADMIN: [
    'challenges:create',
    'challenges:update',
    'challenges:delete',
    'participants:invite',
    'participants:manage',
    'submissions:review',
    'submissions:approve',
    'workspace:settings',
    'rewards:issue'
  ],
  PARTICIPANT: [
    'challenges:view',
    'challenges:enroll',
    'submissions:create',
    'submissions:view_own',
    'profile:update'
  ]
  // MANAGER permissions TBD
}
```

**hasPermission()** (lib/auth/rbac.ts:57-67)
```typescript
export function hasPermission(
  role: Role | null,
  permission: string
): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}
```

## Workspace Isolation

**Query Pattern**: 95%+ of queries filter by `workspaceId`
```typescript
// Example from lib/db/queries.ts
await prisma.challenge.findMany({
  where: {
    workspaceId,  // ← Enforced isolation
    // ... other filters
  }
})
```

**Super Admin Cross-Workspace Access**:
```typescript
// lib/auth/api-auth.ts:63-75
export function canAccessWorkspace(user, workspace, hasMembership) {
  // Platform super admins bypass workspace checks
  if (isPlatformSuperAdmin(user.permissions, user.email)) {
    return true
  }

  return hasMembership
}
```

**Platform Admin Routes**: Isolated from workspace routes
- `/admin/*` - Platform-level admin (workspace management, user management)
- `/w/[slug]/admin/*` - Workspace-level admin (challenges, participants)

## Implementation Files

### Core Auth
- `lib/auth/api-auth.ts` - API route auth helpers
- `lib/auth/rbac.ts` - Permission mappings + checks
- `lib/auth/session.ts` - Supabase session management

### Workspace Membership
- `lib/db/workspace-membership.ts` - CRUD operations
- `lib/db/workspace-compatibility.ts` - Legacy fallback bridge

### Middleware
- `middleware.ts` - Authentication only (no role checks)
- Role checks happen in layouts and API routes

### Layout Protection
- `app/w/[slug]/admin/layout.tsx:31-34` - Admin role required
- `app/w/[slug]/participant/layout.tsx:29-32` - Any role accepted
- `app/admin/layout.tsx:29-32` - Platform super admin required

## Adding MANAGER Role

### Required Updates

1. **Schema** (prisma/schema.prisma)
   ```prisma
   enum Role {
     ADMIN
     PARTICIPANT
     MANAGER  // ← Add this
   }
   ```

2. **Permissions** (lib/auth/rbac.ts)
   ```typescript
   MANAGER: [
     'challenges:view_assigned',
     'submissions:review',
     'submissions:approve_first_level',
     'participants:invite',  // Limited to participant role
     'comments:create'
   ]
   ```

3. **Auth Helper** (lib/auth/api-auth.ts)
   ```typescript
   export async function requireWorkspaceManager(slug: string) {
     const { workspace, user } = await requireWorkspaceAccess(slug)

     if (user.role !== 'MANAGER' && user.role !== 'ADMIN') {
       throw NextResponse.json({ error: 'Manager privileges required' }, { status: 403 })
     }

     return { workspace, user }
   }
   ```

4. **Navigation** (components/navigation/admin-sidebar.tsx)
   - Add manager-specific nav items
   - Filter based on role

5. **Files to Update** (~15-20 files)
   - All API routes with role checks
   - All layouts with role-based rendering
   - All permission-gated UI components

## Security Considerations

1. **Never trust client-side role checks**
   - Always verify server-side in API routes
   - Layout protection is UX, not security

2. **Workspace isolation is critical**
   - Every query must filter by workspaceId
   - Exception: Platform super admin queries

3. **Role precedence matters**
   - WorkspaceMembership.role > User.role
   - Conflicts resolved in favor of membership

4. **Global fallback is a security risk**
   - Current: Falls back to User.role if no membership
   - Future: Remove fallback after migration complete

## Testing Checklist

When implementing MANAGER role:
- [ ] Manager cannot access non-assigned challenges
- [ ] Manager cannot promote to admin
- [ ] Manager cannot override admin decisions
- [ ] Manager isolated to workspace (no cross-workspace access)
- [ ] Platform admin retains bypass capability
- [ ] Role changes require admin privileges
- [ ] Audit log tracks role changes (ActivityEvent table)
