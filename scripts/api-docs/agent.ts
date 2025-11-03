import { StateGraph, END } from "@langchain/langgraph"
import { ChatAnthropic } from "@langchain/anthropic"
import { parse } from "@typescript-eslint/typescript-estree"
import { glob } from "glob"
import fs from "fs/promises"
import path from "path"
import yaml from "js-yaml"
import crypto from "crypto"
import type { OpenAPIV3_1 as OpenAPI } from "openapi-types"

// ============================================================================
// Types & Interfaces
// ============================================================================

interface APIDocState {
  routeFiles: string[]
  routes: ParsedRoute[]
  openApiSpec: OpenAPI.Document
  coverageReport: CoverageReport
  errors: string[]
}

interface ParsedRoute {
  filePath: string
  methods: string[]
  path: string
  params: RouteParam[]
  authHelper: string | null
  requestType: string | null
  responseType: string | null
  description: string | null
}

interface RouteParam {
  name: string
  type: string
  location: "path" | "query" | "body"
  required: boolean
}

interface CoverageReport {
  totalRoutes: number
  documentedRoutes: number
  undocumentedRoutes: string[]
  coverage: number
  timestamp: string
}

// ============================================================================
// Cache Helpers
// ============================================================================

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

function extractHttpMethods(code: string): string[] {
  const methods: string[] = []
  const validMethods = ["GET", "POST", "PUT", "PATCH", "DELETE"]

  for (const method of validMethods) {
    const exportPattern = new RegExp(`export\\s+async\\s+function\\s+${method}`, "m")
    if (exportPattern.test(code)) {
      methods.push(method)
    }
  }

  return methods
}

function filePathToApiPath(filePath: string): string {
  const relativePath = path.relative(process.cwd(), filePath)
  return relativePath
    .replace("app", "/api")
    .replace("/route.ts", "")
    .replace(/\[(\w+)\]/g, "{$1}")
}

async function analyzeCode(state: APIDocState): Promise<Partial<APIDocState>> {
  console.log("🔍 Analyzing route code...")

  const routes: ParsedRoute[] = []
  const errors: string[] = []

  const llm = new ChatAnthropic({
    model: "claude-sonnet-4-20250514",
    temperature: 0
  })

  let processed = 0
  const total = state.routeFiles.length

  for (const filePath of state.routeFiles) {
    try {
      const code = await fs.readFile(filePath, "utf-8")

      // Check cache first
      const cached = await getCachedAnalysis(filePath, code)
      if (cached) {
        routes.push(cached)
        processed++
        if (processed % 10 === 0) {
          console.log(`  Analyzed ${processed}/${total} routes (cached)...`)
        }
        continue
      }

      const apiPath = filePathToApiPath(filePath)
      const methods = extractHttpMethods(code)

      if (methods.length === 0) continue

      // Use LLM to extract metadata
      const prompt = `Analyze this Next.js API route handler and extract metadata as JSON.

File: ${path.relative(process.cwd(), filePath)}
Path: ${apiPath}
Methods: ${methods.join(", ")}

Code:
\`\`\`typescript
${code.slice(0, 3000)}
\`\`\`

Extract:
1. authHelper: Which auth function is used (requireAuth, requireWorkspaceAdmin, requireWorkspaceManager, requireManagerAccess, etc.) or null
2. parameters: Array of {name, type, location: "path"|"query"|"body", required: boolean}
3. requestType: TypeScript type/interface name for request body (if POST/PUT/PATCH) or null
4. responseType: TypeScript type/interface name for response or null
5. description: Brief 1-2 sentence description of what this endpoint does

Return ONLY valid JSON in this exact format:
{
  "authHelper": "requireWorkspaceAdmin",
  "parameters": [{"name": "slug", "type": "string", "location": "path", "required": true}],
  "requestType": null,
  "responseType": "Challenge",
  "description": "Creates a new challenge in the workspace"
}`

      const result = await llm.invoke([
        {
          role: "system",
          content: "You are an API documentation expert. Extract metadata from code and return ONLY valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ])

      const content = result.content.toString()
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      const metadata = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

      const analysis: ParsedRoute = {
        filePath: path.relative(process.cwd(), filePath),
        methods,
        path: apiPath,
        params: metadata.parameters || [],
        authHelper: metadata.authHelper || null,
        requestType: metadata.requestType || null,
        responseType: metadata.responseType || null,
        description: metadata.description || null
      }

      // Cache the result
      await cacheAnalysis(filePath, code, analysis)
      routes.push(analysis)

      processed++
      if (processed % 5 === 0) {
        console.log(`  Analyzed ${processed}/${total} routes...`)
      }

    } catch (error) {
      errors.push(`Failed to analyze ${filePath}: ${error.message}`)
    }
  }

  console.log(`✅ Analyzed ${routes.length} routes (${errors.length} errors)`)

  return {
    routes,
    errors: [...(state.errors || []), ...errors]
  }
}

// ============================================================================
// Node 3: Spec Generator
// ============================================================================

async function generateSpec(state: APIDocState): Promise<Partial<APIDocState>> {
  console.log("📝 Generating OpenAPI spec...")

  const llm = new ChatAnthropic({
    model: "claude-sonnet-4-20250514",
    temperature: 0
  })

  const paths: OpenAPI.PathsObject = {}

  let processed = 0
  const totalOps = state.routes.reduce((sum, r) => sum + r.methods.length, 0)

  for (const route of state.routes) {
    if (!paths[route.path]) {
      paths[route.path] = {}
    }

    for (const method of route.methods) {
      try {
        const prompt = `Generate an OpenAPI 3.1 operation specification.

Path: ${route.path}
Method: ${method}
Auth: ${route.authHelper || "None"}
Description: ${route.description || "No description"}
Parameters: ${JSON.stringify(route.params)}

Create a complete OpenAPI operation object with:
- operationId (camelCase, descriptive)
- summary (1 sentence)
- description (2-3 sentences)
- parameters array (path, query)
- requestBody (if POST/PUT/PATCH with example)
- responses (200, 400, 401, 403, 404, 500 with examples)
- security array (if auth required)
- tags array

Return ONLY valid JSON for the operation object.`

        const result = await llm.invoke([
          {
            role: "system",
            content: "You are an OpenAPI 3.1 expert. Generate operation specs as JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ])

        const content = result.content.toString()
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        const operation = jsonMatch ? JSON.parse(jsonMatch[0]) : null

        if (operation) {
          paths[route.path][method.toLowerCase()] = operation
        }

        processed++
        if (processed % 10 === 0) {
          console.log(`  Generated ${processed}/${totalOps} operations...`)
        }

      } catch (error) {
        state.errors.push(`Failed to generate spec for ${method} ${route.path}: ${error.message}`)
      }
    }
  }

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
    paths,
    components: {
      securitySchemes: {
        SupabaseSession: {
          type: "apiKey",
          in: "cookie",
          name: "sb-access-token",
          description: "Supabase session cookie"
        }
      },
      schemas: {}
    }
  }

  console.log(`✅ Generated spec with ${Object.keys(paths).length} paths`)

  return {
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

  const routePaths = state.routes.map(r => r.path)
  const undocumentedRoutes = routePaths.filter(p => !documentedPaths.includes(p))

  const coverage = totalRoutes > 0 ? (documentedRoutes / totalRoutes) * 100 : 0

  const coverageReport: CoverageReport = {
    totalRoutes,
    documentedRoutes,
    undocumentedRoutes,
    coverage: Math.round(coverage * 100) / 100,
    timestamp: new Date().toISOString()
  }

  console.log(`📊 Coverage: ${coverage.toFixed(1)}% (${documentedRoutes}/${totalRoutes} routes)`)

  return {
    coverageReport
  }
}

// ============================================================================
// Node 5: Writer
// ============================================================================

async function writeDocumentation(state: APIDocState): Promise<Partial<APIDocState>> {
  console.log("💾 Writing documentation...")

  // Write OpenAPI spec
  const specPath = "public/api/generated-openapi.yaml"
  await fs.mkdir(path.dirname(specPath), { recursive: true })
  await fs.writeFile(specPath, yaml.dump(state.openApiSpec, { lineWidth: 100 }))
  console.log(`  ✅ Wrote ${specPath}`)

  // Write coverage report
  const reportPath = "docs/api/coverage-report.json"
  await fs.mkdir(path.dirname(reportPath), { recursive: true })
  await fs.writeFile(reportPath, JSON.stringify(state.coverageReport, null, 2))
  console.log(`  ✅ Wrote ${reportPath}`)

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
  console.log(`  ✅ Wrote ${summaryPath}`)

  return {}
}

// ============================================================================
// Graph Construction
// ============================================================================

export function createAPIDocAgent() {
  const graph = new StateGraph<APIDocState>({
    channels: {
      routeFiles: null,
      routes: null,
      openApiSpec: null,
      coverageReport: null,
      errors: null
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
    routes: [],
    openApiSpec: {} as OpenAPI.Document,
    coverageReport: {
      totalRoutes: 0,
      documentedRoutes: 0,
      undocumentedRoutes: [],
      coverage: 0,
      timestamp: new Date().toISOString()
    },
    errors: []
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
      result.errors.slice(0, 5).forEach(e => console.log(`  - ${e}`))
      if (result.errors.length > 5) {
        console.log(`  ... and ${result.errors.length - 5} more`)
      }
    }

    return result

  } catch (error) {
    console.error("❌ Agent failed:", error)
    throw error
  }
}
