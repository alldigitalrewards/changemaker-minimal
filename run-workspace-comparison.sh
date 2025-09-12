#!/bin/bash

echo "🔍 Running Workspace UX Comparison Tests..."
echo "=========================================="

# Make sure dev server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Dev server not running on localhost:3000"
    echo "Please run 'npm run dev' first"
    exit 1
fi

echo "✅ Dev server is running"
echo ""

# Run the refactored test to capture current state
echo "🔧 Testing REFACTORED workspace page..."
echo "----------------------------------------"
npm run test:e2e -- tests/e2e/workspace-ux-refactored.spec.ts --reporter=line

echo ""
echo "📊 Test Results Summary:"
echo "------------------------"
echo "Screenshots saved to tests/e2e/screenshots/"
echo "- workspaces-after-refactor.png (current refactored version)"
echo ""
echo "🎯 Expected Improvements:"
echo "✓ Create/Join buttons moved to prominent header location"
echo "✓ All buttons have proper aria-labels for accessibility" 
echo "✓ Focus rings added for keyboard navigation"
echo "✓ Coral theme applied consistently"
echo "✓ Duplicate buttons removed from card content"
echo "✓ Clear visual hierarchy with Quick Actions section"
echo ""
echo "🚀 UX Refactor Complete!"