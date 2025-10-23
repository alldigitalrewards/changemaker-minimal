#!/bin/bash
#
# Fix Vercel Preview Environment to Use Staging Supabase
#
# This script updates Preview environment variables to use staging database
# while keeping Production using production database.
#

set -e

echo "=========================================="
echo "Fix Preview Environment for Staging"
echo "=========================================="
echo ""
echo "Current Issue:"
echo "  Preview is using PRODUCTION Supabase (naptpgyrdaoachpmbyaq)"
echo "  This means testing affects production data!"
echo ""
echo "This script will:"
echo "  1. Get staging Supabase credentials"
echo "  2. Update Preview environment variables in Vercel"
echo "  3. Keep Production using production database"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Staging Supabase Branch (within changemaker-minimal project)
STAGING_PROJECT="ffivsyhuyathnnlajjq"
STAGING_URL="https://ffivsyhuyathnnlajjq.supabase.co"

echo ""
echo "=========================================="
echo "Step 1: Get Staging Credentials"
echo "=========================================="
echo ""
echo "Open the Supabase changemaker-minimal project and switch to the STAGING branch:"
echo "1. Go to: https://supabase.com/dashboard/project/ffivsyhuyathnnlajjq"
echo "2. Make sure you're on the 'staging' (Persistent) branch at the top"
echo "3. Go to: Settings → API"
echo ""
echo "You need:"
echo "  1. anon/public key (starts with eyJ...)"
echo "  2. service_role key (marked Sensitive, starts with eyJ...)"
echo ""
read -p "Press Enter when you have the credentials ready..."

echo ""
echo "Paste the staging ANON key:"
read -r STAGING_ANON_KEY

echo ""
echo "Paste the staging SERVICE_ROLE key:"
read -r STAGING_SERVICE_ROLE_KEY

echo ""
echo "=========================================="
echo "Step 2: Get Database Connection Strings"
echo "=========================================="
echo ""
echo "Now get database connection strings from the STAGING branch:"
echo "1. Make sure you're still on 'staging' (Persistent) branch"
echo "2. Go to: Settings → Database"
echo ""
echo "Look for:"
echo "  - Connection Pooler (port 6543)"
echo "  - Direct Connection (port 5432)"
echo ""
read -p "Press Enter when ready..."

echo ""
echo "Paste the Connection Pooler URL (DATABASE_URL):"
read -r STAGING_DATABASE_URL

echo ""
echo "Paste the Direct Connection URL (DIRECT_URL):"
read -r STAGING_DIRECT_URL

echo ""
echo "=========================================="
echo "Step 3: Update Vercel Preview Environment"
echo "=========================================="
echo ""
echo "This will update the following variables for Preview:"
echo "  - NEXT_PUBLIC_SUPABASE_URL"
echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "  - SUPABASE_SERVICE_ROLE_KEY"
echo "  - DATABASE_URL"
echo "  - DIRECT_URL"
echo ""
read -p "Proceed with update? (y/n) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
fi

echo ""
echo "Updating variables..."

# Remove existing Preview variables (if any)
echo "Removing old Preview variables..."
vercel env rm NEXT_PUBLIC_SUPABASE_URL preview --yes 2>/dev/null || true
vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY preview --yes 2>/dev/null || true
vercel env rm SUPABASE_SERVICE_ROLE_KEY preview --yes 2>/dev/null || true
vercel env rm DATABASE_URL preview --yes 2>/dev/null || true
vercel env rm DIRECT_URL preview --yes 2>/dev/null || true

# Add new staging variables for Preview
echo ""
echo "Adding staging variables for Preview..."

echo "$STAGING_URL" | vercel env add NEXT_PUBLIC_SUPABASE_URL preview --yes
echo "$STAGING_ANON_KEY" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY preview --yes
echo "$STAGING_SERVICE_ROLE_KEY" | vercel env add SUPABASE_SERVICE_ROLE_KEY preview --yes
echo "$STAGING_DATABASE_URL" | vercel env add DATABASE_URL preview --yes
echo "$STAGING_DIRECT_URL" | vercel env add DIRECT_URL preview --yes

echo ""
echo "=========================================="
echo "✅ Success!"
echo "=========================================="
echo ""
echo "Preview environment now uses STAGING Supabase:"
echo "  ${STAGING_URL}"
echo ""
echo "Next steps:"
echo "  1. Trigger a new deployment:"
echo "     git commit --allow-empty -m 'test: verify staging environment'"
echo "     git push"
echo ""
echo "  2. Verify the deployment:"
echo "     vercel ls changemaker-minimal | grep Preview | head -1"
echo ""
echo "  3. Test the preview URL:"
echo "     curl https://[preview-url]/api/health"
echo ""
echo "  4. Check it connects to staging Supabase (not production)"
echo ""
