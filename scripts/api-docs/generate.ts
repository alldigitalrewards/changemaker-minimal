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
