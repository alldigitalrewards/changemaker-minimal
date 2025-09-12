#!/bin/bash

# Get preview URL from GitHub PR for testing
# Usage: ./scripts/get-preview-url.sh [pr-number]

PR_NUMBER=${1:-$(gh pr list --head "$(git branch --show-current)" --json number --jq '.[0].number' 2>/dev/null)}

if [ -z "$PR_NUMBER" ]; then
    echo "Error: No PR found for current branch and no PR number provided" >&2
    exit 1
fi

# Try to get URL from PR comments (Vercel bot posts these)
PREVIEW_URL=$(gh pr view "$PR_NUMBER" --comments 2>/dev/null | grep -oE 'https://[a-z0-9-]+\.vercel\.app' | head -1)

if [ -z "$PREVIEW_URL" ]; then
    # Fallback: Try to construct URL from branch name
    BRANCH=$(git branch --show-current)
    PROJECT_NAME="changemaker-minimal"
    ORG_NAME="alldigitalrewards"
    
    # Convert branch name to Vercel-compatible format
    BRANCH_SLUG=$(echo "$BRANCH" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g')
    PREVIEW_URL="https://${PROJECT_NAME}-git-${BRANCH_SLUG}-${ORG_NAME}.vercel.app"
    
    echo "Warning: Using constructed URL (may not be accurate): $PREVIEW_URL" >&2
else
    echo "Found preview URL from PR #$PR_NUMBER" >&2
fi

echo "$PREVIEW_URL"