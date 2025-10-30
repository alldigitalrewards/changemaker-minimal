# Changemaker Implementation Plans

This directory contains detailed implementation roadmaps for major features and initiatives.

## Active Roadmaps

### 1. Manager Role & RewardSTACK Integration
**Status**: Phase 2 Complete ✓
**File**: [implementation-roadmap.md](./implementation-roadmap.md)
**Overview**: Multi-phase implementation of MANAGER role with challenge assignment system and external reward fulfillment via AllDigitalRewards RewardSTACK API.

**Key Features**:
- Manager role with assignment-based permissions
- Two-stage approval workflow (Manager → Admin)
- RLS policies enforcing database-level authorization
- RewardSTACK API integration for SKU and monetary rewards
- Webhook handling for fulfillment status updates
- Admin reconciliation dashboard for failed rewards

**Current Phase**: Phase 3 (RewardSTACK Integration) - Planning Complete

---

### 2. AI Email Template Editor
**Status**: Planning Complete
**File**: [ai-email-editor-roadmap.md](./ai-email-editor-roadmap.md)
**Overview**: Split-view email template editor with AI-powered inline assist using Vercel AI SDK and Claude 3.5 Sonnet.

**Key Features**:
- Split-view editor (Monaco HTML editor + Live preview)
- AI inline assist for template modifications
- Desktop/mobile preview toggle
- Template variable management
- Version history and diff view
- Built-in template library
- Cost-optimized AI Gateway integration

**Current Phase**: Phase 1 (Foundation) - Ready to Start

---

## Task Lists

### Manager Role Task List
**File**: [task-list.md](./task-list.md)
**Total Tasks**: 60 (organized into 4 phases of 15 tasks each)
**Completion**: 30/60 tasks complete (Phases 1-2 done)

### AI Email Editor Task List
**Status**: Integrated into roadmap (42 tasks across 4 phases)
**Estimated Duration**: 4 weeks
**Phases**:
- Phase 1: Foundation & Core UI (12 tasks)
- Phase 2: AI Integration (12 tasks)
- Phase 3: Advanced Features (10 tasks)
- Phase 4: Production Readiness (10 tasks)

---

## Dependencies

### Manager Role Dependencies
- `.claude/memory/role-system-architecture.md` - Role system details
- `.claude/memory/submission-approval-flow.md` - Approval workflow
- `.claude/architecture/manager-assignment-strategy.md` - Assignment implementation

### AI Email Editor Dependencies
- `docs/planning/ai-email-editor-brainstorm.md` - Original brainstorm document
- Vercel AI SDK (external)
- Anthropic Claude API (external)
- Monaco Editor (external)

---

## Other Planning Documents

### Dependencies
**File**: [dependencies.md](./dependencies.md)
**Purpose**: Tracks cross-feature dependencies and blockers

### Zen Planner Input
**File**: [zen-planner-input.md](./zen-planner-input.md)
**Purpose**: Input document for AI-assisted planning workflows

---

## Workflow Integration

### Task Master Integration
Both roadmaps are designed to work with Task Master AI for task breakdown, dependency tracking, and progress monitoring.

**Commands**:
```bash
# Parse roadmap into tasks
task-master parse-prd .claude/plans/implementation-roadmap.md

# View next available task
task-master next

# Mark task complete
task-master set-status --id=<id> --status=done
```

### Progress Tracking
- Use `.claude/PROGRESS.md` for overall project status updates
- Create session logs in `.claude/sessions/` for detailed implementation notes
- Update roadmap files as phases complete

---

## Conventions

### Roadmap Structure
All roadmaps follow this structure:
1. **Overview** - Current status, phase completion, key dependencies
2. **Phases** - Organized by week/milestone with clear deliverables
3. **Tasks** - Detailed task breakdown with time estimates and risk assessment
4. **Success Metrics** - Measurable criteria for each phase
5. **Risk Mitigation** - Known risks and mitigation strategies
6. **References** - Links to related documentation

### Task Format
Each task includes:
- Task number and title
- Time estimate
- File paths affected
- Dependencies on other tasks
- Deliverable description
- Risk assessment

### Status Indicators
- ✅ COMPLETE - Task finished and verified
- 🎯 READY - Dependencies met, ready to start
- ⏸️ PENDING - Blocked or awaiting dependencies
- 📋 PLANNED - Documented but not yet ready

---

## Adding New Roadmaps

When creating a new roadmap:

1. Create file: `.claude/plans/feature-name-roadmap.md`
2. Follow the standard roadmap structure (see above)
3. Update this README with a new section
4. Add cross-references in `dependencies.md` if applicable
5. Create supporting documentation in `docs/planning/`

---

*Last Updated: January 2025*
