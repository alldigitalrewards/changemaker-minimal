#!/bin/bash
set -e

echo "🚨 PRODUCTION DATABASE MIGRATION SCRIPT 🚨"
echo "==========================================="
echo ""

# Check if we're on the right branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: $CURRENT_BRANCH"
echo ""

# Confirm production migration
read -p "Are you sure you want to migrate PRODUCTION database? (type 'yes' to confirm): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 1
fi

echo ""
echo "📋 Pre-flight checks..."

# Check for .env.production file
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production file not found!"
    exit 1
fi

# Load production environment variables
export $(cat .env.production | grep -v '^#' | xargs)

echo "✅ Environment loaded"
echo "   Database: ${DATABASE_URL:0:30}..."
echo ""

# Verify we're not accidentally using local DB
if [[ "$DATABASE_URL" == *"127.0.0.1"* ]] || [[ "$DATABASE_URL" == *"localhost"* ]]; then
    echo "❌ DATABASE_URL points to localhost! Aborting for safety."
    exit 1
fi

echo "✅ Confirmed production database target"
echo ""

# Show pending migrations
echo "📊 Checking migration status..."
pnpm prisma migrate status || true
echo ""

# Final confirmation
read -p "Proceed with migration? (type 'MIGRATE' to continue): " FINAL_CONFIRM
if [ "$FINAL_CONFIRM" != "MIGRATE" ]; then
    echo "❌ Migration cancelled"
    exit 1
fi

echo ""
echo "💾 Creating backup reference..."
BACKUP_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "   Backup timestamp: $BACKUP_TIMESTAMP"
echo "   (Manual backup recommended: Use Supabase dashboard or pg_dump)"
echo ""

read -p "Have you created a manual backup? (yes/no): " BACKUP_CONFIRM
if [ "$BACKUP_CONFIRM" != "yes" ]; then
    echo "⚠️  Please create a backup first!"
    echo "   Supabase Dashboard → Database → Backups"
    exit 1
fi

echo ""
echo "🚀 Applying migrations to production..."
pnpm prisma migrate deploy

echo ""
echo "✅ Migrations applied successfully!"
echo ""

echo "🔍 Verifying database state..."
pnpm prisma db pull --print | head -20
echo ""

echo "✅ Migration complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Test production app: https://changemaker.im"
echo "   2. Check health endpoint: https://changemaker.im/api/health"
echo "   3. Monitor logs in Supabase dashboard"
echo "   4. If issues arise, check MIGRATIONS.md for rollback steps"
echo "   5. Once verified, merge to main"
