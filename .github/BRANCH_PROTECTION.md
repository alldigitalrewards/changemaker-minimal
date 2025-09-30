# Branch Protection Setup

## Required Status Checks for Main Branch

To enforce CI checks before merging to main, configure branch protection rules.

### Setup Steps

1. **Go to Repository Settings**
   - Navigate to: `Settings` → `Branches` → `Branch protection rules`
   - Click "Add rule" or edit existing rule for `main`

2. **Configure Protection Rules**

   **Branch name pattern:** `main`

   ✅ **Require a pull request before merging**
   - Require approvals: 1 (optional for solo dev)
   - Dismiss stale approvals when new commits are pushed

   ✅ **Require status checks to pass before merging**
   - Require branches to be up to date before merging
   - Status checks required:
     - `PR Check Summary` (from pr-checks.yml)
     - `Migration Validation` (from pr-checks.yml)
     - `Build & Type Check` (from pr-checks.yml)
     - `Unit Tests` (from pr-checks.yml)

   ✅ **Require conversation resolution before merging**

   ✅ **Do not allow bypassing the above settings**
   - Includes administrators (recommended for strict enforcement)

   ⚠️ **Allow force pushes** (optional)
   - Only enable if you need to force push (not recommended)

### Workflow Behavior

**Before Merge (PR Checks):**
```
Pull Request → main
├─ pr-checks.yml runs
│  ├─ Migration validation
│  ├─ Build & type check
│  └─ Unit tests
└─ Must pass to merge ✅
```

**After Merge (Production Deployment):**
```
Merged to main
└─ database-migration.yml runs
   ├─ Backup production DB
   ├─ Apply migrations
   ├─ Health checks
   └─ E2E smoke tests
```

### Current Workflows

| Workflow | Trigger | Purpose | Blocks Merge? |
|----------|---------|---------|---------------|
| `pr-checks.yml` | PR to main | Pre-merge validation | ✅ Yes (with branch protection) |
| `database-migration.yml` | Push to main | Production deployment & verification | ❌ No (post-merge) |

### For Solo Development

If you're developing solo and want flexibility:

1. **Minimum protection:**
   - Require status checks: YES
   - Required checks: `PR Check Summary`
   - Allow bypassing: NO

2. **Testing pre-production:**
   - Use `./scripts/migrate-production.sh` before creating PR
   - PR checks validate build/types
   - Merge when green
   - Post-merge workflow deploys to production

### Emergency Override

If you need to bypass checks (emergencies only):
```bash
# Temporarily disable branch protection
# Settings → Branches → Edit rule → Uncheck "Do not allow bypassing"

# OR push directly (not recommended):
git push origin main --force
```

### Verification

After setup, test with a PR:
```bash
# Create test branch
git checkout -b test-branch-protection

# Make trivial change
echo "# Test" >> README.md
git add . && git commit -m "test: Verify branch protection"

# Push and create PR
git push -u origin test-branch-protection
gh pr create --title "Test: Branch Protection" --body "Testing CI checks"

# Verify:
# 1. PR shows "Required" checks
# 2. Checks run automatically
# 3. Merge button disabled until checks pass
```

### GitHub Secrets Required

Ensure these secrets are configured for CI:

**Environment: production**
- `PRODUCTION_DATABASE_URL` - Pooled connection for app
- `PRODUCTION_DIRECT_URL` - Direct connection for migrations
- `NEXT_PUBLIC_SUPABASE_URL` - Public Supabase URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role for admin ops

**Add in:** `Settings` → `Secrets and variables` → `Actions` → `New repository secret`
