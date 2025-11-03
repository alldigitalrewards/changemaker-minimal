# Supabase Vercel Integration - Proper Configuration

## The Problem You Discovered

The Supabase Vercel Integration can only connect ONE Supabase project at a time. When you sync to all environments (Production, Preview, Development), they all get the SAME credentials.

**Current State** (After Resync):
- All three Vercel environments got credentials from ONE Supabase project
- You were viewing from "staging" branch in Supabase when you clicked resync
- This likely synced **staging** credentials to **all environments** including Production ❌

## The Correct Approach

### Option A: Two Separate Integrations (Recommended)

**In Production Supabase Project** (`naptpgyrdaoachpmbyaq`):
1. Go to: https://supabase.com/dashboard/project/naptpgyrdaoachpmbyaq/settings/integrations
2. Connect to Vercel
3. Select your Vercel project: `changemaker-minimal`
4. **Only check**: ✅ Production
5. **Uncheck**: ❌ Preview, ❌ Development
6. Save

**In Staging Supabase Project** (`ffivsyhuyathrnnlajjq`):
1. Go to: https://supabase.com/dashboard/project/ffivsyhuyathrnnlajjq/settings/integrations
2. Connect to Vercel (same project)
3. Select your Vercel project: `changemaker-minimal`
4. **Only check**: ✅ Preview
5. **Uncheck**: ❌ Production, ❌ Development
6. Save

**Result**: Vercel will have environment-specific credentials automatically managed.

### Option B: Integration for Production + Manual for Preview (Simpler)

**Step 1: Configure Production Integration**

From Production Supabase:
1. Go to: https://supabase.com/dashboard/project/naptpgyrdaoachpmbyaq/settings/integrations
2. Connect to Vercel → `changemaker-minimal`
3. **Only check**: ✅ Production
4. Uncheck Preview and Development
5. Click "Save" or "Resync environment variables"

**Step 2: Manually Add Preview Variables in Vercel**

1. Go to: https://vercel.com/alldigitalrewards/changemaker-minimal/settings/environment-variables

2. Get staging credentials from:
   - API Keys: https://supabase.com/dashboard/project/ffivsyhuyathrnnlajjq/settings/api
   - Database: https://supabase.com/dashboard/project/ffivsyhuyathrnnlajjq/settings/database

3. Add these variables for **Preview only**:

```
Variable: NEXT_PUBLIC_SUPABASE_URL
Value: https://ffivsyhuyathrnnlajjq.supabase.co
Environment: ☑️ Preview only

Variable: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: [staging anon key from Supabase]
Environment: ☑️ Preview only

Variable: SUPABASE_SERVICE_ROLE_KEY
Value: [staging service role key]
Environment: ☑️ Preview only

Variable: DATABASE_URL
Value: [staging pooler connection string]
Environment: ☑️ Preview only

Variable: DIRECT_URL
Value: [staging direct connection string]
Environment: ☑️ Preview only
```

**Step 3: Leave Development Empty**
- Development uses local Supabase from `.env` file
- No Vercel configuration needed

## Current Action Required

**Before doing anything else**, check what's currently in Vercel:

```bash
# List current environment variables
vercel env ls --scope alldigitalrewards
```

Look for:
- Which Supabase URL is in Production?
- Which Supabase URL is in Preview?
- Are they the same or different?

**If Production has staging URL** (wrong):
1. You need to fix Production ASAP
2. Follow Option B above
3. Production should have: `https://naptpgyrdaoachpmbyaq.supabase.co`
4. Preview should have: `https://ffivsyhuyathrnnlajjq.supabase.co`

## Verification Commands

After configuration:

```bash
# Check Vercel environment variables
vercel env ls --scope alldigitalrewards | grep SUPABASE_URL

# Should show two different URLs:
# Production: naptpgyrdaoachpmbyaq.supabase.co
# Preview: ffivsyhuyathrnnlajjq.supabase.co
```

Test deployments:

```bash
# Test production
curl https://www.changemaker.im/api/health
# Should connect to production Supabase

# Test preview (get latest preview URL)
vercel ls changemaker-minimal --scope alldigitalrewards | grep Preview | head -1
curl https://[preview-url]/api/health
# Should connect to staging Supabase
```

## Why This Matters

**Wrong Configuration** (all environments using same DB):
- Testing on Preview affects Production data ❌
- Or Production using Staging DB (even worse!) ❌
- No isolation between environments ❌

**Correct Configuration** (environment-specific):
- Production → Production DB ✅
- Preview → Staging DB ✅
- Safe to test any changes ✅

---

**Next Step**: Run the verification command above to see what's currently set, then choose Option A or B based on your preference.
