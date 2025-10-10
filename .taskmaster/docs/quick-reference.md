# Quick Reference Guide
## Challenge Progression & Rewards System
## Common Tasks and Commands

## 🚀 Starting Development

### 1. Check What's Next
```bash
# See next available task
task-master next

# View specific task details
task-master show 2.1

# See all pending tasks
task-master list --status=pending
```

### 2. Start Working on a Task
```bash
# Mark task as in-progress
task-master set-status --id=2.1 --status=in-progress

# Update with notes as you work
task-master update-subtask --id=2.1 --prompt="Created PointTransaction model, testing migrations"
```

### 3. Complete a Task
```bash
# Mark as done
task-master set-status --id=2.1 --status=done

# Check what's next
task-master next
```

## 🗃️ Database Tasks

### Add PointTransaction Model
```bash
# 1. Edit schema
code prisma/schema.prisma

# 2. Create migration
pnpm prisma migrate dev --name add-point-transaction

# 3. Generate client
pnpm prisma generate

# 4. Verify in studio
pnpm prisma studio
```

### Add Challenge Progression Enum
```bash
# 1. Add to schema.prisma:
enum ProgressionState {
  SUBMITTED
  APPROVED
  IN_DEVELOPMENT
  IN_PRODUCTION
  VERIFIED
  COMPLETED
}

# 2. Add field to Challenge model:
progressionState ProgressionState @default(SUBMITTED)

# 3. Migrate
pnpm prisma migrate dev --name add-progression-state
```

## 🔨 Common Implementation Tasks

### Create a New Service
```typescript
// lib/services/points.ts
export class PointService {
  static async awardPoints(userId: string, amount: number, description: string) {
    // Use transaction for atomicity
    return await prisma.$transaction(async (tx) => {
      // Update balance
      // Create transaction record
    });
  }
}
```

### Create an API Route
```typescript
// app/api/w/[slug]/points/award/route.ts
import { requireWorkspaceAdmin } from '@/lib/auth/api-auth';

export async function POST(req: Request, { params }) {
  const { workspace, user } = await requireWorkspaceAdmin(params.slug);
  // Implementation
}
```

### Create Admin Dashboard Component
```typescript
// app/w/[slug]/admin/points/page.tsx
import { WalletOverview } from '@/components/admin/points/wallet-overview';

export default async function PointsAdminPage({ params }) {
  const workspace = await getCurrentWorkspace(params.slug);
  
  return (
    <div>
      <WalletOverview workspaceId={workspace.id} />
    </div>
  );
}
```

## 📝 Testing Tasks

### Run Tests
```bash
# Unit tests
pnpm test

# Specific test file
pnpm test services/points

# E2E tests
pnpm test:e2e

# Watch mode
pnpm test --watch
```

### Test Database Operations
```bash
# Open Prisma Studio
pnpm prisma studio

# Test queries in Node REPL
node
> const { PrismaClient } = require('@prisma/client')
> const prisma = new PrismaClient()
> await prisma.pointsBalance.findMany()
```

## 🔍 Code Search Commands

### Find Existing Models
```bash
# Search for point-related models
grep -r "model.*Point" prisma/

# Find wallet references
grep -r "wallet\|Wallet" lib/ app/

# Find existing services
find lib/services -name "*.ts"
```

### Find API Routes
```bash
# List all API routes
find app/api -name "route.ts" | head -20

# Find point-related APIs
grep -r "points\|Points" app/api/
```

### Find Components
```bash
# Admin components
ls app/w/\[slug\]/admin/

# Find shadcn/ui usage
grep -r "from '@/components/ui" app/
```

## 🎨 UI Development

### Use Existing shadcn/ui Components
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
```

### Apply Changemaker Theme
```typescript
// Use theme colors
className="bg-coral-500 hover:bg-coral-600"
className="text-coral-500"
className="border-coral-500"

// Consistent spacing
className="space-y-4"
className="p-6"
className="mt-8"
```

## 📊 Task Master Commands

### Task Management
```bash
# View complexity analysis
task-master complexity-report

# Update multiple tasks
task-master update --from=4 --prompt="Use existing PointsBalance model"

# Add a new subtask
task-master add-subtask --id=2 --title="Create service layer"

# Check dependencies
task-master validate-dependencies
```

### Progress Tracking
```bash
# See completion percentage
task-master list

# View completed tasks
task-master list --status=done

# Get task history (via git)
git log -p .taskmaster/tasks/tasks.json
```

## 🐛 Common Issues & Solutions

### Issue: Migration Fails
```bash
# Reset database (DEVELOPMENT ONLY)
pnpm prisma migrate reset

# Or fix manually
pnpm prisma migrate resolve
```

### Issue: Types Not Updated
```bash
# Regenerate Prisma client
pnpm prisma generate

# Restart TS server in VS Code
Cmd+Shift+P > "TypeScript: Restart TS Server"
```

### Issue: Task Master Out of Sync
```bash
# Regenerate task files
task-master generate

# Pull latest changes
git pull
task-master list
```

## 📁 Project Structure Reference

```
.taskmaster/
├── tasks/
│   ├── tasks.json          # Main task data
│   └── *.md                # Individual task files
├── docs/
│   ├── prd.txt             # Original PRD
│   ├── prd-revised.txt     # Updated PRD
│   ├── existing-infrastructure.md
│   ├── lessons-learned.md
│   ├── implementation-notes.md
│   ├── architecture-decisions.md
│   └── quick-reference.md  # This file
└── config.json             # Task Master config

app/
├── api/
│   └── w/[slug]/
│       ├── challenges/[id]/progression/  # New API
│       └── points/                       # New APIs
└── w/[slug]/
    ├── admin/
    │   ├── points/         # New dashboard
    │   └── participants/   # Enhanced
    └── participant/        # New dashboard

lib/
├── services/
│   ├── points.ts           # New service
│   └── challenge-progression.ts  # New service
└── db/
    └── queries.ts          # Existing patterns

prisma/
└── schema.prisma          # Add models here
```

## 🚢 Deployment Checklist

### Before Deploying
- [ ] Run `pnpm build` locally
- [ ] Run `pnpm test`
- [ ] Check `pnpm prisma migrate status`
- [ ] Review changed files: `git status`
- [ ] Update task status in Task Master

### Deployment Steps
1. Push to branch: `git push origin SandboxNewFeatures`
2. Create PR: `gh pr create`
3. Run migrations on staging
4. Deploy to staging
5. Test features
6. Merge to main
7. Deploy to production

## 💡 Pro Tips

### 1. Always Check Existing Code First
```bash
# Before creating anything new
grep -r "YourNewThing" .
find . -name "*your-pattern*"
```

### 2. Use Transactions for Points
```typescript
// Always wrap point operations
await prisma.$transaction(async (tx) => {
  // All operations here
});
```

### 3. Follow Existing Patterns
```typescript
// Check how existing features work
// Copy the pattern, modify for your needs
```

### 4. Update Task Notes
```bash
# Document discoveries
task-master update-subtask --id=2.1 --prompt="Found existing model, using that"
```

### 5. Test in Prisma Studio
```bash
# Verify data changes visually
pnpm prisma studio
```

## 🔗 Useful Links

- [Prisma Docs](https://www.prisma.io/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Task Master Docs](https://github.com/alldigitalrewards/task-master-ai)

## 📞 Getting Help

1. Check existing code for patterns
2. Review `.taskmaster/docs/` for context
3. Use `task-master research --query="your question"`
4. Check git history: `git log -p --grep="similar feature"`

## Remember

- **Use what exists** - Don't create new models/patterns unnecessarily
- **Keep it simple** - No external libraries unless absolutely needed
- **Follow patterns** - Consistency > perfection
- **Document as you go** - Update task notes with discoveries
- **Test early** - Catch issues before they compound