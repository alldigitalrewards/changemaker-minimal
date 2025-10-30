# Task Master Integration Skill

## Description

Seamlessly integrate Task Master operations with development workflow, automatically managing task status updates, progress logging, and next-task navigation. Streamlines task tracking without requiring manual Task Master commands.

**When to use this skill:**
- User says: "start next task", "complete task", "update task progress", "mark task done", "what's next", "finish this task", "log progress"
- At the beginning of coding sessions (find next task)
- During implementation (log progress notes)
- After completing work (mark tasks complete)
- When planning work (expand tasks, analyze complexity)
- NOT for Git operations (Git Workflow Skill) or running tests (Test Suite Runner Skill)

## Instructions

### Core Principles

1. **Automatic status tracking** - Update task status at workflow milestones
2. **Detailed logging** - Record implementation notes, challenges, solutions
3. **Dependency awareness** - Respect task dependencies when finding next work
4. **Context preservation** - Include relevant details for future reference
5. **Integration with workflow** - Seamlessly blend with development activities

### Task Master Basics

**Task structure:**
```
1. Main Task
   1.1 Subtask one
   1.2 Subtask two
       1.2.1 Sub-subtask (if needed)
   1.3 Subtask three
2. Another Main Task
```

**Task statuses:**
- `pending` - Not yet started
- `in-progress` - Currently working on
- `done` - Completed and verified
- `review` - Awaiting review/validation
- `blocked` - Cannot proceed (external dependency)
- `deferred` - Postponed to later
- `cancelled` - No longer needed

**Task priorities:**
- `high` - Critical path, blocking other work
- `medium` - Important but not blocking
- `low` - Nice to have, can wait

### Standard Workflow Integration

#### 1. Session Start - Find Next Task

**At the beginning of each session:**

```bash
# Get next available task
task-master next

# Or check all pending tasks
task-master list --status=pending

# View specific task details
task-master show <task-id>
```

**What to look for:**
- Task has no unmet dependencies
- Task is marked `pending`
- Task is in appropriate scope (not blocked/deferred)

**Select task strategically:**
- High priority tasks first
- Tasks that unblock other work
- Related tasks (maintain context)
- Tasks matching your current focus

#### 2. Task Initiation

**Before starting work:**

```bash
# 1. Mark task as in-progress
task-master set-status --id=<task-id> --status=in-progress

# 2. Review task details
task-master show <task-id>

# 3. Log initial plan
task-master update-subtask --id=<task-id> --prompt="Starting implementation. Plan: [high-level approach]"
```

**Example:**
```bash
task-master set-status --id=2.3 --status=in-progress
task-master update-subtask --id=2.3 --prompt="Starting implementation of participant limits. Plan: 1) Add maxParticipants field to schema, 2) Update API validation, 3) Add tests, 4) Update RLS policies"
```

#### 3. During Implementation - Log Progress

**Log key milestones:**

```bash
# After completing sub-steps
task-master update-subtask --id=<task-id> --prompt="Progress update: [what was done]"

# When encountering issues
task-master update-subtask --id=<task-id> --prompt="Challenge: [problem]. Solution: [how it was resolved]"

# When making important decisions
task-master update-subtask --id=<task-id> --prompt="Decision: [what was decided and why]"
```

**What to log:**
- Major implementation steps completed
- Technical decisions made
- Challenges encountered and solutions
- Test results
- Performance observations
- Security considerations

**Example progress log:**
```bash
task-master update-subtask --id=2.3 --prompt="Schema updated with maxParticipants field. Added as nullable integer with default null (unlimited). Migration applied successfully."

task-master update-subtask --id=2.3 --prompt="API validation added. Validates maxParticipants >= 0 if provided. Enrollment endpoint checks against limit. Returns 409 if full."

task-master update-subtask --id=2.3 --prompt="Tests added (5 new tests). All passing. Verified: creation, validation, enrollment limit enforcement, workspace isolation."
```

#### 4. Task Completion

**Before marking as done:**

1. **Verify completion criteria:**
   - All subtask requirements met
   - Tests pass (use Test Suite Runner Skill)
   - Code committed (use Git Workflow Skill)
   - Documentation updated if needed

2. **Log final status:**
```bash
task-master update-subtask --id=<task-id> --prompt="Completed. Tests: [results]. Committed: [commit-sha]. Notes: [any final observations]"
```

3. **Mark as done:**
```bash
task-master set-status --id=<task-id> --status=done
```

**Example completion:**
```bash
task-master update-subtask --id=2.3 --prompt="Completed participant limits feature. Tests: 25/25 passing. Committed: abc123f. RLS policies verified. Ready for review."

task-master set-status --id=2.3 --status=done
```

#### 5. Move to Next Task

**After completing a task:**

```bash
# Find what's next
task-master next

# Start the cycle again
task-master set-status --id=<next-task-id> --status=in-progress
```

### Advanced Task Management

#### Expanding Tasks

**When a task needs breakdown:**

```bash
# View task to understand scope
task-master show <task-id>

# Analyze complexity
task-master analyze-complexity --ids=<task-id> --research

# Expand into subtasks (AI-assisted)
task-master expand --id=<task-id> --num=5 --research

# Or expand with custom context
task-master expand --id=<task-id> --prompt="Break down focusing on: [specific aspects]" --research
```

**When to expand:**
- Task is too large (complexity score > 7)
- Multiple distinct steps required
- Different skills/domains involved
- Want to track progress granularly

**Example expansion:**
```bash
# Task 2 is "Implement participant limits" - too broad
task-master analyze-complexity --ids=2 --research
# Returns: Complexity score 8/10

task-master expand --id=2 --num=4 --research
# Generates:
# 2.1 - Add maxParticipants field to schema
# 2.2 - Implement API validation
# 2.3 - Create enrollment limit checks
# 2.4 - Add test coverage
```

#### Adding New Tasks

**When new work is discovered:**

```bash
# Add with AI assistance
task-master add-task --prompt="[task description]" --research

# Add with manual details
task-master add-task \
  --title="Fix RLS policy bug" \
  --description="Enrollment policy allows cross-workspace access" \
  --priority=high \
  --dependencies="2.3"
```

**What to include:**
- Clear, actionable title
- Detailed description
- Priority level
- Dependencies (what must be done first)
- Any relevant context

#### Managing Dependencies

**Add dependency:**
```bash
# Task 3 depends on task 2
task-master add-dependency --id=3 --depends-on=2
```

**Remove dependency:**
```bash
task-master remove-dependency --id=3 --depends-on=2
```

**Validate dependencies:**
```bash
# Check for circular dependencies or broken references
task-master validate-dependencies

# Fix any issues found
task-master fix-dependencies
```

**Example dependency management:**
```bash
# Cannot implement enrollment limits (2.3) until schema updated (2.1)
task-master add-dependency --id=2.3 --depends-on=2.1

# Verify dependency tree
task-master show 2.3
# Shows: Dependencies: [2.1]
```

#### Task Status Management

**Change task status:**
```bash
# Mark as in-progress
task-master set-status --id=<task-id> --status=in-progress

# Mark as done
task-master set-status --id=<task-id> --status=done

# Mark as blocked
task-master set-status --id=<task-id> --status=blocked

# Mark for review
task-master set-status --id=<task-id> --status=review

# Defer for later
task-master set-status --id=<task-id> --status=deferred
```

**When to use each status:**
- `in-progress`: Actively working on it now
- `done`: Completed, tested, committed, verified
- `review`: Implementation complete, awaiting code review
- `blocked`: Cannot proceed (external dependency, decision needed)
- `deferred`: Intentionally postponing (not priority, scope change)
- `cancelled`: No longer needed (requirements changed)

### Context Logging Patterns

#### Pattern 1: Implementation Notes

```bash
task-master update-subtask --id=2.3 --prompt="
Implementation approach:
- Used Prisma @default directive for maxParticipants
- Validation at API layer prevents negative values
- Enrollment check queries count of existing enrollments
- Returns 409 Conflict if limit reached
- Maintains backward compatibility (null = unlimited)
"
```

#### Pattern 2: Challenge and Resolution

```bash
task-master update-subtask --id=2.3 --prompt="
Challenge: RLS policy was blocking enrollment count query
Root cause: Policy required user context, but service role should bypass
Solution: Added service role bypass policy for Enrollment table
Verified: Tests now pass, workspace isolation maintained
"
```

#### Pattern 3: Decision Documentation

```bash
task-master update-subtask --id=2.3 --prompt="
Decision: Made maxParticipants nullable with null = unlimited
Rationale:
- Backward compatible with existing challenges
- Clearer than magic number (0 or -1) for unlimited
- Database migration doesn't require backfill
- API clearly distinguishes null vs. 0 (no participants allowed)
"
```

#### Pattern 4: Test Results

```bash
task-master update-subtask --id=2.3 --prompt="
Test results:
- Unit tests: 12/12 passing
- API tests: 25/25 passing
- Security tests: 8/8 passing
- Performance: Average response time 45ms
Coverage:
- Challenge creation with/without limit
- Enrollment when limit reached
- Workspace isolation verified
- Edge cases (null, 0, negative) handled
"
```

#### Pattern 5: Commit Reference

```bash
task-master update-subtask --id=2.3 --prompt="
Committed changes in abc123f
Files changed:
- prisma/schema.prisma (added maxParticipants field)
- app/api/w/[slug]/challenges/route.ts (validation logic)
- app/api/w/[slug]/challenges/[id]/enroll/route.ts (limit check)
- tests/api/challenge-crud.spec.ts (new tests)
Branch: feature/participant-limits
PR: #42
"
```

### Integration with Other Skills

#### With Database Schema Migration Skill

```bash
# 1. Find next task
task-master next  # Returns: 2.1 - Add maxParticipants field

# 2. Start task
task-master set-status --id=2.1 --status=in-progress

# 3. Database Migration Skill runs schema changes
# ... (automated by skill)

# 4. Log migration results
task-master update-subtask --id=2.1 --prompt="Schema migration completed. Field added, RLS policies updated, Prisma client regenerated."

# 5. Complete task
task-master set-status --id=2.1 --status=done
```

#### With Test Suite Runner Skill

```bash
# 1. After implementation
task-master update-subtask --id=2.3 --prompt="Implementation complete, running tests..."

# 2. Test Suite Runner runs tests
# ... (automated by skill)

# 3. Log test results
task-master update-subtask --id=2.3 --prompt="Tests run: 25/25 passing. Coverage verified for all requirements."

# 4. Mark ready for review
task-master set-status --id=2.3 --status=review
```

#### With Git Workflow Skill

```bash
# 1. Work complete, tests passing
task-master update-subtask --id=2.3 --prompt="Implementation and tests complete. Ready to commit."

# 2. Git Workflow Skill creates commit
# ... (automated by skill)

# 3. Log commit details
task-master update-subtask --id=2.3 --prompt="Committed as abc123f. PR #42 created."

# 4. Mark done
task-master set-status --id=2.3 --status=done
```

### Workflow Automation Patterns

#### Pattern 1: Full Task Lifecycle

```bash
# Morning: Start session
task-master next
# Returns: Task 2.3 - Implement enrollment limit validation

# Start work
task-master set-status --id=2.3 --status=in-progress
task-master update-subtask --id=2.3 --prompt="Starting. Will implement validation in enrollment endpoint."

# During work (log checkpoints)
task-master update-subtask --id=2.3 --prompt="Added validation logic. Checking against maxParticipants from challenge."
task-master update-subtask --id=2.3 --prompt="Tests added. Verifying limit enforcement works correctly."

# Complete
task-master update-subtask --id=2.3 --prompt="All tests passing. Committed as abc123f."
task-master set-status --id=2.3 --status=done

# Next
task-master next
```

#### Pattern 2: Daily Standup Report

```bash
# Generate standup report
task-master list --status=done | grep "yesterday"
task-master list --status=in-progress
task-master next

# Log standup notes
task-master update-subtask --id=<current-task> --prompt="Standup [date]: Working on [task]. Blocked by: [none/details]. Plan: [today's goals]."
```

#### Pattern 3: Sprint Planning

```bash
# Review complexity
task-master analyze-complexity --research

# Expand high-complexity tasks
task-master expand --id=2 --research
task-master expand --id=5 --research

# View roadmap
task-master list

# Log sprint plan
task-master update-task --id=2 --prompt="Sprint goal: Complete participant limits feature. Estimated: 3 days."
```

### Best Practices

**Do:**
- ✅ Update status at workflow milestones
- ✅ Log detailed implementation notes
- ✅ Document decisions and rationale
- ✅ Record challenges and solutions
- ✅ Reference commits and PRs
- ✅ Use research mode for complex tasks
- ✅ Keep task list current and accurate

**Don't:**
- ❌ Forget to mark tasks as done
- ❌ Skip progress logging during implementation
- ❌ Leave tasks in-progress indefinitely
- ❌ Work on tasks with unmet dependencies
- ❌ Use vague update messages
- ❌ Let task list become stale
- ❌ Duplicate work tracked elsewhere

### Task Master Commands Reference

**Essential commands:**
```bash
# Navigation
task-master list                          # View all tasks
task-master next                          # Get next available task
task-master show <id>                    # View task details

# Status management
task-master set-status --id=<id> --status=<status>

# Task updates
task-master update-task --id=<id> --prompt="[updates]"
task-master update-subtask --id=<id> --prompt="[notes]"

# Task creation
task-master add-task --prompt="[description]" --research
task-master expand --id=<id> --research

# Analysis
task-master analyze-complexity --research
task-master complexity-report

# Dependencies
task-master add-dependency --id=<id> --depends-on=<dep-id>
task-master validate-dependencies
```

**Advanced commands:**
```bash
# Bulk operations
task-master update --from=<id> --prompt="[changes affecting multiple tasks]"
task-master expand --all --research

# Organization
task-master move --from=<id> --to=<id>
task-master remove-task --id=<id>

# Reports
task-master generate                     # Regenerate task markdown files
```

### Task Master File Structure

**Key files:**
```
.taskmaster/
├── tasks/
│   ├── tasks.json              # Main task database (auto-managed)
│   ├── task-1.md              # Individual task files (auto-generated)
│   ├── task-2.md
│   └── task-2.3.md            # Subtask files
├── docs/
│   └── prd.txt                # Product requirements
├── reports/
│   └── task-complexity-report.json
└── config.json                # AI model configuration
```

**File management:**
- ✅ Use commands to modify tasks.json
- ❌ Never manually edit tasks.json (data corruption risk)
- ✅ Reference task markdown files for human reading
- ❌ Never edit task markdown files (auto-generated)

### Error Handling

**Common issues:**

**1. "Task not found"**
```bash
# Verify task exists
task-master list

# Check task ID format (1.2.3 not 1-2-3)
task-master show 2.3  # Correct
```

**2. "Circular dependency detected"**
```bash
# Validate and fix
task-master validate-dependencies
task-master fix-dependencies
```

**3. "Task already in-progress"**
```bash
# Check current status
task-master show <id>

# Update status appropriately
task-master set-status --id=<id> --status=done
```

**4. "Next task has unmet dependencies"**
```bash
# Complete dependencies first
task-master show <blocking-task-id>
task-master set-status --id=<blocking-task-id> --status=done
```

## Examples

### Example 1: Standard Task Workflow

```bash
# Session start
task-master next
# Output: Next task: 2.3 - Implement enrollment limit validation

# Start task
task-master set-status --id=2.3 --status=in-progress
task-master update-subtask --id=2.3 --prompt="Starting implementation. Will add validation to enrollment endpoint."

# During work
task-master update-subtask --id=2.3 --prompt="Added limit check query. Counts existing enrollments for challenge."
task-master update-subtask --id=2.3 --prompt="Tests added. Verified limit enforcement works correctly."

# Complete
task-master update-subtask --id=2.3 --prompt="Completed. Tests: 5/5 passing. Committed: abc123f."
task-master set-status --id=2.3 --status=done

# Next
task-master next
```

### Example 2: Expand Complex Task

```bash
# View task
task-master show 3
# Output: Task 3 - Implement notifications system (complexity: 9/10)

# Too complex, expand
task-master expand --id=3 --num=5 --research
# Generates subtasks:
# 3.1 - Design notification schema
# 3.2 - Create notification API endpoints
# 3.3 - Implement email notifications
# 3.4 - Add in-app notifications
# 3.5 - Create notification preferences UI

# Start with first subtask
task-master set-status --id=3.1 --status=in-progress
```

### Example 3: Log Challenge and Solution

```bash
task-master update-subtask --id=2.3 --prompt="
Challenge: Enrollment count query timing out for large datasets
Investigation:
- Query was missing index on (challengeId, status)
- Sequential scan on Enrollment table (10k+ rows)
Solution:
- Added composite index: CREATE INDEX idx_enrollment_challenge_status
- Query time: 2.3s → 15ms
- Verified workspace isolation still enforced
Testing: All tests passing, performance verified
"
```

## Success Criteria

After using this skill, verify:

- [ ] Task status accurately reflects current work
- [ ] Progress notes are detailed and useful
- [ ] Dependencies are properly managed
- [ ] Next task is clear and ready to work
- [ ] Completed tasks have final notes and commit refs
- [ ] Task list is current and organized
- [ ] Context is preserved for future reference

## Related Skills

- **Git Workflow Skill** - Reference commits in task updates
- **Test Suite Runner Skill** - Log test results in tasks
- **Database Schema Migration Skill** - Track migration steps in tasks

---

*This skill ensures seamless Task Master integration, making task tracking effortless and valuable.*
