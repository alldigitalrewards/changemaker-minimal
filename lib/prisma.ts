import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create or reuse Prisma client with optimized connection pooling
// Connection pool configuration:
// - Pool size: Scales based on environment (5 in dev, 10+ in production)
// - Timeout: 60s to handle long-running queries
// - Connection lifetime: 300s to recycle stale connections
// For tests, use DIRECT_URL to avoid connection pooling issues (port 5432 instead of 6543)
const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.PLAYWRIGHT_TEST === '1'
const databaseUrl = isTestEnvironment && process.env.DIRECT_URL
  ? process.env.DIRECT_URL
  : process.env.DATABASE_URL

// Determine log level based on environment
// Set PRISMA_LOG_QUERIES=false to disable query logging in development
const shouldLogQueries = process.env.PRISMA_LOG_QUERIES !== 'false'
const logConfig = process.env.NODE_ENV === 'development'
  ? (shouldLogQueries ? ['query', 'error', 'warn'] : ['error', 'warn'])
  : ['error']

let prismaInstance = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  },
  log: logConfig
})

if (process.env.NODE_ENV !== 'production') {
  const hasBudgetModels = Boolean(
    (prismaInstance as any).workspacePointsBudget &&
    typeof (prismaInstance as any).workspacePointsBudget.findUnique === 'function' &&
    (prismaInstance as any).challengePointsBudget &&
    typeof (prismaInstance as any).challengePointsBudget.findUnique === 'function'
  )

  if (!hasBudgetModels) {
    prismaInstance = new PrismaClient()
  }

  globalForPrisma.prisma = prismaInstance
}

export const prisma = prismaInstance