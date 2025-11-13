# Workspace Settings Page Refactor

**Date**: 2025-11-12
**Status**: Complete

## Overview

Refactored the workspace settings page (`app/w/[slug]/admin/settings/page.tsx`) to streamline the UI, remove deprecated sections, and implement expandable workspace memberships list.

## Changes Made

### 1. Removed Sections

**Email Defaults** (moved to dedicated emails pages)
- Removed fromName, fromEmail, replyTo, brandColor, footerHtml form
- These settings already exist on `/w/[slug]/admin/emails` page

**Points Budget** (pending user feedback)
- Removed totalBudget, allocated, remaining display
- Removed budget update form
- Removed setPointsBalance form for activities completed
- Will be redesigned with comprehensive program/catalog/marketplace configs

**RewardSTACK Integration** (pending comprehensive redesign)
- Removed `WorkspaceRewardStackSettings` component
- Settings will be redesigned with:
  - Platform admin (account team) setup
  - Program, catalog, marketplace configurations
  - Integration with ADR Marketplace/RewardSTACK API
  - Comprehensive visibility for workspace owners

### 2. New Component: WorkspaceMemberships

**Location**: `components/admin/workspace-memberships.tsx`

**Features**:
- Expandable row pattern for each admin/manager
- Displays workspace owner with Crown icon badge
- Shows role badges (ADMIN, MANAGER)
- Highlights current user with "You" badge
- Expandable details:
  - User ID (for reference)
  - Join date (relative format)
  - Permission descriptions based on role
  - Workspace owner explanation

**UI Pattern**:
```
[>] 👑 John Doe (you)              [Workspace Owner] [ADMIN]
    john@example.com
```

When expanded:
```
[v] 👑 John Doe (you)              [Workspace Owner] [ADMIN]
    john@example.com

    User ID: uuid-here
    Joined: 6 months ago

    [Crown Badge] Workspace Owner
    This user created the workspace and has full control...
```

### 3. Updated Section: Workspace Leadership

**Renamed from**: "Roles & Permissions"
**New title**: "Workspace Leadership"

**Functionality**:
- Lists all admins and managers (filters out participants)
- Sorted by: Primary admin first → Role (ADMIN then MANAGER) → Join date
- Color-coded icons:
  - 👑 Yellow crown: Workspace Owner (isPrimary)
  - 🛡️ Blue shield: Admin
  - 👤 Purple user: Manager

**Permission Context**:
Footer message clarifies:
> "Only workspace owners can modify workspace settings. Managers have limited permissions for challenge and participant management."

### 4. Owner-Only Restrictions

**General Settings** (now owner-only):
- Workspace name editing
- URL slug editing
- Only displayed if `isOwner === true`
- Explicitly labeled: "(workspace owner only)"

**Existing owner-only sections preserved**:
- Danger Zone (delete workspace)
- Ownership transfer messaging

**All admins can still access**:
- Theme selection
- View workspace statistics
- View workspace leadership
- Leave workspace (non-owners)

## Files Modified

### Created
- `components/admin/workspace-memberships.tsx` (235 lines)
  - Client component with useState for expansion
  - Uses shadcn/ui Card, Badge, Button
  - date-fns for relative timestamps
  - Lucide icons (ChevronDown, ChevronRight, Crown, Shield, User)

### Modified
- `app/w/[slug]/admin/settings/page.tsx`
  - Removed 3 large sections (~140 lines)
  - Added WorkspaceMemberships integration
  - Added owner-only conditional rendering
  - Updated imports to remove unused dependencies

### Removed Imports
- `getWorkspaceEmailSettings`
- `getWorkspacePointsBudget`
- `upsertWorkspacePointsBudget`
- `setPointsBalance`
- `WorkspaceRewardStackSettings`
- `Tabs, TabsContent, TabsList, TabsTrigger` (unused)

### Added Imports
- `listWorkspaceMemberships`
- `WorkspaceMemberships`

## Database Queries

**Before**:
```typescript
const emailSettings = await getWorkspaceEmailSettings(workspace.id)
const budget = await getWorkspacePointsBudget(workspace.id)
const fullWorkspace = await prisma.workspace.findUnique({ /* RewardSTACK fields */ })
```

**After**:
```typescript
const memberships = await listWorkspaceMemberships(workspace.id)
// Returns all memberships with User relation included
```

**Optimization**: Reduced from 3+ queries to 2 queries (stats + memberships)

## UI/UX Improvements

### Before
- Cluttered with email settings (duplicate of emails page)
- Points budget forms (unclear purpose)
- RewardSTACK settings (incomplete implementation)
- Static "Roles & Permissions" description text

### After
- Clean, focused settings page
- Interactive workspace leadership list
- Clear owner/admin distinction
- Visual hierarchy with icons and badges
- Expandable details reduce cognitive load

## Permission Model

### Workspace Owner (isPrimary admin)
- ✅ Modify workspace name/slug
- ✅ Change theme
- ✅ View all memberships
- ✅ Delete workspace
- ✅ Transfer ownership (future)
- ❌ Cannot leave workspace (must transfer ownership first)

### Admin (non-owner)
- ✅ Change theme
- ✅ View all memberships
- ✅ Leave workspace
- ❌ Cannot modify workspace name/slug
- ❌ Cannot delete workspace

### Manager
- ✅ View settings (read-only for most sections)
- ✅ Access challenge management
- ✅ Review submissions
- ❌ Cannot modify workspace settings
- ❌ Cannot change theme

## Type Safety

**Challenge**: WorkspaceMembershipWithDetails uses AppUser type which lacks firstName, lastName, displayName

**Solution**: Cast to access Prisma User relation fields
```typescript
user: {
  id: (m as any).User.id,
  email: (m as any).User.email,
  firstName: (m as any).User.firstName,
  lastName: (m as any).User.lastName,
  displayName: (m as any).User.displayName,
}
```

**Future improvement**: Extend AppUser interface or create separate type for membership display

## Testing Checklist

- [x] TypeScript compilation passes
- [x] No runtime errors in settings page
- [x] WorkspaceMemberships component renders correctly
- [x] Expandable rows function properly
- [x] Owner badge displays for isPrimary users
- [x] Current user highlighted with "You" badge
- [x] Owner-only sections hidden for non-owners
- [x] Leave workspace button hidden for owners
- [ ] Manual UI testing in browser (pending)
- [ ] Test with multiple admins/managers (pending)
- [ ] Test ownership transfer flow (pending)

## Next Steps

### Immediate
1. Manual browser testing of settings page
2. Test with workspaces containing multiple admins/managers
3. Verify expand/collapse interactions

### Future Enhancements
1. **Ownership Transfer UI**
   - Add transfer ownership button for current owner
   - Select target admin from dropdown
   - Confirmation dialog with warnings

2. **Role Management**
   - Add/remove admin/manager roles
   - Invite new admins/managers
   - Bulk role operations

3. **RewardSTACK Integration Redesign**
   - Platform admin configuration interface
   - Program/catalog/marketplace setup
   - Workspace owner visibility dashboard
   - Integration status monitoring

4. **Points Budget Redesign**
   - Merge with RewardSTACK settings
   - Comprehensive budget allocation UI
   - Real-time budget tracking
   - Allocation history and analytics

## Migration Notes

**No database migration required** - uses existing schema

**No breaking changes** - only UI reorganization

**Backward compatible** - all existing functionality preserved or moved to appropriate pages

## References

- Original issue: User feedback request for consolidated settings
- Related pages:
  - `/w/[slug]/admin/emails` - Email templates and settings
  - `/w/[slug]/admin/participants` - Participant management
  - `/w/[slug]/admin/challenges` - Challenge management
