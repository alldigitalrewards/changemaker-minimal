# Review Sessions & Start Next Task

Review session status, identify gaps, update PROGRESS.md, and immediately start work on the next incomplete task.

## Steps

1. **Gather context** (parallel calls):
```bash
# List session files
ls -la .claude/sessions/ | grep "session-.*-task-" | awk '{print $9}'

# Read PROGRESS.md to see current state
@.claude/PROGRESS.md

# Read task list to understand all tasks
@.claude/plans/task-list.md
```

2. **Determine current phase**:
- Look at PROGRESS.md to find which phase has unchecked `[ ]` tasks
- Identify the task range for that phase (e.g., Phase 1 = Tasks 1-15)
- Note which tasks are checked `[x]` vs unchecked `[ ]`

3. **Analyze session coverage**:
- Extract task numbers from session filenames
- Compare against current phase task range
- Identify tasks with sessions vs without sessions

4. **Verify implementation for tasks without sessions**:
- For each task without a session file, check codebase for evidence:
  - Schema tasks → check prisma/schema.prisma for models/fields
  - Helper functions → check if lib/db/*.ts files exist
  - Middleware → grep for function names in lib/auth/
  - Documentation → check if docs/schema/*.md exist
  - Seed data → grep prisma/seed.ts for specific users
- Mark as COMPLETE if code evidence found, NOT FOUND otherwise

5. **Update PROGRESS.md**:
- For tasks with code evidence but no session: mark `[x]`
- For tasks without sessions or evidence: keep `[ ]`
- Use Edit tool to update checkboxes
- This keeps PROGRESS.md accurate with reality

6. **Identify next task**:
- Find lowest unchecked `[ ]` task number in PROGRESS.md
- Read dependencies from task-list.md
- Check if dependencies are met (all dependency tasks checked in PROGRESS.md)
- If blocked, find the blocking unchecked dependency

7. **Present summary**:
```
## Session Status

Current Phase: [Phase X - Phase Name]
Task Range: [n-m]

Sessions completed: [list of task numbers]
Sessions missing: [list of task numbers]

Code verification results:
- Task X: COMPLETE (code found)
- Task Y: NOT FOUND (missing)

PROGRESS.md updated:
- Marked complete: [tasks with code evidence]
- Remain unchecked: [tasks without evidence]

## Next Task: Task [N] - [Task Name]

Dependencies: [list with ✅/❌ status]
Ready to start: [YES/NO]

[If YES] Starting implementation...
[If NO] Blocked by Task [X], working on blocker instead...
```

8. **Start implementation immediately**:
- Read full task details from task-list.md
- Create session file: `.claude/sessions/session-YYYYMMDD-task-XX-[name].md`
- Implement task following instructions in task-list.md
- Run tests to verify
- Commit with: `feat: [description] (Task X)`
- Mark task complete in PROGRESS.md
- Push changes

## Important

- Works for ANY phase - not hardcoded to Phase 1
- Uses PROGRESS.md as source of truth for current phase
- Updates PROGRESS.md based on code evidence
- Starts work immediately - no confirmation needed
- If blocked by dependencies, works on blocker instead
- Creates session documentation as implementation progresses
