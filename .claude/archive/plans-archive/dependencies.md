# Manager Role & RewardSTACK Integration - Dependency Graph

## Critical Path Overview

```
Phase 1 (Foundation) → GATE 1 → Phase 2 (Manager) + Phase 3 (RewardSTACK) → GATE 2 + GATE 3 → Phase 4 (Polish) → GATE 4 → Production
```

**Total Duration**: 151 hours (19 days @ 8hr/day)
**Critical Path Duration**: 83 hours (10.4 days)
**Parallelization Opportunity**: 68 hours saved (2 developers after Phase 1)

---

## Phase 1: Foundation (Week 1) - Sequential

**CRITICAL PATH** - All tasks sequential, blocks everything

```
Task 1 (Schema Design)
    ↓
Task 2 (Migration: MANAGER role)
    ↓
Task 3 (Migration: ChallengeAssignment)
    ↓
Task 4 (Migration: SubmissionStatus)
    ↓
Task 5 (Migration: Review fields)
    ↓
Task 6 (Seed: Manager users)
    ↓
Task 7 (RBAC: Manager permissions)
    ↓
Task 8 (Middleware: Manager routes)
    ↓
Task 9 (Auth helper: isManager)
    ↓
Task 10 (Queries: assignment helpers)
    ↓
Task 11 (Rollback SQL)
    ↓
Task 12 (Unit tests: RBAC)
    ↓
Task 13 (Unit tests: Queries)
    ↓
Task 14 (Integration tests: Assignment)
    ↓
Task 15 (Phase 1 validation)
    ↓
🚦 GATE 1: Schema migration deployed to staging
```

**Critical Path Duration**: 39.5 hours
**Blocking**: All Phase 2 and Phase 3 tasks

---

## Phase 2: Manager Role (Week 2) - After Gate 1

**Can run in PARALLEL with Phase 3**

```
Task 16 (API: Assign manager)
    ↓
Task 17 (API: List managers) ←─────────┐
    ↓                                  │
Task 18 (API: Unassign) ←──────────────┤
    ↓                                  │
Task 19 (API: Manager queue) ←─────────┤
    ↓                                  │
Task 20 (API: Manager review) ←────────┤ (All depend on Task 16)
    ↓                                  │
Task 21 (Hook: Auto-assign) ←──────────┤
    ↓                                  │
Task 22 (Hook: Manager notifications)──┘
    ↓
Task 23 (UI: Challenge assignment) ←─── Depends on Tasks 16-18
    ↓
Task 24 (UI: Manager dashboard) ←────── Depends on Task 19
    ↓
Task 25 (UI: Submission review) ←────── Depends on Task 20
    ↓
Task 26 (E2E test: Assignment flow) ←── Depends on Tasks 16-18
    ↓
Task 27 (E2E test: Approval flow) ←──── Depends on Tasks 19-20, 23-25
    ↓
Task 28 (API tests: Manager endpoints) ← Depends on Tasks 16-22
    ↓
Task 29 (UI tests: Manager screens) ←─── Depends on Tasks 23-25
    ↓
Task 30 (Phase 2 validation)
    ↓
🚦 GATE 2: Manager role functional on staging
```

**Phase 2 Duration**: 56.5 hours
**Critical Path Contribution**: 56.5 hours (sequential within phase)
**Blocks**: Tasks 46-50 (Phase 4 Manager notifications)

---

## Phase 3: RewardSTACK Integration (Week 3) - After Gate 1

**Can run in PARALLEL with Phase 2**

```
Task 31 (API client: RewardSTACK)
    ↓
Task 32 (Inngest: Job queue setup) ←───┐
    ↓                                  │
Task 33 (Job: Reward fulfillment) ←────┤ (Depends on Tasks 31-32)
    ↓                                  │
Task 34 (Job: Failure handling) ←──────┤
    ↓                                  │
Task 35 (Job: Retry logic) ←───────────┘
    ↓
Task 36 (Webhook: Handler endpoint) ←── Depends on Task 31
    ↓
Task 37 (Webhook: Signature verify) ←── Depends on Task 36
    ↓
Task 38 (Webhook: Status updates) ←──── Depends on Task 37
    ↓
Task 39 (UI: Reward history) ←───────── Depends on Tasks 33-35
    ↓
Task 40 (UI: Fulfillment status) ←───── Depends on Tasks 36-38
    ↓
Task 41 (Tests: RewardSTACK mock) ←──── Depends on Task 31
    ↓
Task 42 (Tests: Job queue) ←─────────── Depends on Tasks 32-35
    ↓
Task 43 (Tests: Webhook handler) ←───── Depends on Tasks 36-38
    ↓
Task 44 (Tests: Retry scenarios) ←───── Depends on Tasks 34-35
    ↓
Task 45 (Phase 3 validation)
    ↓
🚦 GATE 3: Rewards flowing end-to-end on staging
```

**Phase 3 Duration**: 49 hours
**Critical Path Contribution**: 0 hours (parallel with Phase 2)
**Blocks**: Tasks 51-54 (Phase 4 Reward notifications)

---

## Phase 4: Polish & Production (Week 4) - After Gates 2 & 3

**Sequential dependencies on prior gates**

```
🚦 GATE 2 (Manager) + GATE 3 (Rewards) → Tasks 46-60

Task 46 (Notifications: Assignment email) ←── Depends on Task 23
    ↓
Task 47 (Notifications: Approval needed) ←─── Depends on Task 20
    ↓
Task 48 (Notifications: Manager decision) ←── Depends on Task 25
    ↓
Task 49 (Notifications: Template tests) ←──── Depends on Tasks 46-48
    ↓
Task 50 (Notifications: Delivery tests) ←──── Depends on Task 49
    ↓
Task 51 (Notifications: Reward success) ←──── Depends on Task 40
    ↓
Task 52 (Notifications: Reward failure) ←──── Depends on Task 34
    ↓
Task 53 (Notifications: Template tests) ←──── Depends on Tasks 51-52
    ↓
Task 54 (Notifications: Delivery tests) ←──── Depends on Task 53
    ↓
Task 55 (Feature flags: v1.0-v1.2) ←───────── Independent
    ↓
Task 56 (Performance: Query optimization) ←── Depends on Task 10
    ↓
Task 57 (Docs: Manager guides)
    ↓
Task 58 (Docs: Reward integration)
    ↓
Task 59 (Production deploy prep)
    ↓
Task 60 (Phase 4 validation)
    ↓
🚦 GATE 4: Production deployment
```

**Phase 4 Duration**: 43.5 hours
**Critical Path Contribution**: 43.5 hours
**Blocks**: Production launch

---

## Parallel Work Strategy

### Two-Developer Optimal Schedule

**Week 1 (Phase 1)**:
- **Dev A + Dev B**: Pair on critical path (Tasks 1-15)
- **Duration**: 39.5 hours → 2.5 days @ 2 devs

**Week 2-3 (Phases 2 & 3)**:
- **Dev A**: Phase 2 Manager Role (Tasks 16-30)
- **Dev B**: Phase 3 RewardSTACK (Tasks 31-45)
- **Duration**: max(56.5, 49) = 56.5 hours → 3.5 days

**Week 4 (Phase 4)**:
- **Dev A**: Manager notifications (Tasks 46-50)
- **Dev B**: Reward notifications (Tasks 51-54)
- **Both**: Feature flags, docs, deploy (Tasks 55-60)
- **Duration**: 43.5 hours → 2.7 days

**Total with 2 devs**: 8.7 days (~9 days)
**Savings**: 10 days (50% reduction)

---

## Blocking Relationships Matrix

| Task | Blocks | Blocked By |
|------|--------|------------|
| 1 | 2 | - |
| 2 | 3 | 1 |
| 3 | 6, 10 | 2 |
| 4 | 20 | 2 |
| 5 | 20 | 2 |
| 7 | 8, 12 | 2-6 |
| 8 | 16-22 | 7 |
| 10 | 13, 14, 16-22, 56 | 3, 6 |
| 15 | GATE 1 | 1-14 |
| GATE 1 | 16-45 | 15 |
| 16 | 17-18, 21-23, 26 | GATE 1 |
| 19 | 24, 27 | GATE 1 |
| 20 | 25, 27, 47 | GATE 1, 4, 5 |
| 23 | 26, 29, 46 | 16-18 |
| 30 | GATE 2 | 16-29 |
| 31 | 33-36, 41 | GATE 1 |
| 32 | 33-35, 42 | GATE 1 |
| 36 | 37, 43 | 31 |
| 40 | 51 | 33-38 |
| 45 | GATE 3 | 31-44 |
| GATE 2 | 46-50 | 30 |
| GATE 3 | 51-54 | 45 |
| GATE 2+3 | 55-60 | 30, 45 |
| 60 | GATE 4 | 46-59 |

---

## Critical Path Tasks (Must Stay on Schedule)

**Total Critical Path Duration**: 83 hours (39.5 + 0 + 56.5 - overlap + 43.5)

### Phase 1 (All tasks critical):
1. Task 1: Schema Design (4h)
2. Task 2: MANAGER enum (3h)
3. Task 3: ChallengeAssignment table (4h)
4. Task 7: RBAC permissions (3h)
5. Task 8: Middleware protection (2h)
6. Task 10: Query helpers (3h)
7. Task 15: Phase validation (2h)

### Phase 2 (Longest sequential chain):
8. Task 16: Assignment API (4h)
9. Task 19: Manager queue API (3h)
10. Task 20: Review API (4h)
11. Task 23: Assignment UI (6h)
12. Task 24: Manager dashboard (8h)
13. Task 25: Review UI (6h)
14. Task 27: E2E approval test (4h)
15. Task 30: Phase validation (2h)

### Phase 4 (All sequential):
16. Tasks 46-60: Notifications + deploy (43.5h)

**⚠️ CRITICAL**: Any delay in these tasks delays production launch 1:1

---

## Dependency Visualization by Type

### Data Dependencies
```
Schema (T1-5) → Queries (T10) → APIs (T16-22, T31-38) → UI (T23-25, T39-40)
```

### Authorization Dependencies
```
RBAC (T7) → Middleware (T8) → API Protection (T16-22) → UI Guards (T23-25)
```

### Feature Dependencies
```
Manager Assignment (T16-18) → Auto-assign (T21) → Assignment UI (T23)
Manager Queue (T19) → Dashboard (T24)
Manager Review (T20) → Review UI (T25) → Approval Flow (T27)
```

### External Integration Dependencies
```
RewardSTACK Client (T31) → Job Queue (T32-35) → Webhook (T36-38) → Status UI (T40)
```

### Testing Dependencies
```
Unit Tests (T12-13) → Integration Tests (T14) → E2E Tests (T26-27) → API Tests (T28, T41-43)
```

---

## Risk-Based Dependency Analysis

### HIGH RISK - Single Point of Failure

**Task 3 (ChallengeAssignment table)**:
- Blocks: 10, 16-18, 26 (all manager assignment features)
- Mitigation: Prototype schema in dev DB first
- Rollback: Pre-written DROP TABLE script (Task 11)

**Task 8 (Middleware protection)**:
- Blocks: All manager APIs (16-22)
- Risk: Authorization bypass if wrong
- Mitigation: 100% coverage requirement (Task 12)

**Task 31 (RewardSTACK client)**:
- Blocks: All reward features (33-38, 41)
- Risk: External API changes
- Mitigation: Mock in tests (Task 41), version pinning

### MEDIUM RISK - Parallel Failure Impact

**Tasks 23-25 (Manager UI)**:
- Blocks: E2E tests (27, 29), notifications (46-48)
- Risk: UX redesign mid-flight
- Mitigation: Design review before Task 23

**Tasks 46-54 (Notifications)**:
- Blocks: Production readiness
- Risk: Email deliverability issues
- Mitigation: Test templates early (Tasks 49-50, 53-54)

---

## Gate Dependencies (Go/No-Go Criteria)

### 🚦 GATE 1: Foundation Ready
**Depends on**: Tasks 1-15 complete
**Blocks**: All Phase 2 (16-30) and Phase 3 (31-45) work
**Criteria**:
- Migration deployed to staging (Tasks 2-5)
- Rollback tested (Task 11)
- All unit tests pass (Tasks 12-13)
- Authorization tests pass (Task 14)

**NO-GO TRIGGERS**:
- Migration fails on staging
- Rollback script doesn't restore clean state
- Test coverage <90%

---

### 🚦 GATE 2: Manager Role Functional
**Depends on**: Tasks 16-30 complete
**Blocks**: Manager notifications (46-50)
**Criteria**:
- Admin can assign/unassign managers (Tasks 16-18, 23)
- Manager sees queue (Tasks 19, 24)
- Manager can approve/revise (Tasks 20, 25)
- E2E test passes (Task 27)

**NO-GO TRIGGERS**:
- Manager sees submissions outside assigned challenges
- Approval doesn't trigger admin notification
- Auto-assign logic creates duplicate assignments

---

### 🚦 GATE 3: Rewards Flowing End-to-End
**Depends on**: Tasks 31-45 complete
**Blocks**: Reward notifications (51-54)
**Criteria**:
- Job queue processes fulfillment (Tasks 32-35)
- Webhook receives status updates (Tasks 36-38)
- Retry logic handles failures (Task 44)
- UI shows accurate status (Task 40)

**NO-GO TRIGGERS**:
- Webhook signature fails validation
- Job retries indefinitely (no circuit breaker)
- Reward marked "fulfilled" but not in RewardSTACK

---

### 🚦 GATE 4: Production Ready
**Depends on**: Tasks 46-60 complete
**Blocks**: Production deployment
**Criteria**:
- All notifications deliver (Tasks 46-54)
- Feature flags configured (Task 55)
- Performance acceptable (Task 56)
- Docs complete (Tasks 57-58)
- Deploy runbook tested (Task 59)

**NO-GO TRIGGERS**:
- Notification delivery rate <95%
- Query performance >2s for manager queue
- Missing rollback procedures

---

## Recommended Development Sequence

### Sprint 1 (Week 1): Foundation - SEQUENTIAL
```
Day 1: Tasks 1-5 (Schema + migrations)
Day 2: Tasks 6-8 (Seed data + RBAC)
Day 3: Tasks 9-11 (Helpers + rollback)
Day 4: Tasks 12-14 (Tests)
Day 5: Task 15 (Gate 1 validation)
```

### Sprint 2 (Week 2): Manager Role - Dev A
```
Day 1: Tasks 16-18 (Assignment APIs)
Day 2: Tasks 19-22 (Queue + hooks)
Day 3: Tasks 23-25 (UI)
Day 4: Tasks 26-29 (Tests)
Day 5: Task 30 (Gate 2 validation)
```

### Sprint 2 (Week 2): RewardSTACK - Dev B (PARALLEL)
```
Day 1: Tasks 31-32 (Client + queue)
Day 2: Tasks 33-35 (Jobs)
Day 3: Tasks 36-38 (Webhooks)
Day 4: Tasks 39-40 (UI)
Day 5: Tasks 41-45 (Tests + Gate 3)
```

### Sprint 3 (Week 3): Polish - BOTH DEVS
```
Day 1: Dev A (46-48), Dev B (51-52) - Notifications
Day 2: Dev A (49-50), Dev B (53-54) - Notification tests
Day 3: Both (55-56) - Feature flags + performance
Day 4: Both (57-58) - Documentation
Day 5: Both (59-60) - Deploy prep + Gate 4
```

---

## Frequently Asked Questions

**Q: Can we start Phase 3 before Phase 2 completes?**
A: YES. Phase 3 only depends on Gate 1 (foundation), not Gate 2 (manager role). Dev B can start Task 31 as soon as Task 15 passes.

**Q: What happens if Task 27 (E2E approval test) fails?**
A: Gate 2 is blocked. Check Tasks 19-20 (APIs) and 24-25 (UI) for bugs. Cannot proceed to Phase 4 manager notifications (46-50) until fixed.

**Q: Can we deploy Phase 2 without Phase 3?**
A: YES. Feature flag v1.0 enables Manager role only. v1.1 enables RewardSTACK. Can deploy v1.0 and defer v1.1 if needed.

**Q: What's the minimum viable deployment?**
A: Gate 1 + Gate 2 + Tasks 46-50 (manager notifications). Total: 96 hours. Defers all reward features (Phase 3).

**Q: How do we roll back if production breaks?**
A: Run Task 11 rollback SQL, flip feature flag to v0.9 (pre-manager), redeploy previous Docker image. RTO: 30 minutes.

---

## Summary Statistics

- **Total Tasks**: 60
- **Total Duration**: 151 hours (single dev), 83 hours (critical path)
- **Parallelization Savings**: 68 hours (45%)
- **Critical Path Tasks**: 19 (32%)
- **Blocking Tasks**: 8 (Tasks 1, 2, 3, 7, 8, 10, GATE 1, GATE 2+3)
- **Leaf Tasks** (no dependents): 15 (Tasks 11-15, 26-29, 41-45, 49-50, 53-54, 57-58)
- **Fan-out Points**: Task 10 (blocks 12 tasks), GATE 1 (blocks 30 tasks)
- **Fan-in Points**: GATE 2+3 (requires 30 tasks), Task 60 (requires 14 tasks)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-20
**Corresponds To**: `.claude/plans/task-list.md` v1.0
