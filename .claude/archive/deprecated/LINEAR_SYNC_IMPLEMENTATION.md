# Task Master ↔ Linear Sync Implementation Plan

## Overview

This document outlines the implementation plan for bidirectional synchronization between Task Master (local development planning) and Linear (team collaboration and visibility).

## Current State

### Task Master (Local)
- **Total Tasks**: 29 tasks (26 pending, 3 in-progress)
- **Subtasks**: 92 total (4 completed, 88 pending)
- **Completion**: 4% overall
- **Purpose**: Granular development planning and execution tracking

### Linear (Team)
- **Project**: Changemaker App (ID: `4d9bf4fd-8055-4dc7-8316-3b3f22931208`)
- **Team**: ADR Product Team (ID: `afb2af24-c013-4872-979f-ffec28daef3d`)
- **Total Issues**: 18 active issues (mostly in Backlog)
- **Purpose**: Team visibility, milestone tracking, high-level feature planning

## Implementation Strategy

### Phase 1: Core Sync Script

**Create**: `scripts/sync-linear.ts`

**Key Features**:
1. Read Task Master tasks from `.taskmaster/tasks/tasks.json`
2. Connect to Linear API using `@linear/sdk`
3. Map Task Master tasks → Linear issues
4. Update Linear issue status based on task status
5. Add comments for completed subtasks
6. Update issue descriptions with progress

**Status Mapping**:
```
Task Master → Linear
pending → Backlog
in-progress → In Progress
done → Done
blocked → Blocked
deferred → Backlog (with label)
cancelled → Canceled
```

**Dependencies**:
```bash
pnpm install @linear/sdk tsx
```

### Phase 2: Mapping System

**Create**: `.taskmaster/sync-mappings.json`

**Structure**:
```json
{
  "mappings": {
    "10": {
      "linearIssueId": "uuid-here",
      "linearIdentifier": "ADR-5",
      "lastSyncedAt": "2025-10-27T10:00:00Z",
      "lastSyncedStatus": "in-progress",
      "subtasksSynced": ["10.1", "10.2"]
    }
  },
  "unmappedLinearIssues": [],
  "unmappedTaskMasterTasks": []
}
```

### Phase 3: CLI Commands

Add to `package.json`:
```json
{
  "scripts": {
    "sync:linear": "tsx scripts/sync-linear.ts",
    "sync:linear:init": "tsx scripts/sync-linear.ts --init",
    "sync:linear:dry-run": "tsx scripts/sync-linear.ts --dry-run",
    "sync:linear:report": "tsx scripts/sync-linear.ts --report"
  }
}
```

### Phase 4: GitHub Actions Automation

**Create**: `.github/workflows/sync-linear.yml`

**Triggers**:
- On push to `.taskmaster/tasks/tasks.json`
- Manual workflow dispatch
- Scheduled (optional: every 6 hours)

**Actions**:
1. Detect changes in tasks.json
2. Run sync script with LINEAR_API_KEY from secrets
3. Commit updated mappings back to repo
4. Post summary to workflow run

### Phase 5: Documentation

**Create**:
- `.taskmaster/docs/LINEAR_SYNC_STRATEGY.md` - Overall architecture and philosophy
- `.taskmaster/docs/LINEAR_SYNC_USAGE.md` - User guide and common operations

## Sync Philosophy

**Key Principle**: Linear issues are living status reports of Task Master progress, not duplicated task lists.

### What Gets Synced (Task Master → Linear)

✅ **Always**:
- Task status changes → Linear issue status updates
- Subtask completions → Linear issue comments
- Implementation notes → Linear issue description updates
- Blockers identified → Linear issue labels/status

❌ **Never**:
- Individual subtask status changes (only completion)
- Task creation (must map manually or use `--init`)
- Task deletion (manual cleanup required in Linear)

### Sync Direction Priority

**Primary**: Task Master → Linear (developer work drives team visibility)
**Secondary**: Linear → Task Master (team creates issues, developer implements)

## Implementation Steps

### Step 1: Install Dependencies

```bash
pnpm install @linear/sdk tsx
```

### Step 2: Set Up Environment

Add to `.env.local`:
```bash
LINEAR_API_KEY=lin_api_your_key_here
```

Get API key from: https://linear.app/settings/api

### Step 3: Create Sync Script

Copy the sync script implementation (see reference implementation in git history or request regeneration).

**Core Functions**:
- `loadTaskMasterTasks()` - Read tasks.json
- `loadSyncMappings()` - Read mappings.json
- `mapTaskMasterToLinearStatus()` - Status translation
- `formatLinearDescription()` - Generate issue descriptions
- `syncTask()` - Main sync logic per task
- `initializeMapping()` - Initial setup with fuzzy matching

### Step 4: Initialize Mappings

```bash
pnpm sync:linear:init
```

This performs:
1. Fetch all Linear issues from Changemaker App project
2. Fetch all Task Master tasks
3. Auto-map similar titles using Levenshtein distance
4. Prompt for manual confirmation/adjustment
5. Store in `.taskmaster/sync-mappings.json`

### Step 5: Test Sync

```bash
# Preview changes without making them
pnpm sync:linear:dry-run

# Perform actual sync
pnpm sync:linear

# Generate report
pnpm sync:linear:report
```

### Step 6: Set Up GitHub Actions

1. Add `LINEAR_API_KEY` to GitHub repository secrets
2. Create `.github/workflows/sync-linear.yml`
3. Test with manual workflow dispatch
4. Enable automatic sync on push

### Step 7: Daily Workflow Integration

After completing Task Master subtasks:
```bash
task-master set-status --id=10.1 --status=done
task-master update-subtask --id=10.1 --prompt="Implementation notes"
pnpm sync:linear
```

Optional: Set up post-commit hook:
```bash
# .git/hooks/post-commit
#!/bin/bash
if git diff HEAD~1 --name-only | grep -q ".taskmaster/tasks/tasks.json"; then
  pnpm sync:linear
fi
```

## Linear Issue Description Template

When syncing, use this format:

```markdown
## Overview
{task.description}

## Implementation Details
{task.details}

## Progress Tracking
- Total Subtasks: {count}
- Completed: {completedCount}
- Pending: {pendingCount}

### Completed Subtasks
- [x] Subtask 1
- [x] Subtask 2

### Pending Subtasks
- [ ] Subtask 3
- [ ] Subtask 4

## Dependencies
- Task #X
- Task #Y

## Test Strategy
{task.testStrategy}

---
*🤖 Auto-synced from Task Master on {timestamp}*
```

## Example Workflow

### Developer (Jack) Workflow

```bash
# Morning: Check next task
task-master next
# Output: Task #10 - Test PointTransaction Model Integration

# Start work
task-master set-status --id=10 --status=in-progress

# Complete first subtask
task-master set-status --id=10.1 --status=done
task-master update-subtask --id=10.1 --prompt="Verified Prisma migrations, all FK constraints working"

# Sync to Linear (team sees progress)
pnpm sync:linear
# Result: ADR-5 status → "In Progress", new comment added

# Complete more subtasks...
task-master set-status --id=10.2 --status=done

# Final sync when all done
task-master set-status --id=10 --status=done
pnpm sync:linear
# Result: ADR-5 status → "Done", full progress shown
```

### Team Member Workflow

1. Team member creates new Linear issue "ADR-26: New Feature Request"
2. Sync detects unmapped issue: `pnpm sync:linear:report`
3. Developer creates Task Master task:
   ```bash
   task-master add-task --prompt="Implementation for ADR-26: New Feature"
   ```
4. Manually map in `.taskmaster/sync-mappings.json`
5. Sync establishes connection

## Error Handling

### Unmapped Tasks

**Problem**: Task has no Linear issue mapping

**Solution**:
```bash
# Check unmapped items
pnpm sync:linear:report

# Auto-map with fuzzy matching
pnpm sync:linear:init

# Or manually add to sync-mappings.json
```

### Status Conflicts

**Problem**: Linear shows "Done" but Task Master shows "in-progress"

**Solution**:
```bash
# Review conflict
pnpm sync:linear:report

# Update Task Master if Linear is correct
task-master set-status --id=10 --status=done

# Or force Task Master status to Linear
pnpm sync:linear --force-status --id=10
```

### Duplicate Subtask Comments

**Problem**: Same subtask creates multiple Linear comments

**Solution**: Ensure `subtasksSynced` array in mappings tracks completed subtasks correctly.

## Monitoring

### Sync Logs

Location: `.taskmaster/logs/sync.log`

Format:
```
2025-10-27 10:30:15 - [INFO] Starting sync operation
2025-10-27 10:30:17 - [SUCCESS] Updated ADR-5 status: in-progress → done
2025-10-27 10:30:18 - [SUCCESS] Added comment to ADR-5: Subtask 10.1 completed
2025-10-27 10:30:19 - [WARNING] No Linear mapping for Task 15
2025-10-27 10:30:20 - [INFO] Sync completed successfully
```

### Metrics Tracking

Location: `.taskmaster/sync-metrics.json`

Track:
- Total syncs performed
- Success/failure rates
- Average sync duration
- Tasks/issues updated
- Conflicts detected/resolved

## Best Practices

### For Developers

1. **Work in Task Master First**: Create detailed tasks/subtasks locally
2. **Sync Frequently**: After each significant subtask completion
3. **Use Meaningful Subtask Titles**: They become Linear comments
4. **Add Implementation Notes**: Use `update-subtask` to add details
5. **Review Reports Weekly**: Check for unmapped items

### For Team Members

1. **Check Linear for Status**: Don't expect granular subtask details
2. **Create New Linear Issues**: Prompt Task Master task creation
3. **Add Comments for Questions**: Developer will see and respond
4. **Use Labels**: e.g., "needs-review", "blocked-by-design"
5. **Avoid Manual Status Updates**: Task Master is source of truth

## Security Considerations

1. **API Key Protection**:
   - Never commit LINEAR_API_KEY to git
   - Use `.env.local` for local development
   - Use GitHub Secrets for CI/CD

2. **Mapping File**:
   - `.taskmaster/sync-mappings.json` should be in git
   - Contains only public issue IDs, no sensitive data

3. **Permissions**:
   - Linear API key needs project write access
   - GitHub Actions requires repository secrets access

## Future Enhancements

### Phase 6: Advanced Features (Optional)

1. **Real-time Sync**: WebSocket-based bidirectional sync
2. **Conflict Resolution**: ML-based automatic conflict resolution
3. **Team Notifications**: Slack/Discord integration
4. **Analytics Dashboard**: Web UI for sync health monitoring
5. **Bulk Operations**: Sync entire milestones at once
6. **Reverse Sync**: Linear → Task Master PRD generation

### Phase 7: Integration Improvements

1. **Task Master MCP Tool**: Create Linear sync MCP server
2. **Claude Code Integration**: Sync via slash command
3. **PR Templates**: Auto-reference synced Linear issues
4. **Status Webhooks**: Linear webhook listener for instant updates

## Implementation Checklist

- [ ] Install dependencies (@linear/sdk, tsx)
- [ ] Set up LINEAR_API_KEY in .env.local
- [ ] Create `scripts/sync-linear.ts`
- [ ] Add npm scripts to package.json
- [ ] Run initial mapping: `pnpm sync:linear:init`
- [ ] Test dry-run: `pnpm sync:linear:dry-run`
- [ ] Perform first sync: `pnpm sync:linear`
- [ ] Verify Linear issues updated correctly
- [ ] Add LINEAR_API_KEY to GitHub secrets
- [ ] Create `.github/workflows/sync-linear.yml`
- [ ] Test GitHub Actions workflow
- [ ] Create documentation files
- [ ] Set up post-commit hook (optional)
- [ ] Train team on workflow
- [ ] Monitor sync logs for issues

## Support & References

- **Linear SDK**: https://developers.linear.app/docs/sdk/getting-started
- **Linear API**: https://studio.apollographql.com/public/Linear-API/variant/current/home
- **Task Master Docs**: `.taskmaster/CLAUDE.md`
- **Project Context**: `CLAUDE.md`

---

**Status**: Ready for Implementation
**Priority**: Medium (separate PR after current feature work)
**Estimated Effort**: 4-6 hours
**Owner**: Jack Felke
**Created**: 2025-10-27
