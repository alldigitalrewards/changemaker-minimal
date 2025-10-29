/**
 * Manual cleanup script for test data
 * Removes ALL test workspaces and related data from the database
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting test data cleanup...')

  // Find all test workspaces
  const testWorkspaces = await prisma.workspace.findMany({
    where: {
      slug: {
        startsWith: 'test-workspace-',
      },
    },
    select: { id: true, slug: true },
  })

  console.log(`Found ${testWorkspaces.length} test workspaces to clean up`)

  if (testWorkspaces.length === 0) {
    console.log('No test data to clean up')
    return
  }

  const workspaceIds = testWorkspaces.map((w) => w.id)

  // Delete in reverse order of foreign key dependencies

  // 1. Delete activity submissions
  const submissions = await prisma.activitySubmission.deleteMany({
    where: {
      Activity: {
        Challenge: {
          workspaceId: { in: workspaceIds },
        },
      },
    },
  })
  console.log(`Deleted ${submissions.count} activity submissions`)

  // 2. Delete challenge assignments
  const assignments = await prisma.challengeAssignment.deleteMany({
    where: {
      workspaceId: { in: workspaceIds },
    },
  })
  console.log(`Deleted ${assignments.count} challenge assignments`)

  // 3. Delete enrollments
  const enrollments = await prisma.enrollment.deleteMany({
    where: {
      Challenge: {
        workspaceId: { in: workspaceIds },
      },
    },
  })
  console.log(`Deleted ${enrollments.count} enrollments`)

  // 4. Delete activities
  const activities = await prisma.activity.deleteMany({
    where: {
      Challenge: {
        workspaceId: { in: workspaceIds },
      },
    },
  })
  console.log(`Deleted ${activities.count} activities`)

  // 5. Delete challenges
  const challenges = await prisma.challenge.deleteMany({
    where: {
      workspaceId: { in: workspaceIds },
    },
  })
  console.log(`Deleted ${challenges.count} challenges`)

  // 6. Delete users
  const users = await prisma.user.deleteMany({
    where: {
      workspaceId: { in: workspaceIds },
    },
  })
  console.log(`Deleted ${users.count} users`)

  // 7. Delete workspaces
  const workspaces = await prisma.workspace.deleteMany({
    where: {
      id: { in: workspaceIds },
    },
  })
  console.log(`Deleted ${workspaces.count} workspaces`)

  console.log('✓ Test data cleanup complete')
}

main()
  .catch((error) => {
    console.error('Error during cleanup:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
