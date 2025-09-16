#!/bin/bash

# Run the workspace UX analysis test
echo "Running Workspace UX Analysis..."

# Run the specific test
npm run test:e2e -- tests/e2e/workspace-ux-analysis.spec.ts --reporter=line