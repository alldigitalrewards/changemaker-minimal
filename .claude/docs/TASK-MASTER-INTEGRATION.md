# Task Master Integration Guide

## Overview

Task Master AI is fully integrated with the Changemaker project, managing 35 main tasks with 115 subtasks across two major initiatives:

1. **Manager Role & RewardSTACK Integration** (Tasks 42-61) - 20 tasks
2. **AI Email Template Editor** (Tasks 62-76) - 15 tasks

## Current Status

### Project Metrics
- **Total Tasks**: 35 main tasks
- **Total Subtasks**: 115 subtasks
- **Completion**: 0% (all pending - ready to start)
- **Priority Breakdown**:
  - High: 18 tasks
  - Medium: 13 tasks
  - Low: 4 tasks

### Complexity Analysis
- **Average Complexity**: 5.1/10
- **Most Complex Tasks**:
  - Task 42: Database Schema Migration (●7)
  - Task 43: RewardSTACK Authentication (●6)
  - Task 47: Participant Sync Service (●7)
  - Task 50: Webhook Handler (●6)
  - Task 51: Admin Reconciliation (●6)

### Dependency Structure
- **Tasks ready to start**: 2 (Tasks 42, 62)
- **Blocked by dependencies**: 33 tasks
- **Average dependencies per task**: 1.1

## Quick Start Workflows

### Option 1: Start RewardSTACK Integration

```bash
# View task details
task-master show 42

# View subtasks
task-master show 42

# Start work
task-master set-status --id=42 --status=in-progress

# View next subtask
task-master show 42.1

# Mark subtask complete
task-master set-status --id=42.1 --status=done

# Continue with remaining subtasks
task-master show 42.2
```

**Task 42 Subtasks:**
1. Design Prisma schema changes for RewardSTACK fields
2. Create migration file with rollback support
3. Test migration on staging database clone
4. Update TypeScript types and interfaces
5. Document schema changes in architecture docs

### Option 2: Start AI Email Editor

```bash
# View task details
task-master show 62

# Start work
task-master set-status --id=62 --status=in-progress

# Work through subtasks
task-master show 62.1  # Install AI SDK dependencies
task-master show 62.2  # Configure environment variables
task-master show 62.3  # Set up Monaco Editor and tooling
```

**Task 62 Subtasks:**
1. Install AI SDK dependencies (ai, @ai-sdk/anthropic)
2. Configure AI Gateway environment variables
3. Set up Monaco Editor and UI component libraries

### Option 3: View Overall Progress

```bash
# List all tasks
task-master list

# List by priority
task-master list --priority high

# List by status
task-master list --status pending

# View complexity report
task-master complexity-report

# View next available task
task-master next
```

## Task Categories

### Phase 1: Foundation (Tasks 42-47, 62-65)
**Focus**: Database schema, authentication, core infrastructure

**Key Tasks**:
- Task 42: Database Schema Migration (high, ●7)
- Task 43: RewardSTACK Authentication (high, ●6)
- Task 62: Project Dependencies Setup (high, ●5)
- Task 63: Email Template Schema (high, ●5)
- Task 64: AI SDK Configuration (high, ●5)
- Task 65: Split View Layout (high, ●5)

**Estimated Duration**: 2 weeks

### Phase 2: Core Features (Tasks 48-54, 66-70)
**Focus**: Reward issuance, API endpoints, UI components

**Key Tasks**:
- Task 48-49: Reward Issuance Logic (high, ●5 each)
- Task 50: Webhook Handler (high, ●6)
- Task 51: Admin Reconciliation Dashboard (medium, ●6)
- Task 66-67: HTML Editor & Preview (high, ●5 each)
- Task 68: Template CRUD API (high, ●5)

**Estimated Duration**: 2 weeks

### Phase 3: AI Integration (Tasks 71-76)
**Focus**: AI assist features, template management

**Key Tasks**:
- Task 71: AI Assist Hook (high, ●5)
- Task 72: AI Assist Panel (medium, ●5)
- Task 73: AI Workflow Integration (high, ●5)
- Task 74: Template Variables (medium, ●5)
- Task 75: Performance Optimization (medium, ●5)
- Task 76: Testing & Validation (high, ●5)

**Estimated Duration**: 2 weeks

### Phase 4: Polish & Production (Tasks 55-61)
**Focus**: Background jobs, monitoring, deployment

**Key Tasks**:
- Task 55: Automatic Retry Jobs (medium, ●5)
- Task 56: Performance Optimization (low, ●5)
- Task 57: Documentation (low, ●5)
- Task 59: E2E Testing (high, ●5)
- Task 60: Production Deployment (high, ●5)
- Task 61: Post-Deployment Monitoring (medium, ●5)

**Estimated Duration**: 1 week

## Parallel Development Strategy

### Track 1: RewardSTACK Integration
**Owner**: Backend Developer
**Focus**: API integration, webhooks, database

```bash
# Start with foundation
task-master set-status --id=42 --status=in-progress  # Schema migration
# Complete → Move to 43 → 47 → 48 → 49 → 50

# Branch point: Can work on 51-52 while Track 2 does 53-54
```

### Track 2: Email Template Editor
**Owner**: Frontend Developer
**Focus**: UI components, AI integration

```bash
# Start with dependencies
task-master set-status --id=62 --status=in-progress  # Dependencies
# Complete → Move to 65 → 66 → 67 → 68 → 69 → 70

# Then AI integration: 71 → 72 → 73 → 74 → 75 → 76
```

### Track 3: Admin UI & Participant Features
**Owner**: Full-Stack Developer
**Focus**: Dashboards, reconciliation, participant views

```bash
# After Track 1 completes tasks 42-50
task-master set-status --id=51 --status=in-progress  # Admin dashboard
# Complete → Move to 52 → 53 → 54

# Can work in parallel with Track 2's AI integration
```

## Integration with Claude Code

### Automatic Context Loading

This guide is automatically loaded when you start Claude Code. Task Master tasks are referenced throughout the codebase in:

- `.claude/plans/` - Roadmap documents
- `.claude/sessions/` - Implementation session logs
- `.taskmaster/tasks/` - Generated task files

### During Development

When implementing a task:

1. **Start Task**:
   ```bash
   task-master set-status --id=<id> --status=in-progress
   ```

2. **Work on Subtasks**:
   ```bash
   task-master show <id>.<subtask>
   ```

3. **Log Progress**:
   ```bash
   task-master update-subtask --id=<id>.<subtask> --prompt="implementation notes..."
   ```

4. **Complete Task**:
   ```bash
   task-master set-status --id=<id>.<subtask> --status=done
   task-master set-status --id=<id> --status=done  # When all subtasks done
   ```

5. **Create Session Log**:
   ```bash
   # Manual: Create .claude/sessions/session-YYYYMMDD-task-<id>-<description>.md
   # Document: Implementation approach, challenges, solutions
   ```

## Task Dependencies Graph

### Critical Path (Longest Chain)

```
42 → 43 → 44 → 46 → 47 → 48 → 49 → 50 → 51 → 52 → 55 → 57 → 59 → 60 → 61
└─ Schema  Auth   UI    Config  Sync  Pts   SKU  Hook  Admin Retry Docs  E2E  Deploy Monitor
   (●7)    (●6)   (●5)  (●5)   (●7)  (●5)  (●5) (●6)  (●6)  (●5)  (●5) (●5) (●5)   (●5)

Parallel Branch:
49 → 53 → 54
└─ SKU   SSO   Catalog
   (●5)  (●5)  (●5)
```

### AI Email Editor Path

```
62 → 63 → 68 → 69 → 70
└─ Deps  Schema API  Picker Page
   (●5)  (●5)   (●5) (●5)   (●5)

62 → 64 → 71 → 72 → 73 → 74 → 75 → 76
└─ Deps  AI    Hook  Panel Flow Vars Perf  Test
   (●5)  (●5)  (●5)  (●5)  (●5) (●5) (●5)  (●5)

62 → 65 → 66 → 67
└─ Deps  Layout Editor Preview
   (●5)  (●5)   (●5)   (●5)
```

## Cost Tracking

### Task Generation Costs
- Initial parse (Manager Role): $0.10
- Initial parse (AI Email): $0.07
- Complexity analysis: $0.05
- Expansion (35 tasks): ~$0.42
- **Total Generation Cost**: ~$0.64

### Ongoing Costs
- Task updates with AI: ~$0.01-0.03 per update
- Research-backed additions: ~$0.05-0.10 per task
- **Estimated Monthly**: $5-10 (active development)

## Best Practices

### When to Update Tasks

1. **Task Too Large**: If a task takes >1 day, expand further
   ```bash
   task-master expand --id=<id> --research
   ```

2. **Requirements Change**: Update task description
   ```bash
   task-master update-task --id=<id> --prompt="new requirements..."
   ```

3. **Blocked**: Add blocker information
   ```bash
   task-master update-task --id=<id> --prompt="blocked by: external API access needed"
   task-master set-status --id=<id> --status=blocked
   ```

4. **Implementation Notes**: Log learnings
   ```bash
   task-master update-subtask --id=<id>.<subtask> --prompt="used X approach because Y"
   ```

### When to Create New Tasks

```bash
# Discovered new requirement
task-master add-task --prompt="New requirement discovered during implementation" --research

# Add dependency if needed
task-master add-dependency --id=<new-task-id> --depends-on=<existing-task-id>
```

### When to Use Research Mode

Use `--research` flag when:
- Creating complex technical tasks
- Need industry best practices
- Uncertain about implementation approach
- Want comprehensive subtask breakdown

Skip `--research` when:
- Simple, well-understood tasks
- Budget-conscious
- Quick task additions

## Task Status Workflow

```
pending → in-progress → review → done
   ↓                      ↓
deferred             blocked
   ↓                      ↓
cancelled            pending (when unblocked)
```

### Status Definitions

- **pending**: Ready to work on, dependencies met
- **in-progress**: Currently being worked on (limit to 1-2 tasks)
- **review**: Implemented, needs validation/testing
- **done**: Completed and verified
- **blocked**: Cannot proceed (external dependency, question)
- **deferred**: Postponed to future sprint
- **cancelled**: No longer needed

## Validation & Quality Gates

### Before Marking Task as Done

✅ All subtasks completed
✅ Code tested (unit + integration)
✅ Documentation updated
✅ PR created and reviewed (if applicable)
✅ No regressions in test suite
✅ Session log created (for complex tasks)

### Phase Gates

**Gate 1** (After Task 47): Foundation complete
- Database schema migrated
- Authentication layer working
- Basic API endpoints functional

**Gate 2** (After Task 54): Core features complete
- Reward issuance working end-to-end
- Admin reconciliation functional
- Participant catalog access working

**Gate 3** (After Task 76): AI integration complete
- Email editor with AI assist functional
- Template management working
- Performance optimized

**Final Gate** (After Task 61): Production ready
- E2E tests passing
- Monitoring configured
- Deployment successful

## Troubleshooting

### Task Master Commands Not Working

```bash
# Update to latest version
npm update -g task-master-ai

# Verify installation
task-master --version

# Check config
cat .taskmaster/config.json
```

### Missing Dependencies

```bash
# Validate dependency chain
task-master validate-dependencies

# Fix broken dependencies
task-master fix-dependencies
```

### Task Sync Issues

```bash
# Regenerate task files
task-master generate

# View task JSON directly
cat .taskmaster/tasks/tasks.json | jq '.tasks[] | select(.id == "42")'
```

## Integration with Git Workflow

### Commit Messages

```bash
git commit -m "feat: implement task 42.1 - database schema changes

- Add RewardSTACK integration fields
- Create participant sync tracking
- Update TypeScript types

Task-Master: 42.1"
```

### Branch Naming

```bash
# Feature branches
git checkout -b task/42-rewardstack-schema
git checkout -b task/62-ai-email-dependencies

# Bug fixes discovered during tasks
git checkout -b fix/task-42-migration-rollback
```

### PR Integration

```markdown
## Task Reference

Implements: Task 42 - Database Schema Migration for RewardSTACK Integration

Subtasks completed:
- [x] 42.1 - Design Prisma schema changes
- [x] 42.2 - Create migration with rollback
- [x] 42.3 - Test on staging clone
- [x] 42.4 - Update TypeScript types
- [x] 42.5 - Document schema changes

## Testing

- Migration tested on staging clone (no data loss)
- Rollback tested successfully
- All existing tests passing (58/58)
```

## Reporting & Analytics

### Weekly Progress Report

```bash
# Generate weekly summary
task-master list --status done > weekly-progress.txt

# View completion rate
task-master list | grep "Progress:"

# View velocity (tasks per week)
git log --since="1 week ago" --grep="Task-Master" --oneline | wc -l
```

### Burndown Tracking

Track in `.claude/PROGRESS.md`:

```markdown
## Week 1 (Jan 1-7)
- Completed: Tasks 42, 43, 44 (15% of total)
- In Progress: Task 45, 62
- Blocked: None
- Velocity: 3 tasks/week
```

## Advanced Features

### Task Tag System

All 35 tasks have been tagged with a comprehensive labeling system. For complete documentation, see [TASK-MASTER-TAGS.md](.claude/docs/TASK-MASTER-TAGS.md).

**Quick Tag Reference:**

Feature Areas:
- `rewardstack` - Tasks 42-61 (Manager Role & RewardSTACK Integration)
- `ai-email` - Tasks 62-76 (AI Email Template Editor)

Component Types:
- `database`, `prisma` - Database and schema tasks
- `api`, `webhooks` - API development
- `ui`, `admin`, `participant` - User interface
- `ai`, `hooks`, `prompts` - AI integration
- `testing`, `e2e`, `validation` - Testing tasks

Phases:
- `phase-1` - Foundation (Tasks 42-47, 62-65)
- `phase-2` - Core Features (Tasks 48-52, 66-70)
- `phase-3` - Advanced Features (Tasks 53-58, 71-75)
- `phase-4` - Production (Tasks 59-61, 76)

**View Tags:**
```bash
# View all tags for a task
task-master show 42
# Shows: Tags: rewardstack, database, prisma, phase-1

# Filter tasks by tag (using grep)
task-master list | grep -A 2 "rewardstack"
task-master list | grep -A 2 "phase-1"
task-master list | grep -A 2 "ai-email"
```

### Task Complexity Trends

```bash
# View complexity report
task-master complexity-report

# Analyze by phase
# Phase 1 avg: 5.8
# Phase 2 avg: 5.4
# Phase 3 avg: 5.0
# Phase 4 avg: 5.0
```

### Parallel Task Execution

Use multiple terminal sessions or worktrees:

```bash
# Terminal 1: RewardSTACK track
cd ~/Projects/changemaker-template
task-master set-status --id=42 --status=in-progress

# Terminal 2: AI Email track
cd ~/Projects/changemaker-template
task-master set-status --id=62 --status=in-progress
```

---

**Last Updated**: 2025-01-30
**Task Master Version**: 0.30.2
**Total Investment**: $0.64 in AI-powered task generation
**Expected ROI**: 40+ hours saved in planning and coordination
