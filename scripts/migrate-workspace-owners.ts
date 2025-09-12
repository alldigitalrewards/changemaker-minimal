#!/usr/bin/env tsx

/**
 * Migration script to assign owners to existing workspaces
 * 
 * This script:
 * 1. Finds all workspaces without an owner
 * 2. Assigns the first admin user as the owner
 * 3. If no admin exists, assigns the first member as owner
 * 4. Reports any workspaces that couldn't be assigned an owner
 */

import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateWorkspaceOwners() {
  console.log('Starting workspace owner migration...\n')
  
  try {
    // Find all workspaces without an owner
    const workspacesWithoutOwner = await prisma.workspace.findMany({
      where: {
        ownerId: null
      },
      include: {
        users: {
          orderBy: [
            { role: 'asc' }, // ADMIN comes before PARTICIPANT alphabetically
            { createdAt: 'asc' } // Then by creation date
          ]
        }
      }
    })

    console.log(`Found ${workspacesWithoutOwner.length} workspaces without owners\n`)

    let successCount = 0
    let failCount = 0
    const failedWorkspaces: string[] = []

    for (const workspace of workspacesWithoutOwner) {
      console.log(`Processing workspace: ${workspace.name} (${workspace.slug})`)
      
      // Find the first admin, or fallback to first member
      const firstAdmin = workspace.users.find(user => user.role === Role.ADMIN)
      const potentialOwner = firstAdmin || workspace.users[0]
      
      if (potentialOwner) {
        await prisma.workspace.update({
          where: { id: workspace.id },
          data: { ownerId: potentialOwner.id }
        })
        
        const ownerType = firstAdmin ? 'admin' : 'member'
        console.log(`  ✓ Assigned ${ownerType} as owner: ${potentialOwner.email}`)
        successCount++
      } else {
        console.log(`  ✗ No users found in workspace`)
        failedWorkspaces.push(`${workspace.name} (${workspace.slug})`)
        failCount++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('Migration Complete')
    console.log('='.repeat(50))
    console.log(`✓ Successfully migrated: ${successCount} workspaces`)
    
    if (failCount > 0) {
      console.log(`✗ Failed to migrate: ${failCount} workspaces`)
      console.log('\nFailed workspaces:')
      failedWorkspaces.forEach(ws => console.log(`  - ${ws}`))
    }
    
    // Verify all workspaces now have owners
    const remainingWithoutOwner = await prisma.workspace.count({
      where: { ownerId: null }
    })
    
    if (remainingWithoutOwner === 0) {
      console.log('\n✅ All workspaces now have owners!')
    } else {
      console.log(`\n⚠️  ${remainingWithoutOwner} workspaces still without owners`)
    }

  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
migrateWorkspaceOwners()
  .then(() => {
    console.log('\nMigration script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Migration script failed:', error)
    process.exit(1)
  })