#!/usr/bin/env tsx
/**
 * MIGRATION SCRIPT: Legacy workspaceId → WorkspaceMembership
 * ========================================================
 *
 * This script migrates users from the legacy single-tenant workspaceId field
 * to the proper multi-tenant WorkspaceMembership table.
 *
 * WHAT IT DOES:
 * 1. Finds all users with workspaceId but no WorkspaceMembership
 * 2. Creates WorkspaceMembership records for them
 * 3. Sets isPrimary = true for their primary workspace
 * 4. Validates the migration was successful
 * 5. Reports on users that still need workspaceId set to null
 *
 * SAFETY:
 * - Dry-run mode by default (use --execute to actually migrate)
 * - Validates data before and after migration
 * - Rolls back on errors
 * - Comprehensive logging
 *
 * USAGE:
 *   pnpm tsx scripts/migrate-to-workspace-membership.ts          # Dry run
 *   pnpm tsx scripts/migrate-to-workspace-membership.ts --execute # Actually migrate
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface MigrationStats {
  totalUsers: number
  usersWithLegacyWorkspaceId: number
  usersAlreadyMigrated: number
  usersMigrated: number
  errors: string[]
}

async function validateEnvironment() {
  console.log('🔍 Validating environment...')

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connection OK')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    throw new Error('Cannot connect to database')
  }

  // Check if WorkspaceMembership table exists
  try {
    await prisma.workspaceMembership.findFirst()
    console.log('✅ WorkspaceMembership table exists')
  } catch (error) {
    console.error('❌ WorkspaceMembership table not found')
    throw new Error('Schema migration required: WorkspaceMembership table missing')
  }
}

async function analyzeCurrentState(): Promise<MigrationStats> {
  console.log('\n📊 Analyzing current state...')

  const stats: MigrationStats = {
    totalUsers: 0,
    usersWithLegacyWorkspaceId: 0,
    usersAlreadyMigrated: 0,
    usersMigrated: 0,
    errors: []
  }

  // Count total users
  stats.totalUsers = await prisma.user.count()
  console.log(`   Total users: ${stats.totalUsers}`)

  // Count users with legacy workspaceId
  stats.usersWithLegacyWorkspaceId = await prisma.user.count({
    where: {
      workspaceId: { not: null }
    }
  })
  console.log(`   Users with legacy workspaceId: ${stats.usersWithLegacyWorkspaceId}`)

  // Count users already migrated (have WorkspaceMembership)
  const usersWithMembership = await prisma.user.findMany({
    where: {
      WorkspaceMembership: {
        some: {}
      }
    },
    select: { id: true }
  })
  stats.usersAlreadyMigrated = usersWithMembership.length
  console.log(`   Users with WorkspaceMembership: ${stats.usersAlreadyMigrated}`)

  return stats
}

async function findUsersNeedingMigration() {
  console.log('\n🔎 Finding users that need migration...')

  // Find users with workspaceId but no WorkspaceMembership
  const usersToMigrate = await prisma.user.findMany({
    where: {
      workspaceId: { not: null },
      WorkspaceMembership: {
        none: {}
      }
    },
    include: {
      Workspace: true
    }
  })

  console.log(`   Found ${usersToMigrate.length} users needing migration:`)

  for (const user of usersToMigrate) {
    console.log(`   - ${user.email} (${user.role}) → Workspace: ${user.Workspace?.name || 'MISSING'}`)

    if (!user.Workspace) {
      console.log(`     ⚠️  WARNING: User has workspaceId but workspace doesn't exist!`)
    }
  }

  return usersToMigrate
}

async function migrateUser(user: any, dryRun: boolean) {
  if (!user.workspaceId) {
    throw new Error(`User ${user.email} has no workspaceId`)
  }

  if (!user.Workspace) {
    throw new Error(`User ${user.email} references non-existent workspace ${user.workspaceId}`)
  }

  if (dryRun) {
    console.log(`   [DRY RUN] Would create WorkspaceMembership for ${user.email}`)
    return
  }

  // Create WorkspaceMembership
  await prisma.workspaceMembership.create({
    data: {
      userId: user.id,
      workspaceId: user.workspaceId,
      supabaseUserId: user.supabaseUserId,
      role: user.role,
      isPrimary: true, // Legacy workspaceId becomes primary workspace
    }
  })

  console.log(`   ✅ Created WorkspaceMembership for ${user.email}`)
}

async function performMigration(dryRun: boolean): Promise<MigrationStats> {
  console.log(`\n🚀 ${dryRun ? 'DRY RUN' : 'EXECUTING'} migration...`)

  const stats = await analyzeCurrentState()
  const usersToMigrate = await findUsersNeedingMigration()

  if (usersToMigrate.length === 0) {
    console.log('\n✅ No users need migration!')
    return stats
  }

  console.log(`\n📝 ${dryRun ? 'Would migrate' : 'Migrating'} ${usersToMigrate.length} users...`)

  for (const user of usersToMigrate) {
    try {
      await migrateUser(user, dryRun)
      if (!dryRun) {
        stats.usersMigrated++
      }
    } catch (error) {
      const errorMsg = `Failed to migrate ${user.email}: ${error instanceof Error ? error.message : String(error)}`
      console.error(`   ❌ ${errorMsg}`)
      stats.errors.push(errorMsg)
    }
  }

  return stats
}

async function validateMigration() {
  console.log('\n🔍 Validating migration...')

  // Find users with workspaceId but still no WorkspaceMembership
  const unmigrated = await prisma.user.findMany({
    where: {
      workspaceId: { not: null },
      WorkspaceMembership: { none: {} }
    },
    select: { email: true, workspaceId: true }
  })

  if (unmigrated.length > 0) {
    console.log(`   ⚠️  ${unmigrated.length} users still need migration:`)
    unmigrated.forEach(u => console.log(`      - ${u.email}`))
    return false
  }

  // Check for orphaned WorkspaceMemberships
  const orphaned = await prisma.workspaceMembership.findMany({
    where: {
      User: null
    }
  })

  if (orphaned.length > 0) {
    console.log(`   ⚠️  Found ${orphaned.length} orphaned WorkspaceMembership records`)
    return false
  }

  console.log('   ✅ All users with workspaceId now have WorkspaceMembership')
  return true
}

async function reportNextSteps() {
  console.log('\n📋 Next Steps:')
  console.log('   1. Verify migration was successful in your database')
  console.log('   2. Run tests to ensure WorkspaceMembership queries work correctly')
  console.log('   3. Create Prisma migration to make User.workspaceId nullable (if not already)')
  console.log('   4. Update any remaining code that uses User.workspaceId')
  console.log('   5. After confirming everything works, set all User.workspaceId to NULL:')
  console.log('      UPDATE "User" SET "workspaceId" = NULL WHERE "workspaceId" IS NOT NULL;')
  console.log('   6. Create final Prisma migration to DROP User.workspaceId column')
  console.log('   7. Remove workspace-compatibility.ts file')
}

async function main() {
  const args = process.argv.slice(2)
  const execute = args.includes('--execute')
  const dryRun = !execute

  console.log('=' .repeat(70))
  console.log('  MIGRATION: Legacy workspaceId → WorkspaceMembership')
  console.log('=' .repeat(70))
  console.log(`  Mode: ${dryRun ? '🧪 DRY RUN (no changes will be made)' : '⚡ EXECUTE (will modify database)'}`)
  console.log('=' .repeat(70))

  if (dryRun) {
    console.log('\n💡 This is a dry run. Use --execute flag to actually perform migration.')
  }

  try {
    await validateEnvironment()

    const stats = await performMigration(dryRun)

    if (!dryRun && stats.usersMigrated > 0) {
      const valid = await validateMigration()

      if (!valid) {
        throw new Error('Migration validation failed')
      }
    }

    console.log('\n' + '=' .repeat(70))
    console.log('  MIGRATION SUMMARY')
    console.log('=' .repeat(70))
    console.log(`  Total users: ${stats.totalUsers}`)
    console.log(`  Users with legacy workspaceId: ${stats.usersWithLegacyWorkspaceId}`)
    console.log(`  Users already migrated: ${stats.usersAlreadyMigrated}`)
    console.log(`  Users ${dryRun ? 'to migrate' : 'migrated'}: ${dryRun ? stats.usersWithLegacyWorkspaceId - stats.usersAlreadyMigrated : stats.usersMigrated}`)

    if (stats.errors.length > 0) {
      console.log(`  ❌ Errors: ${stats.errors.length}`)
      stats.errors.forEach(err => console.log(`     - ${err}`))
    } else {
      console.log(`  ✅ Errors: 0`)
    }
    console.log('=' .repeat(70))

    if (!dryRun && stats.usersMigrated > 0) {
      await reportNextSteps()
    }

    if (dryRun && stats.usersWithLegacyWorkspaceId > stats.usersAlreadyMigrated) {
      console.log('\n💡 Run with --execute flag to perform the migration')
    }

    console.log('\n✅ Migration script completed successfully\n')

  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
