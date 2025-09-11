#!/usr/bin/env tsx

/**
 * Test WorkspaceMembership Implementation
 * 
 * This script tests the WorkspaceMembership functionality including:
 * - Database connectivity
 * - Access helper functions
 * - Backward compatibility
 * - Data integrity
 * 
 * Run: npx tsx scripts/test-membership.ts
 */

import { PrismaClient } from '@prisma/client'
import {
  getMembership,
  listMemberships,
  isWorkspaceAdmin,
  hasWorkspaceAccess,
  getPrimaryMembership,
  createMembership,
  getWorkspaceMembershipCount
} from '@/lib/db/workspace-membership'
import {
  getUserWorkspaceRole,
  checkWorkspaceAdmin,
  getUserWorkspaces,
  getUserPrimaryWorkspace
} from '@/lib/db/workspace-compatibility'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Testing WorkspaceMembership implementation...')

  try {
    // Test 1: Database connectivity
    console.log('\n1️⃣ Testing database connectivity...')
    const userCount = await prisma.user.count()
    const workspaceCount = await prisma.workspace.count()
    const membershipCount = await prisma.workspaceMembership.count()

    console.log(`   - Users: ${userCount}`)
    console.log(`   - Workspaces: ${workspaceCount}`)
    console.log(`   - Memberships: ${membershipCount}`)

    if (userCount === 0 || workspaceCount === 0) {
      console.log('⚠️  No test data found. Create some users and workspaces first.')
      return
    }

    // Get sample data for testing
    const sampleUser = await prisma.user.findFirst()
    const sampleWorkspace = await prisma.workspace.findFirst()

    if (!sampleUser || !sampleWorkspace) {
      console.log('❌ Unable to find sample data')
      return
    }

    console.log(`   - Sample user: ${sampleUser.email}`)
    console.log(`   - Sample workspace: ${sampleWorkspace.name}`)

    // Test 2: Basic membership functions
    console.log('\n2️⃣ Testing basic membership functions...')
    
    const membership = await getMembership(sampleUser.id, sampleWorkspace.id)
    console.log(`   - getMembership: ${membership ? 'found' : 'not found'}`)
    
    const userMemberships = await listMemberships(sampleUser.id)
    console.log(`   - listMemberships: ${userMemberships.length} memberships found`)
    
    const isAdmin = await isWorkspaceAdmin(sampleUser.id, sampleWorkspace.id)
    console.log(`   - isWorkspaceAdmin: ${isAdmin}`)
    
    const hasAccess = await hasWorkspaceAccess(sampleUser.id, sampleWorkspace.id)
    console.log(`   - hasWorkspaceAccess: ${hasAccess}`)

    const primaryMembership = await getPrimaryMembership(sampleUser.id)
    console.log(`   - getPrimaryMembership: ${primaryMembership ? 'found' : 'not found'}`)

    // Test 3: Workspace membership count
    console.log('\n3️⃣ Testing workspace analytics...')
    const membershipStats = await getWorkspaceMembershipCount(sampleWorkspace.id)
    console.log(`   - Total members: ${membershipStats.total}`)
    console.log(`   - Admins: ${membershipStats.admins}`)
    console.log(`   - Participants: ${membershipStats.participants}`)

    // Test 4: Backward compatibility
    console.log('\n4️⃣ Testing backward compatibility...')
    
    if (sampleUser.supabaseUserId) {
      const role = await getUserWorkspaceRole(sampleUser.supabaseUserId, sampleWorkspace.slug)
      console.log(`   - getUserWorkspaceRole: ${role || 'none'}`)
      
      const adminCheck = await checkWorkspaceAdmin(sampleUser.supabaseUserId, sampleWorkspace.slug)
      console.log(`   - checkWorkspaceAdmin: ${adminCheck}`)
      
      const userWorkspaces = await getUserWorkspaces(sampleUser.supabaseUserId)
      console.log(`   - getUserWorkspaces: ${userWorkspaces.length} workspaces found`)
      
      const primaryWorkspace = await getUserPrimaryWorkspace(sampleUser.supabaseUserId)
      console.log(`   - getUserPrimaryWorkspace: ${primaryWorkspace?.name || 'none'}`)
    } else {
      console.log('   - Skipping compatibility tests (no supabaseUserId)')
    }

    // Test 5: Data integrity check
    console.log('\n5️⃣ Testing data integrity...')
    
    // Check for users with workspaceId but no membership
    const usersWithoutMembership = await prisma.user.findMany({
      where: {
        workspaceId: { not: null },
        memberships: { none: {} }
      }
    })
    
    console.log(`   - Users with workspaceId but no membership: ${usersWithoutMembership.length}`)
    
    if (usersWithoutMembership.length > 0) {
      console.log('   ⚠️  Some users need membership migration!')
    }

    // Check for orphaned memberships
    const orphanedMemberships = await prisma.workspaceMembership.findMany({
      where: {
        OR: [
          { user: null },
          { workspace: null }
        ]
      }
    })
    
    console.log(`   - Orphaned memberships: ${orphanedMemberships.length}`)

    console.log('\n✅ WorkspaceMembership implementation tests completed!')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
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