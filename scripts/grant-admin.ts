#!/usr/bin/env tsx
/**
 * Script to grant ADMIN role to a user
 * Usage: pnpm tsx scripts/grant-admin.ts <email>
 */

import { prisma } from '../lib/prisma'

async function grantAdminRole(email: string) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        role: true,
        workspaceId: true
      }
    })
    
    console.log('✅ Successfully granted ADMIN role to user:')
    console.log({
      id: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      console.error(`❌ User with email "${email}" not found in database`)
      console.log('\nExisting users:')
      const users = await prisma.user.findMany({
        select: { email: true, role: true }
      })
      users.forEach(u => console.log(`  - ${u.email} (${u.role})`))
    } else {
      console.error('❌ Failed to update user role:', error)
    }
  } finally {
    await prisma.$disconnect()
  }
}

// Get email from command line argument
const email = process.argv[2]

if (!email) {
  console.error('❌ Please provide an email address')
  console.log('Usage: pnpm tsx scripts/grant-admin.ts <email>')
  process.exit(1)
}

grantAdminRole(email).catch(console.error)