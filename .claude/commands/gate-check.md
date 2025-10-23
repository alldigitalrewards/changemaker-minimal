# Check Phase Gate Readiness

Check if you're ready to pass through the next phase gate (go/no-go decision point).

## Arguments

`$ARGUMENTS` = Gate number (1, 2, 3, or 4) - Optional, defaults to next gate

## Steps

1. **Determine which gate to check**:
   - If `$ARGUMENTS` provided, use that gate number
   - Else, auto-detect from current progress:
     - If tasks 1-14 complete → Check Gate 1
     - If tasks 1-29 complete → Check Gate 2
     - If tasks 1-44 complete → Check Gate 3
     - If tasks 1-59 complete → Check Gate 4

2. **Read gate criteria** from `.claude/PROGRESS.md`:
   - Find the gate section (e.g., "🚦 GATE 1 CRITERIA:")
   - Extract all checklist items

3. **Check each criterion**:

   **Gate 1 (Foundation Ready)**:
   - [ ] All Phase 1 tasks complete (1-15)
   - [ ] Migration deployed to staging
   - [ ] Rollback tested successfully
   - [ ] All unit tests pass (100%)
   - [ ] Authorization tests pass
   - [ ] Zero critical security issues

   **Gate 2 (Manager MVP Ready)**:
   - [ ] All Phase 2 tasks complete (16-30)
   - [ ] Manager can review assigned submissions
   - [ ] Two-step approval workflow working
   - [ ] Authorization tests passing
   - [ ] Manager queue loads <2 seconds
   - [ ] Zero critical security issues

   **Gate 3 (Rewards Flowing)**:
   - [ ] All Phase 3 tasks complete (31-45)
   - [ ] SKU reward flows end-to-end
   - [ ] Webhook handler verified
   - [ ] Retry logic tested
   - [ ] <5% failure rate in sandbox
   - [ ] Zero critical security issues

   **Gate 4 (Production Ready)**:
   - [ ] All Phase 4 tasks complete (46-60)
   - [ ] >90% overall test coverage
   - [ ] Zero critical security issues
   - [ ] Manager queue loads <2 seconds
   - [ ] All email triggers working
   - [ ] Deployment runbook verified
   - [ ] Team sign-off

4. **Verify each criterion**:
   - Tasks complete: Check PROGRESS.md for ✅
   - Tests passing: Suggest running `pnpm test`
   - Performance: Suggest running specific benchmarks
   - Security: Check if security audit task complete

5. **Calculate gate readiness score**:
   ```
   Score = (Criteria Met / Total Criteria) * 100
   ```

6. **Display gate report**:

   ```markdown
   # 🚦 Gate [N] Readiness Check

   **Gate**: [Name]
   **Date**: [Current Date]
   **Readiness**: X/Y criteria met ([X%])

   ## Criteria Status

   ### ✅ Complete
   - [x] All Phase N tasks complete (X/X)
   - [x] [Other complete criteria]

   ### 🔨 In Progress
   - [ ] [Criterion name]
     - Current: [Current state]
     - Required: [Required state]
     - Action: [What to do]

   ### ❌ Not Started
   - [ ] [Criterion name]
     - Action: [What to do]

   ## Verification Commands

   Run these to verify criteria:

   ```bash
   # Check tests
   pnpm test
   # Expected: X/X tests passing

   # Check build
   pnpm build
   # Expected: Successful build

   # Check security (if applicable)
   pnpm audit
   # Expected: 0 vulnerabilities

   # Check performance (if applicable)
   [Performance test command]
   # Expected: <2s response time
   ```

   ## Blockers 🚧

   [List any blockers preventing gate passage]

   ## Next Actions

   1. [Highest priority action to meet criteria]
   2. [Next action]
   3. [Next action]

   ## Decision

   [Auto-generated recommendation]

   **GO** ✅ - All criteria met. Ready to proceed to Phase [N+1]!

   **CONDITIONAL GO** ⚠️ - X/Y criteria met. Can proceed if:
   - [List conditions]

   **NO-GO** 🛑 - X/Y criteria met. Must complete:
   - [List missing criteria]

   ## Timeline Impact

   - Current: [Current date]
   - Target Gate [N] Date: [Original target]
   - Status: [On track / X days ahead / X days behind]
   ```

7. **Add recommendations** based on status:
   - 100%: "🎉 Congratulations! Gate [N] passed. Begin Phase [N+1] tasks."
   - 80-99%: "⚠️ Almost there! Complete X more items before proceeding."
   - 50-79%: "🔨 Continue working. Focus on: [highest priority items]"
   - <50%: "🛑 Not ready. Estimated X more days to complete criteria."

8. **Update PROGRESS.md** (if gate passed):
   - Mark gate as complete in gate status section
   - Update phase status to "Complete"
   - Add completion date to weekly summary

## Manual Verification Prompts

For criteria that need manual verification:

```markdown
### Manual Verification Required

Please verify the following manually:

1. **Manager can review assigned submissions**
   - [ ] Test: Assign manager to challenge
   - [ ] Test: Manager sees submission in queue
   - [ ] Test: Manager can approve/reject
   - [ ] Result: [Pass/Fail]

2. **Migration deployed to staging**
   - [ ] Run: `pnpm prisma migrate deploy` on staging
   - [ ] Check: Application starts successfully
   - [ ] Check: Database queries work
   - [ ] Result: [Pass/Fail]

[Mark checkboxes as you verify]
```

## Output Format

Present as:
1. **Summary** (readiness score, decision)
2. **Detailed status** (each criterion)
3. **Verification commands** (run to check)
4. **Blockers** (if any)
5. **Next actions** (prioritized)
6. **Decision** (GO/CONDITIONAL/NO-GO)
7. **Timeline impact** (on track/ahead/behind)

## Smart Features

- **Auto-detect gate** from current task progress
- **Color-coded status** (✅ 🔨 ❌)
- **Actionable items** (what to do next)
- **Timeline tracking** (days ahead/behind)
- **Manual verification prompts** for non-automated checks

## Example Usage

**Input**: `/gate-check` (auto-detect)
- If Task 14 complete → Check Gate 1
- Shows 5/6 criteria met (83%)
- Recommendation: "Complete Task 15 (Phase 1 validation) before gate review"

**Input**: `/gate-check 2`
- Explicitly check Gate 2 (Manager MVP)
- Shows current status even if Phase 2 not complete
- Useful for planning ahead
