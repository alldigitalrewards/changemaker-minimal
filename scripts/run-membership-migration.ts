#!/usr/bin/env tsx

/**
 * Complete WorkspaceMembership Migration Runner
 * 
 * This script runs the full migration process:
 * 1. Applies the SQL schema migration
 * 2. Runs the data migration to backfill memberships
 * 3. Tests the implementation
 * 4. Verifies data integrity
 * 
 * Run: npx tsx scripts/run-membership-migration.ts
 */

import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function runCommand(command: string, description: string): Promise<void> {
  console.log(`🔄 ${description}...`)
  try {
    execSync(command, { stdio: 'inherit' })
    console.log(`✅ ${description} completed`)
  } catch (error) {
    console.error(`❌ ${description} failed:`, error)
    throw error
  }
}

async function main() {
  console.log('🚀 Starting WorkspaceMembership migration process...')

  try {
    // Step 1: Apply SQL schema migration via Prisma
    console.log('\n📖 Step 1: Applying database schema changes...')
    
    // First push the schema to create the tables
    await runCommand('pnpm prisma db push', 'Pushing Prisma schema to database')
    
    // Generate the updated Prisma client
    await runCommand('pnpm prisma generate', 'Generating Prisma client')
    
    console.log('✅ Database schema updated successfully')

    // Step 2: Run data migration to backfill memberships
    console.log('\n📊 Step 2: Running data migration to backfill memberships...')
    
    // Check if there are users to migrate
    const usersToMigrate = await prisma.user.count({
      where: {
        workspaceId: { not: null }
      }
    })
    
    if (usersToMigrate > 0) {
      console.log(`Found ${usersToMigrate} users with workspace relationships to migrate`)
      await runCommand('npx tsx scripts/backfill-memberships.ts', 'Running data migration script')
    } else {
      console.log('No users found with workspace relationships to migrate')
    }

    // Step 3: Test the implementation
    console.log('\n🧪 Step 3: Testing implementation...')
    await runCommand('npx tsx scripts/test-membership.ts', 'Running implementation tests')

    // Step 4: Final verification
    console.log('\n🔍 Step 4: Final verification...')
    
    const stats = await prisma.workspaceMembership.aggregate({
      _count: true
    })
    
    const primaryCount = await prisma.workspaceMembership.count({
      where: { isPrimary: true }
    })
    
    console.log(`📊 Migration Summary:`)
    console.log(`   - Total memberships created: ${stats._count || 0}`)
    console.log(`   - Primary memberships: ${primaryCount}`)
    
    // Check for data integrity issues
    const orphanedUsers = await prisma.user.count({
      where: {
        workspaceId: { not: null },
        memberships: { none: {} }
      }
    })
    
    if (orphanedUsers > 0) {
      console.log(`⚠️  Warning: ${orphanedUsers} users still have workspaceId but no membership`)
      console.log('   This might indicate a migration issue that needs manual review')
    } else {
      console.log('✅ All users with workspaceId have corresponding memberships')
    }

    console.log('\n🎉 WorkspaceMembership migration completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Test your application to ensure backward compatibility')
    console.log('   2. Update any custom queries to use the new membership system')
    console.log('   3. Consider removing User.workspaceId in a future migration once fully migrated')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.error('\n🛠️  Troubleshooting:')
    console.error('   1. Check database connection and credentials')
    console.error('   2. Ensure Prisma schema is valid')
    console.error('   3. Review error logs above for specific issues')
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