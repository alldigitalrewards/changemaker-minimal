# Correct Supabase Setup - Branch-Based Configuration

**Date**: 2025-10-22  
**Status**: ⚠️ Needs Configuration

---

## The ACTUAL Setup (Clarified)

You have **ONE Supabase project** with **TWO database branches**:

**Supabase Project**: `changemaker-minimal` (under changemaker-adr organization)

**Database Branches**:
1. **Production Branch** (main)
   - Project ID: `naptpgyrdaoachpmbyaq`
   - URL: `https://naptpgyrdaoachpmbyaq.supabase.co`
   - Used by: Vercel Production environment

2. **Staging Branch** (persistent)
   - Project ID: `ffivsyhuyathnnlajjq`  
   - URL: `https://ffivsyhuyathnnlajjq.supabase.co`
   - Should be used by: Vercel Preview environment

---

## Current Problem (Verified)

**Vercel Preview is using the PRODUCTION branch**:

```bash
# Current Preview Environment (WRONG):
NEXT_PUBLIC_SUPABASE_URL="https://naptpgyrdaoachpmbyaq.supabase.co"
                                    ^^^^^^^^^^^^^^^^^^^^^^^^
                                    Production branch ❌
```

**Should be**:
```bash
# Correct Preview Environment:
NEXT_PUBLIC_SUPABASE_URL="https://ffivsyhuyathnnlajjq.supabase.co"
                                    ^^^^^^^^^^^^^^^^^^^^^^^^
                                    Staging branch ✅
```

---

## Why This Happened

When you used "Resync environment variables" in the Supabase Vercel Integration:
- You were viewing the **main (production)** branch
- The integration synced production branch credentials to **all** environments
- This included Preview, which should use the staging branch

---

## The Fix

### Step 1: Get Staging Branch Credentials

1. **Go to Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/ffivsyhuyathnnlajjq
   ```

2. **Verify you're on the staging branch**:
   - Look at the top of the page
   - Should show: `staging | Persistent`
   - If not, click the branch dropdown and select "staging"

3. **Get API Credentials**:
   - Go to: Settings → API Keys
   - Copy:
     - `anon` / `public` key
     - `service_role` key (marked "Sensitive")
   - These start with `eyJ...`

4. **Get Database URLs**:
   - Go to: Settings → Database
   - Under "Connection string":
     - Copy **Connection Pooler** URL (port 6543) for `DATABASE_URL`
     - Copy **Direct Connection** URL (port 5432) for `DIRECT_URL`

### Step 2: Update Vercel Preview Environment

**Option A: Use the Updated Script**:
```bash
./scripts/fix-preview-environment.sh
```

**Option B: Manual via Vercel Dashboard**:

1. Go to: https://vercel.com/alldigitalrewards/changemaker-minimal/settings/environment-variables

2. For each of these variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `DIRECT_URL`

3. Click `•••` menu → "Edit"
   - **Uncheck** "Preview" environment  
   - Click "Save"

4. Add new variables for Preview with staging branch values:
   - Click "Add Another"
   - Enter variable name
   - Enter value from staging branch (Step 1)
   - Check **only** "Preview" environment
   - Click "Save"

### Step 3: Configure Supabase Integration (Recommended)

To prevent this issue in the future, configure the Vercel integration properly:

**For Production Branch**:
1. Switch to **main (production)** branch in Supabase
2. Go to: Settings → Integrations
3. Find Vercel integration → Manage
4. Check only: ✅ Production
5. Uncheck: ❌ Preview, ❌ Development
6. Resync environment variables

**For Staging Branch**:
1. Switch to **staging (persistent)** branch in Supabase
2. Go to: Settings → Integrations
3. Find Vercel integration → Manage (or add if not present)
4. Check only: ✅ Preview
5. Uncheck: ❌ Production, ❌ Development
6. Resync environment variables

---

## Verification

After configuration:

```bash
# Pull Preview environment variables
vercel env pull .env.vercel.preview --environment=preview --yes

# Check the URL
grep NEXT_PUBLIC_SUPABASE_URL .env.vercel.preview

# Should show:
# NEXT_PUBLIC_SUPABASE_URL="https://ffivsyhuyathnnlajjq.supabase.co"
#                                   ^^^^^^^^^^^^^^^^^^^^^^^^
#                                   Staging branch ✅
```

Test deployment:
```bash
# Push a commit to trigger new deployment
git commit --allow-empty -m "test: verify staging branch connection"
git push

# Get latest Preview URL
vercel ls changemaker-minimal | grep Preview | head -1

# Test the health endpoint
curl https://[preview-url]/api/health
# Should connect to STAGING branch database
```

---

## Key Differences from Previous Understanding

**What I thought**:
- Two separate Supabase projects
- Project IDs: `naptpgyrdaoachpmbyaq` and `ffivsyhuyathrnnlajjq`

**What it actually is**:
- ONE Supabase project with TWO branches
- Production branch: `naptpgyrdaoachpmbyaq`
- Staging branch: `ffivsyhuyathnnlajjq`
- Old ID `ffivsyhuyathrnnlajjq` no longer exists

**Why this matters**:
- Branch-based configuration is cleaner
- Easier to manage with one project
- Database branching is a Supabase feature for preview environments
- The fix is the same - Preview needs staging branch credentials

---

## Summary

**Current State**:
- Production Vercel → Production branch ✅
- Preview Vercel → Production branch ❌ (should be staging!)

**Target State**:
- Production Vercel → Production branch (`naptpgyrdaoachpmbyaq`) ✅
- Preview Vercel → Staging branch (`ffivsyhuyathnnlajjq`) ✅

**Action Required**:
1. Get credentials from staging branch
2. Update Preview environment variables in Vercel
3. Verify new deployments use correct branch

---

**Files Updated**:
- ✅ `scripts/fix-preview-environment.sh` - Now points to correct branch
- ✅ This document - Explains correct setup

**Ready to proceed**: Run the fix script or follow manual steps above.
