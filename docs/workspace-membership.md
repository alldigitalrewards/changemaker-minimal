# WorkspaceMembership Implementation

This document describes the WorkspaceMembership feature implementation that enables multi-workspace support while maintaining backward compatibility with the existing User.workspaceId system.

## Overview

The WorkspaceMembership system allows users to belong to multiple workspaces with different roles, while maintaining the existing single-workspace functionality as a fallback.

### Key Features

- **Multi-workspace Support**: Users can belong to multiple workspaces
- **Role-based Access**: Each membership has its own role (ADMIN/PARTICIPANT)
- **Primary Workspace**: Users can designate one workspace as primary
- **Backward Compatibility**: Existing User.workspaceId relationships are preserved
- **Gradual Migration**: Old and new systems work side-by-side during transition

## Database Schema

### WorkspaceMembership Model

```prisma
model WorkspaceMembership {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @db.Uuid
  workspaceId String    @db.Uuid
  role        Role
  isPrimary   Boolean   @default(false)
  joinedAt    DateTime  @default(now())
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([userId, workspaceId])
  @@index([userId])
  @@index([workspaceId])
  @@index([userId, isPrimary])
}
```

### User Model Updates

```prisma
model User {
  // ... existing fields
  primaryWorkspaceId  String?               @db.Uuid  // New field
  memberships         WorkspaceMembership[] // New relation
  // ... rest of fields
}
```

## TypeScript Types

The implementation includes comprehensive TypeScript types:

```typescript
interface WorkspaceMembership {
  readonly id: string
  readonly userId: UserId
  readonly workspaceId: WorkspaceId
  readonly role: Role
  readonly isPrimary: boolean
  readonly joinedAt: Date
  readonly createdAt: Date
  readonly updatedAt: Date
}

interface WorkspaceMembershipWithDetails extends WorkspaceMembership {
  user: AppUser
  workspace: Workspace
}
```

## Access Helper Functions

### Core Functions (`/lib/db/workspace-membership.ts`)

- `getMembership(userId, workspaceId)` - Get specific membership
- `listMemberships(userId)` - List all user memberships
- `listWorkspaceMemberships(workspaceId)` - List workspace members
- `isWorkspaceAdmin(userId, workspaceId)` - Check admin status
- `hasWorkspaceAccess(userId, workspaceId)` - Check any access
- `getPrimaryMembership(userId)` - Get primary membership
- `createMembership(userId, workspaceId, role, isPrimary)` - Create membership
- `updateMembershipRole(userId, workspaceId, role)` - Update role
- `setPrimaryMembership(userId, workspaceId)` - Set as primary
- `removeMembership(userId, workspaceId)` - Remove membership
- `getWorkspaceMembershipCount(workspaceId)` - Get stats

### Compatibility Functions (`/lib/db/workspace-compatibility.ts`)

- `getUserWorkspaceRole(supabaseUserId, workspaceSlug)` - Get role (compatible)
- `getUserPrimaryWorkspace(supabaseUserId)` - Get primary workspace
- `checkWorkspaceAdmin(supabaseUserId, workspaceSlug)` - Check admin (compatible)
- `getUserWorkspaces(supabaseUserId)` - Get all user workspaces (new feature)
- `syncLegacyMembership(userId)` - Migration helper

## Migration Process

### 1. Database Migration

Run the database schema changes:

```bash
# Apply schema changes
pnpm prisma db push
pnpm prisma generate
```

### 2. Data Migration

Backfill existing User.workspaceId relationships:

```bash
# Run data migration
pnpm backfill:memberships

# Or run the complete migration process
pnpm migrate:workspace-membership
```

### 3. Testing

Verify the implementation:

```bash
# Test all functionality
pnpm test:membership
```

## Usage Examples

### Check User Access

```typescript
import { isWorkspaceAdmin, hasWorkspaceAccess } from '@/lib/db/workspace-membership'

// Check if user is admin
const isAdmin = await isWorkspaceAdmin(userId, workspaceId)

// Check any access level
const hasAccess = await hasWorkspaceAccess(userId, workspaceId)
```

### List User Memberships

```typescript
import { listMemberships } from '@/lib/db/workspace-membership'

// Get all user memberships (ordered by primary first)
const memberships = await listMemberships(userId)

for (const membership of memberships) {
  console.log(`${membership.workspace.name}: ${membership.role} ${membership.isPrimary ? '(Primary)' : ''}`)
}
```

### Backward Compatible Access

```typescript
import { getUserWorkspaceRole } from '@/lib/db/workspace-compatibility'

// This works with both old and new systems
const role = await getUserWorkspaceRole(supabaseUserId, workspaceSlug)
```

### Create New Membership

```typescript
import { createMembership } from '@/lib/db/workspace-membership'

// Add user to workspace as participant
await createMembership(userId, workspaceId, 'PARTICIPANT', false)

// Add user as admin and set as primary
await createMembership(userId, workspaceId, 'ADMIN', true)
```

## Backward Compatibility

The implementation maintains full backward compatibility:

1. **Existing Code**: Functions like `getUserWorkspaceRole()` continue to work unchanged
2. **Legacy Data**: Users with only `User.workspaceId` are handled seamlessly
3. **Gradual Migration**: Both systems work together during the transition period
4. **Fallback Logic**: If no membership exists, the system falls back to `User.workspaceId`

## Migration Scripts

### Available Scripts

- `pnpm migrate:workspace-membership` - Complete migration process
- `pnpm backfill:memberships` - Data migration only
- `pnpm test:membership` - Test implementation

### Script Files

- `/scripts/workspace-membership-migration.sql` - SQL schema migration
- `/scripts/backfill-memberships.ts` - Data migration script
- `/scripts/test-membership.ts` - Testing script
- `/scripts/run-membership-migration.ts` - Complete migration runner

## Data Integrity

The system ensures data integrity through:

1. **Unique Constraints**: One membership per user per workspace
2. **Foreign Key Constraints**: Cascade deletes for orphaned records
3. **Primary Validation**: Only one primary membership per user
4. **Migration Verification**: Built-in data integrity checks

## Performance Considerations

- **Indexed Queries**: All common queries are indexed for performance
- **Batch Operations**: Efficient bulk operations for migrations
- **Caching Strategy**: Compatible with existing caching patterns
- **Query Optimization**: Uses proper includes to minimize N+1 queries

## Future Considerations

### Phase 1 (Current)
- ✅ Multi-workspace membership system
- ✅ Backward compatibility layer
- ✅ Data migration tools

### Phase 2 (Future)
- [ ] Remove User.workspaceId field once fully migrated
- [ ] Workspace switching UI components
- [ ] Membership invitation system
- [ ] Workspace analytics and reporting

### Phase 3 (Long-term)
- [ ] Team-based permissions within workspaces
- [ ] Workspace templates and cloning
- [ ] Cross-workspace challenge collaboration

## Troubleshooting

### Common Issues

1. **Migration Fails**: Check database connection and Prisma schema validity
2. **Orphaned Data**: Use the test script to identify and fix data issues
3. **Type Errors**: Ensure all types are imported from the correct locations
4. **Performance**: Check query patterns and indexing

### Debug Commands

```bash
# Check membership status
pnpm test:membership

# Verify data integrity
npx tsx -e "
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
prisma.workspaceMembership.count().then(console.log)
"

# List orphaned users
npx tsx -e "
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
prisma.user.findMany({
  where: { workspaceId: { not: null }, memberships: { none: {} } }
}).then(users => console.log('Orphaned users:', users.length))
"
```

## Summary

The WorkspaceMembership implementation provides:

1. **Lean Implementation**: Focused on core MVP functionality
2. **Backward Compatibility**: Existing code continues to work unchanged
3. **Type Safety**: Full TypeScript support with proper error handling
4. **Data Integrity**: Comprehensive migration and validation tools
5. **Performance**: Indexed queries and efficient operations
6. **Future-Ready**: Foundation for advanced multi-workspace features

The system is ready for production use and can be adopted gradually without disrupting existing functionality.