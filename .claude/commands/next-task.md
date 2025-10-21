# Find Next Task and Create Session

Find the next available task from the Manager Role & RewardSTACK Integration plan and create a session file ready for implementation.

## Steps

1. **Read current progress** from `.claude/PROGRESS.md`:
   - Find first unchecked task: `grep "\[ \]" .claude/PROGRESS.md | head -1`
   - Extract task number and name

2. **Check dependencies** in `.claude/plans/dependencies.md`:
   - Verify all prerequisite tasks are complete
   - Identify any blockers

3. **Read task details** from `.claude/plans/task-list.md`:
   - Find task section (lines for that task)
   - Extract: description, time estimate, files to modify, dependencies, risks

4. **Create session file**:
   - Copy `.claude/session-template.md`
   - Name: `.claude/sessions/session-$(date +%Y%m%d)-task-[XX]-[name].md`
   - Fill in ALL template fields with task details:
     - Session N and Task Name
     - Context Files (task-list.md lines)
     - Task Summary
     - Dependencies and Blocks
     - Files to Create/Modify
     - Implementation Plan (copy from task-list.md)
     - Success Criteria
     - Risks & Mitigations

5. **Display summary**:
   ```
   📋 Next Task: Task [X] - [Name]
   ⏱️  Estimated: [X] hours
   📁 Session File: .claude/sessions/session-[date]-task-[XX].md

   Dependencies: [Complete ✅ / Blocked 🔴]

   Quick Start:
   - Files to modify: [list]
   - First step: [from implementation plan]

   Session file is ready! Open it and start coding.
   ```

6. **Open session file** (if in IDE):
   - Output file path for user to click/open

## Context to Include

When generating the session file, include:
- Exact task description from task-list.md
- Code snippets/pseudocode from task-list.md
- Testing commands specific to this task
- Risk mitigations from task-list.md
- Links to related tasks (dependencies, blockers)

## Output Format

Present as a clear action plan with:
1. ✅ Task identified
2. ✅ Dependencies verified
3. ✅ Session file created at: [path]
4. 🚀 Ready to start - here's your first step: [action]

Then display the session file content for review.
