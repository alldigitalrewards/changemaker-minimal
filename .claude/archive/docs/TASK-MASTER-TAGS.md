# Task Master Tag System

## Overview

All 35 Task Master tasks (42-76) have been tagged with a comprehensive labeling system to enable efficient filtering, organization, and tracking. Tags are embedded in each task's implementation details and can be used for filtering with Task Master commands.

## Tag Categories

### 1. Feature Area Tags

**RewardSTACK Integration (Tasks 42-61)**
- `rewardstack` - All tasks related to the Manager Role & RewardSTACK integration feature

**AI Email Editor (Tasks 62-76)**
- `ai-email` - All tasks related to the AI Email Template Editor feature

### 2. Component Type Tags

**Database & Schema**
- `database` - Database schema changes and migrations (Tasks 42, 63)
- `prisma` - Prisma ORM-related tasks

**Authentication & Authorization**
- `auth` - Authentication and authorization tasks (Task 43)
- `sso` - Single sign-on integration (Task 53)

**API Development**
- `api` - API routes and endpoints (Tasks 43, 45, 46, 47, 50, 52, 68)
- `webhooks` - Webhook handlers (Task 50)
- `config` - Configuration management (Tasks 46, 64)
- `crud` - CRUD operations (Task 68)

**User Interface**
- `ui` - UI components and pages (Tasks 44, 51, 54, 65-70, 72)
- `admin` - Admin-facing UI (Tasks 44, 51, 52, 58)
- `participant` - Participant-facing UI (Tasks 53, 54)
- `dashboard` - Dashboard views (Tasks 51, 54, 58)
- `editor` - Editor components (Task 66)
- `monaco` - Monaco Editor integration (Task 66)
- `preview` - Preview functionality (Task 67)
- `layout` - Layout components (Task 65)
- `management` - Management interfaces (Task 69)
- `settings` - Settings pages (Task 70)
- `panel` - Panel components (Task 72)

**AI Integration**
- `ai` - AI-powered features (Tasks 64, 71-73)
- `hooks` - AI integration hooks (Task 71)
- `prompts` - Prompt engineering (Task 71)
- `workflow` - AI workflow integration (Task 73)

**Backend Services**
- `sync` - Synchronization services (Tasks 47, 56)
- `rewards` - Reward issuance logic (Tasks 48, 49)
- `points` - Points-based rewards (Task 48)
- `sku` - SKU-based rewards (Task 49)
- `jobs` - Background jobs (Task 55)
- `retry` - Retry logic (Tasks 52, 55)

**Performance & Optimization**
- `performance` - Performance optimization (Tasks 56, 75)
- `caching` - Caching strategies (Task 56)
- `optimization` - General optimization (Task 75)

**Documentation & Testing**
- `docs` - Documentation (Task 57)
- `testing` - Testing tasks (Tasks 45, 59, 76)
- `e2e` - End-to-end testing (Task 59)
- `validation` - Validation logic (Task 76)

**Templates & Variables**
- `templates` - Template management (Task 74)
- `variables` - Template variables (Task 74)

**Deployment & Monitoring**
- `deployment` - Deployment tasks (Task 60)
- `production` - Production deployment (Task 60)
- `monitoring` - Monitoring and observability (Task 61)
- `stats` - Statistics and analytics (Task 58)

**Dependencies & Setup**
- `dependencies` - Dependency installation (Task 62)
- `setup` - Project setup (Task 62)

### 3. Phase Tags

**Phase 1: Foundation**
- `phase-1` - Core infrastructure and setup (Tasks 42-47, 62-65)
  - Database schema
  - Authentication
  - Core UI components
  - Project dependencies

**Phase 2: Core Features**
- `phase-2` - Main feature implementation (Tasks 48-52, 66-70)
  - Reward issuance
  - Webhooks
  - Admin dashboards
  - Editor and preview components
  - API endpoints

**Phase 3: Advanced Features**
- `phase-3` - AI integration and optimization (Tasks 53-58, 71-75)
  - AI assist features
  - Background jobs
  - Performance optimization
  - Template management
  - Participant features

**Phase 4: Production Readiness**
- `phase-4` - Testing and deployment (Tasks 59-61, 76)
  - E2E testing
  - Deployment
  - Monitoring
  - Validation

## GitHub Labels

In addition to Task Master tags, the following GitHub labels have been created:

### Project Labels
- `manager-role` - Manager Role & RewardSTACK integration project
- `ai-email-editor` - AI Email Template Editor project
- `task-audit-sync` - Task audit and sync system
- `taskmaster` - Task Master AI infrastructure

### Phase Labels
- `phase-1-foundation` - Foundation tasks
- `phase-2-core-features` - Core feature tasks
- `phase-3-advanced` - Advanced feature tasks
- `phase-4-production` - Production readiness tasks
- `phase-5-integration` - Integration tasks

### Task Master Metadata Labels
- `tm-complexity-low` - Low complexity tasks (≤4)
- `tm-complexity-medium` - Medium complexity tasks (5-6)
- `tm-complexity-high` - High complexity tasks (≥7)
- `tm-priority-low` - Low priority tasks
- `tm-priority-medium` - Medium priority tasks
- `tm-priority-high` - High priority tasks
- `tm-status-pending` - Pending tasks
- `tm-status-in-progress` - In-progress tasks
- `tm-status-review` - Tasks in review
- `tm-status-blocked` - Blocked tasks
- `tm-task-42-61` - Manager Role tasks (42-61)
- `tm-task-62-76` - AI Email Editor tasks (62-76)

## Using Tags for Filtering

### View All Tags for a Task

```bash
task-master show <task-id>
```

Example:
```bash
task-master show 42
# Shows: Tags: rewardstack, database, prisma, phase-1

task-master show 71
# Shows: Tags: ai-email, ai, hooks, prompts, phase-3
```

### Filter Tasks by Tag (Future Enhancement)

While Task Master doesn't currently have built-in tag filtering, you can use grep to filter tasks by tag:

```bash
# View all RewardSTACK tasks
task-master list | grep -A 2 "rewardstack"

# View all phase-1 tasks
task-master list | grep -A 2 "phase-1"

# View all AI-related tasks
task-master list | grep -A 2 "ai-email"

# View all database tasks
task-master list | grep -A 2 "database"

# View all API tasks
task-master list | grep -A 2 "api"
```

### View Tasks by Phase

```bash
# Phase 1 (Foundation)
# Tasks: 42-47, 62-65

# Phase 2 (Core Features)
# Tasks: 48-52, 66-70

# Phase 3 (Advanced Features)
# Tasks: 53-58, 71-75

# Phase 4 (Production)
# Tasks: 59-61, 76
```

### View Tasks by Feature Area

```bash
# RewardSTACK Integration
task-master show 42  # through task-master show 61

# AI Email Editor
task-master show 62  # through task-master show 76
```

## Tag Organization Matrix

| Task Range | Feature Area | Primary Tags | Phase |
|------------|--------------|--------------|-------|
| 42-47 | RewardSTACK | database, auth, api, sync | phase-1 |
| 48-52 | RewardSTACK | rewards, webhooks, admin | phase-2 |
| 53-58 | RewardSTACK | participant, jobs, performance, docs | phase-3 |
| 59-61 | RewardSTACK | testing, deployment, monitoring | phase-4 |
| 62-65 | AI Email | dependencies, database, ui, layout | phase-1 |
| 66-70 | AI Email | editor, preview, api, management | phase-2 |
| 71-75 | AI Email | ai, hooks, templates, performance | phase-3 |
| 76 | AI Email | testing, validation | phase-4 |

## Tag Usage Examples

### Find All Database Tasks
Tasks with `database` tag: 42, 63

### Find All Admin UI Tasks
Tasks with `admin` tag: 44, 51, 52, 58

### Find All Testing Tasks
Tasks with `testing` tag: 45, 59, 76

### Find All AI Integration Tasks
Tasks with `ai` tag: 64, 71, 72, 73

### Find All Phase-1 Foundation Tasks
Tasks with `phase-1` tag: 42-47, 62-65

## Integration with Git Workflow

### Commit Message Format

When working on a tagged task, reference the tags in your commit message:

```bash
# Example for Task 42
git commit -m "feat(rewardstack): implement database schema migration for RewardSTACK integration

- Add RewardSTACK configuration fields to Workspace model
- Add participant tracking fields to User model
- Create RewardIssuance model for transaction tracking
- Add indexes for performance optimization

Tags: rewardstack, database, prisma, phase-1
Task: 42"

# Example for Task 71
git commit -m "feat(ai-email): develop AI assist hook and prompt engineering

- Implement useAIAssist hook with streaming support
- Create prompt templates for common operations
- Add error handling and rate limiting
- Integrate with Vercel AI SDK

Tags: ai-email, ai, hooks, prompts, phase-3
Task: 71"
```

### Branch Naming Convention

Use tags to create descriptive branch names:

```bash
# RewardSTACK tasks
git checkout -b task/42-rewardstack-database-migration
git checkout -b task/51-rewardstack-admin-dashboard

# AI Email tasks
git checkout -b task/62-ai-email-setup-dependencies
git checkout -b task/71-ai-email-ai-assist-hook
```

### PR Title Format

```markdown
[rewardstack/phase-1] Database Schema Migration for RewardSTACK Integration (#42)

[ai-email/phase-3] AI Assist Hook and Prompt Engineering (#71)

[rewardstack/phase-2] Admin Reward Management Dashboard (#51)
```

## Tag Statistics

### Total Tags: 45 unique tags across 35 tasks

**By Category:**
- Feature Area: 2 tags (rewardstack, ai-email)
- Component Type: 38 tags
- Phase: 4 tags (phase-1 through phase-4)

**Most Common Tags:**
1. `api` - 8 tasks (43, 45, 46, 47, 50, 52, 68)
2. `ui` - 8 tasks (44, 51, 54, 65-70, 72)
3. `phase-1` - 10 tasks (42-47, 62-65)
4. `phase-2` - 10 tasks (48-52, 66-70)
5. `phase-3` - 11 tasks (53-58, 71-75)

**Tag Distribution:**
- Database: 2 tasks (6%)
- API: 8 tasks (23%)
- UI: 8 tasks (23%)
- AI: 4 tasks (11%)
- Testing: 3 tasks (9%)
- Performance: 2 tasks (6%)
- Deployment: 2 tasks (6%)

## Best Practices

### When to Add Tags

1. **Initial Task Creation**: Add feature area and phase tags immediately
2. **During Planning**: Add component type tags based on implementation details
3. **During Expansion**: Refine tags for subtasks to match specific components
4. **After Implementation**: Update tags if scope changed during development

### Tag Naming Conventions

- Use lowercase, hyphen-separated format
- Keep tags concise (1-2 words max)
- Use plural for categories (rewards, templates, hooks)
- Use singular for specific items (database, api, ui)
- Prefix phase tags with "phase-"

### Tag Maintenance

```bash
# Update task tags
task-master update-task --id=<id> --prompt="Add tags: new-tag, another-tag"

# Verify tags
task-master show <id>
```

### Future Enhancements

1. **Native Tag Filtering**: Built-in `task-master list --tags=rewardstack,phase-1` support
2. **Tag Analytics**: Statistics on tag usage and task completion by tag
3. **Tag Validation**: Ensure tags follow naming conventions
4. **Tag Autocomplete**: Suggest tags based on task description
5. **Tag Dependencies**: Define which tags commonly appear together

---

**Last Updated**: 2025-10-30
**Total Tasks Tagged**: 35 (100%)
**Total Unique Tags**: 45
**Tag Coverage**: Complete (all tasks have feature, component, and phase tags)
