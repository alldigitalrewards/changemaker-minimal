#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verify() {
  console.log('🔍 Verifying WorkspaceMembership Migration...\n')
  
  // Check migration results
  const users = await prisma.user.count({ where: { workspaceId: { not: null } } })
  const memberships = await prisma.workspaceMembership.count()
  const primary = await prisma.workspaceMembership.count({ where: { isPrimary: true } })
  const usersWithPrimary = await prisma.user.count({ where: { primaryWorkspaceId: { not: null } } })
  
  console.log('📊 Migration Statistics:')
  console.log(`  ✅ Users with workspaceId: ${users}`)
  console.log(`  ✅ WorkspaceMembership records: ${memberships}`)
  console.log(`  ✅ Primary memberships: ${primary}`)
  console.log(`  ✅ Users with primaryWorkspaceId: ${usersWithPrimary}`)
  
  // Check consistency
  const consistent = users === memberships && memberships === primary && primary === usersWithPrimary
  if (consistent) {
    console.log('\n  ✅ Data consistency check: PASSED')
  } else {
    console.log('\n  ⚠️  Data consistency check: NEEDS REVIEW')
  }
  
  // Sample data
  const samples = await prisma.workspaceMembership.findMany({
    take: 3,
    include: {
      user: { select: { email: true, role: true, workspaceId: true, primaryWorkspaceId: true } },
      workspace: { select: { name: true, slug: true } }
    },
    orderBy: { joinedAt: 'desc' }
  })
  
  if (samples.length > 0) {
    console.log('\n📝 Sample memberships:')
    samples.forEach((sample, i) => {
      console.log(`\n  ${i + 1}. ${sample.user.email}`)
      console.log(`     Workspace: ${sample.workspace.name} (${sample.workspace.slug})`)
      console.log(`     Role: ${sample.role}`)
      console.log(`     Primary: ${sample.isPrimary}`)
      console.log(`     Backward Compatible: ${sample.user.workspaceId === sample.workspaceId ? 'YES' : 'NO'}`)
    })
  }
  
  // Check backward compatibility
  const usersWithMismatch = await prisma.user.findMany({
    where: {
      AND: [
        { workspaceId: { not: null } },
        { primaryWorkspaceId: { not: null } },
        { NOT: { workspaceId: { equals: prisma.user.fields.primaryWorkspaceId } } }
      ]
    }
  })
  
  console.log(`\n🔄 Backward Compatibility:`)
  console.log(`  ✅ Users with matching workspaceId and primaryWorkspaceId: ${users - usersWithMismatch.length}`)
  console.log(`  ⚠️  Users with mismatched IDs: ${usersWithMismatch.length}`)
  
  await prisma.$disconnect()
  
  console.log('\n✅ Verification complete!')
}

verify().catch(err => {
  console.error('❌ Verification failed:', err)
  process.exit(1)
})