#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateEnrollmentStatus() {
  console.log('🔄 Migrating enrollment status from old schema to new schema...')
  
  try {
    // Get all enrollments with old status values
    const enrollments = await prisma.enrollment.findMany({
      select: {
        id: true,
        status: true,
        user: {
          select: {
            email: true
          }
        },
        challenge: {
          select: {
            title: true
          }
        }
      }
    })

    console.log(`📊 Found ${enrollments.length} enrollment records`)

    // Update ACTIVE status to ENROLLED
    const activeEnrollments = await prisma.$executeRaw`
      UPDATE "Enrollment" 
      SET "status" = 'ENROLLED'::text::"EnrollmentStatus"
      WHERE "status" = 'ACTIVE'
    `

    // Update PENDING status to INVITED  
    const pendingEnrollments = await prisma.$executeRaw`
      UPDATE "Enrollment" 
      SET "status" = 'INVITED'::text::"EnrollmentStatus"
      WHERE "status" = 'PENDING'
    `

    // Update COMPLETED status to ENROLLED (assuming completed means they participated)
    const completedEnrollments = await prisma.$executeRaw`
      UPDATE "Enrollment" 
      SET "status" = 'ENROLLED'::text::"EnrollmentStatus"
      WHERE "status" = 'COMPLETED'
    `

    console.log(`✅ Updated enrollment statuses:`)
    console.log(`   - ACTIVE → ENROLLED: ${activeEnrollments} records`)
    console.log(`   - PENDING → INVITED: ${pendingEnrollments} records`) 
    console.log(`   - COMPLETED → ENROLLED: ${completedEnrollments} records`)

    // Verify the migration
    const updatedEnrollments = await prisma.enrollment.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })

    console.log('\n📈 Current enrollment status distribution:')
    updatedEnrollments.forEach(group => {
      console.log(`   - ${group.status}: ${group._count.status} records`)
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  migrateEnrollmentStatus()
    .then(() => {
      console.log('🎉 Migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error)
      process.exit(1)
    })
}

export { migrateEnrollmentStatus }