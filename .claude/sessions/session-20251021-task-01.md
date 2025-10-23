# Claude Code Session Template

Use this template to start each focused implementation session.

---

## Session [N]: [Task Name]

**Date**: YYYY-MM-DD
**Task ID**: Task [X] from Phase [N]
**Estimated Time**: [X] hours
**Actual Time**: [X] hours

### Context Files
```
@.claude/plans/task-list.md (lines [X-Y])
@.claude/PROGRESS.md
@[existing file to modify]
@[memory file if relevant]
```

### Task Summary
[1-2 sentences from task-list.md describing what this task accomplishes]

**Dependencies**: Task(s) [X, Y, Z] (must be complete)
**Blocks**: Task(s) [A, B, C] (waiting on this)

### Files to Create/Modify
- [ ] `path/to/file1.ts` (NEW)
- [ ] `path/to/file2.ts` (modified)
- [ ] `path/to/test.spec.ts` (NEW)

### Implementation Plan

#### Step 1: [Action Name]
```typescript
// Pseudocode or snippet from task-list.md
```

#### Step 2: [Action Name]
```typescript
// Pseudocode or snippet
```

#### Step 3: Testing
```bash
# Test commands
pnpm test [specific test file]
pnpm build
```

### Success Criteria
- [ ] [Deliverable 1 from task list]
- [ ] [Deliverable 2 from task list]
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] Code committed with proper message

### Testing Strategy
```bash
# Unit tests
pnpm test tests/[relevant test file]

# Integration tests (if applicable)
pnpm test:e2e [relevant test]

# Build verification
pnpm build

# Type check
pnpm tsc --noEmit
```

### Risks & Mitigations
- **Risk**: [Risk from task list]
  - **Mitigation**: [How we'll handle it]

### Implementation Notes
[Document decisions made during implementation]

**Decisions**:
- [Decision 1]: [Why we made this choice]
- [Decision 2]: [Why we made this choice]

**Challenges**:
- [Challenge 1]: [How we overcame it]

**Discoveries**:
- [Unexpected finding 1]

### Verification Checklist
- [ ] Code implements all requirements from task list
- [ ] All new code has tests (unit + integration if applicable)
- [ ] Existing tests still pass (no regressions)
- [ ] TypeScript compiles with no errors
- [ ] Build succeeds (`pnpm build`)
- [ ] Manual smoke test completed
- [ ] Authorization checks in place (if API endpoint)
- [ ] Workspace isolation verified (if multi-tenant code)
- [ ] Performance acceptable (if UI component)
- [ ] Error handling implemented
- [ ] Logging added (if async job or API)

### Commit Message
```
[type]: [description] (Task [X])

[Body explaining what changed and why]

Related tasks: #[X]
```

**Example**:
```
feat: add manager assignment API endpoints (Task 16)

Implements POST /api/workspaces/[slug]/challenges/[id]/managers
to allow admins to assign managers to challenges.

- Validates requester is ADMIN via requireWorkspaceAdmin()
- Creates ChallengeAssignment via helper function
- Returns assignment with manager user details
- Handles errors (manager not in workspace, already assigned)

Related tasks: #16
Dependencies: #10
```

### Update Progress
```bash
# Mark task complete in PROGRESS.md
sed -i '' 's/\[ \] \*\*Task [X]\*\*/\[x\] \*\*Task [X]\*\* ✅/' .claude/PROGRESS.md

# Update daily standup notes
# Add to "Completed" section for today

# Commit progress update
git add .claude/PROGRESS.md
git commit -m "progress: complete Task [X] - [task name]"
```

### Next Session
**Task [X+1]**: [Next task name]
- Estimated time: [X] hours
- Depends on: This task (Task [X])
- Ready to start: [Yes/No - check dependencies]

---

## Example Session: Task 1 - Schema Design

**Date**: 2025-10-21
**Task ID**: Task 1 from Phase 1
**Estimated Time**: 2 hours
**Actual Time**: TBD

### Context Files
```
@.claude/plans/task-list.md (lines 13-22)
@.claude/PROGRESS.md
@prisma/schema.prisma
```

### Task Summary
Add MANAGER role to WorkspaceMembership enum, create ChallengeAssignment model with indexes, extend SubmissionStatus enum with MANAGER_APPROVED and NEEDS_REVISION, add manager review fields to ActivitySubmission.

**Dependencies**: None (starts immediately)
**Blocks**: Tasks 2-15 (all of Phase 1)

### Files to Create/Modify
- [ ] `prisma/schema.prisma` (modified)

### Implementation Plan

#### Step 1: Add MANAGER to WorkspaceMembership.role enum
```prisma
enum Role {
  ADMIN
  PARTICIPANT
  MANAGER  // NEW
}
```

#### Step 2: Create ChallengeAssignment model
```prisma
model ChallengeAssignment {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  challengeId String    @db.Uuid
  managerId   String    @db.Uuid
  workspaceId String    @db.Uuid
  assignedBy  String    @db.Uuid
  assignedAt  DateTime  @default(now())

  Challenge   Challenge @relation(fields: [challengeId], references: [id], onDelete: Cascade)
  Manager     User      @relation("ManagerAssignments", fields: [managerId], references: [id], onDelete: Cascade)
  AssignedBy  User      @relation("AssignmentCreator", fields: [assignedBy], references: [id])
  Workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@unique([challengeId, managerId])
  @@index([managerId, workspaceId])
  @@index([challengeId])
  @@index([workspaceId])
}
```

#### Step 3: Extend SubmissionStatus enum
```prisma
enum SubmissionStatus {
  DRAFT
  PENDING
  MANAGER_APPROVED  // NEW
  NEEDS_REVISION    // NEW
  APPROVED
  REJECTED
}
```

#### Step 4: Add manager review fields to ActivitySubmission
```prisma
model ActivitySubmission {
  // ... existing fields
  managerReviewedBy   String?    @db.Uuid  // NEW
  managerReviewedAt   DateTime?            // NEW
  managerNotes        String?              // NEW
}
```

#### Step 5: Verify Schema
```bash
# Check for syntax errors
pnpm prisma validate

# Format schema
pnpm prisma format
```

### Success Criteria
- [x] Updated schema file with all changes
- [x] No syntax errors (`pnpm prisma validate`)
- [x] All indexes defined correctly
- [x] Relations defined with proper cascade deletes
- [x] Schema formatted consistently

### Testing Strategy
```bash
# Validate schema syntax
pnpm prisma validate

# Format schema
pnpm prisma format

# Don't run migration yet (that's Task 2)
```

### Risks & Mitigations
- **Risk**: Breaking changes to existing enums
  - **Mitigation**: Review all enum usages before migration (Task 2)
  - **Mitigation**: Test migration on staging clone (Task 3)

### Verification Checklist
- [ ] Schema has all required changes from task list
- [ ] `pnpm prisma validate` passes
- [ ] Indexes defined for query optimization
- [ ] Cascade deletes configured correctly
- [ ] No TypeScript errors (after Task 2 migration)
- [ ] Relations use proper relation names to avoid conflicts

### Commit Message
```
feat: add manager role schema changes (Task 1)

Adds foundation for manager role and challenge assignment system:
- Add MANAGER to Role enum
- Create ChallengeAssignment join table with proper indexes
- Extend SubmissionStatus with MANAGER_APPROVED, NEEDS_REVISION
- Add manager review fields to ActivitySubmission

Indexes optimized for:
- Manager queue queries (managerId + workspaceId)
- Challenge manager lookups (challengeId)
- Workspace isolation (workspaceId)

Related tasks: #1
Blocks: #2-15
```

### Update Progress
```bash
sed -i '' 's/\[ \] \*\*Task 1\*\*/\[x\] \*\*Task 1\*\* ✅/' .claude/PROGRESS.md
git add .claude/PROGRESS.md prisma/schema.prisma
git commit -m "progress: complete Task 1 - schema design"
```

### Next Session
**Task 2**: Migration Generation
- Estimated time: 0.5 hours
- Depends on: Task 1 (complete ✅)
- Ready to start: Yes

---

## Template Usage Instructions

1. **Copy this template** to a new file: `.claude/sessions/session-[N]-task-[X].md`
2. **Fill in all [brackets]** with actual values from task-list.md
3. **Keep the template open** during your session to track progress
4. **Update "Implementation Notes"** as you work
5. **Check off items** in "Verification Checklist" before committing
6. **Run the "Update Progress" commands** when complete
7. **Plan "Next Session"** section for continuity

### Naming Convention
- Session files: `.claude/sessions/session-001-task-01-schema-design.md`
- Commit messages: `feat: [description] (Task [X])`
- Progress commits: `progress: complete Task [X] - [name]`

### Session Workflow
```bash
# 1. Start new session
cp .claude/session-template.md .claude/sessions/session-$(printf "%03d" $N)-task-$(printf "%02d" $X)-[name].md

# 2. Fill in template with task details

# 3. Implement task following the steps

# 4. Verify all checklist items

# 5. Commit implementation
git add [changed files]
git commit -m "[type]: [description] (Task $X)"

# 6. Update progress
sed -i '' 's/\[ \] \*\*Task '$X'\*\*/\[x\] \*\*Task '$X'\*\* ✅/' .claude/PROGRESS.md
git add .claude/PROGRESS.md
git commit -m "progress: complete Task $X - [name]"

# 7. Push to remote
git push origin [branch-name]
```

---

**Last Updated**: 2025-10-20
