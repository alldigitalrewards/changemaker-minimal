# Role View Switcher - User Guide

## Overview

The Role View Switcher allows users with multiple roles in a workspace to toggle between different role-specific dashboard views. This feature enables you to experience the platform from different perspectives without changing workspaces.

## How It Works

### Available Views

The Role View Switcher displays different views based on your workspace role:

#### For Workspace Admins
- **Admin View** - Full workspace administration and management
- **Manager View** - Challenge management and submission review
- **Participant View** - Standard participant experience

#### For Challenge Managers
- **Manager View** - Challenge management and submission review
- **Participant View** - Standard participant experience

#### For Participants
- **Participant View** - Standard participant experience only
- *(Switcher is hidden since only one view is available)*

### Visual Location

The Role View Switcher appears in the dashboard header, next to the workspace switcher:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎯 Changemaker | Dashboard                    [Workspace ▾]     │
│                  All Digital Rewards            [Admin View ▾]  │
└─────────────────────────────────────────────────────────────────┘
```

### Dropdown Interface

When clicked, the switcher shows a dropdown with available views:

```
┌──────────────────────────────────────────────┐
│ Switch Role View                              │
├──────────────────────────────────────────────┤
│ 🛡️  Admin View                    [Current]  │
│     Full workspace administration             │
│                                               │
│ 💼  Manager View                              │
│     View as a challenge manager               │
│                                               │
│ 👥  Participant View                          │
│     View as a challenge participant           │
├──────────────────────────────────────────────┤
│ Your workspace role: ADMIN                    │
│ Switching views changes your dashboard and   │
│ available features, but doesn't change your   │
│ actual permissions.                           │
└──────────────────────────────────────────────┘
```

## Example Workflows

### Kim Robinson - Admin Switching Perspectives

**Scenario**: Kim is an admin at All Digital Rewards and wants to see what participants experience.

1. **Starting Point**: Kim is on Admin Dashboard
   - URL: `/w/alldigitalrewards/admin/dashboard`
   - Sees: Full admin controls, all challenges, user management

2. **Switching to Participant View**:
   - Clicks Role View Switcher dropdown in header
   - Sees three options: Admin View (current), Manager View, Participant View
   - Clicks "Participant View"

3. **Result**: Dashboard switches to participant perspective
   - URL: `/w/alldigitalrewards/participant/dashboard`
   - Sees: Enrolled challenges, personal leaderboard, activities
   - Cannot access admin features like user management or challenge creation

4. **Switching Back to Admin View**:
   - Clicks Role View Switcher (now showing "Participant View")
   - Clicks "Admin View"
   - Returns to: `/w/alldigitalrewards/admin/dashboard`

### Testing a New Challenge

**Scenario**: Kim creates a new challenge and wants to verify the participant experience.

1. In **Admin View**: Creates "Q1 Innovation Challenge"
2. Enrolls herself as a participant
3. Switches to **Participant View**
4. Navigates to Challenges → "Q1 Innovation Challenge"
5. Completes an activity submission
6. Switches to **Manager View**
7. Reviews her own submission in manager queue
8. **Important**: Cannot approve her own submission (self-approval prevention)
   - Sees "Your Submission" badge instead of Approve button
9. Switches back to **Admin View** to continue admin tasks

### Manager Testing Submission Review

**Scenario**: Sarah is a challenge manager who also participates in challenges.

1. **Starting Point**: Sarah is on Manager Dashboard
   - URL: `/w/alldigitalrewards/manager/dashboard`
   - Sees: Assigned challenges, pending submissions

2. **Checking Participant Experience**:
   - Switches to "Participant View"
   - Sees her enrollments and activities
   - Submits an activity

3. **Reviewing Others' Submissions**:
   - Switches back to "Manager View"
   - Opens manager queue
   - Reviews submissions from other participants
   - Can approve/reject others' submissions
   - Cannot approve her own submissions (shows "Your Submission" badge)

## Key Features

### Automatic View Filtering

The switcher only shows views you have access to:

- **Participant-only users**: Switcher is hidden (only one view available)
- **Managers**: See Manager and Participant views
- **Admins**: See all three views (Admin, Manager, Participant)

### Current View Indicator

The dropdown clearly marks your current view with a "Current" badge, preventing confusion about which perspective you're viewing.

### URL-Based Navigation

Each view has its own distinct URL structure:
- Admin: `/w/{workspace}/admin/*`
- Manager: `/w/{workspace}/manager/*`
- Participant: `/w/{workspace}/participant/*`

This allows bookmarking specific views and using browser history to navigate between perspectives.

### Permission Preservation

**Important**: Switching views changes your interface and available features, but does NOT change your actual workspace permissions:

- Switching to Participant View doesn't revoke your admin/manager permissions
- Your underlying role remains unchanged
- This is purely a UI/UX toggle for experiencing different perspectives
- Permission checks still apply (e.g., self-approval prevention works regardless of view)

## Technical Notes

### For Developers

The Role View Switcher is implemented in `/components/role-view-switcher.tsx` and integrated into the dashboard header at `/components/layout/dashboard-header.tsx`.

**Key Implementation Details**:

1. **View Determination**: Current view is determined by URL path (`/admin`, `/manager`, or `/participant`)
2. **Available Views**: Calculated based on `workspaceRole` prop from workspace membership
3. **Auto-Hide**: Component returns `null` if only one view is available
4. **Navigation**: Uses Next.js `useRouter` to redirect to different dashboard routes

**Props Interface**:
```typescript
interface RoleViewSwitcherProps {
  workspaceSlug: string      // Workspace slug for URL construction
  workspaceRole: Role        // User's actual workspace role (ADMIN, MANAGER, PARTICIPANT)
  className?: string         // Optional styling
}
```

### Integration Points

The switcher is enabled in all three layout files:

- `/app/w/[slug]/admin/layout.tsx` - Shows switcher for admins
- `/app/w/[slug]/manager/layout.tsx` - Shows switcher for managers
- `/app/w/[slug]/participant/layout.tsx` - Shows switcher for eligible users (auto-hides for participant-only users)

### Dashboard Header Configuration

The dashboard header has a `showRoleSwitcher` prop:
- When `true`: Shows the Role View Switcher dropdown
- When `false`: Shows a static role badge instead

## Benefits

### For Admins
- Quickly test new challenges from participant perspective
- Verify enrollment flows work correctly
- See exactly what participants see without switching accounts
- Debug issues by experiencing them first-hand

### For Managers
- Review challenges as both manager and participant
- Test activities before assigning to participants
- Understand participant experience when providing support
- Switch between managing and participating seamlessly

### For Development & QA
- Single account can test multiple role perspectives
- No need to create test accounts for each role
- Faster debugging and issue reproduction
- Better understanding of user experience across roles

## Limitations

### What the Switcher Does NOT Do

1. **Does not change permissions**: You still have the same underlying role and permissions
2. **Does not affect other workspaces**: Switching views only affects the current workspace
3. **Does not persist across sessions**: Defaults to your primary role view on next login
4. **Does not bypass security**: Self-approval prevention and other business rules still apply
5. **Does not grant temporary permissions**: Participant view does not restrict admin capabilities at the API level

### Security Considerations

The Role View Switcher is a **presentation layer feature** only. All permission checks happen at:

1. **API Layer**: Each endpoint validates workspace membership and role
2. **Server Component Layer**: Route guards check permissions before rendering
3. **UI Component Layer**: Components check permissions for showing/hiding features

Switching views changes what you see, but security validation happens server-side based on your actual role.

## FAQ

### Q: Can participants switch to admin view?
**A**: No. The switcher only shows views you have permission to access. Participants see only participant view, so the switcher is hidden.

### Q: Does switching views log me out?
**A**: No. Switching views is instant navigation within the same workspace session.

### Q: Can I bookmark a specific view?
**A**: Yes! Each view has its own URL. You can bookmark `/w/myworkspace/admin/dashboard` and `/w/myworkspace/participant/dashboard` separately.

### Q: What happens if I switch to participant view and try to access admin features?
**A**: Route guards will redirect you to an authorized page. The URL might change, but you'll be protected from accessing unauthorized features.

### Q: Can I be in admin view in one browser tab and participant view in another?
**A**: Yes! Each tab maintains its own navigation state. You can have multiple tabs open with different views.

### Q: Does the role view affect my workspace membership?
**A**: No. Your workspace role remains unchanged. The view switcher only changes the interface you see.

---

**Implementation Date**: 2025-11-05
**Status**: ✅ Complete - Production Ready
**Related Documentation**:
- `/docs/MULTI_ROLE_USER_EXPERIENCE.md` - Comprehensive multi-role system guide
- `/docs/multi-role-capabilities.md` - Technical implementation details
- `/docs/SELF_APPROVAL_PREVENTION_INTEGRATION.md` - Self-approval prevention system
