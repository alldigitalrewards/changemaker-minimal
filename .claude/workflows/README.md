# Manager Role & RewardSTACK Integration - Workflow Guide

Quick reference for implementing the 60-task plan across 4 phases.

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `.claude/plans/task-list.md` | Complete 60-task breakdown with details |
| `.claude/plans/dependencies.md` | Dependency graph and critical path |
| `.claude/PROGRESS.md` | Live implementation progress tracker |
| `.claude/session-template.md` | Template for focused work sessions |
| `.claude/workflows/update-progress.md` | Progress update instructions |
| `scripts/mark-task-complete.sh` | Automated progress update script |

---

## 🚀 Quick Start

### Starting a New Task

```bash
# 1. Copy session template
cp .claude/session-template.md .claude/sessions/session-$(date +%Y%m%d)-task-[X].md

# 2. Fill in task details from task-list.md
# Edit .claude/sessions/session-[date]-task-[X].md

# 3. Implement following the plan in your session file

# 4. Run tests
pnpm test
pnpm build

# 5. Commit implementation
git add [changed files]
git commit -m "feat: [description] (Task [X])"

# 6. Mark task complete
./scripts/mark-task-complete.sh [X]

# 7. Push changes
git push
```

### Marking a Task Complete

**Automated** (recommended):
```bash
./scripts/mark-task-complete.sh 1
# Follow prompts to commit
```

**Manual**:
```bash
# Edit .claude/PROGRESS.md:
# Change: - [ ] **Task 1**: Schema Design
# To:     - [x] **Task 1**: Schema Design ✅

git add .claude/PROGRESS.md
git commit -m "progress: complete Task 1 - schema design"
```

---

## 📋 Daily Workflow

### Morning
1. **Review progress**: `cat .claude/PROGRESS.md | grep "Not Started" | head -5`
2. **Check dependencies**: Ensure prior tasks complete
3. **Create session file**: Copy template, fill in details

### During Work
4. **Follow session plan**: Step-by-step implementation
5. **Document decisions**: Update session file with notes
6. **Run tests continuously**: `pnpm test --watch`

### Evening
7. **Verify completion**: Run full verification checklist
8. **Commit implementation**: Proper commit message
9. **Update progress**: Run `./scripts/mark-task-complete.sh [X]`
10. **Update standup notes**: Manual edit of PROGRESS.md

---

## 🎯 Phase Overview

| Phase | Tasks | Hours | Status |
|-------|-------|-------|--------|
| **Phase 1: Foundation** | 1-15 | 26h | 🔴 Not Started |
| **Phase 2: Manager Role** | 16-30 | 56.5h | 🔴 Not Started |
| **Phase 3: RewardSTACK** | 31-45 | 49h | 🔴 Not Started |
| **Phase 4: Polish** | 46-60 | 43.5h | 🔴 Not Started |

**Total**: 60 tasks, 151 hours (single dev) / 83 hours (critical path with 2 devs)

---

## 🚦 Phase Gates

### Gate 1: Foundation Ready (After Task 15)
- [ ] Migration deployed to staging
- [ ] Rollback tested successfully
- [ ] All unit tests pass (100%)
- [ ] Authorization tests pass
- [ ] Zero critical security issues

### Gate 2: Manager MVP Ready (After Task 30)
- [ ] Manager can review assigned submissions
- [ ] Two-step approval workflow working
- [ ] Authorization tests passing
- [ ] Manager queue loads <2 seconds
- [ ] Zero critical security issues

### Gate 3: Rewards Flowing (After Task 45)
- [ ] SKU reward flows end-to-end
- [ ] Webhook handler verified
- [ ] Retry logic tested
- [ ] <5% failure rate in sandbox
- [ ] Zero critical security issues

### Gate 4: Production Ready (After Task 60)
- [ ] >90% overall test coverage
- [ ] Zero critical security issues
- [ ] Manager queue loads <2 seconds
- [ ] All email triggers working
- [ ] Deployment runbook verified
- [ ] Team sign-off

---

## 🔀 Git Workflow

### Branch Strategy (Recommended)

```bash
# Create phase branch
git checkout -b phase-1-foundation

# Work on tasks
# ... implement Task 1 ...
git add prisma/schema.prisma
git commit -m "feat: add manager role schema changes (Task 1)"

# ... implement Task 2 ...
git add prisma/migrations/
git commit -m "feat: generate manager role migration (Task 2)"

# Update progress after each task
./scripts/mark-task-complete.sh 1
./scripts/mark-task-complete.sh 2

# Push regularly
git push origin phase-1-foundation

# Create PR when phase complete
gh pr create --title "Phase 1: Foundation" --body "..."
```

### Commit Message Format

**Implementation**:
```
[type]: [description] (Task [X])

[Body]

Related tasks: #[X]
Depends on: #[Y]
Blocks: #[Z]
```

**Progress**:
```
progress: complete Task [X] - [task name]
```

**Types**: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`

---

## 🧪 Testing Workflow

### Unit Tests
```bash
# Run specific test file
pnpm test tests/lib/challenge-assignments.test.ts

# Watch mode during development
pnpm test --watch
```

### Integration Tests
```bash
# Run API tests
pnpm test tests/api/

# Run specific endpoint test
pnpm test tests/api/manager-auth.spec.ts
```

### E2E Tests
```bash
# Run full workflow tests
pnpm test:e2e tests/integration/full-workflow.spec.ts
```

### Build Verification
```bash
# Type check
pnpm tsc --noEmit

# Build
pnpm build

# All checks
pnpm test && pnpm build
```

---

## 📊 Progress Tracking

### Check Current Status
```bash
# View all task status
grep "Task [0-9]" .claude/PROGRESS.md | grep "\[ \]" | head -10

# View phase progress
grep "Phase [0-9]:" .claude/PROGRESS.md | grep "Progress"

# View today's work
grep "$(date +"%A, %b %d, %Y")" .claude/PROGRESS.md -A 10
```

### Update Metrics
After each task, update in `.claude/PROGRESS.md`:
1. Task checkbox (automated with script)
2. Daily standup notes (manual)
3. Phase progress percentage (manual)
4. Phase hours (manual)

### Weekly Review
Every Friday:
1. Update week summary
2. Calculate velocity
3. Review gate criteria
4. Plan next week's tasks

---

## 🛠️ Common Commands

### Development
```bash
# Start dev server
pnpm dev

# Run tests
pnpm test

# Build
pnpm build

# Type check
pnpm tsc --noEmit

# Prisma
pnpm prisma validate
pnpm prisma format
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma migrate deploy
```

### Git
```bash
# Status
git status

# Diff
git diff
git diff .claude/PROGRESS.md

# Commit
git add [files]
git commit -m "[type]: [description] (Task [X])"

# Push
git push origin [branch]

# PR
gh pr create --title "[title]" --body "[body]"
```

### Task Management
```bash
# Mark task complete
./scripts/mark-task-complete.sh [TASK_NUMBER]

# View next tasks
cat .claude/PROGRESS.md | grep "\[ \]" | head -5

# Check dependencies
grep "Depends on: Task" .claude/plans/task-list.md | grep "Task [X]"
```

---

## 📚 Reference Links

### Internal Docs
- [Complete Task List](.claude/plans/task-list.md) - All 60 tasks with details
- [Dependency Graph](.claude/plans/dependencies.md) - Critical path visualization
- [Progress Tracker](.claude/PROGRESS.md) - Live implementation status
- [Session Template](.claude/session-template.md) - Template for focused sessions
- [Update Workflow](.claude/workflows/update-progress.md) - Progress update guide

### External Resources
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Playwright Docs](https://playwright.dev/docs/intro)
- [Inngest Docs](https://www.inngest.com/docs)

---

## 🆘 Troubleshooting

### Script doesn't mark task complete
```bash
# Check exact format
grep "Task 1" .claude/PROGRESS.md

# Manual sed command
sed -i '' 's/\[ \] \*\*Task 1\*\*/\[x\] \*\*Task 1\*\* ✅/' .claude/PROGRESS.md
```

### Tests failing after schema change
```bash
# Regenerate Prisma client
pnpm prisma generate

# Reset test database
pnpm prisma migrate reset --force

# Run tests again
pnpm test
```

### Build failing with type errors
```bash
# Clean build cache
rm -rf .next

# Regenerate types
pnpm prisma generate

# Type check
pnpm tsc --noEmit

# Build
pnpm build
```

### Migration fails on staging
```bash
# Check current schema
pnpm prisma db pull

# Compare with schema.prisma
diff prisma/schema.prisma [pulled-schema]

# Run rollback SQL (Task 11)
psql $DATABASE_URL < rollback.sql
```

---

## 💡 Tips & Best Practices

### Session Management
- **One task per session**: Focus on completing one task fully
- **Test continuously**: Run tests during development, not just at end
- **Document decisions**: Update session file with "why" not just "what"
- **Commit frequently**: Implementation separate from progress updates

### Code Quality
- **Follow existing patterns**: Match codebase style (shadcn/ui, API structure)
- **DRY principle**: Reuse helpers from lib/db/queries.ts
- **Type safety**: No `any` types, use Prisma-generated types
- **Error handling**: Always try/catch async operations

### Testing Strategy
- **Unit tests first**: Test helpers in isolation
- **Integration tests**: Test API endpoints with real database
- **E2E last**: Full workflows only after unit/integration pass
- **>90% coverage**: Aim for comprehensive test coverage

### Performance
- **Index early**: Add database indexes during schema design (Task 11)
- **Pagination**: Add pagination if query returns >50 items
- **Lazy loading**: Use Suspense for slow components
- **Monitor**: Check query performance with EXPLAIN ANALYZE

### Security
- **Authorization first**: Add auth checks before implementing logic
- **Workspace isolation**: Always filter by workspaceId
- **Input validation**: Validate all user input (Zod schemas)
- **Audit logging**: Log sensitive actions (ActivityEvent)

---

**Last Updated**: 2025-10-20
**Project**: Manager Role & RewardSTACK Integration
**Total Tasks**: 60
**Target Completion**: 2025-11-10
