# Review Completed Sessions

Review completed implementation sessions to extract learnings, identify patterns, and prepare context for upcoming work.

## Steps

1. **Find all session files**:
   - List files in `.claude/sessions/` directory
   - Sort by date (most recent first)
   - Extract task numbers from filenames

2. **Read each session file** and extract:
   - Task number and name
   - Date completed
   - Estimated time vs actual time
   - Implementation decisions made
   - Challenges encountered
   - Discoveries/learnings
   - Verification status (all checkboxes complete?)

3. **Categorize sessions** by phase:
   - Phase 1: Foundation (Tasks 1-15)
   - Phase 2: Manager Role (Tasks 16-30)
   - Phase 3: RewardSTACK (Tasks 31-45)
   - Phase 4: Polish (Tasks 46-60)

4. **Extract key insights**:
   - **Decisions**: What technical choices were made?
   - **Challenges**: What was harder than expected?
   - **Discoveries**: What unexpected findings?
   - **Patterns**: What approaches worked well?
   - **Learnings**: What would you do differently?

5. **Display comprehensive review**:

   ```markdown
   # 📚 Session Review Report

   **Generated**: [Current Date]
   **Sessions Reviewed**: X sessions
   **Tasks Completed**: X/60

   ## Recent Sessions (Last 5)

   ### Session 1: Task X - [Name]
   - **Date**: YYYY-MM-DD
   - **Phase**: Phase N
   - **Time**: [Estimated] hours → [Actual] hours
   - **Status**: Complete ✅

   **Key Decisions**:
   - [Decision 1]: [Rationale]
   - [Decision 2]: [Rationale]

   **Challenges**:
   - [Challenge 1]: [How overcome]

   **Discoveries**:
   - [Discovery 1]

   ---

   [Repeat for each recent session]

   ## Sessions by Phase

   ### Phase 1: Foundation (X/15 complete)
   - ✅ Task 1: Schema Design (2h est / 2h actual)
   - ✅ Task 2: Migration Generation (0.5h est / 0.75h actual)
   - 🔨 Task 3: Migration Testing (in progress)
   - ⏳ Task 4-15: Pending

   ### Phase 2: Manager Role (X/15 complete)
   [Same format]

   ### Phase 3: RewardSTACK (X/15 complete)
   [Same format]

   ### Phase 4: Polish (X/15 complete)
   [Same format]

   ## Key Learnings

   ### Technical Decisions
   1. **ChallengeAssignment join table** (Task 3)
      - Chose join table over array in Challenge model
      - Reason: Better query performance, audit trail
      - Impact: Enables efficient manager queue queries

   2. **Two-step approval workflow** (Task 20)
      - PENDING → MANAGER_APPROVED → APPROVED
      - Reason: Clear separation of concerns
      - Impact: Admin can override manager decisions

   [Extract from session "Decisions" sections]

   ### Common Challenges
   1. **Migration testing** (Tasks 3, 12, 21, 39)
      - Challenge: Staging schema differs from production
      - Solution: Clone production DB before testing
      - Lesson: Always test migrations on production clone

   2. **Authorization edge cases** (Tasks 16-20, 27)
      - Challenge: Cross-workspace access attempts
      - Solution: Always filter by workspaceId
      - Lesson: Add workspace isolation tests for all new endpoints

   [Extract from session "Challenges" sections]

   ### Unexpected Discoveries
   1. **N+1 query in manager queue** (Task 18)
      - Found: Initial implementation had N+1 queries
      - Fix: Added proper includes in Prisma query
      - Impact: 10x performance improvement

   2. **Webhook signature timing attack** (Task 37)
      - Found: String comparison vulnerable to timing attack
      - Fix: Used timing-safe comparison
      - Impact: Security vulnerability prevented

   [Extract from session "Discoveries" sections]

   ### Pattern Recognition
   1. **API endpoint pattern**:
      - requireWorkspaceAccess() → workspace isolation
      - try/catch → typed error handling
      - ActivityEvent logging → audit trail
      - Used consistently in Tasks 16-20, 31-38

   2. **Testing pattern**:
      - Unit tests → Integration tests → E2E tests
      - Prisma helpers for test data setup
      - MSW for external API mocking
      - Applied in Tasks 27-30, 41-45, 54

   ## Velocity Analysis

   **Average task completion time**:
   - Estimated: [X] hours/task
   - Actual: [Y] hours/task
   - Variance: [+/-]X%

   **Fastest tasks**:
   - Task X: [Name] - 0.5h actual (1h estimated)
   - Task Y: [Name] - 1h actual (2h estimated)

   **Slowest tasks**:
   - Task Z: [Name] - 6h actual (3h estimated)
     - Reason: [From session notes]

   ## Time Tracking

   | Phase | Est Hours | Actual Hours | Variance |
   |-------|-----------|--------------|----------|
   | Phase 1 | 26h | Xh | +/-Y% |
   | Phase 2 | 56.5h | Xh | +/-Y% |
   | Phase 3 | 49h | Xh | +/-Y% |
   | Phase 4 | 43.5h | Xh | +/-Y% |
   | **Total** | **151h** | **Xh** | **+/-Y%** |

   ## Recommendations for Upcoming Work

   Based on completed sessions:

   1. **Time estimates**: [Adjust up/down based on variance]
   2. **Risk areas**: [Focus on based on challenges]
   3. **Patterns to reuse**: [What worked well]
   4. **Avoid**: [What didn't work]

   ## Context for Next Session

   **Completed recently**:
   - [Last 3 tasks with key outcomes]

   **Ready to start next**:
   - Task [X]: [Name]
   - Dependencies: All complete ✅
   - Estimated: [X] hours
   - Key context from prior sessions:
     - [Relevant learning 1]
     - [Relevant learning 2]

   **Watch out for**:
   - [Known issues from recent sessions]
   - [Common pitfalls to avoid]
   ```

6. **Extract context for AI continuation**:
   - Summarize technical decisions made
   - List established patterns to follow
   - Identify dependencies between completed tasks
   - Highlight any deviations from original plan

7. **Identify trends**:
   - Are tasks taking longer than estimated?
   - Are certain types of tasks consistently harder?
   - What patterns emerge in challenges?
   - What patterns emerge in solutions?

## Smart Features

- **Auto-calculate variance**: Estimated vs actual time
- **Pattern detection**: Find recurring decisions/challenges
- **Context linking**: Show how past decisions affect upcoming tasks
- **Velocity tracking**: Tasks per day, hours per task
- **Risk identification**: Which upcoming tasks might have similar challenges

## Output Format

Present as:
1. **Quick summary** (X sessions, Y tasks complete)
2. **Recent sessions** (last 5 with details)
3. **Phase breakdown** (completion status)
4. **Key learnings** (decisions, challenges, discoveries)
5. **Velocity analysis** (time tracking)
6. **Recommendations** (for upcoming work)
7. **Next session context** (what you need to know)

## Use Cases

**Before starting new session**:
- Review related completed sessions
- Extract relevant patterns/decisions
- Prepare context for similar work

**Weekly review**:
- Assess velocity and timeline
- Identify process improvements
- Document learnings

**Gate review**:
- Verify all phase tasks complete
- Extract phase-specific learnings
- Prepare gate presentation

## Example Output

If 3 sessions completed (Tasks 1-3):

```
📚 Session Review Report

Sessions Reviewed: 3 sessions
Tasks Completed: 3/60 (5%)

Recent Sessions:
1. Task 3: Migration Testing (2h est / 3h actual)
   - Decision: Test on production DB clone
   - Challenge: Staging schema out of sync
   - Learning: Always clone production for migration testing

2. Task 2: Migration Generation (0.5h est / 0.5h actual)
   - Decision: Manual SQL review before running
   - Discovery: Prisma generates unnecessary ALTER statements

3. Task 1: Schema Design (2h est / 2h actual)
   - Decision: ChallengeAssignment join table
   - Rationale: Better performance vs array
   - Impact: Enables efficient queue queries

Key Learnings:
- Migration testing requires production clone
- Manual SQL review catches Prisma issues
- Join table design decision affects Phase 2 performance

Recommendations:
- Continue thorough migration testing (Task 12, 21, 39)
- Reuse ChallengeAssignment pattern for other many-to-many relationships
- Budget extra time for migration tasks (50% variance)

Next Session: Task 4 - Backward Compatibility Layer
- Context: Schema now has MANAGER role (Task 1)
- Pattern: Follow workspace isolation pattern from existing code
```
