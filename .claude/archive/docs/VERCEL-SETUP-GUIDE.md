# Vercel Environment Variables Setup - Step by Step

**Goal**: Configure Preview deployments to use **staging** Supabase instead of production.

**Current Status**: ✅ Build fix pushed, waiting for deployment

---

## Quick Reference

| Environment | Supabase Project | Branch | Domain |
|-------------|------------------|--------|--------|
| **Production** | `naptpgyrdaoachpmbyaq` | `main` | `www.changemaker.im` |
| **Preview/Staging** | `ffivsyhuyathrnnlajjq` | Feature branches | `preview.changemaker.im` |
| **Development** | Local Supabase | Local | `localhost:3000` |

---

## Step 1: Get Staging Supabase Credentials

1. **Open Staging Supabase Project**:
   ```
   https://supabase.com/dashboard/project/ffivsyhuyathrnnlajjq/settings/api
   ```

2. **Copy These Values**:
   - ✏️ **Project URL**: `https://ffivsyhuyathnnlajjq.supabase.co`
   - ✏️ **anon/public key**: (long JWT token starting with `eyJ...`)
   - ✏️ **service_role key**: (marked as "Sensitive", starts with `eyJ...`)

3. **Get Database URLs**:
   ```
   https://supabase.com/dashboard/project/ffivsyhuyathrnnlajjq/settings/database
   ```
   - ✏️ **Connection Pooler** (port 6543): For `DATABASE_URL`
   - ✏️ **Direct Connection** (port 5432): For `DIRECT_URL`

---

## Step 2: Configure Vercel (Choose Method A or B)

### Method A: Via Vercel Dashboard (Recommended)

1. **Go to Environment Variables**:
   ```
   https://vercel.com/alldigitalrewards/changemaker-minimal/settings/environment-variables
   ```

2. **For Each Existing Variable** (if set to "All Environments"):
   
   Find these variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   
   For each:
   - Click the `•••` menu → "Edit"
   - **UNCHECK** "Preview" environment
   - Click "Save"
   - This keeps Production using production values

3. **Add New Preview-Specific Variables**:

   Click "Add Another" for each:

   **Variable 1:**
   ```
   Key: NEXT_PUBLIC_SUPABASE_URL
   Value: https://ffivsyhuyathnnlajjq.supabase.co
   Environments: ☑️ Preview only
   ```

   **Variable 2:**
   ```
   Key: NEXT_PUBLIC_SUPABASE_ANON_KEY
   Value: [paste anon key from Step 1]
   Environments: ☑️ Preview only
   ```

   **Variable 3:**
   ```
   Key: SUPABASE_SERVICE_ROLE_KEY
   Value: [paste service_role key from Step 1]
   Environments: ☑️ Preview only
   ```

   **Variable 4:**
   ```
   Key: DATABASE_URL
   Value: [paste Connection Pooler URL from Step 1]
   Environments: ☑️ Preview only
   ```

   **Variable 5:**
   ```
   Key: DIRECT_URL
   Value: [paste Direct Connection URL from Step 1]
   Environments: ☑️ Preview only
   ```

### Method B: Via Vercel CLI (Faster)

```bash
# Set each variable for Preview environment only
echo "https://ffivsyhuyathnnlajjq.supabase.co" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview

# Paste anon key when prompted
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview

# Paste service role key when prompted
vercel env add SUPABASE_SERVICE_ROLE_KEY preview

# Paste pooler URL when prompted
vercel env add DATABASE_URL preview

# Paste direct URL when prompted
vercel env add DIRECT_URL preview
```

---

## Step 3: Verify Configuration

1. **Check Current Deployment**:
   ```bash
   vercel ls changemaker-minimal --scope alldigitalrewards | head -5
   ```

2. **Wait for Latest Deployment**:
   - Look for deployment from commit `c8aaa99` (Prisma validation fix)
   - Status should show "Ready"

3. **Get Preview URL**:
   ```bash
   vercel ls changemaker-minimal --scope alldigitalrewards | grep "Ready.*Preview" | head -1
   ```

4. **Test the Preview Deployment**:
   ```bash
   # Replace with actual preview URL
   curl https://changemaker-minimal-[hash].vercel.app/api/health
   ```
   
   Should return:
   ```json
   {"status":"ok","database":"connected","timestamp":"..."}
   ```

5. **Check Build Logs** (in Vercel Dashboard):
   - Go to the deployment
   - Click "Build Logs"
   - Search for: `NEXT_PUBLIC_SUPABASE_URL`
   - Should show: `https://ffivsyhuyathnnlajjq...` (staging)

---

## Step 4: Test Staging Database Connection

Once Preview deployment is live with correct environment variables:

```bash
# Get the preview URL
PREVIEW_URL="https://changemaker-minimal-[hash].vercel.app"

# Test health endpoint
curl "$PREVIEW_URL/api/health"

# If you have test auth credentials, try logging in
# This should create/update data in STAGING Supabase only
```

**Verification Checklist**:
- ✅ Preview deployment builds successfully
- ✅ Health endpoint returns "connected"
- ✅ No data appears in Production Supabase
- ✅ Test data appears in Staging Supabase

---

## Step 5: Update PROGRESS.md

Once verified:

```bash
# Mark Task 13 as ready to complete
# Update with actual staging verification results
```

---

## Common Issues & Solutions

### Issue 1: "Variable already exists"
**Solution**: Edit the existing variable, uncheck Preview, then add new one

### Issue 2: Build still failing
**Check**: 
- All 5 variables are set for Preview
- Variables are exactly for "Preview" environment (not "All")
- No typos in variable names

### Issue 3: Still connecting to production
**Solution**:
- Trigger a NEW deployment (environment variables only apply to new deployments)
- Don't use "Redeploy" - push a new commit or use "Trigger Build"

### Issue 4: Can't find staging credentials
**Links**:
- API Keys: `https://supabase.com/dashboard/project/ffivsyhuyathrnnlajjq/settings/api`
- Database: `https://supabase.com/dashboard/project/ffivsyhuyathrnnlajjq/settings/database`

---

## What This Achieves

**Before**:
- ❌ Testing on Preview affects Production database
- ❌ Feature branches create production data
- ❌ Unsafe to test migrations

**After**:
- ✅ Preview uses isolated Staging database
- ✅ Safe to test any changes
- ✅ Production remains untouched
- ✅ Proper environment separation

---

## Next Steps After Configuration

1. ✅ Verify new Preview deployment succeeds
2. ✅ Test Preview URL connects to staging
3. ✅ Run Task 13 smoke tests on Preview URL
4. ✅ Complete Task 13 documentation
5. ✅ Proceed to Task 15 (Phase 1 Gate Review)

---

**Last Updated**: 2025-10-22  
**Related**: Task 13 (Smoke Tests), Task 12 (Staging Deployment)  
**Files**: 
- This guide: `.claude/docs/VERCEL-SETUP-GUIDE.md`
- Detailed docs: `.claude/docs/vercel-staging-setup.md`
- Helper script: `scripts/configure-vercel-staging.sh`
