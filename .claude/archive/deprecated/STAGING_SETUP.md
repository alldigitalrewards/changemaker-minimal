# Staging Environment Setup - Complete Checklist

## Current Status

✅ **Git Branch**: `staging` branch created
✅ **Supabase Branch**: Persistent staging branch created
✅ **Credentials**: All staging credentials collected
⏳ **Vercel Configuration**: Needs environment variables configured

---

## Next Steps: Configure Vercel

### Step 1: Add Environment Variables to Vercel

Go to: **Vercel Dashboard → changemaker-minimal → Settings → Environment Variables**

Add these 5 variables with:
- **Environment**: Preview
- **Git Branch**: `staging` (exact match)

#### Variable 1
```
Name: NEXT_PUBLIC_SUPABASE_URL
Value: https://ffivsyhuyathrnnlajjq.supabase.co
Environment: Preview
Git Branch: staging
```

#### Variable 2
```
Name: NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaXZzeWh1eWF0aHJubmxhampxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNzI5NzIsImV4cCI6MjA3NjY0ODk3Mn0.YLk6vRDSmiP_i6-X1AIKuzVy4KNkChi7HEgsg345eyM
Environment: Preview
Git Branch: staging
```

#### Variable 3
```
Name: DATABASE_URL
Value: postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true
Environment: Preview
Git Branch: staging
```

#### Variable 4
```
Name: DIRECT_URL
Value: postgresql://postgres.ffivsyhuyathrnnlajjq:changemaker2025@aws-1-us-east-2.pooler.supabase.com:5432/postgres
Environment: Preview
Git Branch: staging
```

#### Variable 5
```
Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmaXZzeWh1eWF0aHJubmxhampxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTA3Mjk3MiwiZXhwIjoyMDc2NjQ4OTcyfQ.ALSR4iKBN3GAPT2WwGN2EjrwtKIA2InfGxtW6-omvEU
Environment: Preview
Git Branch: staging
```

---

### Step 2: Verify Git Branch Settings

Go to: **Vercel Dashboard → changemaker-minimal → Settings → Git**

Ensure:
- **Production Branch**: `main`
- **Preview Deployments**: Enabled for all branches (or specifically `staging`)

---

### Step 3: Deploy Staging

```bash
# Push to staging branch to trigger deployment
git checkout staging
git push origin staging
```

---

### Step 4 (Optional): Configure Custom Domain

Go to: **Vercel Dashboard → changemaker-minimal → Settings → Domains**

Add domain:
- Domain: `preview.changemaker.im`
- Assign to: `staging` branch

---

## Architecture Overview

```
Development (Local)
    ↓ git push feature branch → open PR
Feature Preview (Temporary)
    ↓ merge to staging
Staging (Persistent) ← preview.changemaker.im
    ↓ merge to main
Production (Live) ← changemaker.im
```

---

## Environment Matrix

| Environment | Git Branch | Database | URL | Status |
|-------------|------------|----------|-----|--------|
| **Local** | Any | `127.0.0.1:54322` | `localhost:3000` | ✅ Working |
| **Feature Preview** | `feature/*` | Temp preview | Auto-generated | ✅ Working |
| **Staging** | `staging` | `ffivsyhuyathrnnlajjq` | `preview.changemaker.im` | ⏳ Setup in progress |
| **Production** | `main` | `naptpgyrdaoachpmbyaq` | `changemaker.im` | ✅ Working |

---

## Verification

After adding environment variables and deploying:

1. Visit Vercel deployment logs for `staging` branch
2. Confirm build succeeds
3. Test staging deployment at auto-generated URL
4. If custom domain configured, test `preview.changemaker.im`
5. Verify database connection by accessing a protected route

---

## Troubleshooting

### Build Fails with Database Error
- Double-check `DATABASE_URL` is exactly as shown above
- Ensure branch name in Vercel env vars is exactly `staging` (case-sensitive)

### Preview Domain Not Working
- Custom domains may take 5-10 minutes to propagate
- Verify domain is assigned to `staging` branch in Vercel settings

### Environment Variables Not Applied
- Ensure "Environment" is set to **Preview** (not Production or Development)
- Ensure "Git Branch" field has exact value: `staging`
- Redeploy after adding variables

---

**Last Updated**: 2025-10-21
**Status**: Ready for Vercel configuration
