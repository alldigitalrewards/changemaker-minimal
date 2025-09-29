import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create or reuse Prisma client. In development, detect schema changes where
// new models may not exist on a previously cached client instance and
// re-instantiate to pick up the regenerated client API.
let prismaInstance = globalForPrisma.prisma ?? new PrismaClient()

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