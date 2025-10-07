# Test Suite Fixes Required

## Priority 1: Auth Flow Timeout (BLOCKS ALL TESTS)

### Problem
Login helper times out waiting for redirect after form submission:
```typescript
// Location: tests/e2e/support/auth.ts:12
await page.waitForURL((url) =>
  url.pathname === '/workspaces' ||
  url.searchParams.get('redirectTo') !== null
)
```

### Debug Steps
1. Test login manually in browser - does it redirect properly?
2. Check network requests during login - is API responding?
3. Check console for errors during login
4. Verify `/auth/login` form action is correct
5. Check middleware redirect logic

### Potential Fixes

**Option A: Increase Timeout**
```typescript
await page.waitForURL(
  (url) => url.pathname === '/workspaces' || url.searchParams.get('redirectTo') !== null,
  { timeout: 60000 } // 60 seconds instead of 30
)
```

**Option B: Better Wait Logic**
```typescript
// Wait for either workspaces page OR any non-login page
await page.waitForURL((url) => !url.pathname.includes('/auth/login'))
```

**Option C: API-Based Auth (Recommended)**
```typescript
export async function loginWithAPI(page: Page, email: string, password: string) {
  // Use Supabase API directly instead of UI
  const response = await page.request.post('/auth/callback', {
    data: { email, password }
  })
  // Set cookies from response
  await page.context().addCookies(/* cookies from response */)
}
```

## Priority 2: TypeScript Errors in Tests (28 errors)

### Error Categories

#### 1. Missing Prisma Schema Fields

**Error**: Property 'spent' does not exist on ChallengePointsBudget
**Location**: tests/api/challenge-crud.spec.ts:326
**Fix**: Either add field to schema or remove from test

**Error**: Property 'filters' does not exist on WorkspaceParticipantSegment
**Locations**: tests/api/participants.spec.ts (5 occurrences)
**Fix**: Check if field was removed from schema, update tests

**Error**: Property 'createdAt' does not exist on RewardIssuanceOrderByWithRelationInput
**Locations**: tests/api/submissions.spec.ts (2 occurrences)
**Fix**: Use correct field name or remove from orderBy

**Error**: Property 'createdById' does not exist
**Location**: tests/e2e/flows/participant-journey.spec.ts:70
**Fix**: Use 'createdBy' instead (typo)

#### 2. Enum Value Mismatches

**Error**: Property 'COMPLETED' does not exist on EnrollmentStatus enum
**Locations**: tests/api/enrollment.spec.ts (3 occurrences)
**Current Enum**: { INVITED, ENROLLED, WITHDRAWN }
**Fix**: Either add COMPLETED to schema or use correct status

**Error**: Property 'POINTS' does not exist, use 'points' instead
**Locations**: tests/e2e/flows/reward-issuance-flow.spec.ts (6 occurrences)
**Fix**: Use lowercase enum values (points, sku, monetary)

#### 3. Invalid JSON Type

**Error**: Type 'null' is not assignable to NullableJsonNullValueInput
**Locations**:
- tests/api/email-change.spec.ts (2 occurrences)
- tests/e2e/flows/email-change-flow.spec.ts (2 occurrences)
**Fix**: Use `Prisma.JsonNull` or `Prisma.DbNull` instead of `null`

#### 4. Invalid test() Call Signatures

**Error**: Invalid overload for test()
**Locations**: tests/api/email-change.spec.ts (lines 69, 130)
**Fix**: Check test syntax, likely missing function body

### Bulk Fixes Script

```bash
# Fix enum values (POINTS → points, etc.)
find tests -name "*.spec.ts" -exec sed -i '' 's/RewardType\.POINTS/RewardType.points/g' {} \;
find tests -name "*.spec.ts" -exec sed -i '' 's/RewardType\.SKU/RewardType.sku/g' {} \;
find tests -name "*.spec.ts" -exec sed -i '' 's/RewardType\.MONETARY/RewardType.monetary/g' {} \;

# Fix null JSON values
find tests -name "*.spec.ts" -exec sed -i '' 's/: null,/: Prisma.JsonNull,/g' {} \;

# Fix createdById → createdBy
find tests -name "*.spec.ts" -exec sed -i '' 's/createdById:/createdBy:/g' {} \;
```

## Priority 3: Schema Verification

### Check Current Schema

Run these to understand current schema:
```bash
# Check RewardType enum
grep -A5 "enum RewardType" prisma/schema.prisma

# Check EnrollmentStatus enum
grep -A5 "enum EnrollmentStatus" prisma/schema.prisma

# Check ChallengePointsBudget model
grep -A20 "model ChallengePointsBudget" prisma/schema.prisma

# Check WorkspaceParticipantSegment model
grep -A20 "model WorkspaceParticipantSegment" prisma/schema.prisma
```

### Expected Findings
1. RewardType should be lowercase (points, sku, monetary)
2. EnrollmentStatus might not have COMPLETED
3. ChallengePointsBudget might not have 'spent' field
4. WorkspaceParticipantSegment might not have 'filters' field

## Testing Strategy

### Phase 1: Fix Auth (2-4 hours)
1. Debug login redirect manually
2. Implement fix (Options A, B, or C above)
3. Test with single spec file
4. Verify all beforeEach hooks pass

### Phase 2: Fix TypeScript Errors (2-3 hours)
1. Verify schema vs tests
2. Apply bulk fixes for enums
3. Fix JSON null values
4. Fix individual field references
5. Run `pnpm tsc --noEmit` until clean

### Phase 3: Run Full Suite (1 hour)
1. Run full test suite
2. Fix any runtime errors
3. Document results
4. Create pass/fail report

### Phase 4: Manual Testing (4-6 hours)
1. Complete manual checklist in TEST_RESULTS_FINAL.md
2. Document findings
3. Fix any UI bugs
4. Re-test

## Commands to Run After Fixes

```bash
# 1. TypeScript check
pnpm tsc --noEmit

# 2. Single test file (to verify auth fix)
pnpm exec playwright test tests/api/challenge-crud.spec.ts --workers=1

# 3. API tests only
pnpm exec playwright test tests/api --workers=2

# 4. E2E tests only
pnpm exec playwright test tests/e2e --workers=2

# 5. Full suite
pnpm test

# 6. With debugging
pnpm exec playwright test --debug

# 7. Headed mode (see browser)
pnpm exec playwright test --headed
```

## Success Criteria

### Auth Fixed:
- [ ] Single test file runs to completion
- [ ] No timeout errors in beforeEach hooks
- [ ] Login completes within 30 seconds

### TypeScript Fixed:
- [ ] `pnpm tsc --noEmit` shows 0 errors
- [ ] Tests compile without type errors
- [ ] Prisma types match test expectations

### Tests Pass:
- [ ] 90%+ of tests passing
- [ ] No cascading failures
- [ ] Clear pass/fail reporting

### Manual Testing:
- [ ] All features tested manually
- [ ] Results documented
- [ ] Bugs fixed or tracked

## Timeline Estimate

| Task | Time | Priority |
|------|------|----------|
| Debug auth issue | 1-2h | P0 |
| Implement auth fix | 1-2h | P0 |
| Fix TypeScript errors | 2-3h | P1 |
| Run test suite | 1h | P1 |
| Manual testing | 4-6h | P2 |
| Documentation | 1h | P3 |
| **TOTAL** | **10-15h** | |

## Quick Start

If you need tests working RIGHT NOW:

```bash
# 1. Quick auth fix (increase timeout)
# Edit tests/e2e/support/auth.ts line 12, add timeout:
{ timeout: 60000 }

# 2. Quick enum fixes
cd tests
find . -name "*.spec.ts" -exec sed -i '' 's/RewardType\.\([A-Z]*\)/RewardType.\L\1/g' {} \;
find . -name "*.spec.ts" -exec sed -i '' 's/EnrollmentStatus\.COMPLETED/EnrollmentStatus.ENROLLED/g' {} \;

# 3. Try running a single test
cd ..
pnpm exec playwright test tests/api/challenge-crud.spec.ts --workers=1 --timeout=60000

# 4. If that works, run full suite
pnpm test
```

---

**Next Action**: Start with Priority 1 (auth fix) as it blocks everything else.
