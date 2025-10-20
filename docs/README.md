# Project Documentation

This directory consolidates project knowledge that previously lived in the repository root. Files are grouped by theme so teammates can quickly find the right reference.

## Core Documentation

- **Agents**
  - [Task Master Integration Guide](agents/task-master-integration-guide.md)
  - [Amp Instructions](agents/amp-instructions.md)
- **Operations**
  - [Database Migrations](operations/migrations.md)
  - [Public API Documentation](operations/api-docs.md)
- **Planning**
  - [Product TODO](planning/todo.md)
  - [Design TODO](planning/todo-design.md)
- **Reports**
  - [Email Change Validation Report](reports/email-change-validation.md)
  - [Reward System Validation Report](reports/reward-system-validation.md)
- **Testing**
  - [Testing Specification](testing/testing-spec.md)
  - [Test Status Summary](testing/test-status-summary.md)
  - [Test Fix Summary](testing/test-fix-summary.md)

## Manager Role Implementation (October 2025)

**For Developers**:
- **Schema**: [Manager Role Schema](schema/manager-role.md) - Database schema changes, migration procedures
- **API**: [Manager API Endpoints](api/manager-endpoints.md) - All manager-related API routes and documentation

**For End Users**:
- **Guides**: [Manager Review Guide](guides/manager-review-guide.md) - Complete manager user guide with workflows and best practices

**For DevOps**:
- **Deployment**: [Manager Role Runbook](deployment/manager-role-runbook.md) - Deployment procedures, rollback plans, monitoring

**Architecture Documentation** (in `.claude/` directory):
- `.claude/memory/role-system-architecture.md` - Complete role system documentation
- `.claude/memory/submission-approval-flow.md` - Approval workflow architecture
- `.claude/architecture/manager-assignment-strategy.md` - Assignment strategy decision
- `.claude/plans/implementation-roadmap.md` - 4-phase implementation plan
- `.claude/plans/zen-planner-input.md` - Detailed planning document

---

If you create new documentation, place it in the appropriate subfolder (add one if it doesn't exist yet) and link it here.
