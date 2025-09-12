#!/bin/bash

# Run tests against Vercel preview deployment
# Usage: ./scripts/test-preview.sh [test-file]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Getting preview URL...${NC}"

# Try to get the preview URL from script, but fallback to known URL if needed
PREVIEW_URL=$(./scripts/get-preview-url.sh 2>/dev/null || echo "")

if [ -z "$PREVIEW_URL" ]; then
    echo -e "${YELLOW}Using fallback preview URL...${NC}"
    PREVIEW_URL="https://changemaker-minimal-git-workspacemgmtui-alldigitalrewards.vercel.app"
fi

echo -e "${GREEN}Preview URL: $PREVIEW_URL${NC}"

# Export for Playwright tests
export BASE_URL="$PREVIEW_URL"

# Test file or pattern (default to link crawler)
TEST_FILE=${1:-"tests/e2e/link-crawl.spec.ts"}

echo -e "${YELLOW}Running tests against preview...${NC}"
echo "Test file: $TEST_FILE"
echo "----------------------------------------"

# Run Playwright tests
pnpm playwright test "$TEST_FILE" --reporter=list

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tests passed successfully!${NC}"
else
    echo -e "${RED}✗ Tests failed${NC}"
    exit 1
fi