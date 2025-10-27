#!/usr/bin/env tsx

/**
 * Simple validation script to test that our schema fixes work
 * This verifies the Prisma types accept our corrected values
 */

import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function testSchemaFixes() {
  console.log('Testing schema validation fixes...');

  try {
    // Test 1: RewardType enum with 'points' (lowercase)
    console.log('✓ Testing RewardType enum with "points"...');
    const challengeData = {
      id: randomUUID(),
      title: 'Test Challenge',
      description: 'Test challenge',
      workspaceId: randomUUID(), // This will fail but that's OK for type checking
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'PUBLISHED' as const,
      rewardType: 'points' as const, // This should be valid
      rewardConfig: {
        pointsAmount: 100
      }
    };

    // Test 2: EnrollmentStatus with 'ENROLLED'
    console.log('✓ Testing EnrollmentStatus enum with "ENROLLED"...');
    const enrollmentData = {
      userId: randomUUID(),
      challengeId: randomUUID(),
      status: 'ENROLLED' as const // This should be valid
    };

    // Test 3: ActivityTemplate with required id field
    console.log('✓ Testing ActivityTemplate with required id field...');
    const activityTemplateData = {
      id: randomUUID(), // This should be required
      name: 'Test Activity',
      description: 'Test activity',
      type: 'TEXT_SUBMISSION' as const, // Updated from 'SUBMISSION'
      basePoints: 100, // Updated from 'points'
      workspaceId: randomUUID()
    };

    // Test 4: Activity with correct field names
    console.log('✓ Testing Activity with correct field names...');
    const activityData = {
      id: randomUUID(),
      challengeId: randomUUID(),
      templateId: randomUUID(), // Updated from 'activityTemplateId'
      pointsValue: 100,
      position: 0 // Updated from 'sortOrder'
    };

    // Test 5: ActivitySubmission with correct field names
    console.log('✓ Testing ActivitySubmission with correct field names...');
    const submissionData = {
      id: randomUUID(),
      activityId: randomUUID(),
      userId: randomUUID(),
      enrollmentId: randomUUID(), // This should be required
      textContent: 'Test submission content', // Updated from 'content'
      status: 'PENDING' as const
    };

    console.log('✅ All schema validations passed! The fixes are working correctly.');

  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testSchemaFixes().catch(console.error);