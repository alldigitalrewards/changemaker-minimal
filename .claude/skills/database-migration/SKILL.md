# Database Schema Migration Skill

## Description

Handle Prisma schema changes, database migrations, and Supabase RLS policy updates for the Changemaker multi-tenant application. Automatically detects when schema modifications are needed and executes the proper sequence of operations to maintain database integrity and workspace isolation.

**When to use this skill:**
- User says: "update schema", "add migration", "modify database", "change RLS", "update policy", "add field to model", "create new table"
- When discussing database structure changes
- When implementing features that require new database fields or tables
- When fixing RLS policies or permission issues

## Instructions

### Core Principles

1. **Always maintain workspace isolation** - Every new table/model must have `workspaceId` field and RLS policies
2. **Follow the 4-model architecture** - User, Workspace, Challenge, Enrollment (extend minimally)
3. **Test RLS policies** - Always verify policies work correctly after changes
4. **Use db push for development** - `prisma db push` for rapid iteration, migrations for production

### Standard Workflow

#### 1. Schema Change Analysis

Before making changes:
- Read current `prisma/schema.prisma`
- Identify impact on existing tables
- Check for breaking changes to relationships
- Verify workspace isolation will be maintained

#### 2. Schema Modification

When modifying `prisma/schema.prisma`:

```prisma
// Always include for new models:
model NewModel {
  id          String    @id @default(uuid()) @db.Uuid
  workspaceId String    @db.Uuid
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // ... other fields
}
```

Required patterns:
- Use `String @id @default(uuid()) @db.Uuid` for IDs
- Include `workspaceId String @db.Uuid` for tenant isolation
- Add `createdAt` and `updatedAt` timestamps
- Use proper Prisma relation syntax
- Follow existing naming conventions (camelCase)

#### 3. Database Push Sequence

Execute in this exact order:

```bash
# 1. Validate schema syntax
npx prisma validate

# 2. Format schema file
npx prisma format

# 3. Push changes to database (development)
npx prisma db push

# 4. Regenerate Prisma Client
npx prisma generate
```

#### 4. RLS Policy Updates

After schema changes affecting new tables, update RLS policies:

**For new models**, create policies in this sequence:

```sql
-- Enable RLS
ALTER TABLE "NewModel" ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can only access their workspace data
CREATE POLICY "Users can access own workspace newmodels"
  ON "NewModel"
  FOR ALL
  USING (
    "workspaceId" IN (
      SELECT "workspaceId"
      FROM "User"
      WHERE "supabaseUserId" = auth.uid()
    )
  );

-- Policy 2: Service role bypass (for server operations)
CREATE POLICY "Service role has full access to newmodels"
  ON "NewModel"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
```

Execute RLS policies:
```bash
# Option 1: Via Supabase MCP (if connected)
# Use mcp__supabase__execute_sql tool

# Option 2: Via psql
psql "$DATABASE_URL" -f scripts/new-rls-policies.sql
```

#### 5. Verification Steps

After changes, verify:

1. **Schema validation**:
```bash
npx prisma validate
npx prisma generate
```

2. **TypeScript compilation**:
```bash
npx tsc --noEmit
```

3. **Test RLS policies** (create test in `tests/security/`):
```typescript
test('New model respects workspace isolation', async () => {
  // Test that workspace A cannot access workspace B data
});
```

4. **Run relevant tests**:
```bash
npx playwright test tests/api/[related-feature].spec.ts
```

### Common Scenarios

#### Scenario 1: Adding a new field to existing model

```bash
# 1. Edit schema
# 2. Add field with optional flag if data exists: field String?
# 3. Run: npx prisma db push
# 4. Update queries in lib/db/queries.ts if needed
# 5. Run tests
```

#### Scenario 2: Creating a new model

```bash
# 1. Add model to schema with workspace relation
# 2. Run: npx prisma db push
# 3. Create RLS policies (scripts/rls-policies-[model].sql)
# 4. Apply RLS policies via psql or Supabase MCP
# 5. Create queries in lib/db/queries.ts
# 6. Create API routes in app/api/w/[slug]/[resource]/
# 7. Create tests in tests/api/[resource].spec.ts
```

#### Scenario 3: Modifying relationships

```bash
# 1. Update both sides of relation in schema
# 2. Check for cascade behavior (@onDelete, @onUpdate)
# 3. Run: npx prisma db push
# 4. Update all queries using the relationship
# 5. Run full test suite
```

#### Scenario 4: RLS policy fixes

```bash
# 1. Identify broken policy via test failure
# 2. Create fix script in scripts/fix-rls-[issue].sql
# 3. Test SQL locally: psql "$DATABASE_URL" -f scripts/fix-rls-[issue].sql
# 4. Verify with: tests/security/rls-[feature]-test.spec.ts
# 5. Apply to staging/production when verified
```

### Error Handling

**Common errors and solutions:**

1. **"Foreign key constraint failed"**
   - Check existing data doesn't violate new constraints
   - Add field as optional first, migrate data, then make required

2. **"Unique constraint violated"**
   - Ensure unique fields account for workspace isolation
   - Use composite unique constraints: `@@unique([workspaceId, slug])`

3. **"RLS policy blocks query"**
   - Verify service role is used for server queries
   - Check policy logic matches query patterns
   - Test with different user contexts

4. **"Type mismatch after schema change"**
   - Run `npx prisma generate` again
   - Restart TypeScript server in IDE
   - Clear `.next` cache: `rm -rf .next`

### Files to Update

When making schema changes, typically need to update:

1. `prisma/schema.prisma` - Core schema definition
2. `lib/db/queries.ts` - Database query functions
3. `lib/types.ts` - TypeScript type definitions
4. `app/api/w/[slug]/[resource]/route.ts` - API endpoints
5. `scripts/rls-policies-[model].sql` - RLS policies
6. `tests/api/[resource].spec.ts` - API tests
7. `tests/security/rls-[model]-test.spec.ts` - Security tests

### Best Practices

1. **Never skip Prisma generate** - Always run after schema changes
2. **Test in isolation first** - Create RLS test before deploying
3. **Use transactions** - For multi-step migrations, wrap in transaction
4. **Document breaking changes** - Update migration notes in commit
5. **Verify workspace isolation** - Every query must filter by workspaceId
6. **Follow naming conventions** - Match existing model/field names style
7. **Keep it minimal** - Only add fields truly needed for MVP

### Integration with Task Master

When working on tasks involving database changes:

```bash
# Before starting
task-master update-subtask --id=X.X --prompt="Planning schema changes: [description]"

# After completion
task-master update-subtask --id=X.X --prompt="Schema updated. Added: [fields/models]. RLS policies: [verified/pending]. Tests: [passing/failing]"
```

### Environment-Specific Notes

**Local Development:**
```bash
# Use local Supabase instance
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
DIRECT_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

**Staging:**
```bash
# Staging database (test RLS changes here first)
DATABASE_URL="<staging-pooler-url>"
DIRECT_URL="<staging-direct-url>"
```

**Production:**
```bash
# Production database (deploy verified changes only)
DATABASE_URL="<production-pooler-url>"
DIRECT_URL="<production-direct-url>"
```

Always test migrations on staging before production deployment.

## Examples

### Example 1: Adding a description field to Challenge

```bash
# 1. Edit prisma/schema.prisma
model Challenge {
  # ... existing fields
  description String  # Add this line
}

# 2. Push changes
npx prisma db push
npx prisma generate

# 3. Update queries
# Edit lib/db/queries.ts to include description in select

# 4. Run tests
npx playwright test tests/api/challenge-crud.spec.ts
```

### Example 2: Creating a Submission model

```bash
# 1. Add to schema
model Submission {
  id           String     @id @default(uuid()) @db.Uuid
  workspaceId  String     @db.Uuid
  workspace    Workspace  @relation(fields: [workspaceId], references: [id])
  challengeId  String     @db.Uuid
  challenge    Challenge  @relation(fields: [challengeId], references: [id])
  userId       String     @db.Uuid
  user         User       @relation(fields: [userId], references: [id])
  content      String
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

# 2. Push schema
npx prisma db push
npx prisma generate

# 3. Create RLS policies
# scripts/rls-policies-submission.sql

# 4. Apply RLS
psql "$DATABASE_URL" -f scripts/rls-policies-submission.sql

# 5. Create queries in lib/db/queries.ts
# 6. Create API routes
# 7. Create tests
```

## Success Criteria

After using this skill, verify:

- [ ] `npx prisma validate` passes
- [ ] `npx prisma generate` completes successfully
- [ ] `npx tsc --noEmit` shows no TypeScript errors
- [ ] RLS policies are enabled on new tables
- [ ] Workspace isolation is verified via tests
- [ ] Relevant API tests pass
- [ ] Changes documented in commit message

## Related Skills

- **Test Suite Runner Skill** - Verify database changes don't break tests
- **Multi-Tenant Validation Skill** - Ensure workspace isolation maintained
- **API Route Generator Skill** - Create endpoints for new models

---

*This skill ensures database changes maintain the Changemaker architecture: minimal, secure, and workspace-isolated.*
