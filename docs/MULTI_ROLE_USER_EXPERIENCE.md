# Multi-Role User Experience Guide

## Overview: How Kim Robinson Uses Multiple Roles

Kim Robinson (`krobinson@alldigitalrewards.com`) has multiple roles across the platform. This guide shows exactly how the UI adapts as Kim switches contexts.

## Kim's Role Configuration

### Platform Level
- **Platform Super Admin** - Can access any workspace

### Workspace Level (via WorkspaceMembership)
1. **AllDigitalRewards** - ADMIN role (primary workspace)
2. **ACME Corp** - ADMIN role
3. **Sharecare** - PARTICIPANT role

### Challenge Level (dynamically assigned)
- **Challenge Manager** - When assigned to specific challenges via ChallengeAssignment
- **Challenge Participant** - When enrolled in challenges via Enrollment

---

## Part 1: Workspace Switching

### The Workspace Switcher

**Location**: Top navigation bar, appears when user has 2+ workspaces

**What Kim Sees**:
```
┌─────────────────────────────────────────┐
│ 🏢 AllDigitalRewards ▼                  │
│                                         │
│ Switch Workspace                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                         │
│ 🏢 AllDigitalRewards    [ADMIN] ⭐     │  ← Primary
│    (Current)                            │
│                                         │
│ 🏢 ACME Corp           [ADMIN]         │
│                                         │
│ 🏢 Sharecare           [PARTICIPANT]   │
│                                         │
└─────────────────────────────────────────┘
```

**Implementation**: `/components/workspace-switcher.tsx`

### Switching Behavior

When Kim clicks "ACME Corp":
1. **URL Changes**: Redirects from `/w/alldigitalrewards/...` to `/w/acme/...`
2. **Context Switches**: All subsequent API calls use ACME workspace context
3. **Role Changes**: Kim now operates as ADMIN in ACME workspace
4. **Navigation Updates**: Sidebar shows ACME-appropriate options

**Technical Flow**:
```typescript
// User clicks workspace switcher
await switchWorkspace('acme')
  ↓
// Redirects to new workspace URL
router.push('/w/acme/admin/dashboard')
  ↓
// Middleware validates workspace membership
middleware.ts checks WorkspaceMembership.role
  ↓
// Page loads with ACME context
getCurrentWorkspace('acme') returns ACME workspace
getUserWorkspaceRole('acme') returns 'ADMIN'
```

---

## Part 2: Role Composition Within a Workspace

Once Kim is in a workspace (e.g., AllDigitalRewards), their **effective role for each challenge** is determined by THREE factors:

### The Three-Tier Permission Model

```
┌─────────────────────────────────────────────────────────┐
│ Tier 1: WorkspaceMembership (workspace-wide)            │
│ ─────────────────────────────────────────────────────── │
│ Kim's role in AllDigitalRewards workspace: ADMIN        │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Tier 2: ChallengeAssignment (challenge-specific)    │ │
│ │ ───────────────────────────────────────────────────│ │
│ │ Kim assigned as manager for "Q1 Sales Challenge"   │ │
│ │                                                      │ │
│ │ ┌───────────────────────────────────────────────┐  │ │
│ │ │ Tier 3: Enrollment (participation)            │  │ │
│ │ │ ─────────────────────────────────────────────│  │ │
│ │ │ Kim enrolled as participant in same challenge │  │ │
│ │ └───────────────────────────────────────────────┘  │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Permission Resolution Hierarchy

**Rule**: Higher tiers override lower tiers

```typescript
if (workspaceMembership.role === 'ADMIN') {
  // Tier 1 Override - Kim gets FULL admin powers
  return { role: 'ADMIN', canManage: true, canApprove: true, isParticipant: !!enrollment }
}
else if (challengeAssignment) {
  // Tier 2 - Kim is challenge manager
  return { role: 'CHALLENGE_MANAGER', canManage: true, canApprove: true, isParticipant: !!enrollment }
}
else if (enrollment) {
  // Tier 3 - Kim is participant only
  return { role: 'PARTICIPANT', canManage: false, canApprove: false, isParticipant: true }
}
else {
  // Tier 4 Fallback - Default workspace role
  return { role: 'MANAGER', canApprove: true, canEnroll: true }
}
```

**Implementation**: `/lib/auth/challenge-permissions.ts:31-117`

---

## Part 3: UI Changes by Context

### Scenario A: Kim Views "Q1 Sales Challenge" (Where Kim is ADMIN + Enrolled)

**Context**:
- Workspace: AllDigitalRewards
- WorkspaceMembership: ADMIN
- ChallengeAssignment: None (workspace admin has implicit management)
- Enrollment: YES (Kim joined as participant)

**What Kim Sees**:

#### Challenge Detail Page Header
```
┌──────────────────────────────────────────────────────────────┐
│ Q1 Sales Challenge                                           │
│                                                               │
│ [Admin & Participant] ← RoleContextBadge component          │
│  └─ Shows Kim is both admin AND enrolled                    │
│                                                               │
│ Hover for details:                                           │
│ • Workspace Admin (full control)                            │
│ • Enrolled as participant                                   │
└──────────────────────────────────────────────────────────────┘
```

**Implementation**: `/components/ui/role-context-badge.tsx`

#### Challenge Actions Available
```
Available Actions:
✅ Edit Challenge (admin power)
✅ View All Submissions (admin power)
✅ Approve Others' Submissions (admin power)
✅ Submit Activities (participant power)
❌ Approve OWN Submissions (self-approval prevention)
✅ Enroll Others (admin power)
```

#### Manager Queue View
```
┌──────────────────────────────────────────────────────────────┐
│ Manager Review Queue                                         │
│                                                               │
│ Submission by participant1@alldigitalrewards.com             │
│ [Approve] [Request Changes] ← Kim CAN approve               │
│                                                               │
│ Submission by krobinson@alldigitalrewards.com (YOU)         │
│ [Your Submission] "Cannot approve own submissions"          │
│  └─ NO buttons shown (self-approval prevention)             │
└──────────────────────────────────────────────────────────────┘
```

**Implementation**: `/app/w/[slug]/admin/manager/queue/manager-review-button.tsx:141-178`

---

### Scenario B: Kim Views "Employee Wellness Challenge" (Challenge Manager + Participant)

**Context**:
- Workspace: AllDigitalRewards
- WorkspaceMembership: ADMIN (but let's show how it works for a MANAGER)
- ChallengeAssignment: YES (Kim assigned as challenge manager)
- Enrollment: YES (Kim also joined as participant)

**What Kim Sees**:

#### Challenge Detail Page Header
```
┌──────────────────────────────────────────────────────────────┐
│ Employee Wellness Challenge                                  │
│                                                               │
│ [Manager & Participant] ← Shows BOTH roles                  │
│                                                               │
│ Hover for details:                                           │
│ • Challenge Manager (for this challenge)                    │
│ • Enrolled as participant                                   │
└──────────────────────────────────────────────────────────────┘
```

#### Challenge Actions Available
```
Available Actions:
✅ Approve Others' Submissions (manager for THIS challenge)
✅ Submit Activities (participant)
❌ Approve OWN Submissions (self-approval prevention)
❌ Edit Challenge Settings (only workspace admins can edit)
✅ View This Challenge's Submissions (manager power)
❌ View Other Challenges' Submissions (not global admin)
```

#### Permission Resolution
```typescript
// For this specific challenge
getUserChallengePermissions(
  workspaceMembership: { role: 'MANAGER', ... },  // Tier 1
  challengeAssignment: { managerId: kim.id, ... }, // Tier 2 ✅ ACTIVE
  enrollment: { userId: kim.id, ... }              // Tier 3 ✅ ACTIVE
)

// Returns:
{
  role: 'CHALLENGE_MANAGER',        // Tier 2 wins (higher than Tier 3)
  canApproveSubmissions: true,      // Manager power
  canManage: true,                  // Manager power
  isParticipant: true,              // Also enrolled!
  isManager: true,
  isAdmin: false
}
```

---

### Scenario C: Kim Views Challenges in Sharecare Workspace (Participant Only)

**Context**:
- Workspace: Sharecare
- WorkspaceMembership: PARTICIPANT (no admin/manager rights)
- ChallengeAssignment: None
- Enrollment: Varies by challenge

**What Kim Sees**:

#### Workspace Switcher Shows Different Role
```
┌─────────────────────────────────────────┐
│ 🏢 Sharecare ▼                          │
│                                         │
│ Switch Workspace                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                         │
│ 🏢 AllDigitalRewards    [ADMIN] ⭐     │
│                                         │
│ 🏢 ACME Corp           [ADMIN]         │
│                                         │
│ 🏢 Sharecare           [PARTICIPANT]   │  ← Current
│    (Current)                            │
│                                         │
└─────────────────────────────────────────┘
```

#### Navigation Changes
```
Sidebar (as PARTICIPANT in Sharecare):

🏠 Dashboard
📋 My Challenges        ← Can only view/join challenges
📊 Activities           ← Can submit activities
🏆 Leaderboard
👤 Profile

NOT shown:
❌ Admin Dashboard      ← No admin access
❌ Manage Challenges    ← No management access
❌ Manager Queue        ← No approval powers
❌ Participants          ← Can't manage users
```

#### Challenge List View
```
┌──────────────────────────────────────────────────────────────┐
│ Available Challenges                                         │
│                                                               │
│ Health & Wellness Challenge                                  │
│ [Enrolled] ← Already participating                          │
│                                                               │
│ Team Building Challenge                                      │
│ [Enroll in Challenge] ← Can join                           │
│                                                               │
│ Leadership Development                                       │
│ [Enrollment Restricted] ← Can't join (admin-only)          │
└──────────────────────────────────────────────────────────────┘
```

**Implementation**: `/components/challenges/challenge-enrollment-button.tsx`

---

## Part 4: How Roles Are NOT Manually Selected

**Important**: Users don't manually "switch" between roles like "Now I'm acting as manager" vs "Now I'm acting as participant."

### The System is Automatic

**The platform automatically determines permissions based on**:

1. **Current Workspace** (from URL: `/w/{slug}/...`)
2. **Database Queries**:
   - `WorkspaceMembership` - What's Kim's role in this workspace?
   - `ChallengeAssignment` - Is Kim a manager for this challenge?
   - `Enrollment` - Is Kim enrolled in this challenge?

3. **Permission Resolution** (happens server-side on every request):
```typescript
// Example: When loading challenge detail page
const permissions = await fetchUserChallengeContext(
  userId: kim.id,
  challengeId: 'challenge-123',
  workspaceId: 'alldigitalrewards-id'
)

// Returns composite permissions
{
  role: 'ADMIN',                    // Highest applicable role
  canApproveSubmissions: true,
  canManage: true,
  isParticipant: true,              // Also enrolled
  isManager: true,
  isAdmin: true
}
```

### UI Reflects Current Context

**The UI always shows the CURRENT effective role(s)**:

```
User navigates to: /w/alldigitalrewards/admin/challenges/123
                    └─ Workspace context set

Page loads challenge data + permissions
  ↓
Queries database for Kim's relationship to challenge 123:
  • WorkspaceMembership: ADMIN ✅
  • ChallengeAssignment: None
  • Enrollment: Enrolled ✅
  ↓
Permission resolver determines composite role:
  • Effective Role: ADMIN
  • isParticipant: true (because enrolled)
  ↓
UI renders with:
  • RoleContextBadge shows "Admin & Participant"
  • Admin controls visible
  • Participant actions available
  • Self-approval prevention active
```

---

## Part 5: Real-World Workflows

### Workflow 1: Kim Manages AND Participates in a Challenge

**Step 1**: Kim creates "Q1 Sales Challenge" in AllDigitalRewards
- **Role**: ADMIN (workspace-level)
- **UI**: Full admin controls visible

**Step 2**: Kim decides to participate too
- **Action**: Clicks "Enroll in Challenge" button
- **Database**: Creates Enrollment record
- **UI Updates**: Badge changes from "Admin" to "Admin & Participant"

**Step 3**: Kim submits an activity
- **Action**: Goes to Activities page, submits proof
- **Database**: Creates ActivitySubmission with userId = kim.id
- **UI**: Submission appears in "My Submissions"

**Step 4**: Kim goes to Manager Queue to review submissions
- **Action**: Navigates to `/w/alldigitalrewards/admin/manager/queue`
- **UI Shows**:
  ```
  participant1's submission → [Approve] [Request Changes]
  participant2's submission → [Approve] [Request Changes]
  YOUR submission → [Your Submission] "Cannot approve own submissions"
  ```

**Step 5**: API Enforces Self-Approval Prevention
- **If Kim tries to approve own submission via API**:
  ```typescript
  canApproveSubmission(permissions, submission.userId, kim.id)
  // Returns false because submission.userId === kim.id

  API Response: 403 Forbidden
  { error: "You cannot approve your own submission" }
  ```

### Workflow 2: Kim Switches Workspaces Mid-Session

**Starting State**: Kim viewing AllDigitalRewards admin dashboard
- **URL**: `/w/alldigitalrewards/admin/dashboard`
- **Role**: ADMIN

**Action**: Kim clicks workspace switcher, selects "Sharecare"
- **Navigation**: Redirects to `/w/sharecare/participant/dashboard`
- **Context Switch**:
  ```typescript
  // Old context
  workspace: alldigitalrewards
  role: ADMIN

  // New context
  workspace: sharecare
  role: PARTICIPANT
  ```

**UI Changes**:
- **Sidebar**: Admin options disappear, participant-only navigation shown
- **Available Pages**: Can only access participant routes
- **Challenge Views**: All challenges show participant perspective
- **No Approval Powers**: Manager queue not accessible

**If Kim tries to access admin routes**:
```
Navigates to: /w/sharecare/admin/dashboard
                              ↓
              middleware.ts checks role
                              ↓
              role = 'PARTICIPANT' (not ADMIN/MANAGER)
                              ↓
              Redirect to: /w/sharecare/participant/dashboard
```

**Implementation**: `/middleware.ts` + `/lib/auth/workspace-guards.ts`

---

## Part 6: Key UI Components

### Component 1: RoleContextBadge
**File**: `/components/ui/role-context-badge.tsx`

**Purpose**: Shows user's effective role(s) for current challenge

**Props**:
```typescript
interface RoleContextBadgeProps {
  permissions: ChallengePermissions
  showDetails?: boolean  // Show hover tooltip
}
```

**Rendering Logic**:
```typescript
if (permissions.isParticipant && permissions.isManager) {
  return "Manager & Participant"  // Both roles!
} else if (permissions.isAdmin) {
  return "Admin"
} else if (permissions.isManager) {
  return "Manager"
} else if (permissions.isParticipant) {
  return "Participant"
}
```

### Component 2: ManagerReviewButton
**File**: `/app/w/[slug]/admin/manager/queue/manager-review-button.tsx`

**Purpose**: Shows approve/reject buttons with self-approval prevention

**Logic**:
```typescript
// Fetch permissions for this challenge
const { permissions } = useChallengePermissions(workspaceSlug, challengeId)

// Check if can approve THIS submission
const canApprove = canApproveSubmission(
  permissions,
  submissionUserId,  // Who submitted it
  currentUserId      // Kim's ID
)

// Render based on check
if (submissionUserId === currentUserId) {
  return <Badge>Your Submission - Cannot approve own</Badge>
} else if (canApprove) {
  return <>[Approve] [Request Changes]</>
} else {
  return <Badge>Requires Manager Role</Badge>
}
```

### Component 3: ChallengeEnrollmentButton
**File**: `/components/challenges/challenge-enrollment-button.tsx`

**Purpose**: Smart enrollment button with permission awareness

**States**:
1. **Can Enroll**: Shows "Enroll in Challenge" button
2. **Already Enrolled**: Shows green "Enrolled ✓" badge
3. **Cannot Enroll**: Shows disabled button with tooltip explaining why

---

## Part 7: Database Schema Supporting Multi-Role

### The Three Tables

```sql
-- Tier 1: Workspace-level role
CREATE TABLE "WorkspaceMembership" (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES "User"(id),
  workspaceId UUID REFERENCES "Workspace"(id),
  role "Role" NOT NULL,           -- ADMIN, MANAGER, or PARTICIPANT
  isPrimary BOOLEAN DEFAULT false,
  UNIQUE(userId, workspaceId)
);

-- Tier 2: Challenge-specific management
CREATE TABLE "ChallengeAssignment" (
  id UUID PRIMARY KEY,
  managerId UUID REFERENCES "User"(id),
  challengeId UUID REFERENCES "Challenge"(id),
  workspaceId UUID REFERENCES "Workspace"(id),
  assignedAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(managerId, challengeId)
);

-- Tier 3: Challenge participation
CREATE TABLE "Enrollment" (
  id UUID PRIMARY KEY,
  userId UUID REFERENCES "User"(id),
  challengeId UUID REFERENCES "Challenge"(id),
  status TEXT,
  enrolledAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(userId, challengeId)
);
```

### Example: Kim's Records

```sql
-- Kim's workspace memberships
INSERT INTO "WorkspaceMembership" VALUES
  ('...', 'kim-id', 'alldigitalrewards-id', 'ADMIN', true),   -- Primary
  ('...', 'kim-id', 'acme-id', 'ADMIN', false),
  ('...', 'kim-id', 'sharecare-id', 'PARTICIPANT', false);

-- Kim assigned as manager for specific challenge
INSERT INTO "ChallengeAssignment" VALUES
  ('...', 'kim-id', 'wellness-challenge-id', 'alldigitalrewards-id', NOW());

-- Kim enrolled as participant in multiple challenges
INSERT INTO "Enrollment" VALUES
  ('...', 'kim-id', 'sales-challenge-id', 'ACTIVE', NOW()),
  ('...', 'kim-id', 'wellness-challenge-id', 'ACTIVE', NOW());
```

### Query to Get Kim's Permissions for a Challenge

```sql
SELECT
  wm.role as workspace_role,
  ca.id IS NOT NULL as is_challenge_manager,
  e.id IS NOT NULL as is_enrolled
FROM "User" u
LEFT JOIN "WorkspaceMembership" wm ON wm."userId" = u.id
  AND wm."workspaceId" = $workspaceId
LEFT JOIN "ChallengeAssignment" ca ON ca."managerId" = u.id
  AND ca."challengeId" = $challengeId
LEFT JOIN "Enrollment" e ON e."userId" = u.id
  AND e."challengeId" = $challengeId
WHERE u.email = 'krobinson@alldigitalrewards.com';

-- Result for "Q1 Sales Challenge":
-- workspace_role: ADMIN
-- is_challenge_manager: false
-- is_enrolled: true
--
-- Resolved Permission: ADMIN + Participant
```

---

## Summary: The User Experience

### What Kim Experiences:

1. **Workspace Switcher**: Dropdown showing all 3 workspaces with roles
   - One click switches entire context
   - URL, navigation, and permissions all update

2. **Automatic Role Composition**: System determines permissions per challenge
   - No manual switching needed
   - Badge shows current effective role(s)
   - UI adapts automatically

3. **Self-Approval Prevention**: Critical safety rule
   - Own submissions show special badge
   - No approve buttons for own work
   - API enforces even if UI is bypassed

4. **Consistent Permissions**: Same rules across all pages
   - Manager queue
   - Challenge detail pages
   - Activity submission pages
   - Approval workflows

### Technical Implementation:

- **Middleware**: Routes requests based on workspace role
- **Permission Resolver**: Combines three tiers of permissions
- **UI Components**: Render based on computed permissions
- **API Guards**: Enforce permissions at backend
- **Database Queries**: Efficient joins to fetch all role data

The system is **context-aware** and **automatic** - users simply navigate the platform, and permissions adapt to their current workspace and challenge relationships.
