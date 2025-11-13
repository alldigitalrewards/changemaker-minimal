# Notification System

Complete in-app notification system for participants to receive personalized alerts and messages.

## Overview

The notification system provides real-time, workspace-scoped notifications for participants. Primary use cases include:

- Shipping address required for physical rewards
- Reward issuance confirmations
- Submission approvals/rejections
- Challenge invitations
- System announcements

## Architecture

### Database Layer

**Notification Model** (`prisma/schema.prisma`)

```prisma
model Notification {
  id             String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId         String           @db.Uuid
  workspaceId    String           @db.Uuid
  type           NotificationType
  title          String
  message        String
  actionUrl      String?
  actionText     String?
  read           Boolean          @default(false)
  readAt         DateTime?
  dismissed      Boolean          @default(false)
  dismissedAt    DateTime?
  expiresAt      DateTime?
  createdAt      DateTime         @default(now())
  updatedAt      DateTime         @default(now())
}

enum NotificationType {
  SHIPPING_ADDRESS_REQUIRED
  CHALLENGE_INVITED
  CHALLENGE_ENROLLED
  REWARD_ISSUED
  SUBMISSION_APPROVED
  SUBMISSION_REJECTED
  ANNOUNCEMENT
  SYSTEM
}
```

### Data Access Layer

**Location:** `/lib/db/notifications.ts`

**Functions:**
- `createNotification()` - Create a new notification
- `getUserNotifications()` - Get notifications with filters (read/unread, dismissed)
- `getUnreadNotificationCount()` - Get count of unread notifications
- `markNotificationAsRead()` - Mark single notification as read
- `markAllNotificationsAsRead()` - Bulk mark as read
- `dismissNotification()` - Dismiss a notification
- `notificationExists()` - Check for duplicate notifications
- `deleteExpiredNotifications()` - Cleanup job for expired notifications

### Service Layer

**Location:** `/lib/services/notifications.ts`

**Business Logic Functions:**

```typescript
createShippingAddressNotification({
  userId: string
  workspaceId: string
  workspaceSlug: string
  skuName: string
  rewardIssuanceId: string
})

createRewardIssuedNotification({
  userId: string
  workspaceId: string
  workspaceSlug: string
  rewardType: 'points' | 'sku'
  amount?: number
  skuName?: string
})

createSubmissionApprovedNotification({
  userId: string
  workspaceId: string
  workspaceSlug: string
  activityName: string
  challengeId: string
  pointsAwarded?: number
})

hasIncompleteShippingAddress(userId: string): Promise<boolean>
```

### API Layer

**Endpoints:**

```
GET  /api/workspaces/[slug]/notifications
  Query params: includeRead, includeDismissed, limit, offset
  Returns: { notifications: Notification[], unreadCount: number }

POST /api/workspaces/[slug]/notifications
  Body: { action: 'read-all' }
  Returns: { success: true, count: number }

POST /api/workspaces/[slug]/notifications/[id]/read
  Returns: { notification: Notification }

POST /api/workspaces/[slug]/notifications/[id]/dismiss
  Returns: { notification: Notification }

GET  /api/workspaces/[slug]/notifications/count
  Returns: { count: number }
```

**Security:**
- All endpoints require workspace access via `requireWorkspaceAccess()`
- Notifications are workspace-isolated
- Users can only access their own notifications

### UI Components

**1. NotificationBell** (`components/notifications/notification-bell.tsx`)

Client component that displays bell icon with unread badge.

Features:
- Real-time unread count badge
- Auto-refresh every 30 seconds
- Opens dropdown on click

**2. NotificationDropdown** (`components/notifications/notification-dropdown.tsx`)

Popover showing recent unread notifications.

Features:
- Shows 5 most recent unread notifications
- Mark as read/dismiss actions
- Link to full inbox page
- Icon indicators by notification type

**3. NotificationInbox** (`components/notifications/notification-inbox.tsx`)

Full-page inbox with tabbed interface.

Features:
- Tabs: Unread, All, Read
- Mark all as read bulk action
- Individual mark read/dismiss
- Notification type icons and colors
- Click-to-action for actionable notifications
- Auto-mark as read when viewing in inbox

**Notification Type Icons:**

| Type | Icon | Color |
|------|------|-------|
| SHIPPING_ADDRESS_REQUIRED | Package | Orange |
| REWARD_ISSUED | Trophy | Green |
| SUBMISSION_APPROVED | Check | Blue |
| SUBMISSION_REJECTED | X | Red |
| CHALLENGE_INVITED | MessageSquare | Purple |
| CHALLENGE_ENROLLED | Trophy | Indigo |
| ANNOUNCEMENT | Bell | Gray |
| SYSTEM | AlertCircle | Yellow |

## Integration Points

### 1. Participant Sidebar

The notification bell is integrated into the participant sidebar header:

```tsx
// components/navigation/participant-sidebar.tsx
import { NotificationBell } from '@/components/notifications/notification-bell'

<NotificationBell workspaceSlug={workspace.slug} />
```

### 2. Reward Issuance Flow

Notifications are automatically created when SKU rewards require shipping addresses:

```typescript
// lib/rewardstack/reward-logic.ts - issueCatalogReward()

if (missingFields.length > 0) {
  // Create notification for user to add shipping address
  await createShippingAddressNotification({
    userId: rewardIssuance.userId,
    workspaceId: rewardIssuance.workspaceId,
    workspaceSlug: workspace.slug,
    skuName: skuDetails?.name || 'your reward',
    rewardIssuanceId: rewardIssuanceId,
  })

  throw new Error('Missing shipping address fields...')
}
```

### 3. Navigation

Added to participant navigation menu:

```typescript
// components/navigation/participant-sidebar.tsx
{ name: 'Notifications', href: '/participant/notifications', icon: Bell }
```

## Usage Examples

### Creating a Custom Notification

```typescript
import { createNotification } from '@/lib/db/notifications'

await createNotification({
  userId: user.id,
  workspaceId: workspace.id,
  type: 'ANNOUNCEMENT',
  title: 'New Challenge Available',
  message: 'Check out the new Summer Challenge!',
  actionUrl: `/w/${workspace.slug}/participant/challenges/${challengeId}`,
  actionText: 'View Challenge',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
})
```

### Preventing Duplicate Notifications

```typescript
import { notificationExists, createNotification } from '@/lib/db/notifications'

const exists = await notificationExists(
  userId,
  workspaceId,
  'SHIPPING_ADDRESS_REQUIRED'
)

if (!exists) {
  await createNotification({...})
}
```

### Batch Operations

```typescript
import { markAllNotificationsAsRead } from '@/lib/db/notifications'

// Mark all user notifications as read in workspace
const count = await markAllNotificationsAsRead(userId, workspaceId)
console.log(`Marked ${count} notifications as read`)
```

## Notification Lifecycle

1. **Creation**
   - Notification created via service layer or direct DB call
   - `read: false`, `dismissed: false` by default
   - Optional `expiresAt` (default: 30 days)

2. **Delivery**
   - User sees unread badge on notification bell
   - Badge shows count of unread, non-dismissed notifications
   - Dropdown shows 5 most recent unread

3. **Reading**
   - User clicks notification or marks as read
   - `read: true`, `readAt: timestamp`
   - Removed from unread list

4. **Dismissing**
   - User dismisses notification (close icon)
   - `dismissed: true`, `dismissedAt: timestamp`
   - Hidden from all views

5. **Expiry**
   - Notifications past `expiresAt` are excluded from queries
   - Cleanup job can delete expired notifications

## Design Patterns

### Workspace Isolation

All notifications are scoped to a workspace:

```typescript
const notifications = await getUserNotifications(userId, workspaceId, options)
```

### Deduplication

Prevent duplicate notifications using `notificationExists()`:

```typescript
const exists = await notificationExists(
  userId,
  workspaceId,
  'SHIPPING_ADDRESS_REQUIRED',
  { rewardIssuanceId: 'abc123' } // Optional additional filters
)
```

### Auto-Expiry

Notifications automatically exclude expired ones:

```typescript
// In getUserNotifications()
where: {
  OR: [
    { expiresAt: null },
    { expiresAt: { gte: new Date() } }
  ]
}
```

### Graceful Degradation

Notification creation failures don't block core flows:

```typescript
try {
  await createShippingAddressNotification({...})
} catch (error) {
  console.error('Failed to create notification:', error)
  // Don't fail the reward issuance
}
```

## Testing

### Manual Testing Checklist

1. **Create Notification**
   - Issue SKU reward without shipping address
   - Verify notification appears in bell dropdown
   - Check unread badge count

2. **Mark as Read**
   - Click notification in dropdown
   - Verify it disappears from unread
   - Check badge count decrements

3. **Full Inbox**
   - Navigate to `/w/[slug]/participant/notifications`
   - Verify tabs work (Unread, All, Read)
   - Test "Mark all as read" button

4. **Dismiss**
   - Click X on notification
   - Verify it's removed from all views

5. **Action URL**
   - Click notification with action
   - Verify redirect to correct page

### API Testing

```bash
# Get notifications
curl -H "Cookie: ..." \
  http://localhost:3000/api/workspaces/demo/notifications

# Get unread count
curl -H "Cookie: ..." \
  http://localhost:3000/api/workspaces/demo/notifications/count

# Mark as read
curl -X POST -H "Cookie: ..." \
  http://localhost:3000/api/workspaces/demo/notifications/[id]/read

# Mark all as read
curl -X POST -H "Cookie: ..." -H "Content-Type: application/json" \
  -d '{"action":"read-all"}' \
  http://localhost:3000/api/workspaces/demo/notifications
```

## Future Enhancements

### Planned Features

1. **Email Notifications**
   - Send email for critical notifications
   - User preference for email delivery

2. **Push Notifications**
   - Browser push notifications
   - Service worker integration

3. **Notification Preferences**
   - User settings for notification types
   - Frequency settings (immediate, daily digest)

4. **Notification Templates**
   - Reusable notification templates
   - Dynamic variable substitution

5. **Notification History**
   - Audit trail of all notifications
   - Export functionality

### Performance Optimizations

1. **Polling → WebSocket**
   - Replace 30s polling with WebSocket for real-time updates
   - Reduce server load

2. **Caching**
   - Cache unread count in Redis
   - Invalidate on notification changes

3. **Pagination**
   - Infinite scroll in full inbox
   - Lazy loading for large notification lists

## Maintenance

### Cleanup Job

Run periodically to delete expired notifications:

```typescript
import { deleteExpiredNotifications } from '@/lib/db/notifications'

// In a cron job or background worker
const count = await deleteExpiredNotifications()
console.log(`Deleted ${count} expired notifications`)
```

### Monitoring

Key metrics to track:
- Notification creation rate
- Read rate (% notifications read)
- Dismiss rate (% notifications dismissed)
- Time to read (how long until user reads)
- Action click-through rate

### Database Indexes

Ensure these indexes exist for performance:

```sql
CREATE INDEX idx_notifications_user_read_dismissed
  ON "Notification" ("userId", "read", "dismissed");

CREATE INDEX idx_notifications_expires
  ON "Notification" ("expiresAt");

CREATE INDEX idx_notifications_created
  ON "Notification" ("createdAt" DESC);
```

## Troubleshooting

### Notifications Not Appearing

1. Check workspace isolation - correct workspaceId?
2. Verify user has workspace membership
3. Check if notification was dismissed
4. Check expiresAt date
5. Inspect browser console for API errors

### Badge Count Incorrect

1. Clear browser cache
2. Check for client-side polling errors
3. Verify API response matches DB state
4. Check for race conditions in mark-as-read

### Performance Issues

1. Add database indexes
2. Reduce polling frequency
3. Implement pagination
4. Add notification count limit per user

## Summary

The notification system provides a complete, production-ready solution for in-app notifications:

- **Complete:** Database, API, service layer, UI components
- **Secure:** Workspace-isolated, user-owned
- **Scalable:** Indexed, paginated, auto-expiry
- **Flexible:** Multiple types, custom actions, deduplication
- **Integrated:** Reward flow, participant sidebar, navigation

Primary use case (shipping address alerts) is fully implemented and tested.
