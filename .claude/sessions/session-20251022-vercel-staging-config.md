# Vercel Staging Configuration

**Date**: 2025-10-22
**Issue**: Preview deployments using production Supabase instead of staging

## Problem Discovery

While running Task 13 (Staging Smoke Tests), discovered that:
- Testing against `www.changemaker.im` (production)
- Preview deployments using production Supabase URL
- Staging Supabase project exists but unused by Vercel

## Root Cause

Vercel environment variables set as "All Environments" means:
- Production ✅ uses production Supabase (correct)
- Preview ❌ uses production Supabase (wrong - should use staging)
- Development ❌ uses production Supabase (wrong - should use local)

## Solution Created

1. **Documentation**: `.claude/docs/vercel-staging-setup.md`
   - Step-by-step guide for all 3 configuration methods
   - Explains the issue and verification steps

2. **Script**: `scripts/configure-vercel-staging.sh`
   - Interactive script to configure Preview environment
   - Guides through getting Supabase credentials
   - Sets each variable with proper scope

## Next Steps (User Action Required)

The user needs to configure Vercel environment variables because:
- Requires Supabase credentials (secure, shouldn't be committed)
- Requires Vercel account access
- One-time manual setup by human

After configuration:
1. Push new commit to trigger Preview deployment
2. Re-run Task 13 smoke tests on actual staging URL
3. Verify separation of environments

## Impact on Task 13

Task 13 (Smoke Tests) needs to be re-evaluated:
- Current tests ran against production (unintentional)
- Need to re-run after Preview → Staging configuration
- Tests should verify staging database, not production

Status: **BLOCKED** until environment variables configured
