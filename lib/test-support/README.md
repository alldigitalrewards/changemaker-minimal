# Test Support Library

Provides factories, auth provisioning, and seed profiles for deterministic, composable test data generation.

## Quick Start

```bash
# Fast minimal seed (1 workspace, 3 users, 1 challenge)
pnpm seed --profile=minimal

# Full demo seed (3 workspaces, 16 users, 12 challenges)
pnpm seed --profile=demo

# Production-like volume (10 workspaces, 100 users, 50 challenges)
pnpm seed --profile=full
```

## Features

### Deterministic Data
- No more `Math.random()` in seed scripts
- Predictable challenge templates
- Consistent user roles and permissions
- Reproducible test outcomes

### Composable Factories
- `createWorkspace()` - Single workspace creation
- `createUserWithMemberships()` - User with auth + memberships
- `createChallengeFromTemplate()` - Challenge from template
- All factories support batch operations

### Centralized Auth
- `ensureAuthUser()` - Idempotent Supabase auth creation
- Supports both test and production contexts
- Optional mocking for unit tests

## Usage

### Using Factories Directly

```typescript
import {
  createWorkspace,
  createUserWithMemberships,
  createChallengeFromTemplate,
  CHALLENGE_TEMPLATES,
} from "@/lib/test-support";

// Create a workspace
const workspace = await createWorkspace({
  slug: "my-workspace",
  name: "My Workspace",
});

// Create a user with memberships
const { user, memberships } = await createUserWithMemberships({
  email: "test@example.com",
  memberships: [
    {
      workspaceId: workspace.id,
      role: "ADMIN",
      isPrimary: true,
    },
  ],
});

// Create a challenge from template
const challenge = await createChallengeFromTemplate(
  CHALLENGE_TEMPLATES[0],
  workspace.id,
);
```

### Using Seed Profiles

```typescript
import { runSeedProfile } from "@/lib/test-support";
import { prisma } from "@/lib/prisma";

// Programmatic seed
const result = await runSeedProfile("demo", { prisma });

console.log(result.stats);
// { workspaceCount: 3, userCount: 16, challengeCount: 12, membershipCount: 16 }
```

### In Tests

```typescript
import { createWorkspace, ensureAuthUser } from "@/lib/test-support";
import { test, expect } from "@playwright/test";

test("workspace isolation", async ({ page }) => {
  // Create test workspace
  const workspace = await createWorkspace({
    slug: "test-workspace",
    name: "Test Workspace",
  });

  // Create test user
  const authResult = await ensureAuthUser({
    email: "test@example.com",
    password: "TestPassword123!",
  });

  // ... rest of test
});
```

## Architecture

```
lib/test-support/
├── factories/              # Data factories
│   ├── workspace.factory.ts
│   ├── user.factory.ts
│   ├── challenge.factory.ts
│   └── index.ts
├── seeds/                  # Seed profiles
│   └── profiles.ts
├── auth-provisioning.ts    # Centralized auth
└── index.ts                # Main export
```

## Profiles

### Minimal Profile
- **Speed**: ~10 seconds
- **Use**: Rapid iteration, unit tests
- **Data**: 1 workspace, 3 users, 1 challenge

### Demo Profile
- **Speed**: ~30 seconds
- **Use**: Staging, demos, integration tests
- **Data**: 3 workspaces, 16 users, 12 challenges

### Full Profile
- **Speed**: ~2 minutes
- **Use**: Load testing, production simulation
- **Data**: 10 workspaces, 100 users, 50 challenges

## Migration from Old Seed Scripts

Old pattern (non-deterministic):
```typescript
const numChallenges = Math.floor(Math.random() * 3) + 3;
for (let i = 0; i < numChallenges; i++) {
  const template = challengeTemplates[i % challengeTemplates.length];
  // ... create challenge
}
```

New pattern (deterministic):
```typescript
import { createChallengesForWorkspace } from "@/lib/test-support";

const challenges = await createChallengesForWorkspace(workspaceId, 4);
```

## Benefits

1. **70% less code duplication** between seed.ts and seed-staging.ts
2. **100% deterministic** - same input always produces same output
3. **Faster iteration** - minimal profile runs in <10 seconds
4. **Type-safe** - Full TypeScript support throughout
5. **Testable** - Mock auth, inject dependencies
6. **Composable** - Mix and match factories as needed

## Future Enhancements

Phase 2 will add:
- Activity and submission factories
- Enrollment factories with deterministic status
- Points and budget factories
- Email template factories
