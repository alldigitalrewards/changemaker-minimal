# Leaderboard Page Layout Plan

## Overview
Enhanced leaderboard layout with time-based filtering, challenge filtering, privacy controls, visual gamification, and improved statistics presentation.

## Current Layout Analysis (from screenshot)
```
┌─────────────────────────────────────────────────────────────┐
│ Header: "Dashboard" + Workspace Name                        │
│ Participant Badge | Activities completed: 25 | User Menu    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Sidebar Navigation                                          │
│ - Dashboard                                                 │
│ - Challenges                                                │
│ - My Activities                                             │
│ - Leaderboard (active)                                      │
│ - Profile                                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Workspace Leaderboard                                       │
│ Activities completed in AllDigitalRewards                   │
│                                                             │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│ │ Your     │  │ lisa.t   │  │ sarah.j  │                   │
│ │ ranking  │  │ 75       │  │ 25       │                   │
│ │ #2       │  │ Crown    │  │ Trophy   │                   │
│ │ 25 done  │  │          │  │          │                   │
│ └──────────┘  └──────────┘  └──────────┘                   │
│                                                             │
│ ┌──────────┐                                                │
│ │ mike.c   │                                                │
│ │ 20       │                                                │
│ │ Bronze   │                                                │
│ └──────────┘                                                │
│                                                             │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│ │ Top      │  │ Average  │  │ Participants │                │
│ │ 75       │  │ 40       │  │ 3          │                 │
│ └──────────┘  └──────────┘  └──────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

## Enhanced Layout Structure

### Layout Hierarchy
```
┌───────────────────────────────────────────────────────────────────────┐
│ 1. Page Header (Dashboard Header - unchanged)                        │
├───────────────────────────────────────────────────────────────────────┤
│ 2. Page Title & Controls Section                                     │
│    - Page title                                                       │
│    - Time period tabs                                                 │
│    - Challenge filter dropdown                                        │
├───────────────────────────────────────────────────────────────────────┤
│ 3. Your Stats Section (Personal Performance)                         │
│    - Current rank                                                     │
│    - Activities completed                                             │
│    - Rank change indicator                                            │
│    - Progress to next milestone                                       │
├───────────────────────────────────────────────────────────────────────┤
│ 4. Top Performers Showcase (Top 3 with medals)                       │
│    - Gold, Silver, Bronze positions                                   │
│    - Prominent display with avatars                                   │
├───────────────────────────────────────────────────────────────────────┤
│ 5. Leaderboard Rankings (Positions 4+)                               │
│    - Ranked list with all visual enhancements                         │
├───────────────────────────────────────────────────────────────────────┤
│ 6. Workspace Statistics                                               │
│    - Top/Average/Participant count                                    │
│    - Privacy note (X participants hidden)                             │
└───────────────────────────────────────────────────────────────────────┘
```

## Detailed Component Layout

### 2. Page Title & Controls Section
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Workspace Leaderboard                                [Export CSV ↓]   │
│  Activities completed in AllDigitalRewards                              │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────┐           │
│  │ [ All Time ] [ This Month ] [ This Week ] [ Today ]     │           │
│  └─────────────────────────────────────────────────────────┘           │
│                                                                         │
│  Challenge:  [ All Challenges ▾ ]                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Components:
- H1: "Workspace Leaderboard"
- Subtitle: "Activities completed in {workspaceName}" (dynamic)
- Export button (admin only): Ghost button, top-right
- Tabs component: Primary tabs, active state with coral-500 underline
- Select dropdown: Challenge filter with search capability
```

### 3. Your Stats Section (Highlighted Card)
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Your Performance                                                        │
│                                                                         │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐          │
│ │              │              │              │              │          │
│ │  Your Rank   │  Activities  │ Rank Change  │  Next Badge  │          │
│ │              │              │              │              │          │
│ │     #2       │      25      │     ↑ 1      │   50 (50%)   │          │
│ │              │  completed   │ since Monday │              │          │
│ │   Top 33%    │              │              │ ▓▓▓▓▓░░░░░   │          │
│ │              │              │              │              │          │
│ └──────────────┴──────────────┴──────────────┴──────────────┘          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Styling:
- Card with coral-100 background (subtle highlight)
- Border: coral-300
- Grid: 4 columns on desktop, 2x2 on mobile
- Icons: TrendingUp for rank, Activity for count, TrendingUp/Down for change, Award for badge
- Progress bar: coral-500 fill
```

### 4. Top Performers Showcase
```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Top Performers                                   │
│                                                                         │
│         ┌──────────┐      ┌──────────┐      ┌──────────┐               │
│         │  🥈      │      │  👑 🥇   │      │  🥉      │               │
│         │          │      │          │      │          │               │
│         │   [LT]   │      │   [SJ]   │      │   [MC]   │               │
│         │          │      │          │      │          │               │
│         │lisa.taylor      │sarah.jones      │mike.chen │               │
│         │          │      │          │      │          │               │
│         │    75    │      │    75    │      │    20    │               │
│         │activities│      │activities│      │activities│               │
│         │          │      │          │      │          │               │
│         │  ↑ 5     │      │  →       │      │  ↓ 2     │               │
│         │          │      │          │      │          │               │
│         └──────────┘      └──────────┘      └──────────┘               │
│            #2                 #1                #3                      │
│                                                                         │
│         [Silver Tier]    [Gold Tier]      [Bronze Tier]                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Features:
- Center #1 position (larger), #2 left, #3 right
- Medal emoji/icons above avatars
- Avatar with initials or profile photo (96px for #1, 80px for #2/#3)
- Large activity count (text-4xl for #1, text-3xl for #2/#3)
- Rank change indicators (↑↓→)
- Tier badges below cards
- Trophy emoji for #1
- Animated entrance (fade + slide up)
- Hover effect: subtle scale and shadow increase
```

### 5. Leaderboard Rankings Table (Positions 4+)
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Rank    Participant                          Activities    Change     │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                         │
│   4      [JD] John Doe                             18        ↑ 2       │
│          john.doe@example.com                                          │
│          ▓▓▓▓▓▓▓░░░░░░░░ 24% of top                                   │
│                                                             🏆          │
│                                                                         │
│   5      [AS] Alice Smith                          15        →         │
│          alice.smith@example.com                                       │
│          ▓▓▓▓▓▓░░░░░░░░░ 20% of top                                   │
│                                                                         │
│   6      [BJ] Bob Johnson                          12        ↓ 1       │
│          bob.johnson@example.com                                       │
│          ▓▓▓▓░░░░░░░░░░░ 16% of top                                   │
│          🎯🎯                                                           │
│                                                                         │
│   ...                                                                  │
│                                                                         │
│   12     [YO] You (Private)                         8        ↑ 3       │
│          Privacy enabled - only you can see this                       │
│          ▓▓░░░░░░░░░░░░░ 10% of top                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Components per row:
- Rank number (bold, text-lg)
- Avatar (40px circle)
- Name (text-base, font-semibold)
- Email (text-sm, text-muted-foreground)
- Progress bar (relative to top performer, full width)
- Activity count (text-lg, right-aligned)
- Rank change (icon + number, colored: green ↑, red ↓, gray →)
- Badge icons (milestone badges: 🏆 10, 🎯 25, ⭐ 50, 💎 100)
- Privacy indicator for opted-out users (italic text)

Styling:
- Alternating row backgrounds (transparent / slate-50)
- Hover: bg-slate-100
- Current user row: bg-coral-50, border-l-4 border-coral-500
- Opted-out rows: reduced opacity (0.7), italic name
- Smooth transitions on hover
- Color coding:
  - Top 10%: border-l-4 border-amber-400 (gold)
  - Top 25%: border-l-4 border-slate-400 (silver)
  - Top 50%: border-l-4 border-amber-700 (bronze)
```

### 6. Workspace Statistics
```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  Workspace Statistics                                                   │
│                                                                         │
│  ┌──────────────┬──────────────┬──────────────┬──────────────┐         │
│  │              │              │              │              │         │
│  │ 👑           │ 📊           │ 👥           │ 🔒           │         │
│  │              │              │              │              │         │
│  │ Top          │ Average      │ Participants │ Hidden       │         │
│  │              │              │              │              │         │
│  │    75        │    40        │      15      │      3       │         │
│  │ activities   │ activities   │    active    │  by choice   │         │
│  │              │              │              │              │         │
│  └──────────────┴──────────────┴──────────────┴──────────────┘         │
│                                                                         │
│  Last updated: 2 minutes ago                                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

Features:
- Grid: 4 columns on desktop, 2x2 on mobile
- Icons: Crown, BarChart, Users, Lock
- Light background (slate-50)
- Border: slate-200
- Timestamp: text-sm, text-muted-foreground
- Auto-refresh indicator when data updates
```

## Mobile Responsive Layout (< 768px)

### Mobile Adjustments
```
┌──────────────────────────┐
│ Header (collapsed)       │
├──────────────────────────┤
│ Page Title               │
│                          │
│ [All Time ▾]             │
│ [All Challenges ▾]       │
├──────────────────────────┤
│ Your Stats (2x2 grid)    │
│ ┌──────┬──────┐          │
│ │ Rank │ Acts │          │
│ ├──────┼──────┤          │
│ │Change│Badge │          │
│ └──────┴──────┘          │
├──────────────────────────┤
│ Top 3 (Vertical Stack)   │
│                          │
│ ┌────────────────┐       │
│ │ #1 👑          │       │
│ │ [Avatar]       │       │
│ │ 75 activities  │       │
│ └────────────────┘       │
│                          │
│ ┌──────┬──────┐          │
│ │ #2 🥈│ #3 🥉│          │
│ └──────┴──────┘          │
├──────────────────────────┤
│ Rankings (Compact)       │
│                          │
│ 4 [Avatar] John D   18 ↑ │
│   ▓▓▓▓░░░░░ 24%         │
│                          │
│ 5 [Avatar] Alice S  15 → │
│   ▓▓▓▓░░░░░ 20%         │
│                          │
├──────────────────────────┤
│ Stats (2x2 grid)         │
│ ┌──────┬──────┐          │
│ │ Top  │ Avg  │          │
│ │ 75   │ 40   │          │
│ ├──────┼──────┤          │
│ │ Part │Hidden│          │
│ │ 15   │ 3    │          │
│ └──────┴──────┘          │
└──────────────────────────┘

Breakpoints:
- < 640px: Stack everything, single column
- 640-768px: Two columns where possible
- > 768px: Full desktop layout
```

## Component Specifications

### Color Palette
```typescript
const leaderboardColors = {
  // Rankings
  gold: 'text-amber-400 border-amber-400 bg-amber-50',
  silver: 'text-slate-400 border-slate-400 bg-slate-50',
  bronze: 'text-amber-700 border-amber-700 bg-amber-50',

  // Rank changes
  rankUp: 'text-green-600',
  rankDown: 'text-red-600',
  rankSame: 'text-slate-400',

  // Current user highlight
  currentUser: 'bg-coral-50 border-l-4 border-coral-500',

  // Stats cards
  statsBackground: 'bg-slate-50 border-slate-200',

  // Progress bars
  progressFill: 'bg-coral-500',
  progressBackground: 'bg-slate-200',
}
```

### Typography Scale
```typescript
const typography = {
  pageTitle: 'text-3xl font-bold text-slate-900',
  sectionTitle: 'text-xl font-semibold text-slate-800',
  rankNumber: 'text-lg font-bold text-slate-700',
  userName: 'text-base font-semibold text-slate-900',
  userEmail: 'text-sm text-slate-500',
  activityCount: 'text-lg font-medium text-slate-900',
  statLabel: 'text-sm text-slate-600',
  statValue: 'text-2xl font-bold text-slate-900',
}
```

### Spacing & Layout
```typescript
const spacing = {
  pageContainer: 'max-w-7xl mx-auto px-4 py-8',
  sectionGap: 'space-y-8',
  cardPadding: 'p-6',
  cardGap: 'gap-6',
  gridCols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
}
```

### Animation Specs
```typescript
const animations = {
  // Rank change pulse
  rankChange: 'animate-pulse duration-1000',

  // New achievement badge bounce
  badgeUnlock: 'animate-bounce duration-500',

  // Top 3 entrance
  topPerformerEntrance: 'animate-fade-in-up duration-800',

  // Row hover
  rowHover: 'transition-all duration-200 hover:scale-[1.02] hover:shadow-md',

  // Tab switch
  tabSwitch: 'transition-colors duration-300',
}
```

## Interactive States

### Tab States (Time Period)
```
Default: bg-transparent text-slate-600
Hover:   bg-slate-100 text-slate-900
Active:  bg-white text-coral-600 border-b-2 border-coral-600
```

### Challenge Dropdown States
```
Default: border-slate-300
Hover:   border-slate-400
Focus:   border-coral-500 ring-2 ring-coral-200
Open:    border-coral-500
```

### Ranking Row States
```
Default:      bg-white (odd) / bg-slate-50 (even)
Hover:        bg-slate-100 scale-[1.02] shadow-md
Current User: bg-coral-50 border-l-4 border-coral-500 (persistent)
Private:      opacity-70 italic
```

### Medal/Badge Hover
```
Default: scale-100 opacity-100
Hover:   scale-110 opacity-100 + tooltip
Tooltip: "Gold Medal - 1st Place" / "🏆 10 Activities Badge"
```

## Accessibility Considerations

### ARIA Labels
```html
<main aria-label="Workspace Leaderboard">
  <section aria-label="Time period filter">
    <div role="tablist">
      <button role="tab" aria-selected="true">All Time</button>
      <button role="tab" aria-selected="false">This Month</button>
    </div>
  </section>

  <section aria-label="Your performance statistics">
    <div role="status" aria-live="polite">Your rank: 2</div>
  </section>

  <section aria-label="Top performers">
    <div role="list">
      <div role="listitem" aria-label="1st place: sarah.jones with 75 activities"></div>
    </div>
  </section>

  <table aria-label="Leaderboard rankings">
    <caption class="sr-only">Complete leaderboard showing all participants</caption>
  </table>
</main>
```

### Keyboard Navigation
- Tab order: Filters → Your Stats → Top 3 → Rankings → Stats
- Enter/Space: Activate tabs and dropdowns
- Arrow keys: Navigate within tabs and select options
- Escape: Close dropdowns
- Focus indicators: 2px coral-500 ring

### Screen Reader Support
- Announce rank changes: "Your rank increased by 1 position"
- Announce filter changes: "Showing leaderboard for This Week"
- Announce challenge filter: "Filtered by Save Water Challenge"
- Status updates: aria-live="polite" for live stats

## Empty States

### No Data State
```
┌─────────────────────────────────────────────────┐
│                                                 │
│              📊                                 │
│                                                 │
│      No leaderboard data yet                    │
│                                                 │
│   Activities will appear here once participants │
│   complete challenges in this workspace.        │
│                                                 │
│   [ Get Started with Challenges ]               │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Privacy Opt-Out State (Self)
```
┌─────────────────────────────────────────────────┐
│                                                 │
│              🔒                                 │
│                                                 │
│      You're hidden from the leaderboard         │
│                                                 │
│   Your privacy settings hide you from public    │
│   rankings. You can still see your own stats.   │
│                                                 │
│   Your Rank: #5 (visible only to you)          │
│   Activities: 25                                │
│                                                 │
│   [ Change Privacy Settings ]                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

### No Results (Filtered)
```
┌─────────────────────────────────────────────────┐
│                                                 │
│              🔍                                 │
│                                                 │
│    No participants found for this filter        │
│                                                 │
│   Try selecting a different time period or      │
│   challenge to see rankings.                    │
│                                                 │
│   [ Reset Filters ]                             │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Loading States

### Skeleton Loader
```
┌─────────────────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                                │ Title
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                         │ Subtitle
│                                                 │
│ ┌──────┬──────┬──────┬──────┐                   │ Tabs
│ │▓▓▓▓▓▓│▓▓▓▓▓▓│▓▓▓▓▓▓│▓▓▓▓▓▓│                   │
│ └──────┴──────┴──────┴──────┘                   │
│                                                 │
│ ┌────────────────────────────────┐              │ Your Stats
│ │ ▓▓▓▓▓▓  ▓▓▓▓▓▓  ▓▓▓▓▓▓  ▓▓▓▓▓▓ │              │
│ └────────────────────────────────┘              │
│                                                 │
│ ┌──────────────────────────────────┐            │ Top 3
│ │   ▓▓▓    ▓▓▓    ▓▓▓               │            │
│ │  ▓▓▓▓▓  ▓▓▓▓▓  ▓▓▓▓▓              │            │
│ └──────────────────────────────────┘            │
│                                                 │
│ ▓ ▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓ ▓▓▓▓              │ Rows
│ ▓ ▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓ ▓▓▓▓              │
│ ▓ ▓▓▓ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ ▓▓▓ ▓▓▓▓              │
└─────────────────────────────────────────────────┘

Animation: shimmer effect, pulse, duration-1500ms
```

## Page Performance Targets

- Initial page load: < 500ms
- Filter switch: < 300ms (with cache)
- Scroll smoothness: 60fps
- Tab transition: < 200ms
- Skeleton → content: < 100ms fade-in

## Component File Structure
```
src/app/w/[slug]/participant/leaderboard/
├── page.tsx                          # Main page component
├── components/
│   ├── leaderboard-header.tsx        # Title + filters
│   ├── time-period-tabs.tsx          # Time filter tabs
│   ├── challenge-filter.tsx          # Challenge dropdown
│   ├── your-stats-card.tsx           # Personal performance
│   ├── top-performers.tsx            # Top 3 showcase
│   ├── leaderboard-table.tsx         # Rankings table
│   ├── ranking-row.tsx               # Individual row
│   ├── workspace-stats.tsx           # Bottom stats cards
│   ├── medal-badge.tsx               # Visual medals/badges
│   ├── rank-change-indicator.tsx    # ↑↓→ indicators
│   ├── progress-bar.tsx              # Relative progress
│   └── avatar.tsx                    # User avatar
└── hooks/
    ├── use-leaderboard-data.tsx      # Data fetching
    └── use-leaderboard-filters.tsx   # Filter state management
```

## Implementation Notes

1. **Progressive Enhancement**: Core functionality works without JS, visual enhancements layer on top
2. **Caching Strategy**: Cache per filter combination (period × challenge) with 5-min TTL
3. **Optimistic Updates**: Show skeleton immediately on filter change, swap when data ready
4. **Real-time Updates**: Poll every 60 seconds when page is active, pause when hidden
5. **Privacy**: Always filter opted-out users before sending data to client
6. **Performance**: Virtual scrolling for leaderboards with 100+ participants
7. **Internationalization**: Prepare for i18n with date/number formatters
8. **Analytics**: Track filter usage, engagement time, most-viewed periods

## Next Steps

1. Create wireframes in Figma (optional)
2. Build components in Storybook (optional)
3. Implement base layout with static data
4. Add filter functionality
5. Connect to real API
6. Add visual enhancements
7. Polish animations and interactions
8. Accessibility audit
9. Performance optimization
10. User testing
