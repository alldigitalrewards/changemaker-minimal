#!/bin/bash
#
# Configure Vercel Preview Environment to Use Staging Supabase
#
# This script helps you set up environment-specific variables so that:
# - Production uses production Supabase
# - Preview uses staging Supabase
# - Development uses local Supabase
#

set -e

echo "=== Vercel Environment Configuration ==="
echo ""
echo "This script will guide you through setting up Preview environment"
echo "variables to use the STAGING Supabase project."
echo ""
echo "Prerequisites:"
echo "1. You must have staging Supabase credentials ready"
echo "2. Vercel CLI must be installed and logged in"
echo ""
read -p "Press Enter to continue..."

# Staging Supabase Project ID from screenshots
STAGING_PROJECT_ID="jlvvtejfinfqjfulnmfl"
STAGING_URL="https://ffivsyhuyathnnlajjq.supabase.co"

echo ""
echo "=== Step 1: Get Staging Credentials ==="
echo ""
echo "Open this URL in your browser:"
echo "https://supabase.com/dashboard/project/${STAGING_PROJECT_ID}/settings/api"
echo ""
echo "You need to copy:"
echo "  - anon/public key"
echo "  - service_role key (marked as Sensitive)"
echo ""
read -p "Have you copied these? Press Enter when ready..."

echo ""
echo "=== Step 2: Set NEXT_PUBLIC_SUPABASE_URL for Preview ==="
echo "Value: ${STAGING_URL}"
echo ""
echo "Command: vercel env add NEXT_PUBLIC_SUPABASE_URL preview --scope alldigitalrewards"
echo ""
read -p "Run this command? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "${STAGING_URL}" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview --scope alldigitalrewards || echo "Note: Variable might already exist"
fi

echo ""
echo "=== Step 3: Set NEXT_PUBLIC_SUPABASE_ANON_KEY for Preview ==="
echo ""
read -p "Paste the anon/public key from Supabase: " ANON_KEY
if [ -n "$ANON_KEY" ]; then
    echo "${ANON_KEY}" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview --scope alldigitalrewards || echo "Note: Variable might already exist"
fi

echo ""
echo "=== Step 4: Set SUPABASE_SERVICE_ROLE_KEY for Preview ==="
echo ""
read -p "Paste the service_role key from Supabase: " SERVICE_KEY
if [ -n "$SERVICE_KEY" ]; then
    echo "${SERVICE_KEY}" | vercel env add SUPABASE_SERVICE_ROLE_KEY preview --scope alldigitalrewards || echo "Note: Variable might already exist"
fi

echo ""
echo "=== Step 5: Database Connection Strings ==="
echo ""
echo "Open this URL in your browser:"
echo "https://supabase.com/dashboard/project/${STAGING_PROJECT_ID}/settings/database"
echo ""
echo "Look for 'Connection Pooler' and 'Direct Connection'"
echo ""
read -p "Press Enter when ready to input..."

echo ""
read -p "Paste DATABASE_URL (Connection Pooler, port 6543): " DB_URL
if [ -n "$DB_URL" ]; then
    echo "${DB_URL}" | vercel env add DATABASE_URL preview --scope alldigitalrewards || echo "Note: Variable might already exist"
fi

echo ""
read -p "Paste DIRECT_URL (Direct Connection, port 5432): " DIRECT
if [ -n "$DIRECT" ]; then
    echo "${DIRECT}" | vercel env add DIRECT_URL preview --scope alldigitalrewards || echo "Note: Variable might already exist"
fi

echo ""
echo "=== Configuration Complete! ==="
echo ""
echo "Next steps:"
echo "1. Trigger a new Preview deployment:"
echo "   git commit --allow-empty -m 'test: use staging database'"
echo "   git push origin $(git branch --show-current)"
echo ""
echo "2. Check the deployment uses staging Supabase:"
echo "   - Go to Vercel deployment"
echo "   - Check Build Logs for: NEXT_PUBLIC_SUPABASE_URL=https://ffivsyhuyathnnlajjq..."
echo ""
echo "3. Test the Preview URL:"
echo "   curl https://[preview-url]/api/health"
echo ""
echo "4. Verify in Supabase Dashboard:"
echo "   - Check staging project for test data (not production)"
echo ""
