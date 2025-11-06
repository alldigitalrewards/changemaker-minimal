import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const userId = 'bbb71ccd-98a5-43f8-947c-51d584daa0b9'

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  })

  if (!user) {
    console.error('User not found')
    process.exit(1)
  }

  console.log('Found user:', user.email)

  // Check if workspace already exists
  const existingWorkspace = await prisma.workspace.findUnique({
    where: { slug: 'test-workspace' }
  })

  if (existingWorkspace) {
    console.log('Workspace already exists:', existingWorkspace.slug)
    await prisma.$disconnect()
    return
  }

  // Create workspace
  const workspace = await prisma.workspace.create({
    data: {
      id: crypto.randomUUID(),
      name: 'Test Workspace',
      slug: 'test-workspace'
    }
  })

  console.log('Created workspace:', workspace.slug)

  // Add user as admin member
  const membership = await prisma.workspaceMembership.create({
    data: {
      userId: userId,
      workspaceId: workspace.id,
      role: 'ADMIN'
    }
  })

  console.log('Added admin membership with role:', membership.role)

  await prisma.$disconnect()
}

main().catch(console.error)
