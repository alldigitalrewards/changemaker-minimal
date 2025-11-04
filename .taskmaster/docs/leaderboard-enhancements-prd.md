# Leaderboard Enhancements PRD

## Overview
Enhance the existing workspace leaderboard functionality to provide more engagement, flexibility, and privacy controls for participants while giving admins better insights into workspace activity.

## Current State
- Basic leaderboard showing participants ranked by activities completed
- Simple card layout with top performer, average, and participant count
- Located at `/w/[slug]/participant/leaderboard`
- API endpoint: `/api/workspaces/[slug]/leaderboard`
- No filtering, no privacy controls, no time-based views

## Goals
1. Increase participant engagement through enhanced leaderboard features
2. Provide privacy controls for participants who prefer not to be ranked publicly
3. Enable time-based and challenge-specific leaderboard views
4. Add visual enhancements to celebrate achievements
5. Support future team/department-based rankings

## User Stories

### Participant Stories
1. As a participant, I want to see my ranking over different time periods (weekly, monthly, all-time) so I can track my recent vs overall performance
2. As a participant, I want to opt out of public leaderboards for privacy while still seeing my own stats
3. As a participant, I want to see challenge-specific leaderboards so I can compare my performance in specific areas
4. As a participant, I want visual recognition for top achievements (badges, medals) to feel more motivated
5. As a participant, I want to see my ranking trend (up/down arrows) to understand if I'm improving

### Admin Stories
1. As an admin, I want to see workspace-wide engagement trends on the leaderboard
2. As an admin, I want to export leaderboard data for reporting purposes
3. As an admin, I want to configure whether the leaderboard is visible to all participants
4. As an admin, I want to see completion rates alongside activity counts for better context

## Features

### Feature 1: Time-Based Leaderboard Filtering
**Priority**: High
**Complexity**: Medium

Add tab-based filtering for different time periods:
- All Time (default, current behavior)
- This Month
- This Week
- Today

Requirements:
- Update API endpoint to accept `period` query parameter
- Add database queries with date filtering on ActivityEvent
- Update UI with tab selector component
- Cache leaderboard data per period (5-minute TTL)
- Show period-specific stats (top/average for that period)

### Feature 2: Privacy Controls & Opt-Out
**Priority**: High
**Complexity**: Medium

Allow participants to control leaderboard visibility:
- Add `showInLeaderboard` boolean to WorkspaceMembership.preferences JSONB
- Default to `true` (opt-in by default)
- Add privacy toggle in participant profile settings
- Filter opted-out users from public leaderboard API
- Users always see their own stats regardless of privacy setting
- Show anonymous count of hidden participants ("X participants hidden by privacy settings")

Requirements:
- Database migration to ensure preferences field exists
- API endpoint: PUT `/api/workspaces/[slug]/me/preferences`
- Privacy toggle UI in participant profile page
- Update leaderboard query to respect privacy settings
- Add helper function: `shouldShowInLeaderboard(membership)`

### Feature 3: Challenge-Specific Leaderboards
**Priority**: Medium
**Complexity**: Medium

Enable filtering by specific challenge:
- Add dropdown selector for challenges
- Filter activities by challengeId in query
- Show challenge context in header ("Leaderboard: Save Water Challenge")
- Link from challenge detail page to its leaderboard
- Support "All Challenges" default view

Requirements:
- Update API to accept `challengeId` query parameter
- Add challenge selector component (dropdown or tabs)
- Filter ActivityEvent by challenge relationship
- Add breadcrumb navigation
- Link from `/w/[slug]/participant/challenges/[id]` to filtered leaderboard

### Feature 4: Visual Enhancements & Gamification
**Priority**: Medium
**Complexity**: Low

Add visual elements to celebrate achievements:
- Medal icons for top 3 (gold, silver, bronze)
- Badge system for milestones (10, 25, 50, 100 activities)
- Rank change indicators (↑↓ arrows with delta from previous period)
- Progress bars showing % of top performer
- Animated transitions when rankings update
- Participant avatars (using Supabase avatar_url or initials)

Requirements:
- Design medal/badge components using shadcn/ui
- Store historical rankings for trend calculation
- Add avatar support from user metadata
- CSS animations for ranking changes
- Trophy icon for #1 spot
- Color coding: top 10% (gold), top 25% (silver), top 50% (bronze)

### Feature 5: Enhanced Statistics & Insights
**Priority**: Low
**Complexity**: Low

Provide more context beyond raw activity counts:
- Completion rate (completed vs total activities)
- Streak tracking (consecutive days with activity)
- Points earned (if points system is active)
- Average activities per day/week
- Participation rate by challenge
- Personal best indicators

Requirements:
- Expand leaderboard API response with additional metrics
- Add stats cards below leaderboard table
- Calculate streaks from ActivityEvent timestamps
- Show mini-charts for trends (optional)
- Add "Your Stats" section above leaderboard

### Feature 6: Department/Team Rankings
**Priority**: Low (Future)
**Complexity**: High

Support team-based competition:
- Add optional `department` field to WorkspaceMembership
- Enable department-level leaderboards
- Show individual and team rankings side-by-side
- Team average vs individual performance
- Cross-team challenges

Requirements:
- Database schema update for department support
- New API endpoint for team leaderboards
- Team management in workspace settings
- Toggle between individual/team view
- Team-based filtering and aggregation

### Feature 7: Export & Admin Tools
**Priority**: Low
**Complexity**: Low

Admin capabilities for leaderboard data:
- Export leaderboard to CSV
- Configure workspace leaderboard visibility (show/hide entirely)
- Set leaderboard refresh frequency
- Configure whether to show points vs activities
- Admin-only detailed analytics view

Requirements:
- Add workspace settings for leaderboard configuration
- CSV export endpoint: GET `/api/workspaces/[slug]/leaderboard/export`
- Admin toggle to enable/disable leaderboard feature
- Configuration UI in workspace settings

## Technical Implementation

### Database Changes
```sql
-- Add preferences field if not exists (already planned)
ALTER TABLE "WorkspaceMembership"
ADD COLUMN IF NOT EXISTS "preferences" JSONB DEFAULT '{}';

-- Optional: Add department field for team rankings (future)
ALTER TABLE "WorkspaceMembership"
ADD COLUMN "department" TEXT;

-- Add index for leaderboard queries
CREATE INDEX IF NOT EXISTS "ActivityEvent_timestamp_idx"
ON "ActivityEvent" ("timestamp");
```

### API Endpoints

#### Enhanced Leaderboard Query
```typescript
GET /api/workspaces/[slug]/leaderboard
Query params:
  - period?: 'all' | 'month' | 'week' | 'day'
  - challengeId?: string
  - department?: string

Response:
{
  leaderboard: [
    {
      userId: string
      name: string
      avatarUrl?: string
      rank: number
      activityCount: number
      points: number
      completionRate: number
      rankChange?: number
      badges: string[]
    }
  ],
  stats: {
    topCount: number
    averageCount: number
    participantCount: number
    hiddenCount: number
  },
  currentUser: {
    rank: number
    activityCount: number
    percentile: number
  }
}
```

#### Privacy Settings
```typescript
PUT /api/workspaces/[slug]/me/preferences
Body:
{
  showInLeaderboard: boolean
}
```

#### Export
```typescript
GET /api/workspaces/[slug]/leaderboard/export
Query params: same as leaderboard query
Response: CSV file
```

### UI Components

#### LeaderboardTabs
```tsx
<Tabs defaultValue="all">
  <TabsList>
    <TabsTrigger value="all">All Time</TabsTrigger>
    <TabsTrigger value="month">This Month</TabsTrigger>
    <TabsTrigger value="week">This Week</TabsTrigger>
    <TabsTrigger value="day">Today</TabsTrigger>
  </TabsList>
</Tabs>
```

#### ChallengeFilter
```tsx
<Select>
  <SelectTrigger>All Challenges</SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Challenges</SelectItem>
    {challenges.map(c => <SelectItem key={c.id}>{c.title}</SelectItem>)}
  </SelectContent>
</Select>
```

#### RankingCard (Enhanced)
```tsx
<Card>
  <CardContent>
    {rank <= 3 && <MedalIcon rank={rank} />}
    <Avatar src={avatarUrl} fallback={initials} />
    <div>
      <h3>{name}</h3>
      <Badge>{department}</Badge>
    </div>
    <div>
      {activityCount} activities
      <RankTrend change={rankChange} />
    </div>
  </CardContent>
</Card>
```

## Success Metrics
1. Participant engagement: 20% increase in leaderboard page views
2. Privacy adoption: Monitor opt-out rate (expect <15%)
3. Feature usage: 40% of users try time-based filtering within first month
4. Admin satisfaction: Positive feedback on export functionality
5. Performance: Leaderboard loads in <500ms with caching

## Non-Goals
- Real-time live updates (polling acceptable)
- Social features (comments, likes, reactions)
- Leaderboard across multiple workspaces
- Integration with external gamification platforms
- Native mobile app features

## Implementation Phases

### Phase 1: Privacy & Time Filtering (1-2 days)
- Privacy controls in preferences
- Time-based filtering (week/month/all)
- Update API and queries

### Phase 2: Visual Enhancements (1 day)
- Medals for top 3
- Rank change indicators
- Avatar support
- Progress bars

### Phase 3: Challenge Filtering (1 day)
- Challenge dropdown selector
- Filtered queries
- Navigation from challenge pages

### Phase 4: Stats & Export (1 day)
- Enhanced statistics
- CSV export
- Admin configuration

### Phase 5: Future - Team Rankings (3-4 days)
- Department field
- Team leaderboards
- Cross-team features

## Open Questions
1. Should we support custom leaderboard periods (e.g., last 30 days, Q1 2025)?
2. Should admins be included in leaderboards or filtered out by default?
3. What happens to historical rankings when a user opts out?
4. Should we add leaderboard notifications (e.g., "You moved up 3 spots!")?
5. How do we handle ties in rankings?

## Dependencies
- Existing WorkspaceMembership.preferences field (from participant preferences work)
- User profile page (for privacy toggle placement)
- Challenge detail pages (for linking to filtered leaderboards)
- Workspace settings page (for admin configuration)

## Risks & Mitigations
1. **Risk**: Performance degradation with complex queries
   - **Mitigation**: Implement caching with 5-minute TTL, add database indexes

2. **Risk**: Privacy concerns if not implemented correctly
   - **Mitigation**: Default to opt-in, clear UI messaging, audit trail for preference changes

3. **Risk**: Scope creep with gamification features
   - **Mitigation**: Strict prioritization, focus on MVP features first

4. **Risk**: Database load from historical ranking calculations
   - **Mitigation**: Pre-calculate rankings in background job, store in cache
