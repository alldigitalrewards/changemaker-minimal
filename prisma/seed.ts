/**
 * Database Seed Script
 * Populates the database with default workspaces, users, and mock data
 * Updated to support WorkspaceMembership for multi-workspace testing
 */

import { PrismaClient, EnrollmentStatus, ActivityEventType } from '@prisma/client'
import { type Role, ROLE_ADMIN, ROLE_PARTICIPANT } from '../lib/types'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

// Initialize Supabase Admin client for user creation
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // You'll need to add this to .env.local
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const DEFAULT_PASSWORD = 'Changemaker2025!'

// Workspace data
const workspaces = [
  { 
    slug: 'acme', 
    name: 'ACME Corporation'
  },
  { 
    slug: 'alldigitalrewards', 
    name: 'AllDigitalRewards'
  },
  { 
    slug: 'sharecare', 
    name: 'Sharecare'
  }
]

// Admin users with multi-workspace configuration
const adminUsers = [
  { 
    email: 'krobinson@alldigitalrewards.com', 
    name: 'Kim Robinson',
    workspaceMemberships: [
      { workspace: 'alldigitalrewards', isPrimary: true },
      { workspace: 'acme', isPrimary: false },
      { workspace: 'sharecare', isPrimary: false }
    ]
  },
  { 
    email: 'kfelke@alldigitalrewards.com', 
    name: 'Kathryn Felke',
    workspaceMemberships: [
      { workspace: 'alldigitalrewards', isPrimary: true }
    ]
  },
  { 
    email: 'jfelke@alldigitalrewards.com', 
    name: 'Jack Felke',
    workspaceMemberships: [
      { workspace: 'alldigitalrewards', isPrimary: true },
      { workspace: 'acme', isPrimary: false }
    ]
  },
  { 
    email: 'jhoughtelin@alldigitalrewards.com', 
    name: 'Josh Houghtelin',
    workspaceMemberships: [
      { workspace: 'alldigitalrewards', isPrimary: true },
      { workspace: 'sharecare', isPrimary: false }
    ]
  }
]

// Participant users (domain-specific)
const participantUsers = [
  // ACME participants
  { email: 'john.doe@acme.com', name: 'John Doe', workspace: 'acme' },
  { email: 'jane.smith@acme.com', name: 'Jane Smith', workspace: 'acme' },
  { email: 'bob.wilson@acme.com', name: 'Bob Wilson', workspace: 'acme' },
  
  // AllDigitalRewards participants
  { email: 'sarah.jones@alldigitalrewards.com', name: 'Sarah Jones', workspace: 'alldigitalrewards' },
  { email: 'mike.chen@alldigitalrewards.com', name: 'Mike Chen', workspace: 'alldigitalrewards' },
  { email: 'lisa.taylor@alldigitalrewards.com', name: 'Lisa Taylor', workspace: 'alldigitalrewards' },
  
  // Sharecare participants
  { email: 'david.brown@sharecare.com', name: 'David Brown', workspace: 'sharecare' },
  { email: 'emma.davis@sharecare.com', name: 'Emma Davis', workspace: 'sharecare' },
  { email: 'alex.johnson@sharecare.com', name: 'Alex Johnson', workspace: 'sharecare' }
]

// Sample challenges
const challengeTemplates = [
  {
    title: 'Innovation Sprint 2025',
    description: 'Propose and develop innovative solutions to improve our customer experience using AI and automation.'
  },
  {
    title: 'Sustainability Challenge',
    description: 'Create initiatives to reduce our carbon footprint and promote environmental responsibility.'
  },
  {
    title: 'Wellness & Wellbeing',
    description: 'Design programs that enhance employee wellness and work-life balance.'
  },
  {
    title: 'Digital Transformation',
    description: 'Identify opportunities to digitize and streamline our business processes.'
  },
  {
    title: 'Community Outreach',
    description: 'Develop partnerships and programs that give back to our local communities.'
  }
]

async function getOrCreateSupabaseUser(email: string, password: string, metadata: any = {}) {
  try {
    // First, try to create the user
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    })

    if (createData?.user) {
      return createData.user
    }

    // If user already exists (error code 'user_already_exists'), get the existing user
    if (createError?.message?.includes('already been registered')) {
      const { data: userData } = await supabaseAdmin.auth.admin.listUsers()
      const existingUser = userData?.users?.find(u => u.email === email)
      
      if (existingUser) {
        // Update user metadata and password
        const { data: updateData } = await supabaseAdmin.auth.admin.updateUserById(
          existingUser.id,
          {
            password,
            user_metadata: metadata
          }
        )
        return updateData?.user || existingUser
      }
    }

    console.error(`Failed to create/get user ${email}:`, createError)
    return null
  } catch (error) {
    console.error(`Error with user ${email}:`, error)
    return null
  }
}

async function seed() {
  try {
    console.log('🌱 Starting seed...\n')

    // Clear existing data (optional - comment out if you want to preserve data)
    console.log('🗑️  Clearing existing data...')
    await prisma.activityEvent.deleteMany()
    await prisma.enrollment.deleteMany()
    await prisma.activitySubmission.deleteMany()
    await prisma.activity.deleteMany()
    await prisma.activityTemplate.deleteMany()
    await prisma.challenge.deleteMany()
    await prisma.inviteRedemption.deleteMany()
    await prisma.inviteCode.deleteMany()
    await prisma.pointsBalance.deleteMany()
    await prisma.workspaceMembership.deleteMany()
    await prisma.user.deleteMany()
    await prisma.workspace.deleteMany()

    // Create workspaces
    console.log('🏢 Creating workspaces...')
    const createdWorkspaces = []
    for (const workspace of workspaces) {
      const created = await prisma.workspace.create({
        data: {
          slug: workspace.slug,
          name: workspace.name
        }
      })
      createdWorkspaces.push(created)
      console.log(`✓ Created workspace: ${workspace.name}`)
    }

    // Create admin users with WorkspaceMemberships
    console.log('\n👤 Creating admin users with multi-workspace memberships...')
    for (const admin of adminUsers) {
      // Get or create Supabase auth user
      const supabaseUser = await getOrCreateSupabaseUser(
        admin.email,
        DEFAULT_PASSWORD,
        { role: 'ADMIN', name: admin.name }
      )

      if (supabaseUser) {
        // Create Prisma user
        const user = await prisma.user.upsert({
          where: { email: admin.email },
          update: {
            supabaseUserId: supabaseUser.id,
            role: ROLE_ADMIN,
            isPending: false, // Admins are not pending
            // Set legacy workspaceId to primary workspace for backward compatibility
            workspaceId: createdWorkspaces.find(w =>
              w.slug === admin.workspaceMemberships.find(m => m.isPrimary)?.workspace
            )?.id
          },
          create: {
            email: admin.email,
            supabaseUserId: supabaseUser.id,
            role: ROLE_ADMIN,
            isPending: false, // Admins are not pending
            // Set legacy workspaceId to primary workspace for backward compatibility
            workspaceId: createdWorkspaces.find(w =>
              w.slug === admin.workspaceMemberships.find(m => m.isPrimary)?.workspace
            )?.id
          }
        })
        
        // Create WorkspaceMemberships
        for (const membership of admin.workspaceMemberships) {
          const workspace = createdWorkspaces.find(w => w.slug === membership.workspace)
          if (workspace) {
            await prisma.workspaceMembership.upsert({
              where: {
                userId_workspaceId: {
                  userId: user.id,
                  workspaceId: workspace.id
                }
              },
              update: {
                role: ROLE_ADMIN,
                isPrimary: membership.isPrimary
              },
              create: {
                userId: user.id,
                workspaceId: workspace.id,
                role: ROLE_ADMIN,
                isPrimary: membership.isPrimary
              }
            })
            console.log(`  ✓ Added ${admin.email} to ${workspace.name}${membership.isPrimary ? ' (primary)' : ''}`)
          }
        }
        console.log(`✓ Created admin: ${admin.email} with ${admin.workspaceMemberships.length} workspace(s)`)
      } else {
        console.error(`❌ Failed to create/retrieve admin user: ${admin.email}`)
      }
    }

    // Create sample invite codes for each workspace (after we have admin users to be creators)
    console.log('\n📨 Creating sample invite codes...')
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    // Get the first admin user to be the creator of invite codes
    const firstAdmin = await prisma.user.findFirst({
      where: { role: ROLE_ADMIN }
    })

    if (firstAdmin) {
      for (const workspace of createdWorkspaces) {
        // Create a general invite code
        await prisma.inviteCode.create({
          data: {
            code: `${workspace.slug.toUpperCase()}-WELCOME-2025`,
            workspaceId: workspace.id,
            createdBy: firstAdmin.id,
            role: ROLE_PARTICIPANT,
            maxUses: 100,
            usedCount: 0,
            expiresAt: thirtyDaysFromNow
          }
        })
        console.log(`✓ Created general invite code for ${workspace.name}: ${workspace.slug.toUpperCase()}-WELCOME-2025`)

        // Create a targeted invite code for testing
        await prisma.inviteCode.create({
          data: {
            code: `${workspace.slug.toUpperCase()}-VIP-2025`,
            workspaceId: workspace.id,
            createdBy: firstAdmin.id,
            role: ROLE_PARTICIPANT,
            maxUses: 1,
            usedCount: 0,
            expiresAt: thirtyDaysFromNow,
            targetEmail: `vip@${workspace.slug}.com`
          }
        })
        console.log(`✓ Created VIP invite code for ${workspace.name}: ${workspace.slug.toUpperCase()}-VIP-2025 (for vip@${workspace.slug}.com)`)
      }
    }

    // Create participant users with single workspace membership
    console.log('\n👥 Creating participant users...')
    for (const participant of participantUsers) {
      // Get or create Supabase auth user
      const supabaseUser = await getOrCreateSupabaseUser(
        participant.email,
        DEFAULT_PASSWORD,
        { role: 'PARTICIPANT', name: participant.name }
      )

      if (supabaseUser) {
        // Create or update Prisma user linked to respective workspace
        const workspace = createdWorkspaces.find(w => w.slug === participant.workspace)
        
        // Use upsert to handle existing Prisma users
        const user = await prisma.user.upsert({
          where: { email: participant.email },
          update: {
            supabaseUserId: supabaseUser.id,
            role: ROLE_PARTICIPANT,
            isPending: false, // Seeded participants are not pending
            workspaceId: workspace?.id
          },
          create: {
            email: participant.email,
            supabaseUserId: supabaseUser.id,
            role: ROLE_PARTICIPANT,
            isPending: false, // Seeded participants are not pending
            workspaceId: workspace?.id
          }
        })
        
        // Create WorkspaceMembership for participants too
        if (workspace) {
          await prisma.workspaceMembership.upsert({
            where: {
              userId_workspaceId: {
                userId: user.id,
                workspaceId: workspace.id
              }
            },
            update: {
              role: ROLE_PARTICIPANT,
              isPrimary: true
            },
            create: {
              userId: user.id,
              workspaceId: workspace.id,
              role: ROLE_PARTICIPANT,
              isPrimary: true
            }
          })
        }
        console.log(`✓ Created/updated participant: ${participant.email}`)
      } else {
        console.error(`❌ Failed to create/retrieve participant user: ${participant.email}`)
      }
    }

    // Create challenges for each workspace
    console.log('\n🎯 Creating challenges...')
    const allChallenges = []
    for (const workspace of createdWorkspaces) {
      // Create 3-5 challenges per workspace
      const numChallenges = Math.floor(Math.random() * 3) + 3
      for (let i = 0; i < numChallenges; i++) {
        const template = challengeTemplates[i % challengeTemplates.length]
        
        // Generate realistic dates for demo data
        const now = new Date()
        const startDate = new Date(now.getTime() + (i * 7 + Math.floor(Math.random() * 14)) * 24 * 60 * 60 * 1000) // Start 0-2 weeks from now, staggered
        const endDate = new Date(startDate.getTime() + (30 + Math.floor(Math.random() * 30)) * 24 * 60 * 60 * 1000) // End 30-60 days after start
        const enrollmentDeadline = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000) // Enrollment deadline 1 week before start
        
        const challenge = await prisma.challenge.create({
          data: {
            title: `${template.title} - ${workspace.name}`,
            description: template.description,
            startDate,
            endDate,
            enrollmentDeadline,
            workspaceId: workspace.id
          }
        })
        allChallenges.push(challenge)
        console.log(`✓ Created challenge: ${challenge.title}`)

        // Seed timeline: challenge created event
        await prisma.activityEvent.create({
          data: {
            workspaceId: workspace.id,
            challengeId: challenge.id,
            type: ActivityEventType.CHALLENGE_CREATED
          }
        })
      }
    }

    // Create enrollments (participants in challenges)
    console.log('\n📝 Creating enrollments...')
    const participants = await prisma.user.findMany({
      where: { role: ROLE_PARTICIPANT }
    })

    for (const participant of participants) {
      // Enroll each participant in 1-3 challenges from their workspace
      const workspaceChallenges = allChallenges.filter(
        c => c.workspaceId === participant.workspaceId
      )
      
      const numEnrollments = Math.min(
        Math.floor(Math.random() * 3) + 1,
        workspaceChallenges.length
      )
      
      const selectedChallenges = workspaceChallenges
        .sort(() => Math.random() - 0.5)
        .slice(0, numEnrollments)

      for (const challenge of selectedChallenges) {
        const enrollment = await prisma.enrollment.create({
          data: {
            userId: participant.id,
            challengeId: challenge.id,
            status: [EnrollmentStatus.INVITED, EnrollmentStatus.ENROLLED, EnrollmentStatus.WITHDRAWN][Math.floor(Math.random() * 3)]
          }
        })
        console.log(`✓ Enrolled ${participant.email} in challenge`)

        if (enrollment.status === EnrollmentStatus.ENROLLED) {
          await prisma.activityEvent.create({
            data: {
              workspaceId: challenge.workspaceId,
              challengeId: challenge.id,
              enrollmentId: enrollment.id,
              userId: participant.id,
              type: ActivityEventType.ENROLLED
            }
          })
        }
      }
    }

    // Print summary
    console.log('\n✨ Seed completed successfully!\n')
    console.log('📊 Summary:')
    const finalWorkspaceCount = await prisma.workspace.count()
    const finalUserCount = await prisma.user.count()
    const finalChallengeCount = await prisma.challenge.count()
    const finalEnrollmentCount = await prisma.enrollment.count()
    const finalMembershipCount = await prisma.workspaceMembership.count()
    const finalInviteCount = await prisma.inviteCode.count()

    console.log(`  - Workspaces: ${finalWorkspaceCount}`)
    console.log(`  - Users: ${finalUserCount} (${adminUsers.length} admins, ${participantUsers.length} participants)`)
    console.log(`  - Workspace Memberships: ${finalMembershipCount}`)
    console.log(`  - Challenges: ${finalChallengeCount}`)
    console.log(`  - Enrollments: ${finalEnrollmentCount}`)
    console.log(`  - Invite Codes: ${finalInviteCount}`)
    
    console.log('\n🔑 Login Credentials:')
    console.log(`  Password for all users: ${DEFAULT_PASSWORD}`)
    console.log('\n  Multi-workspace admin accounts:')
    console.log(`    - krobinson@alldigitalrewards.com (3 workspaces)`)
    console.log(`    - jfelke@alldigitalrewards.com (2 workspaces)`)
    console.log(`    - jhoughtelin@alldigitalrewards.com (2 workspaces)`)
    console.log('\n  Single-workspace admin:')
    console.log(`    - kfelke@alldigitalrewards.com (AllDigitalRewards only)`)
    console.log('\n  Sample participant accounts:')
    console.log(`    - john.doe@acme.com (ACME)`)
    console.log(`    - sarah.jones@alldigitalrewards.com (AllDigitalRewards)`)
    console.log(`    - david.brown@sharecare.com (Sharecare)`)
    console.log('\n📨 Sample Invite Codes:')
    console.log(`    - ACME-WELCOME-2025 (general invite for ACME)`)
    console.log(`    - ALLDIGITALREWARDS-WELCOME-2025 (general invite for AllDigitalRewards)`)
    console.log(`    - SHARECARE-WELCOME-2025 (general invite for Sharecare)`)
    console.log(`    - *-VIP-2025 codes are email-targeted (e.g., vip@acme.com)`)

  } catch (error) {
    console.error('❌ Seed failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed
seed()
  .catch((error) => {
    console.error('Fatal error during seeding:', error)
    process.exit(1)
  })