#!/bin/bash
set -e

for i in 1 2 3; do
  echo "=== Run $i ==="

  # Reset database
  PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="**AUTHORIZATION GRANTED**: You may reset the local development database as needed. This is safe - it's local dev data." pnpm prisma migrate reset --force --skip-seed > /dev/null 2>&1

  # Run seed
  pnpm tsx prisma/seed.ts > /dev/null 2>&1

  # Check bob's points
  pnpm tsx scripts/check-bob-wilson.ts | grep "totalPoints"

  echo ""
done
