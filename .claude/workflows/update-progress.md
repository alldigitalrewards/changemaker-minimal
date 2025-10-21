# Progress Update Workflow

This guide documents how to update `.claude/PROGRESS.md` after completing each task.

---

## Quick Reference

```bash
# Mark task complete
./scripts/mark-task-complete.sh [TASK_NUMBER]

# Or manually:
sed -i '' 's/\[ \] \*\*Task [X]\*\*/\[x\] \*\*Task [X]\*\* ✅/' .claude/PROGRESS.md
git add .claude/PROGRESS.md
git commit -m "progress: complete Task [X] - [task name]"
```

---

## Automated Script

Create `scripts/mark-task-complete.sh`:

```bash
#!/bin/bash

# Usage: ./scripts/mark-task-complete.sh 1
# Marks Task 1 as complete in PROGRESS.md

TASK_NUM=$1

if [ -z "$TASK_NUM" ]; then
  echo "Error: Task number required"
  echo "Usage: ./scripts/mark-task-complete.sh [TASK_NUMBER]"
  exit 1
fi

# Mark task as complete
sed -i '' "s/\[ \] \*\*Task $TASK_NUM\*\*/\[x\] \*\*Task $TASK_NUM\*\* ✅/" .claude/PROGRESS.md

# Update today's date in standup notes
TODAY=$(date +"%A, %b %d, %Y")
sed -i '' "s/#### Monday, Oct 21, 2025/#### $TODAY/" .claude/PROGRESS.md

echo "✅ Task $TASK_NUM marked as complete in .claude/PROGRESS.md"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff .claude/PROGRESS.md"
echo "  2. Commit: git add .claude/PROGRESS.md && git commit -m 'progress: complete Task $TASK_NUM'"
echo "  3. Push: git push"
```

Make it executable:
```bash
chmod +x scripts/mark-task-complete.sh
```

---

## Manual Update Process

### Step 1: Mark Task Complete

Find the task in `.claude/PROGRESS.md` and change:
```markdown
- [ ] **Task 1**: Schema Design & Review ⏱️ 2h
```

To:
```markdown
- [x] **Task 1**: Schema Design & Review ⏱️ 2h ✅
```

**Using sed**:
```bash
sed -i '' 's/\[ \] \*\*Task 1\*\*/\[x\] \*\*Task 1\*\* ✅/' .claude/PROGRESS.md
```

### Step 2: Update Daily Standup Notes

Add to today's date section under "Completed":
```markdown
#### Monday, Oct 21, 2025
- **Started**: Task 1 (Schema Design)
- **Completed**: Task 1 ✅
- **Hours Logged**: 2h
- **Blockers**: None
- **Tomorrow**: Task 2 (Migration Generation)
```

### Step 3: Update Overview Statistics

Update the phase progress table at the top:
```markdown
| Phase | Tasks | Status | Progress | Hours |
|-------|-------|--------|----------|-------|
| Phase 1: Foundation | 15 | In Progress | 1/15 (7%) | 2/26h |
```

### Step 4: Commit Progress Update

```bash
git add .claude/PROGRESS.md
git commit -m "progress: complete Task 1 - schema design"
```

---

## Full Workflow Example

### Completing Task 1: Schema Design

```bash
# 1. Verify task is complete
pnpm prisma validate  # Should pass
git status            # Should show modified prisma/schema.prisma

# 2. Commit implementation
git add prisma/schema.prisma
git commit -m "feat: add manager role schema changes (Task 1)

Adds foundation for manager role and challenge assignment system:
- Add MANAGER to Role enum
- Create ChallengeAssignment join table with proper indexes
- Extend SubmissionStatus with MANAGER_APPROVED, NEEDS_REVISION
- Add manager review fields to ActivitySubmission

Related tasks: #1
Blocks: #2-15"

# 3. Mark task complete in PROGRESS.md
sed -i '' 's/\[ \] \*\*Task 1\*\*/\[x\] \*\*Task 1\*\* ✅/' .claude/PROGRESS.md

# 4. Update daily standup notes (manual edit)
# Edit .claude/PROGRESS.md:
#   - Add "Task 1 ✅" to today's "Completed" section
#   - Update "Hours Logged" to 2h
#   - Update "Tomorrow" to next task

# 5. Update overview table (manual edit)
# Edit .claude/PROGRESS.md:
#   - Change "Phase 1: Foundation" progress from "0/15 (0%)" to "1/15 (7%)"
#   - Change hours from "0/26h" to "2/26h"

# 6. Commit progress update
git add .claude/PROGRESS.md
git commit -m "progress: complete Task 1 - schema design"

# 7. Push to remote
git push origin [branch-name]
```

---

## Progress Update Checklist

After completing each task, verify:

- [ ] Task marked with `✅` in PROGRESS.md
- [ ] Daily standup notes updated with completion
- [ ] Hours logged updated
- [ ] Phase progress percentage updated
- [ ] Phase hours updated
- [ ] Next task identified in standup notes
- [ ] Progress committed with proper message
- [ ] Implementation committed separately (before progress)

---

## Tracking Metrics

### After Each Task

Update these sections in PROGRESS.md:

1. **Task Status** (checkboxes):
   ```markdown
   - [x] **Task 1**: Schema Design & Review ⏱️ 2h ✅
   ```

2. **Daily Standup**:
   ```markdown
   - **Completed**: Task 1 ✅
   - **Hours Logged**: 2h
   ```

3. **Phase Overview**:
   ```markdown
   | Phase 1: Foundation | 15 | In Progress | 1/15 (7%) | 2/26h |
   ```

### After Each Sprint (Week)

Update these sections:

1. **Week Summary**:
   ```markdown
   **Week 1 Summary**:
   - Tasks Completed: 15/15 ✅
   - Hours Logged: 26/26h
   - Status: Complete
   ```

2. **Metrics & KPIs**:
   ```markdown
   - **New Files**: 3/60 created
   - **Tests Written**: 8/75 new tests
   - **Story Points Completed**: 15/60
   ```

---

## Branch Strategy

### Recommended Git Workflow

```bash
# Create feature branch for each phase
git checkout -b phase-1-foundation

# Work on tasks in the phase
# ... complete Task 1 ...
git add prisma/schema.prisma
git commit -m "feat: add manager role schema changes (Task 1)"

# ... complete Task 2 ...
git add prisma/migrations/
git commit -m "feat: generate manager role migration (Task 2)"

# Update progress after each task
git add .claude/PROGRESS.md
git commit -m "progress: complete Task 2 - migration generation"

# Push branch regularly
git push origin phase-1-foundation

# When phase complete, create PR
gh pr create \
  --title "Phase 1: Foundation - Manager Role Schema" \
  --body "Completes Tasks 1-15 (Phase 1 Foundation)

## Changes
- Add MANAGER role to schema
- Create ChallengeAssignment model
- Extend submission statuses
- Add manager review fields
- Update RBAC and middleware
- Add seed data for managers
- Comprehensive test coverage

## Testing
- All 58 tests passing
- Migration tested on staging clone
- Rollback script verified

## Gate 1 Criteria
✅ Migration deployed to staging
✅ Rollback tested successfully
✅ All unit tests pass (100%)
✅ Authorization tests pass
✅ Zero critical security issues

Related: Tasks #1-15"
```

### Alternative: Single Branch with Tags

```bash
# Work on main/develop branch
git checkout develop

# Tag after each phase
git tag phase-1-complete
git tag phase-2-complete
git tag phase-3-complete
git tag production-ready

# Push tags
git push --tags
```

---

## Daily Workflow

### Morning (Session Start)

1. **Review PROGRESS.md**:
   ```bash
   cat .claude/PROGRESS.md | grep "Status: Not Started" | head -5
   ```

2. **Identify next task**:
   - Check dependencies (all prior tasks complete?)
   - Verify blockers resolved
   - Estimate hours for today

3. **Create session file**:
   ```bash
   cp .claude/session-template.md .claude/sessions/session-$(date +%Y%m%d)-task-X.md
   ```

### During Implementation

4. **Update session file** as you work:
   - Document decisions
   - Note challenges
   - Record discoveries

### Evening (Session End)

5. **Verify completion**:
   - Run verification checklist
   - All tests passing?
   - Build succeeds?

6. **Commit implementation**:
   ```bash
   git add [files]
   git commit -m "[type]: [description] (Task X)"
   ```

7. **Update progress**:
   ```bash
   ./scripts/mark-task-complete.sh X
   git add .claude/PROGRESS.md
   git commit -m "progress: complete Task X - [name]"
   ```

8. **Update standup notes**:
   - What was completed
   - What's next
   - Any blockers

---

## Weekly Workflow

### Friday (Week End)

1. **Update week summary** in PROGRESS.md
2. **Calculate metrics**:
   - Tasks completed this week
   - Hours logged vs estimated
   - Velocity (tasks per day)

3. **Review gate criteria**:
   - Is phase complete?
   - Are all gate criteria met?
   - Ready for gate review?

4. **Plan next week**:
   - Identify next 5-10 tasks
   - Check dependencies
   - Estimate hours

---

## Troubleshooting

### Task marked complete but still shows [ ]

**Problem**: sed command didn't match the exact format.

**Solution**: Check the exact format in PROGRESS.md:
```bash
grep "Task 1" .claude/PROGRESS.md
```

Then adjust sed command to match:
```bash
sed -i '' 's/- \[ \] \*\*Task 1\*\*/- \[x\] \*\*Task 1\*\* ✅/' .claude/PROGRESS.md
```

### Progress percentage not updating

**Problem**: Manually calculated wrong percentage.

**Solution**: Use this formula:
```
Progress % = (Tasks Completed / Total Tasks) * 100
Example: (1 / 15) * 100 = 7% (rounded)
```

### Hours not adding up

**Problem**: Forgot to update phase hours.

**Solution**: Double-check both columns:
```markdown
| Phase 1 | 15 | In Progress | 1/15 (7%) | 2/26h |
                                         ^     ^
                                         |     |
                                   Completed  Total
```

---

## Automation Ideas

### Git Hooks

Create `.git/hooks/post-commit`:
```bash
#!/bin/bash

# Auto-update PROGRESS.md on task commits
if [[ $1 =~ "Task ([0-9]+)" ]]; then
  TASK_NUM="${BASH_REMATCH[1]}"
  echo "📝 Detected Task $TASK_NUM completion"
  echo "Run: ./scripts/mark-task-complete.sh $TASK_NUM"
fi
```

### Task Master Integration

If using Task Master AI:
```bash
# Mark task complete in both systems
task-master set-status --id=$TASK_NUM --status=done
./scripts/mark-task-complete.sh $TASK_NUM
```

---

## Reference: Commit Message Format

### Implementation Commits
```
[type]: [description] (Task [X])

[Body explaining what changed and why]

Related tasks: #[X]
Depends on: #[Y]
Blocks: #[Z]
```

**Types**:
- `feat`: New feature (Tasks 16-26, 31-43, 46-53)
- `fix`: Bug fix
- `refactor`: Code change without feature change (Tasks 4-6)
- `test`: Adding tests (Tasks 27-30, 41-44, 54-56)
- `docs`: Documentation (Tasks 14, 57-58)
- `chore`: Tooling, dependencies (Tasks 31, 35)
- `perf`: Performance improvement (Task 55)

### Progress Commits
```
progress: complete Task [X] - [task name]

[Optional: Brief note about completion]
```

### Examples

**Implementation**:
```
feat: add manager assignment API endpoints (Task 16)

Implements POST /api/workspaces/[slug]/challenges/[id]/managers
to allow admins to assign managers to challenges.

- Validates requester is ADMIN via requireWorkspaceAdmin()
- Creates ChallengeAssignment via helper function
- Returns assignment with manager user details
- Handles errors (manager not in workspace, already assigned)

Related tasks: #16
Depends on: #10
Blocks: #17, #23, #26
```

**Progress**:
```
progress: complete Task 16 - assignment API create

Completed POST endpoint for manager assignment.
Next: Task 17 (List & Delete endpoints)
```

---

**Last Updated**: 2025-10-20
