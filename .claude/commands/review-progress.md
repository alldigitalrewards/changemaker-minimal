# Review Implementation Progress

Review the current state of the Manager Role & RewardSTACK Integration implementation, showing what's been completed and what's next.

## Steps

1. **Read `.claude/PROGRESS.md`** and extract:
   - Phase overview table (4 phases with completion percentages)
   - Completed tasks (all with ✅)
   - In-progress tasks (if any)
   - Next pending task
   - Recent daily standup notes (last 3 days)

2. **Calculate current metrics**:
   - Total tasks completed: X/60 (X%)
   - Total hours logged: X/151h (X%)
   - Current phase: Phase N (In Progress/Complete)
   - Current velocity: X tasks/day (if >3 days of data)

3. **Check gate status**:
   - Gate 1 (Foundation): Not Started / In Progress / Complete
   - Gate 2 (Manager MVP): Not Started / Blocked / In Progress / Complete
   - Gate 3 (RewardSTACK): Not Started / Blocked / In Progress / Complete
   - Gate 4 (Production): Not Started / Blocked / In Progress / Complete

4. **Review recent sessions**:
   - List files in `.claude/sessions/` sorted by date
   - Show last 3 session files created
   - Extract task numbers from filenames

5. **Identify blockers** (if any):
   - Check Risk Register in PROGRESS.md
   - Look for tasks marked as blocked
   - Show critical path tasks not yet started

6. **Display summary** in this format:

```markdown
# 📊 Implementation Progress Report

**Generated**: [Current Date & Time]

## Overall Status
- **Tasks Completed**: X/60 (X%)
- **Hours Logged**: X/151h (X%)
- **Current Phase**: Phase N - [Name]
- **Velocity**: X tasks/day (last 7 days)

## Phase Breakdown
| Phase | Status | Progress | Hours |
|-------|--------|----------|-------|
| Phase 1: Foundation | [Status] | X/15 (X%) | X/26h |
| Phase 2: Manager | [Status] | X/15 (X%) | X/56.5h |
| Phase 3: RewardSTACK | [Status] | X/15 (X%) | X/49h |
| Phase 4: Polish | [Status] | X/15 (X%) | X/43.5h |

## Recently Completed ✅
- Task X: [Name] - [Date]
- Task Y: [Name] - [Date]
- Task Z: [Name] - [Date]

## Current Work 🔨
- Task N: [Name] - In Progress

## Next Up ⏭️
- Task N+1: [Name]
  - Dependencies: [Complete ✅ / Waiting on Task X 🔴]
  - Estimated: [X] hours

## Gate Status 🚦
- [x] Gate 1: Foundation - Complete
- [ ] Gate 2: Manager MVP - Blocked on Task X
- [ ] Gate 3: RewardSTACK - Not Started
- [ ] Gate 4: Production - Not Started

## Recent Sessions
1. session-20251021-task-01-schema-design.md
2. session-20251021-task-02-migration-generation.md
3. session-20251022-task-03-migration-testing.md

## Blockers 🚧
[List any blockers from Risk Register or task notes]

## Recommendations
- [Next action based on current state]
- [Suggestion for parallel work if applicable]
- [Warning if falling behind schedule]
```

7. **Add context-aware recommendations**:
   - If Phase 1 complete: "✅ Ready to start Phase 2 & 3 in parallel!"
   - If approaching gate: "📋 Review gate criteria - X/Y criteria met"
   - If velocity slow: "⚠️ Velocity: X tasks/day (target: Y tasks/day for on-time delivery)"
   - If ahead of schedule: "🚀 Ahead of schedule by X days!"

## Output

Present a comprehensive but scannable progress report showing:
1. Where we are (tasks, hours, phase)
2. What we've done (recent completions)
3. What's next (upcoming tasks)
4. Any issues (blockers, risks)
5. Actionable recommendations
