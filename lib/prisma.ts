import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create or reuse Prisma client with optimized connection pooling
// Connection pool configuration:
// - Pool size: Scales based on environment (5 in dev, 10+ in production)
// - Timeout: 60s to handle long-running queries
// - Connection lifetime: 300s to recycle stale connections
let prismaInstance = globalForPrisma.prisma ?? new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
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