# START HERE: Manager Role & RewardSTACK Integration

**Welcome to the implementation workflow!** This guide gets you started with the 60-task plan.

---

## 🎯 What You're Building

Adding two major features to the Changemaker platform:

1. **Manager Role**: Middle-tier approval workflow between participants and admins
2. **RewardSTACK Integration**: External SKU and monetary reward fulfillment

**Timeline**: 4 weeks (151 hours solo / 83 hours with 2 devs)
**Tasks**: 60 total across 4 phases
**Gates**: 4 go/no-go decision points

---

## 📋 Before You Start

### Prerequisites
- [x] Node.js 18+ installed
- [x] pnpm installed
- [x] PostgreSQL running (local or Supabase)
- [x] Git configured
- [ ] RewardSTACK API credentials (for Phase 3)
- [ ] Inngest account (for Phase 3)

### Environment Setup
```bash
# Verify you're in the project root
pwd
# Should show: /Users/jack/Projects/changemaker-template

# Install dependencies
pnpm install

# Verify Prisma schema
pnpm prisma validate

# Run existing tests (should all pass)
pnpm test
# Expected: 58 passing tests

# Build to verify environment
pnpm build
```

**✅ If all above pass, you're ready to start!**

---

## 📁 File Structure Overview

```
.claude/
├── START-HERE.md                    # This file
├── PROGRESS.md                      # Live progress tracker (UPDATE DAILY)
├── session-template.md              # Template for each task
├── plans/
│   ├── task-list.md                # Complete 60-task breakdown
│   └── dependencies.md             # Dependency graph
├── workflows/
│   ├── README.md                   # Workflow quick reference
│   └── update-progress.md          # Progress update instructions
└── sessions/                        # Created as you work
    └── session-YYYYMMDD-task-X.md  # One per task

scripts/
└── mark-task-complete.sh            # Automated progress updater
```

---

## 🚀 Step-by-Step First Task

Let's complete **Task 1: Schema Design** together.

### Step 1: Read the Task Details

```bash
# Open task list and find Task 1
open .claude/plans/task-list.md
# Or: cat .claude/plans/task-list.md | grep -A 20 "Task 1:"
```

**Task 1 Summary**:
- Add MANAGER to Role enum
- Create ChallengeAssignment model
- Extend SubmissionStatus enum
- Add manager review fields
- Time: 2 hours

### Step 2: Create Session File

```bash
# Copy template
cp .claude/session-template.md .claude/sessions/session-$(date +%Y%m%d)-task-01.md

# Open in editor
code .claude/sessions/session-$(date +%Y%m%d)-task-01.md
# Or: vim, nano, etc.
```

**Fill in the template**:
- Session N: 1
- Task Name: Schema Design & Review
- Task ID: Task 1 from Phase 1
- Estimated Time: 2 hours
- Files to Modify: `prisma/schema.prisma`

### Step 3: Implement Task 1

**Edit `prisma/schema.prisma`**:

```prisma
// 1. Add MANAGER to Role enum
enum Role {
  ADMIN
  PARTICIPANT
  MANAGER  // NEW
}

// 2. Create ChallengeAssignment model
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

// 3. Extend SubmissionStatus enum
enum SubmissionStatus {
  DRAFT
  PENDING
  MANAGER_APPROVED  // NEW
  NEEDS_REVISION    // NEW
  APPROVED
  REJECTED
}

// 4. Add manager review fields to ActivitySubmission
model ActivitySubmission {
  // ... existing fields
  managerReviewedBy   String?    @db.Uuid  // NEW
  managerReviewedAt   DateTime?            // NEW
  managerNotes        String?              // NEW
}
```

### Step 4: Verify Schema

```bash
# Validate syntax
pnpm prisma validate
# Should output: "The schema is valid ✔"

# Format schema
pnpm prisma format
```

### Step 5: Commit Implementation

```bash
# Stage changes
git add prisma/schema.prisma

# Commit with proper message
git commit -m "feat: add manager role schema changes (Task 1)

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
Blocks: #2-15"
```

### Step 6: Update Progress

```bash
# Automated (recommended)
./scripts/mark-task-complete.sh 1

# The script will:
# 1. Mark Task 1 as complete in PROGRESS.md
# 2. Show what changed
# 3. Ask if you want to commit
```

**Manual alternative**:
```bash
# Edit .claude/PROGRESS.md
# Find: - [ ] **Task 1**: Schema Design & Review ⏱️ 2h
# Change to: - [x] **Task 1**: Schema Design & Review ⏱️ 2h ✅

# Also update daily standup notes for today:
# - **Started**: Task 1 (Schema Design)
# - **Completed**: Task 1 ✅
# - **Hours Logged**: 2h
# - **Tomorrow**: Task 2 (Migration Generation)

# Commit progress
git add .claude/PROGRESS.md
git commit -m "progress: complete Task 1 - schema design"
```

### Step 7: Push Changes

```bash
git push origin [your-branch-name]
```

**🎉 Congratulations! You've completed Task 1!**

---

## 🔄 Repeat for Each Task

Now that you've completed Task 1, repeat this workflow for Tasks 2-60:

1. **Read task details** from `.claude/plans/task-list.md`
2. **Create session file** from template
3. **Implement** following the task plan
4. **Test** (`pnpm test`, `pnpm build`)
5. **Commit implementation** with proper message
6. **Update progress** with `./scripts/mark-task-complete.sh [X]`
7. **Push** to remote

---

## 📅 Phase Breakdown

### Phase 1: Foundation (Week 1)
**Tasks 1-15** | **26 hours** | **Status**: 🔴 Not Started

**Critical Path**: All tasks are sequential
**Deliverable**: Database schema with MANAGER role, authorization, tests

**Next Steps**:
1. ✅ Task 1: Schema Design (completed above!)
2. ⏳ Task 2: Generate migration
3. ⏳ Task 3: Test migration on staging clone ⚠️ CRITICAL

**Gate 1 Criteria**: See `.claude/PROGRESS.md` for checklist

---

### Phase 2: Manager Role (Week 2)
**Tasks 16-30** | **56.5 hours** | **Status**: 🔴 Not Started

**Can start after**: Gate 1 (Task 15 complete)
**Can run in parallel with**: Phase 3 (if 2 developers)

**Key Tasks**:
- Task 16-17: Assignment API endpoints
- Task 19: Manager review API ⚠️ CRITICAL (authorization)
- Task 23: Manager dashboard UI
- Task 27-29: Authorization tests

**Gate 2 Criteria**: Manager can review submissions end-to-end

---

### Phase 3: RewardSTACK Integration (Week 2, Parallel)
**Tasks 31-45** | **49 hours** | **Status**: 🔴 Not Started

**Can start after**: Gate 1 (Task 15 complete)
**Can run in parallel with**: Phase 2

**Key Tasks**:
- Task 32: RewardSTACK API client
- Task 36: Async reward fulfillment job ⚠️ CORE LOGIC
- Task 38: Webhook handler
- Task 42: Integration tests with MSW

**Gate 3 Criteria**: SKU rewards flowing end-to-end

---

### Phase 4: Polish & Production (Week 3-4)
**Tasks 46-60** | **43.5 hours** | **Status**: 🔴 Not Started

**Can start after**: Gates 2 & 3 (Tasks 30 & 45 complete)

**Key Tasks**:
- Task 46-53: Email notifications
- Task 54: Comprehensive E2E tests ⚠️ CRITICAL GATE
- Task 56: Security audit ⚠️ CRITICAL GATE
- Task 60: Production deployment

**Gate 4 Criteria**: Production ready with >90% test coverage

---

## 📊 Daily Workflow Reference

### Morning (15 min)
```bash
# 1. Check what's next
cat .claude/PROGRESS.md | grep "\[ \]" | head -5

# 2. Verify dependencies
grep "Task [X]" .claude/plans/task-list.md | grep "Dependencies"

# 3. Create session file
cp .claude/session-template.md .claude/sessions/session-$(date +%Y%m%d)-task-[X].md

# 4. Plan your work in the session file
```

### During Work (4-6 hours)
```bash
# 1. Implement following session plan

# 2. Test continuously
pnpm test --watch

# 3. Document decisions in session file
```

### Evening (15 min)
```bash
# 1. Run verification checklist
pnpm test
pnpm build

# 2. Commit implementation
git add [files]
git commit -m "[type]: [description] (Task [X])"

# 3. Update progress
./scripts/mark-task-complete.sh [X]

# 4. Push
git push
```

---

## 🚦 Gate Reviews

After every 15 tasks, you'll hit a **Phase Gate** (go/no-go decision point).

### What is a Gate Review?

A checkpoint to verify:
- All phase tasks complete
- All tests passing
- No critical bugs
- Performance acceptable
- Ready to proceed or fix issues

### Gate Process

1. **Run gate checklist** (in PROGRESS.md)
2. **Review deliverables** (all tasks in phase)
3. **Decision**: GO (proceed) or NO-GO (fix issues)
4. **Document decision** in PROGRESS.md

**If NO-GO**: Fix blockers, re-test, re-review

**If GO**: Proceed to next phase!

---

## 🆘 Getting Unstuck

### "I don't know what task to work on next"

```bash
# Check current progress
grep "\[ \]" .claude/PROGRESS.md | head -1

# Check dependencies
grep "Depends on" .claude/plans/task-list.md | grep "Task [X]"
```

### "My implementation doesn't match the task description"

That's okay! Task list is a guide, not gospel. Document your approach in the session file and explain why you diverged.

### "Tests are failing"

```bash
# Regenerate Prisma client
pnpm prisma generate

# Reset test database
pnpm prisma migrate reset --force

# Run specific test
pnpm test [test-file-name]
```

### "I'm stuck on a task"

1. Re-read task details in `.claude/plans/task-list.md`
2. Check dependency graph in `.claude/plans/dependencies.md`
3. Review similar existing code in the codebase
4. Ask for help (team Slack, pair programming)
5. Document the blocker in PROGRESS.md

---

## 📚 Essential Reading

Before starting Phase 1:
- [ ] `.claude/plans/task-list.md` - All 60 tasks
- [ ] `.claude/plans/dependencies.md` - Critical path
- [ ] `.claude/PROGRESS.md` - Track your progress here
- [ ] `.claude/workflows/README.md` - Quick reference

Before starting each phase:
- [ ] Read all tasks in that phase (15 tasks)
- [ ] Review gate criteria for that phase
- [ ] Check dependency graph for parallel work

---

## 🎯 Success Metrics

Track these in `.claude/PROGRESS.md`:

### Code Metrics
- **New Files**: 0/60 created
- **Tests Written**: 0/75 new tests
- **Test Coverage**: +0% (target: +130%)

### Quality Metrics
- **Tests Passing**: 58/58 (100%)
- **Critical Bugs**: 0
- **Security Issues**: 0

### Velocity Metrics
- **Tasks Completed**: 0/60 (0%)
- **Hours Logged**: 0/151h (0%)
- **Sprint Velocity**: N/A (track after Week 1)

---

## ✅ You're Ready!

You now have everything you need:

- [x] **Planning docs** - 60 tasks detailed
- [x] **Progress tracker** - PROGRESS.md ready
- [x] **Session template** - Start focused work
- [x] **Update scripts** - Automated progress updates
- [x] **Workflow guides** - Reference when stuck

**Next action**: Start Task 1 (see above walkthrough)

**Questions?** Check:
1. `.claude/workflows/README.md` - Quick reference
2. `.claude/workflows/update-progress.md` - Progress updates
3. `.claude/plans/dependencies.md` - Task relationships

---

## 🚀 Let's Build!

```bash
# Your first command:
cp .claude/session-template.md .claude/sessions/session-$(date +%Y%m%d)-task-01.md

# Then open in your editor:
code .claude/sessions/session-$(date +%Y%m%d)-task-01.md
```

**Good luck! You've got this! 💪**

---

**Project**: Manager Role & RewardSTACK Integration
**Total Tasks**: 60 across 4 phases
**Target**: 2025-11-10 (4 weeks)
**Last Updated**: 2025-10-20
