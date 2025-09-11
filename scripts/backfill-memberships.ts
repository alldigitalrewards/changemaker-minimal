#!/usr/bin/env tsx

/**
 * Data Migration: Backfill WorkspaceMembership from User.workspaceId
 * 
 * This script migrates existing user-workspace relationships from the legacy
 * User.workspaceId field to the new WorkspaceMembership table while setting
 * isPrimary=true for existing relationships.
 * 
 * Run: npx tsx scripts/backfill-memberships.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔄 Starting WorkspaceMembership backfill migration...')

  try {
    // Get all users with workspaceId (existing relationships)
    const usersWithWorkspace = await prisma.user.findMany({
      where: {
        workspaceId: {
          not: null
        }
      },
      select: {
        id: true,
        workspaceId: true,
        role: true,
        createdAt: true
      }
    })

    console.log(`📊 Found ${usersWithWorkspace.length} users with existing workspace relationships`)

    if (usersWithWorkspace.length === 0) {
      console.log('✅ No users to migrate. Migration complete.')
      return
    }

    // Create WorkspaceMembership records for each user
    const membershipData = usersWithWorkspace.map(user => ({
      userId: user.id,
      workspaceId: user.workspaceId!,
      role: user.role,
      isPrimary: true, // Mark as primary since this was their only workspace
      joinedAt: user.createdAt, // Use user creation date as join date
      createdAt: new Date(),
      updatedAt: new Date()
    }))

    // Batch insert memberships
    await prisma.workspaceMembership.createMany({
      data: membershipData,
      skipDuplicates: true // Skip if membership already exists
    })

    console.log(`✅ Created ${membershipData.length} WorkspaceMembership records`)

    // Update User.primaryWorkspaceId for migrated users
    for (const user of usersWithWorkspace) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          primaryWorkspaceId: user.workspaceId
        }
      })
    }

    console.log(`✅ Updated ${usersWithWorkspace.length} users with primaryWorkspaceId`)

    // Verify migration results
    const membershipCount = await prisma.workspaceMembership.count()
    const primaryCount = await prisma.workspaceMembership.count({
      where: { isPrimary: true }
    })

    console.log(`📊 Migration Results:`)
    console.log(`   - Total memberships: ${membershipCount}`)
    console.log(`   - Primary memberships: ${primaryCount}`)
    console.log(`   - Users with primaryWorkspaceId: ${usersWithWorkspace.length}`)

    console.log('🎉 WorkspaceMembership backfill migration completed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  })