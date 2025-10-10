#!/bin/bash
# Database verification script for production/preview database
# This script checks the migration status and data integrity

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Changemaker Database Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if we're using production or local
if [ -z "$PROD_DB" ]; then
  echo "⚠️  PROD_DB not set. Pulling production database URL..."

  # Pull production env vars if not already present
  if [ ! -f /tmp/.env.production ]; then
    vercel env pull --environment=production /tmp/.env.production
  fi

  export PROD_DB=$(grep "^DIRECT_URL=" /tmp/.env.production | cut -d'"' -f2)
fi

echo "🔗 Connected to: ${PROD_DB%%@*}@****" # Hide password in output
echo ""

# 1. Check migration status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Migration Status (Latest 5)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql "$PROD_DB" -c "
SELECT
  LEFT(migration_name, 50) as migration,
  TO_CHAR(finished_at, 'YYYY-MM-DD HH24:MI') as applied
FROM _prisma_migrations
ORDER BY finished_at DESC
LIMIT 5;
" --quiet --tuples-only --no-align --field-separator='|'
echo ""

# 2. Check new tables exist
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  New Tables Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql "$PROD_DB" -c "
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'RewardIssuance')
    THEN '✅ RewardIssuance table exists'
    ELSE '❌ RewardIssuance table MISSING'
  END as status
UNION ALL
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'TenantSku')
    THEN '✅ TenantSku table exists'
    ELSE '❌ TenantSku table MISSING'
  END;
" --quiet --tuples-only
echo ""

# 3. Check new fields exist
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  New Fields Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql "$PROD_DB" -c "
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'emailChangePending'
    )
    THEN '✅ User.emailChangePending exists (jsonb)'
    ELSE '❌ User.emailChangePending MISSING'
  END as status
UNION ALL
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'User' AND column_name = 'tenantId'
    )
    THEN '✅ User.tenantId exists (text)'
    ELSE '❌ User.tenantId MISSING'
  END
UNION ALL
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Challenge' AND column_name = 'rewardType'
    )
    THEN '✅ Challenge.rewardType exists (enum)'
    ELSE '❌ Challenge.rewardType MISSING'
  END
UNION ALL
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'Challenge' AND column_name = 'rewardConfig'
    )
    THEN '✅ Challenge.rewardConfig exists (jsonb)'
    ELSE '❌ Challenge.rewardConfig MISSING'
  END;
" --quiet --tuples-only
echo ""

# 4. Data counts
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Data Integrity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql "$PROD_DB" -c "
SELECT
  'Workspaces' as entity,
  LPAD(COUNT(*)::text, 10) as count
FROM \"Workspace\"
UNION ALL
SELECT 'Users', LPAD(COUNT(*)::text, 10) FROM \"User\"
UNION ALL
SELECT 'Challenges', LPAD(COUNT(*)::text, 10) FROM \"Challenge\"
UNION ALL
SELECT 'Enrollments', LPAD(COUNT(*)::text, 10) FROM \"Enrollment\"
UNION ALL
SELECT 'RewardIssuances', LPAD(COUNT(*)::text, 10) FROM \"RewardIssuance\"
UNION ALL
SELECT 'TenantSkus', LPAD(COUNT(*)::text, 10) FROM \"TenantSku\";
" --quiet --tuples-only --no-align --field-separator='|' | column -t -s'|'
echo ""

# 5. Auth sync status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Auth Sync Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql "$PROD_DB" -c "
SELECT
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE \"supabaseUserId\" IS NOT NULL) as with_auth,
  COUNT(*) FILTER (WHERE \"supabaseUserId\" IS NULL) as without_auth
FROM \"User\";
" --quiet --tuples-only --no-align --field-separator='|' | column -t -s'|'
echo ""

# 6. Admin users check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Admin Users"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql "$PROD_DB" -c "
SELECT
  email,
  CASE
    WHEN \"supabaseUserId\" IS NOT NULL THEN '✅ Synced'
    ELSE '❌ Not synced'
  END as auth_status
FROM \"User\"
WHERE role = 'ADMIN'
ORDER BY email;
" --quiet --tuples-only --no-align --field-separator='|' | column -t -s'|'
echo ""

# 7. Workspace summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  Workspace Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
psql "$PROD_DB" -c "
SELECT
  w.slug,
  w.name,
  COUNT(DISTINCT u.id) as users,
  COUNT(DISTINCT c.id) as challenges
FROM \"Workspace\" w
LEFT JOIN \"User\" u ON u.\"workspaceId\" = w.id
LEFT JOIN \"Challenge\" c ON c.\"workspaceId\" = w.id
GROUP BY w.id, w.slug, w.name
ORDER BY w.\"createdAt\";
" --quiet --tuples-only --no-align --field-separator='|' | column -t -s'|'
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Database Verification Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Test preview deployment:"
echo "  curl https://preview.changemaker.im/api/health"
echo ""
