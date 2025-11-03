# API Documentation Gaps Analysis

**Generated**: 2025-11-03
**Status**: Action Required

---

## Executive Summary

The Changemaker API has **54 implemented endpoints** but only **18 are documented**:
- ✅ 10 public endpoints (OpenAPI spec)
- ✅ 8 manager endpoints (dedicated doc)
- ❌ **36 workspace endpoints undocumented** (67% of API surface)

This creates risks for:
- Frontend developers (no contract reference)
- API consumers (no integration guide)
- Maintenance (drift between implementation and expectations)

---

## Documented Endpoints (18/54)

### Public API (OpenAPI 3.1) - 10 endpoints
| Endpoint | Methods | Status |
|----------|---------|--------|
| `/api/health` | GET | ✅ Documented |
| `/api/account/profile` | GET, PUT | ✅ Documented |
| `/api/account/email/start-change` | POST | ✅ Documented |
| `/api/account/email/confirm` | POST | ✅ Documented |
| `/api/account/email/cancel` | POST | ✅ Documented |
| `/api/account/password/change` | POST | ✅ Documented |
| `/api/account/password/update` | POST | ✅ Documented |
| `/api/account/password/request-reset` | POST | ✅ Documented |
| `/api/user/workspaces` | GET | ✅ Documented |
| `/api/invites/accept` | POST | ✅ Documented |

**Location**: `public/api/public-openapi.yaml`
**Rendered at**: `/docs/public-api` (Redoc)

### Manager API - 8 endpoints
| Endpoint | Methods | Status |
|----------|---------|--------|
| `/api/workspaces/[slug]/challenges/[id]/managers` | POST, GET | ✅ Documented |
| `/api/workspaces/[slug]/challenges/[id]/managers/[managerId]` | DELETE | ✅ Documented |
| `/api/workspaces/[slug]/submissions/[id]/manager-review` | POST | ✅ Documented |
| `/api/workspaces/[slug]/submissions/[id]/review` | PATCH | ✅ Documented |
| `/api/workspaces/[slug]/manager/queue` | GET | ✅ Documented |

**Location**: `docs/api/manager-endpoints.md`

---

## Undocumented Endpoints (36/54)

### Admin Endpoints (4 endpoints)
```
POST   /api/admin/users/bulk-upload
PATCH  /api/admin/users/[id]/role
PATCH  /api/admin/users/[id]/workspace
PATCH  /api/admin/users/[id]/superadmin
```

**Impact**: No reference for bulk user operations or role management.

---

### Workspace Management (5 endpoints)
```
GET    /api/workspaces/[slug]
GET/POST /api/workspaces/[slug]/users
POST   /api/workspace/switch
GET/POST /api/workspaces/[slug]/invites
GET    /api/workspaces/[slug]/profile
```

**Impact**: Core workspace operations lack API contracts.

---

### Challenge Management (7 endpoints)
```
GET/POST   /api/workspaces/[slug]/challenges
GET/PUT/DELETE /api/workspaces/[slug]/challenges/[id]
GET/POST   /api/workspaces/[slug]/challenges/[id]/activities
PUT/DELETE /api/workspaces/[slug]/challenges/[id]/activities/[activityId]
POST       /api/workspaces/[slug]/challenges/[id]/activities/reorder
GET/POST   /api/workspaces/[slug]/challenges/[id]/budget
```

**Impact**: Challenge CRUD and activity management lack specs.

---

### Participant Management (10 endpoints)
```
GET/POST   /api/workspaces/[slug]/participants
GET/PUT/DELETE /api/workspaces/[slug]/participants/[id]
POST       /api/workspaces/[slug]/participants/bulk
GET        /api/workspaces/[slug]/participants/export
GET/POST   /api/workspaces/[slug]/participants/[id]/enrollments
GET/PUT/DELETE /api/workspaces/[slug]/participants/[id]/enrollments/[enrollmentId]
POST       /api/workspaces/[slug]/participants/[id]/enrollments/[enrollmentId]/progress
GET/POST   /api/workspaces/[slug]/participants/segments
GET/PUT/DELETE /api/workspaces/[slug]/participants/segments/[id]
```

**Impact**: Critical for participant lifecycle, completely undocumented.

---

### Submission Management (2 endpoints)
```
GET/POST   /api/workspaces/[slug]/submissions
GET        /api/workspaces/[slug]/submissions/[id]
```

**Note**: Manager review endpoints are documented, but basic submission listing/creation is not.

---

### Email System (5 endpoints)
```
GET/PATCH  /api/workspaces/[slug]/emails/settings
GET/POST   /api/workspaces/[slug]/emails/templates
GET/PUT/DELETE /api/workspaces/[slug]/emails/templates/[type]
POST       /api/workspaces/[slug]/emails/test-send
POST       /api/workspaces/[slug]/communications
```

**Impact**: Email configuration and sending lack documentation.

---

### Other Features (5 endpoints)
```
GET/POST   /api/workspaces/[slug]/activity-templates
GET/PUT/DELETE /api/workspaces/[slug]/activity-templates/[id]
GET/POST   /api/workspaces/[slug]/enrollments
GET        /api/workspaces/[slug]/leaderboard
GET/POST   /api/workspaces/[slug]/points
GET/POST   /api/workspaces/[slug]/budget
```

**Impact**: Template management, leaderboards, and points tracking undocumented.

---

### Internal/Auth Endpoints (2 endpoints)
```
POST   /api/auth/sync-user
POST   /api/invites/redeem
```

**Note**: These may be internal-only but should have implementation docs.

---

## Documentation Quality Issues

### 1. OpenAPI Spec Issues

#### Missing in Spec but Referenced in Docs
The `docs/operations/api-docs.md` references these endpoints that aren't in the OpenAPI spec:
- ❌ `/api/invites/redeem` (exists in code, not in spec)
- ❌ `/api/workspace/switch` (exists in code, not in spec)

#### Schema Accuracy
**Issue**: `WorkspaceMembershipSummary` schema lists roles as `[ADMIN, PARTICIPANT]`
```yaml
role:
  type: string
  enum: [ADMIN, PARTICIPANT]  # ❌ Missing MANAGER role
```

**Required Fix**: Add MANAGER to enum (introduced in Phase 2)

---

### 2. Manager Endpoints Documentation

**Strengths**:
- Comprehensive implementation examples
- Clear authorization patterns
- Good error response documentation

**Issues**:
1. **Outdated reference**: Line 22 states "Auth Helpers Used" but doesn't account for the new `requireManagerAccess()` helper with challengeId parameter
2. **Missing dashboard endpoint**: `GET /api/workspaces/[slug]/manager/dashboard` is described but this exact route doesn't exist (actual route is `/api/workspaces/[slug]/manager/queue`)

---

### 3. Operations Playbook

**Strengths**:
- Clear editing workflow
- Validation guidance (Redocly CLI)
- Good examples of authentication patterns

**Issues**:
1. **Incomplete endpoint table**: The "Quick Reference" table at the top lists 12 endpoints but the actual OpenAPI spec only contains 10
2. **Missing workspace endpoints**: The playbook doesn't mention that workspace-scoped endpoints aren't in the public API spec

---

## Recommended Actions

### Priority 1: Document Critical Workflows (Week 1)

Create `docs/api/workspace-endpoints.md` covering:

**Challenge Management** (most used)
```
GET    /api/workspaces/[slug]/challenges           # List challenges
POST   /api/workspaces/[slug]/challenges           # Create challenge
GET    /api/workspaces/[slug]/challenges/[id]      # Get challenge details
PUT    /api/workspaces/[slug]/challenges/[id]      # Update challenge
DELETE /api/workspaces/[slug]/challenges/[id]      # Delete challenge
```

**Participant Management** (second most used)
```
GET    /api/workspaces/[slug]/participants         # List participants
POST   /api/workspaces/[slug]/participants         # Create participant
POST   /api/workspaces/[slug]/participants/bulk    # Bulk import
GET    /api/workspaces/[slug]/participants/export  # Export CSV
```

**Enrollment Management**
```
GET    /api/workspaces/[slug]/enrollments          # List enrollments
POST   /api/workspaces/[slug]/enrollments          # Create enrollment
```

---

### Priority 2: Fix Existing Documentation (Week 1)

#### OpenAPI Spec
1. ✅ Add MANAGER role to `WorkspaceMembershipSummary.role` enum
2. ✅ Bump version to 1.2.0
3. ✅ Consider adding workspace-scoped endpoints to a separate `workspace-openapi.yaml`

#### Manager Endpoints Doc
1. ✅ Update dashboard endpoint path (line 524)
2. ✅ Add note about `requireManagerAccess(slug, challengeId)` signature
3. ✅ Cross-reference workspace endpoints doc once created

#### Operations Playbook
1. ✅ Sync endpoint count in Quick Reference table
2. ✅ Add note about workspace API documentation location

---

### Priority 3: Establish Documentation Process (Week 2)

Create `docs/api/README.md` with:

```markdown
# API Documentation Structure

## Public API
- **Spec**: `public/api/public-openapi.yaml` (OpenAPI 3.1)
- **Rendered**: https://changemaker.im/docs/public-api
- **Scope**: Account management, invites, health checks

## Workspace API
- **Docs**: `docs/api/workspace-endpoints.md`
- **Scope**: Challenges, participants, enrollments, activities

## Manager API
- **Docs**: `docs/api/manager-endpoints.md`
- **Scope**: Manager assignments, submission reviews, queue

## Admin API
- **Docs**: `docs/api/admin-endpoints.md` (TODO)
- **Scope**: User management, bulk operations, role assignments

## Maintenance
- Update OpenAPI spec when public API changes
- Update docs when workspace API changes
- Run `pnpm dlx @redocly/cli@latest lint` before commit
- Include API changes in PR descriptions
```

---

### Priority 4: Generate TypeScript Types (Week 2)

Generate types from OpenAPI spec:

```bash
pnpm add -D openapi-typescript
pnpm exec openapi-typescript public/api/public-openapi.yaml -o lib/types/api.generated.ts
```

Add to `package.json`:
```json
{
  "scripts": {
    "generate:types": "openapi-typescript public/api/public-openapi.yaml -o lib/types/api.generated.ts"
  }
}
```

---

## Long-Term Strategy

### Option 1: Split OpenAPI Specs
- `public/api/public-openapi.yaml` - Public API (current)
- `public/api/workspace-openapi.yaml` - Workspace API (new)
- `public/api/admin-openapi.yaml` - Admin API (new)

**Pros**: Clear separation, different auth models
**Cons**: Multiple specs to maintain

### Option 2: Single Comprehensive Spec
Merge all into one OpenAPI spec with tags:
- `Health`, `Account`, `Password`, `Invites` (public)
- `Challenges`, `Participants`, `Enrollments` (workspace)
- `Manager`, `Admin` (privileged)

**Pros**: Single source of truth
**Cons**: Large file, harder to navigate

### Recommendation
**Option 1** for now (separate concerns), with a potential move to Option 2 once the API stabilizes.

---

## Verification Checklist

- [ ] Every `app/api/**/route.ts` has corresponding documentation
- [ ] OpenAPI spec validates with Redocly CLI
- [ ] All auth helpers (`requireWorkspaceAdmin`, `requireManagerAccess`) are documented
- [ ] Error response patterns are consistent across docs
- [ ] TypeScript types generated from OpenAPI spec
- [ ] CI/CD checks for spec validation
- [ ] PR template includes "API changes?" checkbox

---

## Impact Assessment

### Current State
- **Public API**: 100% documented ✅
- **Manager API**: 100% documented ✅
- **Workspace API**: 0% documented ❌
- **Overall**: 33% documented

### Target State (4 weeks)
- **Public API**: 100% documented ✅
- **Manager API**: 100% documented ✅
- **Workspace API**: 100% documented 🎯
- **Overall**: 100% documented

### Business Risk (Current)
- **High**: Frontend developers rely on code inspection
- **High**: API changes can break without contract tests
- **Medium**: New team members have steep learning curve
- **Medium**: Integration partners lack clear API reference

---

**Next Steps**:
1. Review this analysis with team
2. Prioritize endpoint documentation based on usage
3. Assign documentation tasks
4. Set up automated spec validation in CI

**Estimated Effort**:
- Priority 1 (Critical endpoints): 8-12 hours
- Priority 2 (Fix existing): 2-4 hours
- Priority 3 (Process): 2-3 hours
- Priority 4 (Types): 1-2 hours

**Total**: 13-21 hours (~2-3 days)
