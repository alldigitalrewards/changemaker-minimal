#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const submissions = await prisma.activitySubmission.findMany({
    where: { status: 'PENDING' },
    include: { Activity: true },
    take: 10
  })

  const withActivity = submissions.filter(s => s.Activity !== null)
  const orphaned = submissions.filter(s => s.Activity === null)

  console.log(`Total PENDING submissions: ${submissions.length}`)
  console.log(`With Activity: ${withActivity.length}`)
  console.log(`Missing Activity (orphaned): ${orphaned.length}`)

  if (orphaned.length > 0) {
    console.log('\nOrphaned submissions found:')
    orphaned.forEach(s => {
      console.log(`  - Submission ${s.id}, activityId: ${s.activityId}`)
    })
  }
}

main().catch(console.error).finally(() => prisma.$disconnect())
