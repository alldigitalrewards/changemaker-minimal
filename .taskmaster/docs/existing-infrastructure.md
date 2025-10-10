# Existing Infrastructure Inventory
## Last Updated: January 17, 2025

This document catalogs the infrastructure that already exists in the Changemaker codebase, preventing redundant implementation.

## Core Models (Already Implemented)

### PointsBalance Model
**Location**: `prisma/schema.prisma`
**Purpose**: Serves as the wallet system
**Key Fields**:
- `userId`: Links to User
- `workspaceId`: Links to Workspace (multi-tenant isolation)
- `availablePoints`: Current balance
- `pendingPoints`: Points awaiting confirmation
- `lifetimePoints`: Historical total

**Discovery**: Initially planned to create a "Wallet" model, but PointsBalance IS the wallet. No need for duplication.

### ActivityTemplate Model
**Location**: `prisma/schema.prisma`
**Purpose**: Defines activities participants can complete
**Key Fields**:
- `basePoints`: Points awarded for completion (ALREADY EXISTS!)
- `requirements`: JSON field for activity rules
- `workspaceId`: Workspace isolation
- `isActive`: Enable/disable activities

**Discovery**: Was going to add point values to activities - already there as `basePoints`.

### ActivitySubmission Model
**Location**: `prisma/schema.prisma`
**Purpose**: Tracks participant activity completions
**Key Fields**:
- `pointsAwarded`: Points earned (ALREADY EXISTS!)
- `status`: Submission status
- `completedAt`: Completion timestamp
- `reviewedBy`: Admin who reviewed

**Discovery**: Point tracking already integrated into submission system.

### Challenge Model
**Location**: `prisma/schema.prisma`
**Purpose**: Core challenge functionality
**Missing**: Only needs `progressionState` enum field
**Existing Fields**:
- `title`, `description`: Basic info
- `workspaceId`: Workspace isolation
- `createdBy`: Admin who created
- `enrollments`: Related enrollments

## Existing Services & Utils

### Authentication System
**Location**: `/lib/auth/`
- `api-auth.ts`: API route authentication
- `requireWorkspaceAccess()`: Workspace access validation
- `requireWorkspaceAdmin()`: Admin role checking
- Supabase integration fully working

### Database Queries
**Location**: `/lib/db/queries.ts`
**Existing Patterns**:
- Workspace-isolated queries
- Typed error handling (DatabaseError, WorkspaceAccessError)
- Transaction support
- Optimistic locking patterns

### Workspace Context
**Location**: `/lib/workspace-context.ts`
- `getCurrentWorkspace(slug)`: Get workspace by slug
- `getUserWorkspaceRole()`: Get user's role in workspace
- Multi-tenant isolation helpers

## Existing UI Components

### Admin Layout
**Location**: `/app/w/[slug]/admin/`
- Sidebar navigation
- Role-based access control
- Consistent header/footer
- Responsive design

### Challenge Management
**Location**: `/app/w/[slug]/admin/challenges/`
- CRUD operations for challenges
- List view with filters
- Edit forms with validation
- Already integrated with workspace context

### Participant Management
**Location**: `/app/w/[slug]/admin/participants/`
- Basic participant list
- Enrollment status display
- Search functionality
- Ready for enhancement (Task #9)

## Existing API Routes

### Challenge APIs
**Location**: `/app/api/w/[slug]/challenges/`
- GET: List challenges
- POST: Create challenge
- PUT: Update challenge
- DELETE: Remove challenge

### Enrollment APIs
**Location**: `/app/api/w/[slug]/enrollments/`
- POST: Enroll participant
- GET: Get enrollments
- PATCH: Update enrollment status

## Frontend Stack

### UI Library
- **shadcn/ui**: Already installed and configured
- Components: Card, Button, Input, Select, Table, Dialog, Form
- Consistent with Changemaker theme

### Styling
- **Tailwind CSS**: Configured with custom theme
- **Changemaker Colors**: 
  - Primary: Coral (#FF6B6B)
  - Secondary: Terracotta
  - Already in `tailwind.config.js`

### Data Fetching
- Server Components for initial data
- `useEffect` + `fetch` for client updates
- SWR ready to use if needed

## Infrastructure We DON'T Have (And Don't Need)

### ❌ State Machine Libraries
- No XState
- No Redux-Saga
- Simple service classes are sufficient

### ❌ Queue Systems
- No Redis
- No BullMQ
- This is a mock system - keep it simple

### ❌ Complex Authentication
- No separate auth service
- Supabase handles everything
- No need for JWT management

### ❌ Webhook Infrastructure
- No webhook endpoints
- No event streaming
- Manual processes for MVP

## Key Discoveries

1. **Points Infrastructure**: 60% already exists
   - PointsBalance = Wallet ✓
   - ActivityTemplate.basePoints = Point values ✓
   - ActivitySubmission.pointsAwarded = Earned points ✓

2. **Only Missing Pieces**:
   - PointTransaction model (for audit trail)
   - Challenge.progressionState enum
   - Service layer to orchestrate existing models
   - UI components for management

3. **Multi-Tenant Architecture**: Fully implemented
   - Path-based routing (/w/[slug])
   - Workspace isolation in all queries
   - Role-based access control working

## Integration Points

### Where to Add New Features

1. **PointTransaction Model**
   - Add to `prisma/schema.prisma`
   - Link to existing PointsBalance
   - Foreign keys to ActivitySubmission and Challenge

2. **Challenge Progression**
   - Add enum to Challenge model
   - Create service in `/lib/services/`
   - API routes at `/app/api/w/[slug]/challenges/[id]/progression`

3. **Admin Dashboard**
   - Extend `/app/w/[slug]/admin/`
   - Use existing layout components
   - Follow established patterns

4. **Participant Dashboard**
   - Create at `/app/w/[slug]/participant/`
   - Mirror admin structure
   - Reuse component patterns

## Commands That Work

```bash
# Development
pnpm dev                 # Starts Next.js and checks Supabase

# Database
pnpm prisma generate     # Generate Prisma Client
pnpm prisma db push     # Push schema changes
pnpm prisma studio      # Visual database editor

# Testing
pnpm test               # Run Jest tests
pnpm test:e2e          # Run Cypress tests

# Building
pnpm build             # Production build
pnpm start             # Run production server
```

## Environment Variables (Already Configured)

```env
DATABASE_URL            # PostgreSQL connection
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Conclusion

The Changemaker platform has a solid foundation. We don't need to rebuild infrastructure—we need to enhance what exists. The original assessment of "40-50% redundancy" was actually conservative. The real number is closer to 60% already implemented.