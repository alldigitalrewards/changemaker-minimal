# Start New Task Session

Interactively start a new implementation session for a specific task number.

## Arguments

`$ARGUMENTS` = Task number (e.g., "1", "16", "45")

## Steps

1. **Validate task number**:
   - Parse `$ARGUMENTS` to get task number
   - Verify task exists in `.claude/plans/task-list.md`
   - Check if task already completed in `.claude/PROGRESS.md`

2. **Check dependencies**:
   - Read task dependencies from task-list.md
   - Verify all prerequisite tasks are complete
   - If dependencies not met, show blockers and exit

3. **Extract task details** from `.claude/plans/task-list.md`:
   - Find task section (use grep or search)
   - Extract:
     - Task title
     - Description
     - Time estimate
     - Dependencies (tasks that must be complete)
     - Blocks (tasks waiting on this)
     - Files to create/modify
     - Deliverables
     - Risks
     - Implementation steps (if any)

4. **Create session file**:
   - Generate filename: `session-$(date +%Y%m%d)-task-$(printf "%02d" $TASK_NUM)-[slugified-name].md`
   - Copy from `.claude/session-template.md`
   - Fill in template with extracted task details:

   ```markdown
   ## Session [N]: [Task Name]

   **Date**: $(date +%Y-%m-%d)
   **Task ID**: Task $TASK_NUM from Phase [N]
   **Estimated Time**: [X] hours

   ### Context Files
   @.claude/plans/task-list.md (lines [X-Y])
   @.claude/PROGRESS.md
   [Additional context files based on task type]

   ### Task Summary
   [Full description from task-list.md]

   **Dependencies**: Task(s) [list] (✅ complete)
   **Blocks**: Task(s) [list]

   ### Files to Create/Modify
   [List from task-list.md with checkboxes]

   ### Implementation Plan
   [Steps from task-list.md, numbered with code snippets if available]

   ### Success Criteria
   [Deliverables from task-list.md as checkboxes]

   ### Risks & Mitigations
   [From task-list.md]
   ```

5. **Mark task as in-progress** (optional):
   - Update `.claude/PROGRESS.md`
   - Change task status from `[ ]` to `[ ] 🔨` (in progress indicator)
   - Update today's standup notes: "Started: Task X"

6. **Display session info**:
   ```markdown
   # 🚀 Session Started: Task [X] - [Name]

   **Session File**: .claude/sessions/[filename].md
   **Estimated Time**: [X] hours
   **Phase**: Phase [N]

   ## Dependencies
   ✅ Task 1: [Name] - Complete
   ✅ Task 2: [Name] - Complete

   ## This Task Will Unlock
   ⏳ Task Y: [Name]
   ⏳ Task Z: [Name]

   ## Files You'll Modify
   - [ ] path/to/file1.ts (NEW)
   - [ ] path/to/file2.ts (modified)

   ## First Step
   [First implementation step from plan]

   ## Quick Commands
   # Open session file
   code .claude/sessions/[filename].md

   # Run tests
   pnpm test

   # Mark complete when done
   ./scripts/mark-task-complete.sh [X]

   ---

   Session file is ready! Start implementing following the plan.
   ```

7. **Open session file** (show content for review):
   - Read and display the created session file
   - Highlight first implementation step

## Smart Features

- **Auto-detect phase** from task number (1-15=Phase1, 16-30=Phase2, etc.)
- **Context-aware file suggestions** based on task type:
  - Schema tasks → include `prisma/schema.prisma`
  - API tasks → include similar API route files
  - UI tasks → include similar component files
  - Test tasks → include test helpers
- **Extract code snippets** from task-list.md if present
- **Warning messages**:
  - If task dependencies not complete
  - If task already complete
  - If task is critical path

## Examples

**Input**: `/session-start 1`
**Output**: Creates session for Task 1 (Schema Design), shows it's Phase 1, no dependencies

**Input**: `/session-start 16`
**Output**: Creates session for Task 16 (Assignment API), checks Task 10 is complete, shows this is Phase 2

**Input**: `/session-start 27`
**Result**: Warns "⚠️ Task 27 depends on Tasks 18, 19 which are not complete yet"

## Error Handling

- Invalid task number → "Task $N not found in plan"
- Dependencies not met → "❌ Cannot start Task $N - waiting on Task(s) $X, $Y"
- Task already complete → "✅ Task $N already complete. Start next task instead?"
- No arguments → Prompt user: "Which task? (Enter number 1-60)"

## Output

Creates session file and displays:
1. Session file path
2. Task context (phase, dependencies, blocks)
3. Files to modify
4. First implementation step
5. Quick commands to get started
