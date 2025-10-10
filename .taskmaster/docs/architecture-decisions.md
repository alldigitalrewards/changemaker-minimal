# Architecture Decisions Record (ADR)
## Challenge Progression & Rewards System
## Date: January 17, 2025

This document records key architectural decisions and their rationale.

## ADR-001: Use Existing PointsBalance as Wallet System

### Status
Accepted

### Context
Initially planned to create a new "Wallet" model for managing user points.

### Decision
Use the existing PointsBalance model as the wallet system.

### Rationale
- PointsBalance already tracks user points per workspace
- Has fields for available, pending, and lifetime points
- Already integrated with workspace multi-tenancy
- Creating a duplicate would violate DRY principles

### Consequences
- **Positive**: No migration needed, existing code continues working
- **Positive**: Reduces model complexity
- **Negative**: None identified

---

## ADR-002: Single PointTransaction Model for Audit Trail

### Status
Accepted

### Context
Need comprehensive audit trail for all point movements for compliance and debugging.

### Decision
Create a single PointTransaction model that records all point movements.

### Rationale
- Single source of truth for all transactions
- Simpler than separate models for different transaction types
- Enum field (EARNED/SPENT/ADJUSTED) provides type differentiation
- Foreign keys to Challenge and ActivitySubmission maintain context

### Consequences
- **Positive**: Complete audit trail in one table
- **Positive**: Easy to query transaction history
- **Positive**: Supports compliance requirements
- **Negative**: Table will grow large (mitigated by indexes)

---

## ADR-003: Simple Service Classes Over State Machine Libraries

### Status
Accepted

### Context
Challenge progression needs state management. Considered XState or similar libraries.

### Decision
Implement simple service classes with validation methods instead of external state machine libraries.

### Rationale
- Only 6 states with linear progression
- No complex parallel states or conditions
- External library adds 50KB+ to bundle
- YAGNI principle - we don't need the complexity
- Easier to understand and maintain

### Code Example
```typescript
class ChallengeProgressionService {
  static transitions = {
    SUBMITTED: ['APPROVED'],
    APPROVED: ['IN_DEVELOPMENT'],
    // ... simple mapping
  };
}
```

### Consequences
- **Positive**: No external dependencies
- **Positive**: Smaller bundle size
- **Positive**: Easier to debug
- **Negative**: Would need refactor if states become complex (unlikely)

---

## ADR-004: No Queue System for Mock Points

### Status
Accepted

### Context
Considered using Redis/BullMQ for point distribution queues.

### Decision
Use synchronous operations with database transactions for point operations.

### Rationale
- This is a mock system before RewardSTACK integration
- Queue adds infrastructure complexity
- PostgreSQL transactions provide consistency
- Volume doesn't justify async processing
- Can add queues later if needed

### Consequences
- **Positive**: Simpler deployment (no Redis)
- **Positive**: Easier local development
- **Positive**: Immediate feedback to users
- **Negative**: Limited scalability (acceptable for MVP)

---

## ADR-005: Atomic Database Transactions for Points

### Status
Accepted

### Context
Point operations must maintain consistency between balance and transaction records.

### Decision
Use Prisma's transaction API for all point operations.

### Code Example
```typescript
await prisma.$transaction(async (tx) => {
  const balance = await tx.pointsBalance.update(...);
  const transaction = await tx.pointTransaction.create(...);
  return { balance, transaction };
});
```

### Rationale
- Prevents partial updates
- Handles concurrent operations safely
- PostgreSQL provides ACID guarantees
- Rollback on any failure

### Consequences
- **Positive**: Data consistency guaranteed
- **Positive**: No manual rollback logic needed
- **Negative**: Slightly slower than non-transactional (negligible)

---

## ADR-006: Path-Based Admin/Participant Separation

### Status
Accepted (Existing Pattern)

### Context
Need separate interfaces for admins and participants.

### Decision
Follow existing pattern:
- `/w/[slug]/admin/*` - Admin interfaces
- `/w/[slug]/participant/*` - Participant interfaces

### Rationale
- Consistent with existing routing
- Clear separation of concerns
- Middleware can enforce role-based access
- URL structure is self-documenting

### Consequences
- **Positive**: Consistent user experience
- **Positive**: Easy to implement auth guards
- **Positive**: Clear code organization

---

## ADR-007: shadcn/ui for All New Components

### Status
Accepted

### Context
Need UI components for dashboards and management interfaces.

### Decision
Use shadcn/ui components exclusively, no additional UI libraries.

### Rationale
- Already installed and configured
- Consistent with existing UI
- Customizable with Tailwind
- No additional dependencies
- Maintains Changemaker theme

### Consequences
- **Positive**: Consistent look and feel
- **Positive**: No additional bundle size
- **Positive**: Team already familiar
- **Negative**: Must build some components from primitives

---

## ADR-008: No Caching Layer for MVP

### Status
Accepted

### Context
Considered implementing Redis caching for point balances and transactions.

### Decision
No caching layer for initial implementation.

### Rationale
- PostgreSQL performance sufficient for MVP scale
- Adds deployment complexity
- Can add later if performance issues arise
- Measure first, optimize later

### Consequences
- **Positive**: Simpler deployment
- **Positive**: No cache invalidation complexity
- **Positive**: Always fresh data
- **Negative**: Higher database load (monitor and adjust)

---

## ADR-009: Manual Point Values (No Configuration System)

### Status
Accepted

### Context
Point values for progression states (10/50/100 points).

### Decision
Hardcode point values in service layer for MVP.

### Rationale
- Only 3 point values needed
- Configuration system is premature optimization
- Can easily extract to config later
- Keeps implementation simple

### Code Example
```typescript
const POINT_AWARDS = {
  SUBMITTED: 10,
  APPROVED: 50,
  COMPLETED: 100
};
```

### Consequences
- **Positive**: Simple implementation
- **Positive**: No configuration UI needed
- **Negative**: Requires code change to adjust (acceptable)

---

## ADR-010: Leverage Existing Error Handling Patterns

### Status
Accepted

### Context
Need consistent error handling for new features.

### Decision
Use existing error patterns from `/lib/db/queries.ts`:
- DatabaseError
- WorkspaceAccessError
- ResourceNotFoundError

### Rationale
- Consistency across codebase
- Frontend already handles these errors
- Well-tested patterns
- No learning curve for team

### Consequences
- **Positive**: Consistent error handling
- **Positive**: No new patterns to document
- **Positive**: Existing error boundaries work

---

## ADR-011: Simple In-Memory Rate Limiting

### Status
Accepted

### Context
Need rate limiting for point distribution endpoints.

### Decision
Implement simple in-memory rate limiting without external libraries.

### Rationale
- External library (rate-limiter-flexible) not needed for MVP
- Simple Map-based solution sufficient
- Can upgrade later if needed
- Avoids Redis dependency

### Consequences
- **Positive**: No external dependencies
- **Positive**: Works in development
- **Negative**: Resets on server restart (acceptable for MVP)
- **Negative**: Not distributed (single server only)

---

## ADR-012: Integration Over Invention

### Status
Accepted (Meta-Decision)

### Context
General approach to implementing new features.

### Decision
Always prefer integrating with existing code over creating new patterns.

### Examples
- Use PointsBalance instead of creating Wallet
- Use ActivityTemplate.basePoints instead of new point configuration
- Use existing auth middleware instead of new guards
- Use existing error types instead of new ones

### Rationale
- Reduces cognitive load
- Maintains consistency
- Faster implementation
- Fewer bugs

### Consequences
- **Positive**: Faster development
- **Positive**: More maintainable code
- **Positive**: Consistent patterns
- **Negative**: May need refactoring if patterns don't fit (rare)

---

## ADR-013: No Webhooks for Mock System

### Status
Accepted

### Context
Considered webhooks for point award notifications.

### Decision
No webhook infrastructure for the mock point system.

### Rationale
- This is temporary before RewardSTACK integration
- Webhooks add significant complexity
- Manual process acceptable for MVP
- Not worth the implementation cost

### Consequences
- **Positive**: Simpler implementation
- **Positive**: No webhook security concerns
- **Positive**: No retry logic needed
- **Negative**: No real-time external notifications (acceptable)

---

## ADR-014: Pagination Strategy

### Status
Accepted

### Context
Transaction history and participant lists need pagination.

### Decision
Use cursor-based pagination with Prisma's built-in support.

### Rationale
- More efficient than offset pagination
- Prisma has built-in support
- Consistent pagination experience
- Handles large datasets well

### Code Example
```typescript
findMany({
  take: 20,
  cursor: lastId ? { id: lastId } : undefined,
  skip: lastId ? 1 : 0
})
```

### Consequences
- **Positive**: Efficient for large datasets
- **Positive**: Consistent pagination
- **Negative**: Can't jump to specific page (acceptable)

---

## ADR-015: Testing Strategy Focus

### Status
Accepted

### Context
Need to balance test coverage with development speed.

### Decision
Focus on:
1. Service layer unit tests (critical business logic)
2. API route integration tests (main workflows)
3. Skip UI component unit tests for MVP

### Rationale
- Service layer has business logic
- API routes are integration points
- UI components are mostly display logic
- Can add component tests later

### Consequences
- **Positive**: Faster initial development
- **Positive**: Tests for critical paths
- **Negative**: Lower overall coverage (acceptable for MVP)

---

## Summary of Principles

1. **Use What Exists**: Always check for existing code first
2. **YAGNI**: Don't add complexity for potential future needs
3. **Simple > Complex**: Choose simple solutions that work
4. **Consistency > Perfection**: Follow existing patterns
5. **Measure > Assume**: Add optimization only after measuring
6. **Atomic > Eventually Consistent**: For financial data, use transactions
7. **Explicit > Magic**: Clear code over clever abstractions

## Decision Log

| Date | Decision | Impact |
|------|----------|--------|
| 2025-01-17 | Use existing PointsBalance | -1 model, -2 weeks work |
| 2025-01-17 | No state machine library | -50KB bundle, -1 dependency |
| 2025-01-17 | No Redis/queues | -1 infrastructure component |
| 2025-01-17 | Simple service classes | -3 dependencies |
| 2025-01-17 | Atomic transactions | +data consistency |

## Review Schedule

These decisions should be reviewed:
- After MVP launch (3 months)
- When user count exceeds 1,000
- Before RewardSTACK integration
- If performance issues arise