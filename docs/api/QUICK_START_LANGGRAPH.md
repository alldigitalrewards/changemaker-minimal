# LangGraph API Docs - Quick Start

Get 100% API documentation coverage in 30 minutes.

---

## Prerequisites

```bash
# Verify Node.js version
node --version  # Should be 20.x or higher

# Verify pnpm
pnpm --version  # Should be 8.x or higher

# Set Anthropic API key
export ANTHROPIC_API_KEY="your-key-here"
```

---

## Installation (5 minutes)

### Step 1: Install Dependencies

```bash
# LangGraph and LangChain
pnpm add @langchain/langgraph @langchain/core @langchain/anthropic

# TypeScript parsing
pnpm add -D @typescript-eslint/parser @typescript-eslint/typescript-estree

# OpenAPI tools
pnpm add -D openapi-types openapi-typescript js-yaml

# Utilities
pnpm add -D glob zod tsx nodemon
```

### Step 2: Create Directory Structure

```bash
mkdir -p scripts/api-docs
mkdir -p .cache/api-docs
touch scripts/api-docs/agent.ts
touch scripts/api-docs/generate.ts
```

### Step 3: Add Scripts to package.json

```json
{
  "scripts": {
    "docs:api": "tsx scripts/api-docs/generate.ts",
    "docs:api:watch": "nodemon --watch app/api --ext ts --exec 'pnpm docs:api'",
    "generate:types": "openapi-typescript public/api/generated-openapi.yaml -o lib/types/api.generated.ts"
  }
}
```

---

## Implementation (15 minutes)

### Copy Agent Code

Copy the full `agent.ts` implementation from `docs/api/LANGGRAPH_AUTOMATION.md` to `scripts/api-docs/agent.ts`.

**Key sections**:
1. State definition (lines 1-100)
2. Scanner node (lines 101-150)
3. Analyzer node (lines 151-300)
4. Generator node (lines 301-450)
5. Validator node (lines 451-500)
6. Writer node (lines 501-550)
7. Graph construction (lines 551-600)

### Create CLI Runner

Create `scripts/api-docs/generate.ts`:

```typescript
#!/usr/bin/env tsx

import { runAPIDocAgent } from "./agent"

async function main() {
  console.log("🚀 Generating API documentation...\n")

  try {
    const result = await runAPIDocAgent()

    console.log("\n" + "=".repeat(60))
    console.log(`✅ Coverage: ${result.coverageReport.coverage}%`)
    console.log(`📊 Documented: ${result.coverageReport.documentedRoutes}/${result.coverageReport.totalRoutes} routes`)
    console.log("=".repeat(60) + "\n")

    if (result.coverageReport.coverage === 100) {
      console.log("🎉 100% API documentation coverage achieved!")
      return process.exit(0)
    } else {
      console.log("⚠️  Undocumented routes:")
      result.coverageReport.undocumentedRoutes.forEach(r => console.log(`   - ${r}`))
      return process.exit(1)
    }
  } catch (error) {
    console.error("❌ Error:", error)
    return process.exit(1)
  }
}

main()
```

Make it executable:

```bash
chmod +x scripts/api-docs/generate.ts
```

---

## First Run (5 minutes)

### Run Generator

```bash
pnpm docs:api
```

**Expected output**:

```
🚀 Starting API Documentation Agent

📂 Scanning route files...
Found 54 route files

🔍 Analyzing route code...
Analyzed 54 routes (0 errors)

📝 Generating OpenAPI spec...
Generated spec with 54 endpoints

✅ Validating coverage...
Coverage: 100.0% (54/54 routes)
✅ OpenAPI spec is valid

💾 Writing documentation...
✅ Wrote public/api/generated-openapi.yaml
✅ Wrote docs/api/coverage-report.json
✅ Wrote docs/api/API_COVERAGE_REPORT.md

============================================================
✅ API Documentation Agent Complete
============================================================
Coverage: 100%
Documented: 54/54 routes
Errors: 0

🎉 100% API documentation coverage achieved!
```

### View Generated Docs

```bash
# Start dev server
pnpm dev

# Visit documentation
open http://localhost:3000/docs/api
```

### Check Coverage Report

```bash
cat docs/api/API_COVERAGE_REPORT.md
```

---

## CI/CD Setup (5 minutes)

### Create GitHub Workflow

Create `.github/workflows/api-docs.yml`:

```yaml
name: API Documentation

on:
  pull_request:
    paths:
      - 'app/api/**/*.ts'
  push:
    branches: [main, staging]

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Generate API docs
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: pnpm docs:api

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: api-coverage-report
          path: docs/api/coverage-report.json
```

### Add GitHub Secret

1. Go to repository Settings → Secrets → Actions
2. Click "New repository secret"
3. Name: `ANTHROPIC_API_KEY`
4. Value: Your Anthropic API key
5. Click "Add secret"

### Test Workflow

```bash
git add .github/workflows/api-docs.yml
git commit -m "ci: add API docs generation workflow"
git push origin feature/api-docs

# Create PR to trigger workflow
```

---

## Optional: Pre-commit Hook

Install Husky:

```bash
pnpm add -D husky
pnpm exec husky install
```

Create `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Check if API routes changed
API_CHANGES=$(git diff --cached --name-only | grep '^app/api/.*\.ts$' || true)

if [ -n "$API_CHANGES" ]; then
  echo "🔍 API routes changed, regenerating documentation..."
  pnpm docs:api

  # Stage generated files
  git add public/api/generated-openapi.yaml
  git add docs/api/coverage-report.json
  git add docs/api/API_COVERAGE_REPORT.md
fi
```

Make executable:

```bash
chmod +x .husky/pre-commit
```

---

## Verification

### Check Files Were Generated

```bash
ls -lh public/api/generated-openapi.yaml
ls -lh docs/api/coverage-report.json
ls -lh docs/api/API_COVERAGE_REPORT.md
```

### Validate OpenAPI Spec

```bash
pnpm dlx @redocly/cli@latest lint public/api/generated-openapi.yaml
```

### Generate TypeScript Types

```bash
pnpm generate:types
ls -lh lib/types/api.generated.ts
```

---

## Usage Examples

### Watch Mode (Development)

```bash
# Terminal 1: Watch for changes
pnpm docs:api:watch

# Terminal 2: Make API changes
code app/api/workspaces/[slug]/challenges/route.ts

# Terminal 1 will auto-regenerate docs
```

### Manual Generation

```bash
# Full regeneration
pnpm docs:api

# Check coverage
cat docs/api/coverage-report.json | jq '.coverage'
```

### View in Browser

```bash
pnpm dev
open http://localhost:3000/docs/api
```

---

## Troubleshooting

### Error: "ANTHROPIC_API_KEY not set"

```bash
export ANTHROPIC_API_KEY="your-key-here"

# Or add to .env.local
echo "ANTHROPIC_API_KEY=your-key-here" >> .env.local
```

### Error: "Cannot find module @langchain/langgraph"

```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install
```

### Error: "OpenAPI validation failed"

```bash
# Check specific errors
pnpm dlx @redocly/cli@latest lint --format=stylish public/api/generated-openapi.yaml

# View generated spec
cat public/api/generated-openapi.yaml | less
```

### Coverage Not 100%

```bash
# List undocumented routes
cat docs/api/coverage-report.json | jq -r '.undocumentedRoutes[]'

# Check for errors
cat docs/api/coverage-report.json | jq -r '.errors[]'

# Run with verbose logging
DEBUG=* pnpm docs:api
```

---

## Next Steps

1. ✅ Review generated OpenAPI spec
2. ✅ Customize tags and descriptions in `agent.ts`
3. ✅ Add JSDoc annotations to route files for enhanced docs
4. ✅ Set up Slack notifications for coverage alerts
5. ✅ Add coverage badge to README

---

## Cost Analysis

**First run** (all 54 routes):
- Input tokens: ~135,000
- Output tokens: ~100,000
- Cost: ~$0.60 (Claude Sonnet)

**Incremental runs** (2-3 changed routes):
- Input tokens: ~5,000
- Output tokens: ~4,000
- Cost: ~$0.02

**Monthly estimate** (20 runs):
- Total: ~$1.20/month

---

## Support

Issues? Questions?

1. Check `docs/api/LANGGRAPH_AUTOMATION.md` for detailed documentation
2. Review error logs in `docs/api/coverage-report.json`
3. Run with debug: `DEBUG=* pnpm docs:api`
4. Open GitHub issue with error details

---

**Time to 100% coverage**: 30 minutes
**Maintenance time**: 0 minutes (automated)
**Cost**: ~$1.20/month
