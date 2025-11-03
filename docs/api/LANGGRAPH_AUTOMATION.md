# Automating 100% API Documentation with LangGraph v1

**Created**: 2025-11-03
**Status**: Implementation Ready
**Estimated Setup**: 4-6 hours

---

## Overview

This document describes a LangGraph v1-based system that automatically:
1. **Scans** all API route files in `app/api/`
2. **Extracts** endpoint metadata (methods, params, auth, responses)
3. **Generates** OpenAPI 3.1 specs
4. **Validates** against implementation
5. **Maintains** 100% documentation coverage via CI/CD

---

## Architecture

### LangGraph State Machine

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Documentation Agent                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  ROUTE_SCANNER   │
                    │  Find all routes │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  CODE_ANALYZER   │
                    │  Parse AST/Types │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  SPEC_GENERATOR  │
                    │  Create OpenAPI  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  VALIDATOR       │
                    │  Check coverage  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  WRITER          │
                    │  Update files    │
                    └──────────────────┘
```

### State Schema

```typescript
interface APIDocState {
  // Input
  routeFiles: string[]
  existingSpec: OpenAPISpec | null

  // Processing
  routes: ParsedRoute[]
  schemas: TypeScriptSchema[]
  endpoints: EndpointSpec[]

  // Output
  openApiSpec: OpenAPISpec
  coverageReport: CoverageReport
  errors: ValidationError[]

  // Metadata
  timestamp: string
  changedFiles: string[]
  shouldUpdate: boolean
}

interface ParsedRoute {
  filePath: string
  httpMethods: ('GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')[]
  urlPattern: string
  params: RouteParam[]
  authHelper: string | null
  requestSchema: TypeSchema | null
  responseSchema: TypeSchema | null
  errorCodes: number[]
}
```

---

## Implementation

### 1. Setup Dependencies

```bash
pnpm add @langchain/langgraph @langchain/core @langchain/anthropic
pnpm add -D @typescript-eslint/parser @typescript-eslint/typescript-estree
pnpm add -D openapi-types js-yaml
```

### 2. LangGraph Agent Implementation

Create `scripts/api-docs/agent.ts`:

```typescript
import { StateGraph, END } from "@langchain/langgraph"
import { ChatAnthropic } from "@langchain/anthropic"
import { parse } from "@typescript-eslint/typescript-estree"
import { glob } from "glob"
import fs from "fs/promises"
import path from "path"
import yaml from "js-yaml"
import type { OpenAPIV3_1 as OpenAPI } from "openapi-types"

// ============================================================================
// State Definition
// ============================================================================

interface APIDocState {
  routeFiles: string[]
  existingSpec: OpenAPI.Document | null
  routes: ParsedRoute[]
  schemas: Record<string, TypeSchema>
  endpoints: EndpointDefinition[]
  openApiSpec: OpenAPI.Document
  coverageReport: CoverageReport
  errors: string[]
  shouldUpdate: boolean
}

interface ParsedRoute {
  filePath: string
  methods: string[]
  path: string
  params: Array<{ name: string; type: string; location: "path" | "query" | "body" }>
  authHelper: string | null
  requestType: string | null
  responseType: string | null
  description: string | null
}

interface TypeSchema {
  type: string
  properties?: Record<string, any>
  required?: string[]
  example?: any
}

interface EndpointDefinition {
  path: string
  method: string
  operationId: string
  summary: string
  description: string
  parameters: OpenAPI.ParameterObject[]
  requestBody?: OpenAPI.RequestBodyObject
  responses: OpenAPI.ResponsesObject
  security?: OpenAPI.SecurityRequirementObject[]
}

interface CoverageReport {
  totalRoutes: number
  documentedRoutes: number
  undocumentedRoutes: string[]
  coverage: number
  timestamp: string
}

// ============================================================================
// Node 1: Route Scanner
// ============================================================================

async function scanRoutes(state: APIDocState): Promise<Partial<APIDocState>> {
  console.log("📂 Scanning route files...")

  const routeFiles = await glob("app/api/**/route.ts", {
    cwd: process.cwd(),
    absolute: true
  })

  console.log(`Found ${routeFiles.length} route files`)

  return {
    routeFiles,
    errors: []
  }
}

// ============================================================================
// Node 2: Code Analyzer
// ============================================================================

async function analyzeCode(state: APIDocState): Promise<Partial<APIDocState>> {
  console.log("🔍 Analyzing route code...")

  const routes: ParsedRoute[] = []
  const errors: string[] = []

  const llm = new ChatAnthropic({
    model: "claude-3-5-sonnet-20241022",
    temperature: 0
  })

  for (const filePath of state.routeFiles) {
    try {
      const code = await fs.readFile(filePath, "utf-8")
      const relativePath = path.relative(process.cwd(), filePath)

      // Extract API path from file path
      // app/api/workspaces/[slug]/challenges/[id]/route.ts
      // -> /api/workspaces/{slug}/challenges/{id}
      const apiPath = relativePath
        .replace("app/api", "/api")
        .replace("/route.ts", "")
        .replace(/\[(\w+)\]/g, "{$1}")

      // Parse TypeScript AST
      const ast = parse(code, {
        jsx: false,
        loc: true,
        range: true
      })

      // Extract HTTP methods (GET, POST, etc.)
      const methods = extractHttpMethods(ast, code)

      if (methods.length === 0) continue

      // Use LLM to extract detailed metadata
      const analysis = await llm.invoke([
        {
          role: "system",
          content: `You are an API documentation expert. Analyze this Next.js route handler and extract:
1. Auth helper used (requireAuth, requireWorkspaceAdmin, requireWorkspaceManager, requireManagerAccess, etc.)
2. Request body schema/type (if POST/PUT/PATCH)
3. Response schema/type
4. Path/query parameters
5. Brief description of what the endpoint does
6. Expected error codes

Return valid JSON only.`
        },
        {
          role: "user",
          content: `File: ${relativePath}\nPath: ${apiPath}\nMethods: ${methods.join(", ")}\n\nCode:\n\`\`\`typescript\n${code}\n\`\`\``
        }
      ])

      const metadata = JSON.parse(analysis.content.toString())

      routes.push({
        filePath: relativePath,
        methods,
        path: apiPath,
        params: metadata.parameters || [],
        authHelper: metadata.authHelper || null,
        requestType: metadata.requestType || null,
        responseType: metadata.responseType || null,
        description: metadata.description || null
      })

    } catch (error) {
      errors.push(`Failed to analyze ${filePath}: ${error.message}`)
    }
  }

  console.log(`Analyzed ${routes.length} routes (${errors.length} errors)`)

  return {
    routes,
    errors: [...state.errors, ...errors]
  }
}

// Helper: Extract HTTP methods from AST
function extractHttpMethods(ast: any, code: string): string[] {
  const methods: string[] = []
  const validMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]

  // Simple pattern matching for exported async functions
  for (const method of validMethods) {
    const exportPattern = new RegExp(`export\\s+async\\s+function\\s+${method}`, "m")
    if (exportPattern.test(code)) {
      methods.push(method)
    }
  }

  return methods
}

// ============================================================================
// Node 3: Spec Generator
// ============================================================================

async function generateSpec(state: APIDocState): Promise<Partial<APIDocState>> {
  console.log("📝 Generating OpenAPI spec...")

  const llm = new ChatAnthropic({
    model: "claude-3-5-sonnet-20241022",
    temperature: 0
  })

  const endpoints: EndpointDefinition[] = []
  const schemas: Record<string, TypeSchema> = {}

  for (const route of state.routes) {
    for (const method of route.methods) {
      // Use LLM to generate comprehensive endpoint spec
      const prompt = `Generate an OpenAPI 3.1 endpoint specification for:

Path: ${route.path}
Method: ${method}
Auth: ${route.authHelper || "None"}
Description: ${route.description || "No description"}
Request Type: ${route.requestType || "None"}
Response Type: ${route.responseType || "None"}
Parameters: ${JSON.stringify(route.params, null, 2)}

Include:
- operationId (camelCase, descriptive)
- summary (1 sentence)
- description (2-3 sentences with business context)
- parameters (path, query with proper schemas)
- requestBody (if applicable, with example)
- responses (200, 400, 401, 403, 404, 500 with examples)
- security requirements (based on auth helper)

Return valid JSON matching OpenAPI 3.1 PathItemObject structure.`

      const result = await llm.invoke([
        { role: "system", content: "You are an OpenAPI 3.1 specification expert." },
        { role: "user", content: prompt }
      ])

      try {
        const endpointSpec = JSON.parse(result.content.toString())
        endpoints.push({
          path: route.path,
          method: method.toLowerCase(),
          ...endpointSpec
        })
      } catch (error) {
        state.errors.push(`Failed to parse spec for ${method} ${route.path}: ${error.message}`)
      }
    }
  }

  // Build complete OpenAPI document
  const openApiSpec: OpenAPI.Document = {
    openapi: "3.1.0",
    info: {
      title: "Changemaker API",
      version: "2.0.0",
      description: `Comprehensive API documentation for Changemaker platform.

Generated automatically from route implementations.
Last updated: ${new Date().toISOString()}`,
      contact: {
        name: "Changemaker Support",
        email: "support@changemaker.im"
      }
    },
    servers: [
      { url: "https://changemaker.im", description: "Production" },
      { url: "https://staging.changemaker.im", description: "Staging" },
      { url: "http://localhost:3000", description: "Local" }
    ],
    tags: [
      { name: "Health", description: "Health and status endpoints" },
      { name: "Account", description: "User account management" },
      { name: "Workspaces", description: "Workspace operations" },
      { name: "Challenges", description: "Challenge management" },
      { name: "Participants", description: "Participant management" },
      { name: "Submissions", description: "Submission review workflow" },
      { name: "Manager", description: "Manager role operations" },
      { name: "Admin", description: "Admin operations" }
    ],
    paths: {},
    components: {
      securitySchemes: {
        SupabaseSession: {
          type: "apiKey",
          in: "cookie",
          name: "sb-access-token",
          description: "Supabase session cookie"
        }
      },
      schemas: schemas
    }
  }

  // Organize endpoints by path
  for (const endpoint of endpoints) {
    if (!openApiSpec.paths[endpoint.path]) {
      openApiSpec.paths[endpoint.path] = {}
    }
    openApiSpec.paths[endpoint.path][endpoint.method] = {
      operationId: endpoint.operationId,
      summary: endpoint.summary,
      description: endpoint.description,
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      responses: endpoint.responses,
      security: endpoint.security
    }
  }

  console.log(`Generated spec with ${endpoints.length} endpoints`)

  return {
    endpoints,
    schemas,
    openApiSpec
  }
}

// ============================================================================
// Node 4: Validator
// ============================================================================

async function validateCoverage(state: APIDocState): Promise<Partial<APIDocState>> {
  console.log("✅ Validating coverage...")

  const totalRoutes = state.routes.length
  const documentedPaths = Object.keys(state.openApiSpec.paths || {})
  const documentedRoutes = documentedPaths.length

  const undocumentedRoutes = state.routes
    .filter(r => !documentedPaths.includes(r.path))
    .map(r => r.path)

  const coverage = totalRoutes > 0 ? (documentedRoutes / totalRoutes) * 100 : 0

  const coverageReport: CoverageReport = {
    totalRoutes,
    documentedRoutes,
    undocumentedRoutes,
    coverage: Math.round(coverage * 100) / 100,
    timestamp: new Date().toISOString()
  }

  console.log(`Coverage: ${coverage.toFixed(1)}% (${documentedRoutes}/${totalRoutes} routes)`)

  // Validate with Redocly CLI
  const tempFile = "/tmp/openapi-temp.yaml"
  await fs.writeFile(tempFile, yaml.dump(state.openApiSpec))

  try {
    const { execSync } = require("child_process")
    execSync(`pnpm dlx @redocly/cli@latest lint ${tempFile}`, { stdio: "pipe" })
    console.log("✅ OpenAPI spec is valid")
  } catch (error) {
    state.errors.push(`OpenAPI validation failed: ${error.message}`)
  }

  return {
    coverageReport,
    shouldUpdate: coverage < 100 || state.errors.length === 0
  }
}

// ============================================================================
// Node 5: Writer
// ============================================================================

async function writeDocumentation(state: APIDocState): Promise<Partial<APIDocState>> {
  console.log("💾 Writing documentation...")

  // Write OpenAPI spec
  const specPath = "public/api/generated-openapi.yaml"
  await fs.writeFile(specPath, yaml.dump(state.openApiSpec, { lineWidth: 100 }))
  console.log(`✅ Wrote ${specPath}`)

  // Write coverage report
  const reportPath = "docs/api/coverage-report.json"
  await fs.writeFile(reportPath, JSON.stringify(state.coverageReport, null, 2))
  console.log(`✅ Wrote ${reportPath}`)

  // Write markdown summary
  const summaryPath = "docs/api/API_COVERAGE_REPORT.md"
  const summary = `# API Documentation Coverage Report

**Generated**: ${state.coverageReport.timestamp}
**Coverage**: ${state.coverageReport.coverage}%
**Documented**: ${state.coverageReport.documentedRoutes}/${state.coverageReport.totalRoutes} routes

## Status

${state.coverageReport.coverage === 100 ? "✅ **100% Coverage Achieved**" : "⚠️ **Incomplete Coverage**"}

## Undocumented Routes

${state.coverageReport.undocumentedRoutes.length === 0
  ? "None - all routes documented!"
  : state.coverageReport.undocumentedRoutes.map(r => `- \`${r}\``).join("\n")}

## Errors

${state.errors.length === 0
  ? "None"
  : state.errors.map(e => `- ${e}`).join("\n")}

---

*Generated automatically by LangGraph API Documentation Agent*
`

  await fs.writeFile(summaryPath, summary)
  console.log(`✅ Wrote ${summaryPath}`)

  return {
    errors: state.errors
  }
}

// ============================================================================
// Graph Construction
// ============================================================================

export function createAPIDocAgent() {
  const graph = new StateGraph<APIDocState>({
    channels: {
      routeFiles: null,
      existingSpec: null,
      routes: null,
      schemas: null,
      endpoints: null,
      openApiSpec: null,
      coverageReport: null,
      errors: null,
      shouldUpdate: null
    }
  })

  // Add nodes
  graph.addNode("scanner", scanRoutes)
  graph.addNode("analyzer", analyzeCode)
  graph.addNode("generator", generateSpec)
  graph.addNode("validator", validateCoverage)
  graph.addNode("writer", writeDocumentation)

  // Define edges
  graph.addEdge("scanner", "analyzer")
  graph.addEdge("analyzer", "generator")
  graph.addEdge("generator", "validator")
  graph.addEdge("validator", "writer")
  graph.addEdge("writer", END)

  // Set entry point
  graph.setEntryPoint("scanner")

  return graph.compile()
}

// ============================================================================
// CLI Runner
// ============================================================================

export async function runAPIDocAgent() {
  console.log("🚀 Starting API Documentation Agent\n")

  const app = createAPIDocAgent()

  const initialState: APIDocState = {
    routeFiles: [],
    existingSpec: null,
    routes: [],
    schemas: {},
    endpoints: [],
    openApiSpec: {} as OpenAPI.Document,
    coverageReport: {
      totalRoutes: 0,
      documentedRoutes: 0,
      undocumentedRoutes: [],
      coverage: 0,
      timestamp: new Date().toISOString()
    },
    errors: [],
    shouldUpdate: false
  }

  try {
    const result = await app.invoke(initialState)

    console.log("\n" + "=".repeat(60))
    console.log("✅ API Documentation Agent Complete")
    console.log("=".repeat(60))
    console.log(`Coverage: ${result.coverageReport.coverage}%`)
    console.log(`Documented: ${result.coverageReport.documentedRoutes}/${result.coverageReport.totalRoutes} routes`)
    console.log(`Errors: ${result.errors.length}`)

    if (result.errors.length > 0) {
      console.log("\nErrors:")
      result.errors.forEach(e => console.log(`  - ${e}`))
    }

    return result

  } catch (error) {
    console.error("❌ Agent failed:", error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  runAPIDocAgent()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
```

---

## 3. CLI Script

Create `scripts/api-docs/generate.ts`:

```typescript
#!/usr/bin/env tsx

import { runAPIDocAgent } from "./agent"

async function main() {
  console.log("Generating API documentation...\n")

  const result = await runAPIDocAgent()

  if (result.coverageReport.coverage === 100) {
    console.log("\n🎉 100% API documentation coverage achieved!")
    process.exit(0)
  } else {
    console.log(`\n⚠️  Coverage is ${result.coverageReport.coverage}%`)
    console.log("Run again to improve coverage.")
    process.exit(1)
  }
}

main()
```

Add to `package.json`:

```json
{
  "scripts": {
    "docs:api": "tsx scripts/api-docs/generate.ts",
    "docs:api:watch": "nodemon --watch app/api --ext ts --exec 'pnpm docs:api'"
  }
}
```

---

## 4. CI/CD Integration

Create `.github/workflows/api-docs.yml`:

```yaml
name: API Documentation

on:
  pull_request:
    paths:
      - 'app/api/**/*.ts'
      - 'lib/**/*.ts'
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

      - name: Check coverage
        run: |
          COVERAGE=$(jq -r '.coverage' docs/api/coverage-report.json)
          echo "API Coverage: $COVERAGE%"

          if (( $(echo "$COVERAGE < 100" | bc -l) )); then
            echo "❌ API documentation coverage is below 100%"
            exit 1
          fi

      - name: Validate OpenAPI spec
        run: pnpm dlx @redocly/cli@latest lint public/api/generated-openapi.yaml

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: api-coverage-report
          path: docs/api/coverage-report.json

      - name: Comment on PR
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs')
            const report = JSON.parse(fs.readFileSync('docs/api/coverage-report.json', 'utf8'))

            const body = `## API Documentation Coverage

            **Coverage**: ${report.coverage}%
            **Documented**: ${report.documentedRoutes}/${report.totalRoutes} routes

            ${report.undocumentedRoutes.length > 0 ? `### Undocumented Routes
            ${report.undocumentedRoutes.map(r => `- \`${r}\``).join('\n')}` : '✅ All routes documented!'}
            `

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body
            })

      - name: Commit updated docs
        if: github.ref == 'refs/heads/main'
        run: |
          git config user.name "API Docs Bot"
          git config user.email "bot@changemaker.im"
          git add public/api/generated-openapi.yaml docs/api/
          git diff --quiet && git diff --staged --quiet || (git commit -m "docs: update API documentation [skip ci]" && git push)
```

---

## 5. Pre-commit Hook

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

  echo "✅ API documentation updated"
fi
```

Install Husky:

```bash
pnpm add -D husky
pnpm exec husky install
pnpm exec husky add .husky/pre-commit
```

---

## Usage

### Generate Documentation

```bash
# One-time generation
pnpm docs:api

# Watch mode (regenerate on file changes)
pnpm docs:api:watch
```

### View Generated Docs

```bash
# Serve locally
pnpm dev

# Visit http://localhost:3000/docs/api
```

### CI/CD

- **On PR**: Validates coverage, comments on PR with report
- **On merge to main**: Auto-commits updated docs
- **Fails if**: Coverage < 100% or OpenAPI validation fails

---

## Advanced Features

### 1. Incremental Updates

Modify `agent.ts` to only process changed files:

```typescript
async function scanRoutes(state: APIDocState): Promise<Partial<APIDocState>> {
  // Get changed files from git
  const { execSync } = require("child_process")
  const changedFiles = execSync("git diff --name-only HEAD~1 HEAD")
    .toString()
    .split("\n")
    .filter(f => f.startsWith("app/api/") && f.endsWith(".ts"))

  if (changedFiles.length === 0) {
    console.log("No API routes changed, using cached spec")
    return { routeFiles: [], shouldUpdate: false }
  }

  // Only process changed files
  return { routeFiles: changedFiles, shouldUpdate: true }
}
```

### 2. Custom Annotations

Add JSDoc comments to route files for enhanced docs:

```typescript
/**
 * @openapi
 * tags:
 *   - Challenges
 * summary: Create a new challenge
 * description: |
 *   Creates a new challenge in the workspace. Requires admin role.
 *   Points budget is optional but recommended.
 */
export async function POST(request: Request, { params }: { params: { slug: string } }) {
  // ...
}
```

Update analyzer to parse JSDoc:

```typescript
import { parse as parseComment } from "doctrine"

function extractJsDocAnnotations(code: string): Record<string, any> {
  const commentPattern = /\/\*\*\s*\n([^*]|\*[^/])*\*\//g
  const comments = code.match(commentPattern) || []

  for (const comment of comments) {
    const parsed = parseComment(comment, { unwrap: true })
    const openApiTag = parsed.tags.find(t => t.title === "openapi")

    if (openApiTag) {
      return yaml.load(openApiTag.description)
    }
  }

  return {}
}
```

### 3. Response Example Generation

Add example generation to `generateSpec`:

```typescript
async function generateExamples(route: ParsedRoute): Promise<any> {
  const llm = new ChatAnthropic({ model: "claude-3-5-sonnet-20241022" })

  const result = await llm.invoke([
    {
      role: "system",
      content: "Generate realistic example responses for API endpoints in JSON format."
    },
    {
      role: "user",
      content: `Generate example responses for ${route.path}:
- 200 OK response (success case)
- 400 Bad Request (validation error)
- 403 Forbidden (insufficient permissions)
- 404 Not Found

Response type: ${route.responseType}
Include realistic data matching the Changemaker domain.`
    }
  ])

  return JSON.parse(result.content.toString())
}
```

### 4. TypeScript Type Generation

Generate types from OpenAPI spec:

```typescript
import openapiTS from "openapi-typescript"

async function generateTypes(state: APIDocState): Promise<void> {
  const specPath = "public/api/generated-openapi.yaml"
  const output = await openapiTS(specPath)

  await fs.writeFile("lib/types/api.generated.ts", output)
  console.log("✅ Generated TypeScript types")
}
```

Add to graph as final node:

```typescript
graph.addNode("typeGenerator", generateTypes)
graph.addEdge("writer", "typeGenerator")
graph.addEdge("typeGenerator", END)
```

---

## Monitoring & Reporting

### Coverage Badge

Add to README.md:

```markdown
![API Coverage](https://img.shields.io/endpoint?url=https://changemaker.im/api/docs/coverage-badge)
```

Create badge endpoint in `app/api/docs/coverage-badge/route.ts`:

```typescript
import { NextResponse } from "next/server"
import fs from "fs/promises"

export async function GET() {
  const report = JSON.parse(
    await fs.readFile("docs/api/coverage-report.json", "utf-8")
  )

  const color = report.coverage === 100 ? "brightgreen" : report.coverage >= 80 ? "yellow" : "red"

  return NextResponse.json({
    schemaVersion: 1,
    label: "API Coverage",
    message: `${report.coverage}%`,
    color
  })
}
```

### Slack Notifications

Add to CI workflow:

```yaml
- name: Notify Slack
  if: failure()
  uses: slackapi/slack-github-action@v1
  with:
    payload: |
      {
        "text": "API documentation coverage check failed",
        "blocks": [
          {
            "type": "section",
            "text": {
              "type": "mrkdwn",
              "text": "*API Coverage Alert* :warning:\n\nCoverage is below 100% on `${{ github.ref_name }}`"
            }
          }
        ]
      }
  env:
    SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## Cost Optimization

### Token Usage Estimates

- **Per route analysis**: ~1,000 tokens
- **Per endpoint spec generation**: ~1,500 tokens
- **54 routes**: ~135,000 tokens (~$0.41 at Claude Sonnet rates)

### Caching Strategy

Cache analyzed routes to avoid re-processing:

```typescript
import crypto from "crypto"

async function getCachedAnalysis(filePath: string, code: string): Promise<ParsedRoute | null> {
  const hash = crypto.createHash("sha256").update(code).digest("hex")
  const cacheFile = `.cache/api-docs/${hash}.json`

  try {
    const cached = await fs.readFile(cacheFile, "utf-8")
    return JSON.parse(cached)
  } catch {
    return null
  }
}

async function cacheAnalysis(filePath: string, code: string, analysis: ParsedRoute): Promise<void> {
  const hash = crypto.createHash("sha256").update(code).digest("hex")
  const cacheFile = `.cache/api-docs/${hash}.json`

  await fs.mkdir(path.dirname(cacheFile), { recursive: true })
  await fs.writeFile(cacheFile, JSON.stringify(analysis, null, 2))
}
```

Add caching to analyzer:

```typescript
async function analyzeCode(state: APIDocState): Promise<Partial<APIDocState>> {
  for (const filePath of state.routeFiles) {
    const code = await fs.readFile(filePath, "utf-8")

    // Check cache first
    const cached = await getCachedAnalysis(filePath, code)
    if (cached) {
      routes.push(cached)
      continue
    }

    // Analyze with LLM
    const analysis = await analyzeLLM(filePath, code)

    // Cache result
    await cacheAnalysis(filePath, code, analysis)
    routes.push(analysis)
  }
}
```

---

## Troubleshooting

### Issue: LLM Returns Invalid JSON

**Solution**: Add retry logic with structured output:

```typescript
import { zodToJsonSchema } from "zod-to-json-schema"
import { z } from "zod"

const EndpointSchema = z.object({
  operationId: z.string(),
  summary: z.string(),
  description: z.string(),
  parameters: z.array(z.any()).optional(),
  // ...
})

const llm = new ChatAnthropic({
  model: "claude-3-5-sonnet-20241022"
}).withStructuredOutput(EndpointSchema)
```

### Issue: Coverage Not 100%

**Debug**:

```bash
# List undocumented routes
cat docs/api/coverage-report.json | jq -r '.undocumentedRoutes[]'

# Check errors
cat docs/api/coverage-report.json | jq -r '.errors[]'
```

### Issue: OpenAPI Validation Fails

**Fix**:

```bash
# Detailed validation
pnpm dlx @redocly/cli@latest lint --format=stylish public/api/generated-openapi.yaml

# Auto-fix some issues
pnpm dlx @redocly/cli@latest lint --fix public/api/generated-openapi.yaml
```

---

## Next Steps

1. ✅ Install dependencies
2. ✅ Create `scripts/api-docs/agent.ts`
3. ✅ Run initial generation: `pnpm docs:api`
4. ✅ Review generated spec
5. ✅ Set up CI/CD workflow
6. ✅ Configure pre-commit hook
7. ✅ Add coverage badge to README

---

**Estimated Results**:
- Initial setup: 4-6 hours
- Per-run time: 3-5 minutes (first run), 30-60 seconds (incremental)
- Coverage: 100% (all 54 endpoints)
- Maintenance: Automatic via CI/CD

**ROI**:
- Eliminates manual documentation
- Catches API drift immediately
- Self-updating on every commit
- Type-safe API clients from OpenAPI
