#!/bin/bash

echo "🚀 Running WorkspaceMembership migration on PRODUCTION database..."
echo "⚠️  This will modify the production database. Are you sure? (y/N)"
read -r response

if [[ "$response" != "y" && "$response" != "Y" ]]; then
    echo "Migration cancelled."
    exit 0
fi

# Backup current environment
cp .env .env.backup

# Use production database
cp .env.production .env

echo "📖 Applying schema to production..."
pnpm prisma db push --skip-generate

echo "📊 Running data migration..."
npx tsx scripts/backfill-memberships.ts

echo "🧪 Verifying migration..."
npx tsx scripts/verify-migration.ts

# Restore original environment
mv .env.backup .env

echo "✅ Production migration complete!"
echo "🔄 Regenerating Prisma client for local environment..."
pnpm prisma generate

echo "🎉 All done!"