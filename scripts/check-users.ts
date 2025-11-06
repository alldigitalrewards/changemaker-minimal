import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      supabaseUserId: true,
      WorkspaceMembership: {
        select: {
          role: true,
          Workspace: {
            select: {
              slug: true,
              name: true
            }
          }
        }
      }
    }
  })

  console.log('All users:', JSON.stringify(users, null, 2))

  await prisma.$disconnect()
}

main().catch(console.error)
