#!/bin/bash
# Test Environment Validation Script
# Checks for common issues that cause test failures

set -e

echo "🔍 Checking test environment..."
echo ""

# Check for running Node processes
echo "1. Checking for stale Node.js processes..."
NODE_COUNT=$(pgrep -f "node" | wc -l | tr -d ' ')
if [ "$NODE_COUNT" -gt 0 ]; then
  echo "   ⚠️  Found $NODE_COUNT Node.js processes running"
  echo "   PIDs: $(pgrep -f 'node' | tr '\n' ' ')"
  echo "   Ports in use:"
  lsof -nP -iTCP -sTCP:LISTEN | grep node || echo "   None found"
else
  echo "   ✅ No stale Node.js processes"
fi
echo ""

# Check port 3000 (Next.js dev server)
echo "2. Checking port 3000 (Next.js)..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  PID=$(lsof -Pi :3000 -sTCP:LISTEN -t)
  echo "   ⚠️  Port 3000 is in use by PID $PID"
  ps -p $PID -o comm=,pid=,args=
else
  echo "   ✅ Port 3000 is available"
fi
echo ""

# Check Supabase connection
echo "3. Checking Supabase connection..."
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "   ❌ NEXT_PUBLIC_SUPABASE_URL not set"
else
  echo "   ✅ NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "   ❌ SUPABASE_SERVICE_ROLE_KEY not set"
else
  echo "   ✅ SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
fi
echo ""

# Check database connection
echo "4. Testing database connection..."
if [ -z "$DATABASE_URL" ]; then
  echo "   ❌ DATABASE_URL not set"
else
  echo "   ✅ DATABASE_URL configured"
  # Try a simple query
  if command -v psql >/dev/null 2>&1; then
    if psql "$DATABASE_URL" -c "SELECT 1" >/dev/null 2>&1; then
      echo "   ✅ Database connection successful"
    else
      echo "   ⚠️  Database connection failed"
    fi
  else
    echo "   ⚠️  psql not found, skipping connection test"
  fi
fi
echo ""

# Check Prisma client
echo "5. Checking Prisma client..."
if [ -d "node_modules/.prisma/client" ]; then
  echo "   ✅ Prisma client generated"
else
  echo "   ❌ Prisma client not found - run 'pnpm prisma generate'"
fi
echo ""

# Check for stale test data
echo "6. Checking for stale test data in database..."
if command -v psql >/dev/null 2>&1 && [ -n "$DATABASE_URL" ]; then
  TEST_WORKSPACES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM \"Workspace\" WHERE slug LIKE 'test-ws-%'" 2>/dev/null | tr -d ' ' || echo "0")
  if [ "$TEST_WORKSPACES" -gt 0 ]; then
    echo "   ⚠️  Found $TEST_WORKSPACES test workspaces in database"
    echo "   Consider running cleanup before tests"
  else
    echo "   ✅ No stale test data found"
  fi
else
  echo "   ⚠️  Skipping database check"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$NODE_COUNT" -gt 0 ]; then
  echo "⚠️  Recommendation: Kill stale Node processes with 'killall -9 node'"
fi

if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
  echo "⚠️  Recommendation: Free port 3000 before running tests"
fi

echo ""
echo "To clean environment and run tests:"
echo "  killall -9 node 2>/dev/null; sleep 3; pnpm test"
echo ""
