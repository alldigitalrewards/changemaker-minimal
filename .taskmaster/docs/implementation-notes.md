# Implementation Notes - Technical Details
## Challenge Progression & Rewards System
## Last Updated: January 17, 2025

This document contains specific technical implementation details discovered during analysis.

## 1. PointTransaction Model Implementation

### Schema Definition
```prisma
model PointTransaction {
  id                   String              @id @default(uuid()) @db.Uuid
  userId               String              @db.Uuid
  user                 User                @relation(fields: [userId], references: [id])
  workspaceId          String              @db.Uuid
  workspace            Workspace           @relation(fields: [workspaceId], references: [id])
  amount               Int
  type                 TransactionType
  description          String
  activitySubmissionId String?             @db.Uuid
  activitySubmission   ActivitySubmission? @relation(fields: [activitySubmissionId], references: [id])
  challengeId          String?             @db.Uuid
  challenge            Challenge?          @relation(fields: [challengeId], references: [id])
  metadata             Json?
  createdAt            DateTime            @default(now())
  
  @@index([userId, createdAt])
  @@index([workspaceId, createdAt])
}

enum TransactionType {
  EARNED
  SPENT
  ADJUSTED
}
```

### Why These Fields
- **userId + workspaceId**: Multi-tenant isolation
- **activitySubmissionId**: Link to what earned points
- **challengeId**: Track challenge-related transactions
- **metadata**: Flexibility for future needs
- **indexes**: Optimize history queries

### Integration Points
```typescript
// Update existing models with relations
model PointsBalance {
  // ... existing fields
  transactions PointTransaction[]
}

model ActivitySubmission {
  // ... existing fields
  transactions PointTransaction[]
}
```

## 2. Challenge Progression Implementation

### Schema Changes
```prisma
model Challenge {
  // ... existing fields
  progressionState ProgressionState @default(SUBMITTED)
  transactions     PointTransaction[]
}

enum ProgressionState {
  SUBMITTED
  APPROVED
  IN_DEVELOPMENT
  IN_PRODUCTION
  VERIFIED
  COMPLETED
}
```

### State Machine Service
```typescript
// lib/services/challenge-progression.ts
export class ChallengeProgressionService {
  private static transitions = {
    SUBMITTED: ['APPROVED'],
    APPROVED: ['IN_DEVELOPMENT'],
    IN_DEVELOPMENT: ['IN_PRODUCTION'],
    IN_PRODUCTION: ['VERIFIED'],
    VERIFIED: ['COMPLETED'],
    COMPLETED: []
  };

  static async transitionTo(
    challengeId: string,
    newState: ProgressionState,
    userId: string
  ) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId }
    });

    if (!this.isValidTransition(challenge.progressionState, newState)) {
      throw new Error(`Invalid transition from ${challenge.progressionState} to ${newState}`);
    }

    // Update challenge state
    const updated = await prisma.challenge.update({
      where: { id: challengeId },
      data: { progressionState: newState }
    });

    // Award points based on transition
    await this.awardProgressionPoints(challengeId, newState, userId);

    return updated;
  }

  private static async awardProgressionPoints(
    challengeId: string,
    state: ProgressionState,
    userId: string
  ) {
    const pointsMap = {
      APPROVED: 50,
      COMPLETED: 100
    };

    const points = pointsMap[state];
    if (!points) return;

    // Use existing PointService to handle transaction
    await PointService.awardPoints(
      userId,
      points,
      `Challenge ${state.toLowerCase()}`,
      { challengeId }
    );
  }
}
```

## 3. Point Service Layer

### Core Service Implementation
```typescript
// lib/services/points.ts
export class PointService {
  static async awardPoints(
    userId: string,
    amount: number,
    description: string,
    metadata?: {
      challengeId?: string;
      activitySubmissionId?: string;
    }
  ) {
    return await prisma.$transaction(async (tx) => {
      // Update balance
      const balance = await tx.pointsBalance.update({
        where: { userId },
        data: {
          availablePoints: { increment: amount },
          lifetimePoints: { increment: amount }
        }
      });

      // Create transaction record
      const transaction = await tx.pointTransaction.create({
        data: {
          userId,
          workspaceId: balance.workspaceId,
          amount,
          type: 'EARNED',
          description,
          challengeId: metadata?.challengeId,
          activitySubmissionId: metadata?.activitySubmissionId,
          metadata: metadata as any
        }
      });

      return { balance, transaction };
    });
  }

  static async spendPoints(
    userId: string,
    amount: number,
    description: string
  ) {
    return await prisma.$transaction(async (tx) => {
      // Check balance first
      const balance = await tx.pointsBalance.findUnique({
        where: { userId }
      });

      if (balance.availablePoints < amount) {
        throw new Error('Insufficient points');
      }

      // Update balance
      const updated = await tx.pointsBalance.update({
        where: { userId },
        data: {
          availablePoints: { decrement: amount }
        }
      });

      // Create transaction
      await tx.pointTransaction.create({
        data: {
          userId,
          workspaceId: balance.workspaceId,
          amount: -amount,
          type: 'SPENT',
          description
        }
      });

      return updated;
    });
  }
}
```

### Why Atomic Transactions
- Prevents partial updates
- Ensures balance/transaction consistency
- Handles concurrent operations safely

## 4. API Route Patterns

### Challenge Progression API
```typescript
// app/api/w/[slug]/challenges/[id]/progression/route.ts
export async function PUT(
  req: Request,
  { params }: { params: { slug: string; id: string } }
) {
  const { workspace, user } = await requireWorkspaceAdmin(params.slug);
  const { state } = await req.json();

  const challenge = await ChallengeProgressionService.transitionTo(
    params.id,
    state,
    user.id
  );

  return NextResponse.json({ challenge });
}
```

### Points Distribution API
```typescript
// app/api/w/[slug]/admin/points/distribute/route.ts
export async function POST(req: Request) {
  const { workspace, user } = await requireWorkspaceAdmin(params.slug);
  const { userIds, amount, reason } = await req.json();

  // Validate workspace has sufficient points
  const workspaceBalance = await prisma.pointsBalance.findFirst({
    where: { workspaceId: workspace.id, userId: null }
  });

  if (workspaceBalance.availablePoints < amount * userIds.length) {
    return NextResponse.json(
      { error: 'Insufficient workspace points' },
      { status: 400 }
    );
  }

  // Distribute points atomically
  const results = await prisma.$transaction(
    userIds.map(userId =>
      PointService.awardPoints(userId, amount, reason)
    )
  );

  return NextResponse.json({ results });
}
```

## 5. UI Component Patterns

### Admin Dashboard Components
```typescript
// components/admin/points/wallet-overview.tsx
export function WalletOverview({ workspaceId }: { workspaceId: string }) {
  const { data: balance } = useSWR(
    `/api/w/${workspaceId}/points/balance`,
    fetcher
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Points</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-coral-500">
          {balance?.availablePoints.toLocaleString() ?? 0}
        </div>
        <Button onClick={() => setShowFundingDialog(true)}>
          Fund Wallet
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Transaction History Table
```typescript
// components/admin/points/transaction-history.tsx
export function TransactionHistory({ workspaceId }: { workspaceId: string }) {
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState<TransactionType | 'ALL'>('ALL');

  const { data } = useSWR(
    `/api/w/${workspaceId}/transactions?page=${page}&type=${filter}`,
    fetcher
  );

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Description</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data?.transactions.map(tx => (
          <TableRow key={tx.id}>
            <TableCell>{formatDate(tx.createdAt)}</TableCell>
            <TableCell>{tx.user.name}</TableCell>
            <TableCell>
              <Badge variant={tx.type === 'EARNED' ? 'success' : 'default'}>
                {tx.type}
              </Badge>
            </TableCell>
            <TableCell className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
              {tx.amount > 0 ? '+' : ''}{tx.amount}
            </TableCell>
            <TableCell>{tx.description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

## 6. Database Optimization

### Required Indexes
```sql
-- For transaction history queries
CREATE INDEX idx_point_transactions_user_created 
ON point_transactions(user_id, created_at DESC);

CREATE INDEX idx_point_transactions_workspace_created 
ON point_transactions(workspace_id, created_at DESC);

-- For filtering by type
CREATE INDEX idx_point_transactions_type 
ON point_transactions(type);
```

### Query Optimization
```typescript
// Efficient pagination with cursor
async function getTransactionHistory(
  workspaceId: string,
  cursor?: string,
  limit = 20
) {
  return await prisma.pointTransaction.findMany({
    where: { workspaceId },
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      challenge: { select: { title: true } },
      activitySubmission: { 
        select: { 
          activityTemplate: { 
            select: { name: true } 
          } 
        } 
      }
    }
  });
}
```

## 7. Testing Strategy

### Unit Tests
```typescript
// __tests__/services/points.test.ts
describe('PointService', () => {
  it('should award points atomically', async () => {
    const result = await PointService.awardPoints(
      userId,
      100,
      'Test award'
    );

    expect(result.balance.availablePoints).toBe(100);
    expect(result.transaction.type).toBe('EARNED');
  });

  it('should prevent overspending', async () => {
    await expect(
      PointService.spendPoints(userId, 1000, 'Too much')
    ).rejects.toThrow('Insufficient points');
  });
});
```

### Integration Tests
```typescript
// __tests__/api/progression.test.ts
describe('Challenge Progression API', () => {
  it('should transition states and award points', async () => {
    const res = await fetch(`/api/w/test/challenges/${id}/progression`, {
      method: 'PUT',
      body: JSON.stringify({ state: 'APPROVED' })
    });

    const { challenge } = await res.json();
    expect(challenge.progressionState).toBe('APPROVED');

    // Verify points were awarded
    const balance = await prisma.pointsBalance.findUnique({
      where: { userId: challenge.createdBy }
    });
    expect(balance.availablePoints).toBe(50);
  });
});
```

## 8. Error Handling

### Consistent Error Responses
```typescript
// lib/api/errors.ts
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

// Usage in API routes
try {
  // ... operation
} catch (error) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    );
  }
  
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
```

## 9. Security Considerations

### Input Validation
```typescript
// lib/validation/points.ts
export const distributePointsSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
  amount: z.number().int().min(1).max(1000),
  reason: z.string().min(3).max(200)
});

// Use in API route
const validated = distributePointsSchema.parse(await req.json());
```

### Rate Limiting (Simple)
```typescript
// Since we're not using external libraries
const requestCounts = new Map();

export function simpleRateLimit(
  identifier: string,
  maxRequests = 10,
  windowMs = 60000
) {
  const now = Date.now();
  const requests = requestCounts.get(identifier) || [];
  
  const recentRequests = requests.filter(
    time => now - time < windowMs
  );
  
  if (recentRequests.length >= maxRequests) {
    throw new ApiError(429, 'RATE_LIMIT', 'Too many requests');
  }
  
  recentRequests.push(now);
  requestCounts.set(identifier, recentRequests);
}
```

## 10. Performance Considerations

### Caching Strategy (Without Redis)
```typescript
// Simple in-memory cache for development
class SimpleCache {
  private cache = new Map();
  
  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  set(key: string, value: any, ttlMs = 60000) {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }
}

const cache = new SimpleCache();
```

## Migration Strategy

### Safe Migration for Existing Data
```sql
-- Add progressionState with default for existing challenges
ALTER TABLE challenges 
ADD COLUMN progression_state TEXT DEFAULT 'SUBMITTED';

-- Backfill based on existing status
UPDATE challenges 
SET progression_state = 'COMPLETED' 
WHERE status = 'completed';
```

## Deployment Notes

1. **Migration Order**:
   - Deploy schema changes first
   - Run migrations
   - Deploy service layer
   - Deploy UI components

2. **Feature Flags** (if needed):
   ```typescript
   const FEATURES = {
     PROGRESSION_STATES: process.env.ENABLE_PROGRESSION === 'true',
     POINT_SYSTEM: process.env.ENABLE_POINTS === 'true'
   };
   ```

3. **Rollback Plan**:
   - Keep old fields during transition
   - Dual-write to old and new systems
   - Switch reads after validation

## Common Pitfalls to Avoid

1. **Don't forget workspace isolation** in queries
2. **Always use transactions** for point operations
3. **Validate state transitions** before updating
4. **Include proper indexes** for large tables
5. **Test concurrent operations** for race conditions

## Next Steps for Implementation

1. Start with Task #2 (PointTransaction model)
2. Run migration and verify with Prisma Studio
3. Implement PointService with tests
4. Add Challenge progression enum
5. Build service layers
6. Create API routes
7. Implement UI components
8. Integration testing
9. Documentation