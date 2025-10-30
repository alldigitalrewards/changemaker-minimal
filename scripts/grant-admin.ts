#!/usr/bin/env tsx
/**
 * Script to grant ADMIN role to a user in a workspace
 * Usage: pnpm tsx scripts/grant-admin.ts <email> <workspaceSlug>
 */

import { prisma } from '../lib/prisma'

async function grantAdminRole(email: string, workspaceSlug: string) {
  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true }
    })

    if (!user) {
      console.error(`❌ User with email "${email}" not found in database`)
      console.log('\nExisting users:')
      const users = await prisma.user.findMany({
        select: { email: true }
      })
      users.forEach(u => console.log(`  - ${u.email}`))
      return
    }

    // Find the workspace
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true, name: true, slug: true }
    })

    if (!workspace) {
      console.error(`❌ Workspace with slug "${workspaceSlug}" not found in database`)
      console.log('\nExisting workspaces:')
      const workspaces = await prisma.workspace.findMany({
        select: { slug: true, name: true }
      })
      workspaces.forEach(w => console.log(`  - ${w.slug} (${w.name})`))
      return
    }

    // Update or create workspace membership with ADMIN role
    const membership = await prisma.workspaceMembership.upsert({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: workspace.id
        }
      },
      update: {
        role: 'ADMIN'
      },
      create: {
        userId: user.id,
        workspaceId: workspace.id,
        role: 'ADMIN',
        isPrimary: false
      },
      select: {
        role: true,
        isPrimary: true,
        Workspace: {
          select: {
            name: true,
            slug: true
          }
        }
      }
    })

    console.log('✅ Successfully granted ADMIN role to user:')
    console.log({
      email: user.email,
      workspace: membership.Workspace.name,
      slug: membership.Workspace.slug,
      role: membership.role,
      isPrimary: membership.isPrimary
    })
  } catch (error) {
    console.error('❌ Failed to update user role:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get email and workspace slug from command line arguments
const email = process.argv[2]
const workspaceSlug = process.argv[3]

if (!email || !workspaceSlug) {
  console.error('❌ Please provide both email address and workspace slug')
  console.log('Usage: pnpm tsx scripts/grant-admin.ts <email> <workspaceSlug>')
  process.exit(1)
}

grantAdminRole(email, workspaceSlug).catch(console.error)