# Current Situation - Vercel Environment Configuration

**Date**: 2025-10-22  
**Status**: ⚠️ Preview Using Production Database

---

## What We Discovered

When you used "Resync environment variables" in the Supabase Vercel Integration, it synced **production** Supabase credentials to **all** Vercel environments.

**Current State** (verified via `vercel env pull`):

```bash
# Preview Environment (WRONG):
NEXT_PUBLIC_SUPABASE_URL="https://naptpgyrdaoachpmbyaq.supabase.co"
                                    ^^^^^^^^^^^^^^^^^^^^^^^^
                                    This is PRODUCTION!
```

**Should be**:
```bash
# Preview Environment (CORRECT):
NEXT_PUBLIC_SUPABASE_URL="https://ffivsyhuyathrnnlajjq.supabase.co"
                                    ^^^^^^^^^^^^^^^^^^^^^^^^
                                    This is STAGING!
```

---

## Why This Happened

The Supabase Vercel Integration can only connect **one** Supabase project at a time. When you:

1. Viewed from the "main" branch context in Supabase
2. Clicked "Resync environment variables"
3. Had all three environments checked (Production, Preview, Development)

Result: Production credentials went to **all** environments.

---

## The Risk

❌ **Current Setup (Dangerous)**:
- Production Vercel → Production Supabase ✅
- **Preview Vercel → Production Supabase ❌** (should be staging!)
- Development Vercel → Production Supabase ❌ (should be local)

**What this means**:
- Testing on preview.changemaker.im affects **production** data
- Feature branch testing creates data in **production** database
- Migration testing on preview could break **production**
- Task 13 smoke tests were hitting **production** (unintentionally)

---

## The Fix (3 Options)

### Option 1: Run the Fix Script (Recommended - Interactive)

```bash
./scripts/fix-preview-environment.sh
```

This will:
- Guide you to get staging credentials
- Update Preview environment in Vercel
- Keep Production untouched

### Option 2: Manual via Vercel Dashboard

1. Go to: https://vercel.com/alldigitalrewards/changemaker-minimal/settings/environment-variables

2. Find these variables and click "Edit":
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL`
   - `DIRECT_URL`

3. For each:
   - Click `•••` menu → "Edit"
   - **Uncheck** "Preview" environment
   - Click "Save"

4. Add new variables for Preview:
   - Get credentials from: https://supabase.com/dashboard/project/ffivsyhuyathrnnlajjq/settings/api
   - Add each with "Preview" environment checked only

### Option 3: Via Supabase Integration (Proper Way)

**In Production Supabase** (`naptpgyrdaoachpmbyaq`):
1. Go to: https://supabase.com/dashboard/project/naptpgyrdaoachpmbyaq/settings/integrations
2. Find Vercel integration → Manage
3. **Uncheck** Preview and Development
4. Keep only **Production** checked
5. Resync

**In Staging Supabase** (`ffivsyhuyathrnnlajjq`):
1. Go to: https://supabase.com/dashboard/project/ffivsyhuyathrnnlajjq/settings/integrations
2. Add Vercel integration (or edit existing)
3. Select project: `changemaker-minimal`
4. **Check only** Preview
5. Resync

---

## Verification After Fix

```bash
# Pull Preview environment variables
vercel env pull .env.vercel.preview --environment=preview --yes

# Check the URL
grep NEXT_PUBLIC_SUPABASE_URL .env.vercel.preview

# Should show:
# NEXT_PUBLIC_SUPABASE_URL="https://ffivsyhuyathrnnlajjq.supabase.co"
#                                   ^^^^^^^^^^^^^^^^^^^^^^^^
#                                   STAGING ✅
```

Test the deployment:
```bash
# Get latest Preview URL
vercel ls changemaker-minimal | grep Preview | head -1

# Test it
curl https://[preview-url]/api/health
# Should connect to STAGING database
```

---

## Files Created to Help

1. **This summary**: `.claude/docs/CURRENT-SITUATION.md`
2. **Fix script**: `scripts/fix-preview-environment.sh`
3. **Detailed guide**: `.claude/docs/VERCEL-SETUP-GUIDE.md`
4. **Integration guide**: `.claude/docs/SUPABASE-VERCEL-INTEGRATION-FIX.md`

---

## Next Steps

1. ✅ **Choose a fix method** (Option 1, 2, or 3)
2. ✅ **Apply the fix** (update Preview to use staging)
3. ✅ **Trigger new deployment** (push a commit)
4. ✅ **Verify** (check Preview uses staging database)
5. ✅ **Complete Task 13** (run smoke tests on actual staging)

---

## Summary

**Before Fix**:
- Preview → Production DB ❌ (dangerous!)

**After Fix**:
- Production → Production DB ✅
- Preview → Staging DB ✅
- Safe to test anything ✅

---

**Last Updated**: 2025-10-22  
**Related Tasks**: Task 12, Task 13  
**Priority**: HIGH (affects data safety)
