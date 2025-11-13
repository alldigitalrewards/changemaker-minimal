# Vercel Environment Configuration for Staging

**Issue**: Preview deployments (including feature branches) are currently using **production** Supabase database.

**Goal**: Configure Preview environments to use **staging** Supabase project for safe testing.

## Current State (From Screenshots)

### Vercel Environments
- **Production**: `main` branch → `www.changemaker.im` → Prod Supabase (naptpgyrdaoachpmbyaq)
- **Preview**: All feature branches → `preview.changemaker.im` → ❌ Currently using Prod Supabase (WRONG)
- **Development**: Local only → Local Supabase

### Supabase Projects
1. **Production**: `naptpgyrdaoachpmbyaq` (currently used by all environments)
2. **Staging**: `ffivsyhuyathrnnlajjq` (should be used by Preview, but isn't)

## Step-by-Step Fix

### Option 1: Via Vercel Dashboard (Recommended - Visual)

1. **Go to Vercel Project Settings**
   - Navigate to: https://vercel.com/alldigitalrewards/changemaker-minimal/settings/environment-variables

2. **Get Staging Supabase Credentials**
   - Go to: https://supabase.com/dashboard/project/ffivsyhuyathrnnlajjq/settings/api
   - Copy the following:
     - Project URL (e.g., `https://ffivsyhuyathnnlajjq.supabase.co`)
     - Anon/Public Key (visible in screenshot as `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
     - Service Role Key (marked as `Sensitive`)
   
3. **Get Staging Database Connection Strings**
   - Go to: https://supabase.com/dashboard/project/ffivsyhuyathrnnlajjq/settings/database
   - Copy:
     - Connection Pooler URL (port 6543) for `DATABASE_URL`
     - Direct Connection URL (port 5432) for `DIRECT_URL`

4. **Add Preview Environment Variables**
   
   For each variable below, click "Add Another" in Vercel:
   
   | Key | Value | Environment |
   |-----|-------|-------------|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://ffivsyhuyathnnlajjq.supabase.co` | Preview ☑️ |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `[from staging project]` | Preview ☑️ |
   | `SUPABASE_SERVICE_ROLE_KEY` | `[from staging project]` | Preview ☑️ |
   | `DATABASE_URL` | `postgresql://postgres.[staging-id]:[password]@[host]:6543/postgres` | Preview ☑️ |
   | `DIRECT_URL` | `postgresql://postgres.[staging-id]:[password]@[host]:5432/postgres` | Preview ☑️ |

   **Important**: 
   - ✅ Check ONLY "Preview" environment (NOT Production, NOT Development)
   - ❌ Do NOT check "Production" - leave production variables unchanged

5. **Update Existing Variables** (If They Already Exist for Preview)
   
   Check the screenshot - these variables are set for "All Environments":
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   
   You need to:
   1. Click the `•••` menu next to each
   2. Select "Edit"
   3. **UNCHECK** "Preview" if it points to production
   4. Save
   5. Then add NEW entries specifically for Preview with staging values

### Option 2: Via Vercel CLI (Faster for Multiple Variables)

```bash
# Set Staging Supabase URL for Preview
vercel env add NEXT_PUBLIC_SUPABASE_URL preview --scope alldigitalrewards
# When prompted, enter: https://ffivsyhuyathnnlajjq.supabase.co

# Set Staging Supabase Anon Key
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview --scope alldigitalrewards
# Paste the anon key from Supabase staging project

# Set Staging Service Role Key
vercel env add SUPABASE_SERVICE_ROLE_KEY preview --scope alldigitalrewards
# Paste the service role key from Supabase staging project

# Set Staging Database URL (Pooler - port 6543)
vercel env add DATABASE_URL preview --scope alldigitalrewards
# Enter the pooler connection string from Supabase

# Set Staging Direct URL (port 5432)
vercel env add DIRECT_URL preview --scope alldigitalrewards
# Enter the direct connection string from Supabase
```

## Alternative Approach: Use Supabase Integration

From your last screenshot, I see the **Supabase Vercel Integration** is active. You can:

1. **Manage Integration**
   - Click "Manage" on the Supabase integration in Vercel
   - Verify it's syncing variables correctly
   
2. **Check Sync Settings**
   - ✅ Production should sync to Production environment
   - ✅ Preview should sync to Preview environment
   - ✅ Development should sync to Development environment (if needed)

3. **If Integration is Misconfigured**
   - The integration might be syncing the SAME project (production) to all environments
   - You may need to:
     1. Disconnect the integration
     2. Manually set Preview environment variables (Option 1 or 2 above)
     3. Reconnect only for Production environment

## Verification Steps

After configuration:

1. **Trigger a new Preview deployment**
   ```bash
   git commit --allow-empty -m "test: trigger preview deployment"
   git push origin feature/manager-role-phase1-clean
   ```

2. **Check Deployment Logs**
   - Go to the new Preview deployment in Vercel
   - Check "Build Logs" for which Supabase URL is being used
   - Look for: `NEXT_PUBLIC_SUPABASE_URL=https://ffivsyhuyathnnlajjq...`

3. **Test the Preview URL**
   ```bash
   curl https://[preview-url]/api/health
   # Should connect to staging database
   ```

4. **Verify Database Connection**
   - If your health endpoint shows database info, it should show staging project
   - Check that any test data appears in staging Supabase, NOT production

## Common Issues

### Issue 1: Variables Still Using Production
**Symptom**: Preview deployments connect to production database

**Fix**: 
- Remove/Edit the "All Environments" variables
- Add environment-specific variables instead
- Vercel prioritizes more specific environment settings

### Issue 2: Supabase Integration Overwriting
**Symptom**: Integration keeps syncing production to all environments

**Fix**:
- Disable auto-sync in Supabase integration for Preview
- Or, manually override with Vercel environment variables (they take precedence)

### Issue 3: Variables Not Taking Effect
**Symptom**: Changed variables, but deployment uses old values

**Fix**:
- Trigger a new deployment (environment variables only apply to NEW deployments)
- Don't redeploy existing deployment - push a new commit

## Recommended Final State

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `naptpgy...` | `ffivsyh...` | `127.0.0.1:54321` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Prod key | Staging key | Local key |
| `SUPABASE_SERVICE_ROLE_KEY` | Prod key | Staging key | Local key |
| `DATABASE_URL` | Prod pooler | Staging pooler | `127.0.0.1:54322` |
| `DIRECT_URL` | Prod direct | Staging direct | `127.0.0.1:54322` |

## Why This Matters

**Current Risk (Before Fix)**:
- Running migrations on Preview → affects Production database ❌
- Testing features on Preview → creates/modifies Production data ❌
- Task 13 smoke tests are hitting Production ❌

**After Fix**:
- Preview deployments use Staging database ✅
- Safe to test migrations and features ✅
- Production data remains untouched ✅
- Proper separation of concerns ✅

## Next Steps

1. **Fix Preview environment variables** (using Option 1 or 2)
2. **Trigger new Preview deployment**
3. **Re-run Task 13 smoke tests** against actual staging environment
4. **Verify separation**: Check both Supabase projects to confirm data isolation
5. **Update PROGRESS.md** to reflect staging environment is now properly configured

---

**Last Updated**: 2025-10-22  
**Related Tasks**: Task 12 (Staging Deployment), Task 13 (Smoke Tests)  
**Affects**: All Preview deployments, Feature branch testing
