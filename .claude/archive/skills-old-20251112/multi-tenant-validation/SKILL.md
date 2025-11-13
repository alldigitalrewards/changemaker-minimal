# Multi-Tenant Validation Skill

## Description

Verify workspace isolation, RLS policies, and role-based access control for the Changemaker multi-tenant application. Automatically detects when validation is needed and performs comprehensive security checks to ensure no data leakage between workspaces.

**When to use this skill:**
- User says: "validate isolation", "check RLS", "verify permissions", "test multi-tenancy", "ensure workspace separation", "validate security"
- After creating or modifying database models
- After updating RLS policies
- Before deploying to staging/production
- When implementing new API routes
- During security audits or code review

## Instructions

### Core Principles

1. **Zero tolerance for data leakage** - Any workspace isolation breach is critical
2. **Defense in depth** - Verify at multiple layers (RLS, API, middleware)
3. **Test with real scenarios** - Use actual user contexts, not mocks
4. **Automate validation** - Include in test suite, not just manual checks
5. **Document findings** - Track validation results for audit trail

### Multi-Tenancy Architecture

**Workspace Isolation Layers:**

```
┌─────────────────────────────────────────┐
│ Layer 1: Middleware (Route Protection) │
│ - Path extraction: /w/[slug]           │
│ - Auth verification: Supabase session  │
│ - Role check: ADMIN/PARTICIPANT        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Layer 2: API Routes (Business Logic)   │
│ - Workspace context validation         │
│ - Role-based authorization             │
│ - Input validation & sanitization      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Layer 3: Database Queries (Prisma)     │
│ - workspaceId filter on all queries    │
│ - Proper relation includes             │
│ - Transaction boundaries               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ Layer 4: Row Level Security (RLS)      │
│ - Postgres RLS policies enabled        │
│ - User workspace context enforcement   │
│ - Service role bypass for server ops   │
└─────────────────────────────────────────┘
```

### Standard Validation Workflow

#### 1. Pre-Validation Checks

Before running validation:

```bash
# 1. Ensure test environment is ready
npx prisma generate

# 2. Verify Supabase connection
psql "$DATABASE_URL" -c "SELECT version();"

# 3. Check RLS is enabled on all tables
psql "$DATABASE_URL" -c "
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE schemaname='public'
  AND tablename NOT LIKE '_prisma%';
"
```

All tables should show `rowsecurity = true`.

#### 2. RLS Policy Validation

**Check policies exist for each table:**

```sql
-- List all RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

**Required policies for each model:**

1. **Workspace access policy** - Users can only access their workspace data
2. **Service role bypass** - Server operations can access all data

**Verify policy structure:**

```sql
-- Example: Check Challenge table policies
SELECT policyname, cmd, qual::text
FROM pg_policies
WHERE tablename = 'Challenge';

-- Expected policies:
-- 1. "Users can access own workspace challenges" (FOR ALL)
-- 2. "Service role has full access to challenges" (FOR ALL TO service_role)
```

#### 3. Workspace Isolation Tests

**Test Categories:**

**A. Cross-Workspace Data Access (Critical):**

Test that Workspace A users cannot:
- Read Workspace B data
- Update Workspace B data
- Delete Workspace B data
- Create data in Workspace B

**B. Role-Based Access Control:**

Test that:
- PARTICIPANT cannot access admin-only routes
- ADMIN can access all workspace routes
- Unauthenticated users are blocked

**C. API Route Protection:**

Test that:
- All routes require authentication
- All routes validate workspace membership
- All routes respect role requirements

**D. Database Query Isolation:**

Test that:
- All queries filter by workspaceId
- Relations properly enforce workspace boundaries
- Aggregations don't leak cross-workspace data

#### 4. Automated Test Suite

**Run isolation tests:**

```bash
# 1. Full security test suite
npx playwright test tests/security/ --reporter=list

# 2. RLS-specific tests
npx playwright test tests/security/rls-fixture-test.spec.ts --reporter=list

# 3. Role-based access tests
npx playwright test tests/api/manager-auth.spec.ts --reporter=list

# 4. Cross-workspace tests
npx playwright test -g "workspace isolation" --reporter=list
```

**Expected results:**
- All tests MUST pass
- No warnings or console errors
- Response times < 1000ms (indicates proper indexing)

#### 5. Manual Validation Scenarios

**Scenario 1: User switches workspaces**

```typescript
// Create two workspaces with same user
const workspace1 = await createWorkspace("workspace-1");
const workspace2 = await createWorkspace("workspace-2");

// Add user to both workspaces
await addUserToWorkspace(user.id, workspace1.id, "PARTICIPANT");
await addUserToWorkspace(user.id, workspace2.id, "PARTICIPANT");

// Create challenge in workspace 1
const challenge = await createChallenge({
  title: "Test",
  workspaceId: workspace1.id
});

// Try to access from workspace 2 context
const response = await fetch(`/api/w/workspace-2/challenges/${challenge.id}`);

// MUST return 404 or 403, NOT the challenge
expect(response.status).toBe(404);
```

**Scenario 2: Admin accesses participant data**

```typescript
// Admin should only see own workspace participants
const admin = await createAdmin(workspace1.id);
const participant = await createParticipant(workspace2.id);

// Admin queries participants
const participants = await getParticipants(admin, workspace1.id);

// MUST NOT include workspace2 participant
expect(participants.find(p => p.id === participant.id)).toBeUndefined();
```

**Scenario 3: Direct database query bypass**

```typescript
// Simulate compromised API - direct Prisma query without workspaceId
const allChallenges = await prisma.challenge.findMany();

// With proper RLS, this should fail or return empty
// Service role queries bypass RLS (expected)
// User role queries respect RLS (critical)
```

### Validation Checklist

**For each new model, verify:**

- [ ] **Schema includes workspaceId field**
  ```prisma
  workspaceId String @db.Uuid
  workspace   Workspace @relation(fields: [workspaceId], references: [id])
  ```

- [ ] **RLS is enabled**
  ```sql
  ALTER TABLE "ModelName" ENABLE ROW LEVEL SECURITY;
  ```

- [ ] **User access policy exists**
  ```sql
  CREATE POLICY "Users can access own workspace data"
    ON "ModelName" FOR ALL
    USING ("workspaceId" IN (
      SELECT "workspaceId" FROM "User"
      WHERE "supabaseUserId" = auth.uid()
    ));
  ```

- [ ] **Service role policy exists**
  ```sql
  CREATE POLICY "Service role has full access"
    ON "ModelName" FOR ALL TO service_role
    USING (true) WITH CHECK (true);
  ```

- [ ] **API routes filter by workspaceId**
  ```typescript
  const challenges = await prisma.challenge.findMany({
    where: { workspaceId: workspace.id }  // REQUIRED
  });
  ```

- [ ] **Tests verify isolation**
  - Create test in `tests/security/rls-[model]-test.spec.ts`
  - Test cross-workspace access fails
  - Test role-based permissions work

### Common Vulnerabilities

**Critical Issues to Check:**

**1. Missing workspaceId filter:**
```typescript
// ❌ VULNERABLE - No workspace filter
const challenges = await prisma.challenge.findMany();

// ✅ SECURE - Workspace filter applied
const challenges = await prisma.challenge.findMany({
  where: { workspaceId }
});
```

**2. RLS bypass via service role:**
```typescript
// ❌ VULNERABLE - Using service role for user query
const supabase = createServiceClient();
const { data } = await supabase.from('Challenge').select('*');

// ✅ SECURE - Using user session for user query
const supabase = createClient();  // User context
const { data } = await supabase.from('Challenge').select('*');
```

**3. Incomplete relation includes:**
```typescript
// ❌ VULNERABLE - Related data not filtered
const challenge = await prisma.challenge.findFirst({
  where: { id, workspaceId },
  include: { enrollments: true }  // No workspace filter on enrollments
});

// ✅ SECURE - Explicit workspace filter on relations
const challenge = await prisma.challenge.findFirst({
  where: { id, workspaceId },
  include: {
    enrollments: {
      where: { challenge: { workspaceId } }
    }
  }
});
```

**4. ID-based lookups without workspace check:**
```typescript
// ❌ VULNERABLE - Finding by ID without workspace
const challenge = await prisma.challenge.findUnique({
  where: { id }  // No workspaceId check
});

// ✅ SECURE - Compound check with workspace
const challenge = await prisma.challenge.findFirst({
  where: { id, workspaceId }  // Both ID and workspace
});
```

**5. Aggregate queries leaking data:**
```typescript
// ❌ VULNERABLE - Count across all workspaces
const count = await prisma.challenge.count();

// ✅ SECURE - Count within workspace only
const count = await prisma.challenge.count({
  where: { workspaceId }
});
```

### Validation Report Format

**Generate comprehensive report:**

```markdown
## Multi-Tenant Validation Report
**Date:** [timestamp]
**Environment:** [local/staging/production]

### RLS Policy Status
- [Model] Challenge: ✅ Enabled, 2 policies active
- [Model] Enrollment: ✅ Enabled, 2 policies active
- [Model] User: ✅ Enabled, 2 policies active
- [Model] Workspace: ✅ Enabled, 1 policy active

### Test Results
**Security Tests:** 15/15 passed ✅
**RLS Tests:** 8/8 passed ✅
**Role Tests:** 6/6 passed ✅

### Isolation Verification
- ✅ Cross-workspace data access blocked
- ✅ Role-based permissions enforced
- ✅ API routes validate workspace membership
- ✅ Database queries filter by workspaceId

### Vulnerabilities Found
[None / List of issues]

### Recommendations
1. [Action item 1]
2. [Action item 2]

### Sign-off
- [ ] All critical tests passing
- [ ] No data leakage detected
- [ ] RLS policies verified
- [ ] Ready for deployment
```

### Database Inspection Tools

**Query current RLS state:**

```sql
-- 1. Check which tables have RLS enabled
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE '_prisma%'
ORDER BY tablename;

-- 2. List all policies with details
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  CASE
    WHEN roles = '{public}' THEN 'public'
    WHEN roles = '{service_role}' THEN 'service_role'
    ELSE array_to_string(roles, ', ')
  END as applies_to,
  cmd as command_type,
  qual::text as using_expression,
  with_check::text as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Test policy with specific user context
SET ROLE authenticated;
SET request.jwt.claims.sub TO '[user-uuid]';
SELECT * FROM "Challenge" WHERE "workspaceId" = '[workspace-uuid]';
RESET ROLE;

-- 4. Verify service role bypass
SET ROLE service_role;
SELECT count(*) FROM "Challenge";  -- Should return all challenges
RESET ROLE;

-- 5. Check foreign key relationships
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
```

### Integration with Other Skills

**With Database Schema Migration Skill:**
```bash
# After schema changes, validate isolation
1. Database Migration Skill creates/modifies table
2. Multi-Tenant Validation checks RLS policies
3. Run isolation tests
4. Report any vulnerabilities
```

**With Test Suite Runner Skill:**
```bash
# Comprehensive validation
1. Run security test suite
2. Validate RLS policies via database queries
3. Check API route protection
4. Generate validation report
```

**With Task Master:**
```bash
# Track validation in workflow
task-master update-subtask --id=X.X --prompt="Multi-tenant validation: [PASSED/FAILED]. Issues: [none/details]. RLS policies: [verified]."
```

### Performance Considerations

**Workspace-scoped queries should be fast:**

```sql
-- Add indexes for workspace filtering
CREATE INDEX idx_challenge_workspace ON "Challenge"("workspaceId");
CREATE INDEX idx_enrollment_workspace ON "Enrollment"("challengeId", "userId");
CREATE INDEX idx_user_workspace ON "User"("workspaceId", "email");
```

**Monitor query performance:**
```sql
EXPLAIN ANALYZE
SELECT * FROM "Challenge"
WHERE "workspaceId" = '[uuid]';

-- Should show index scan, not sequential scan
-- Execution time should be < 10ms for indexed queries
```

### Deployment Validation

**Before deploying to production:**

1. **Run full validation suite in staging:**
```bash
# Switch to staging environment
export DATABASE_URL="<staging-url>"

# Run complete validation
npx playwright test tests/security/ --reporter=list
```

2. **Manual spot checks:**
- Log in as different workspace users
- Attempt cross-workspace access
- Verify admin/participant role boundaries

3. **Database audit:**
```sql
-- Run validation queries on staging database
-- Verify RLS policies match expectations
-- Check for any missing policies or indexes
```

4. **Performance verification:**
```bash
# Check query times under load
# Verify no N+1 query patterns
# Confirm proper index usage
```

### Best Practices

1. **Always validate after schema changes** - New models require new RLS policies
2. **Test with multiple workspaces** - Create at least 2 workspaces for testing
3. **Use real user contexts** - Don't mock auth, use actual Supabase sessions
4. **Verify at all layers** - Check middleware, API, queries, and RLS
5. **Document validation results** - Keep audit trail of security checks
6. **Automate where possible** - Include in CI/CD pipeline
7. **Never skip RLS** - Even if "it's just an internal tool"
8. **Monitor production** - Log and alert on potential isolation breaches

### Emergency Response

**If isolation breach detected:**

1. **Immediate containment:**
```sql
-- Revoke all access temporarily
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM public;
```

2. **Investigate scope:**
```sql
-- Check which data may have been exposed
SELECT * FROM "AuditLog"
WHERE timestamp > '[breach-time]'
AND "workspaceId" != '[expected-workspace]';
```

3. **Fix vulnerability:**
- Identify root cause (missing filter, RLS policy, etc.)
- Apply fix via Database Migration Skill
- Verify fix with Multi-Tenant Validation

4. **Notify affected parties:**
- Document what data was potentially exposed
- Follow incident response protocol

## Examples

### Example 1: Validate New Challenge Model

```bash
# 1. Check schema has workspaceId
# Read prisma/schema.prisma - verify Challenge model

# 2. Check RLS is enabled
psql "$DATABASE_URL" -c "SELECT rowsecurity FROM pg_tables WHERE tablename='Challenge';"

# 3. Check policies exist
psql "$DATABASE_URL" -c "SELECT policyname FROM pg_policies WHERE tablename='Challenge';"

# 4. Run isolation tests
npx playwright test tests/security/rls-fixture-test.spec.ts --reporter=list

# 5. Verify in test scenario
# Create two workspaces, ensure Challenge isolation works
```

### Example 2: Debug Failing RLS Test

```bash
# 1. Test reports cross-workspace access is possible
npx playwright test tests/security/rls-fixture-test.spec.ts:45 --reporter=line

# 2. Check which policy is missing
psql "$DATABASE_URL" -c "SELECT * FROM pg_policies WHERE tablename='Challenge';"

# 3. Verify policy logic
# Read scripts/rls-policies-challenge.sql

# 4. Re-apply policies
psql "$DATABASE_URL" -f scripts/rls-policies-challenge.sql

# 5. Re-test
npx playwright test tests/security/rls-fixture-test.spec.ts --reporter=list
```

### Example 3: Pre-Deployment Validation

```bash
# 1. Full security suite
timeout 180 npx playwright test tests/security/ --reporter=list

# 2. Database policy audit
psql "$DATABASE_URL" -f scripts/audit-rls-policies.sql

# 3. Manual verification
# Log into staging as two different workspace users
# Attempt cross-workspace operations

# 4. Generate report
# Document all validation results

# 5. Sign-off
# All tests passed, ready for production deployment
```

## Success Criteria

After using this skill, verify:

- [ ] All models have RLS enabled
- [ ] Required policies exist for each model
- [ ] Security tests pass (100% pass rate required)
- [ ] Cross-workspace access is blocked
- [ ] Role-based permissions enforced
- [ ] No console errors or warnings during validation
- [ ] Validation results documented
- [ ] Ready for deployment (if pre-deployment check)

## Related Skills

- **Database Schema Migration Skill** - Create RLS policies after schema changes
- **Test Suite Runner Skill** - Execute security and RLS tests
- **API Route Generator Skill** - Ensure new routes include workspace validation

---

*This skill is critical for maintaining the security and integrity of the multi-tenant Changemaker platform. Zero tolerance for isolation breaches.*
