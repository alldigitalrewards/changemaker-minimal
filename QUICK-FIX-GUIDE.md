# Quick Fix Guide - Preview Environment Configuration

## The Problem
Preview deployments are using **production** database branch instead of **staging** branch.

## Your Supabase Setup
**Project**: changemaker-minimal (one project, two branches)
- **Production branch**: `naptpgyrdaoachpmbyaq` → for Vercel Production ✅
- **Staging branch**: `ffivsyhuyathnnlajjq` → for Vercel Preview ❌ (needs fixing)

## Quick Fix (Choose One)

### Option 1: Run the Script (Easiest)
```bash
./scripts/fix-preview-environment.sh
```
Follow the prompts to:
1. Get staging branch credentials from Supabase
2. Update Vercel Preview environment variables
3. Test the deployment

### Option 2: Manual Steps

**Step 1: Get Staging Credentials**

Go to: https://supabase.com/dashboard/project/ffivsyhuyathnnlajjq

Make sure you're on **"staging"** branch (shows at top: `staging | Persistent`)

Get from Settings → API:
- anon key
- service_role key

Get from Settings → Database:
- Connection Pooler URL (port 6543)
- Direct Connection URL (port 5432)

**Step 2: Update Vercel**

Go to: https://vercel.com/alldigitalrewards/changemaker-minimal/settings/environment-variables

For these variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `DIRECT_URL`

Do this:
1. Click `•••` → Edit
2. **Uncheck** "Preview"
3. Save
4. Add new variable with **same name**
5. Enter **staging branch value**
6. Check **only** "Preview"
7. Save

## Verification

After configuration:
```bash
# Trigger new deployment
git push

# Check Preview environment
vercel env pull .env.preview --environment=preview --yes
grep SUPABASE_URL .env.preview

# Should show:
# NEXT_PUBLIC_SUPABASE_URL="https://ffivsyhuyathnnlajjq.supabase.co"
```

## What This Fixes
- ✅ Preview deployments will use staging database
- ✅ Safe to test migrations and features
- ✅ Production data remains untouched
- ✅ Can complete Task 13 properly

---
**Created**: 2025-10-22  
**Script**: `scripts/fix-preview-environment.sh`  
**Detailed docs**: `.claude/docs/CORRECT-SETUP.md` (if not gitignored)
