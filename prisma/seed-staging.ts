/**
 * Staging Database Seed Script
 * Ensures minimum required data exists for staging environment
 * Safe to run multiple times - checks for existing data
 */

import {
  PrismaClient,
  EnrollmentStatus,
} from "@prisma/client";
import { ROLE_ADMIN, ROLE_PARTICIPANT, ROLE_MANAGER } from "../lib/types";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

// Initialize Supabase Admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);

const DEFAULT_PASSWORD = "Changemaker2025!";

// Essential workspaces for staging (matching production)
const stagingWorkspaces = [
  {
    slug: "acme",
    name: "ACME Corporation",
  },
  {
    slug: "alldigitalrewards",
    name: "AllDigitalRewards",
  },
  {
    slug: "sharecare",
    name: "Sharecare",
  },
];

// Admin users matching production seed
const stagingAdmins = [
  {
    email: "krobinson@alldigitalrewards.com",
    name: "Kim Robinson",
    workspace: "alldigitalrewards",
  },
  {
    email: "kfelke@alldigitalrewards.com",
    name: "Kathryn Felke",
    workspace: "alldigitalrewards",
  },
  {
    email: "jfelke@alldigitalrewards.com",
    name: "Jack Felke",
    workspace: "alldigitalrewards",
  },
  {
    email: "jhoughtelin@alldigitalrewards.com",
    name: "Josh Houghtelin",
    workspace: "alldigitalrewards",
  },
];

// Regular workspace admin users (non-platform admins)
const stagingWorkspaceAdmins = [
  {
    email: "admin.adr@test.com",
    name: "ADR Admin",
    workspace: "alldigitalrewards",
  },
  {
    email: "admin.acme@test.com",
    name: "ACME Admin",
    workspace: "acme",
  },
  {
    email: "admin.sharecare@test.com",
    name: "Sharecare Admin",
    workspace: "sharecare",
  },
];

// Manager users for testing
const stagingManagers = [
  {
    email: "manager1@test.com",
    name: "Sarah Manager",
    workspace: "alldigitalrewards",
  },
  {
    email: "manager2@test.com",
    name: "Mike Manager",
    workspace: "alldigitalrewards",
  },
  {
    email: "manager.acme@test.com",
    name: "ACME Manager",
    workspace: "acme",
  },
  {
    email: "manager.sharecare@test.com",
    name: "Sharecare Manager",
    workspace: "sharecare",
  },
];

// Participant users for testing
const stagingParticipants = [
  {
    email: "participant1@test.com",
    name: "Alice Participant",
    workspace: "alldigitalrewards",
  },
  {
    email: "participant2@test.com",
    name: "Bob Participant",
    workspace: "alldigitalrewards",
  },
  {
    email: "participant3@test.com",
    name: "Carol Participant",
    workspace: "alldigitalrewards",
  },
  {
    email: "participant.acme@test.com",
    name: "ACME Participant",
    workspace: "acme",
  },
  {
    email: "participant.sharecare@test.com",
    name: "Sharecare Participant",
    workspace: "sharecare",
  },
];

/**
 * Split a full name into firstName and lastName
 */
function splitFullName(fullName: string): { firstName: string; lastName: string | null } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return {
      firstName: parts[0],
      lastName: parts.slice(1).join(' ')
    };
  }
  return {
    firstName: fullName.trim(),
    lastName: null
  };
}

/**
 * Get or create a Supabase user for staging
 */
async function ensureSupabaseUser(email: string, name: string) {
  try {
    // Check if user exists
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users?.users?.find(u => u.email === email);

    if (existingUser) {
      console.log(`✓ Supabase user exists: ${email}`);
      return existingUser.id;
    }

    // Create new user with the default password
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: DEFAULT_PASSWORD,
      email_confirm: true,
      user_metadata: { name },
    });

    if (error) {
      console.error(`Failed to create Supabase user ${email}:`, error);
      return null;
    }

    console.log(`✓ Created Supabase user: ${email} (password: ${DEFAULT_PASSWORD})`);
    return data.user.id;
  } catch (error) {
    console.error(`Error ensuring Supabase user ${email}:`, error);
    return null;
  }
}

async function seedStaging() {
  try {
    console.log("🌱 Starting staging seed...\n");

    // 1. Ensure workspaces exist
    console.log("📁 Ensuring workspaces...");
    for (const workspace of stagingWorkspaces) {
      await prisma.workspace.upsert({
        where: { slug: workspace.slug },
        update: { name: workspace.name },
        create: {
          id: crypto.randomUUID(),
          ...workspace,
        },
      });
      console.log(`✓ Workspace ready: ${workspace.name}`);
    }

    // 2. Ensure admin users exist
    console.log("\n👤 Ensuring admin users...");
    for (const admin of stagingAdmins) {
      const workspace = await prisma.workspace.findUnique({
        where: { slug: admin.workspace },
      });

      if (!workspace) {
        console.error(`Workspace not found: ${admin.workspace}`);
        continue;
      }

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: admin.email },
      });

      if (!existingUser) {
        // Create Supabase user
        const supabaseUserId = await ensureSupabaseUser(admin.email, admin.name);

        if (supabaseUserId) {
          // Split name into firstName and lastName
          const { firstName, lastName } = splitFullName(admin.name);

          // Create database user
          await prisma.user.create({
            data: {
              email: admin.email,
              supabaseUserId,
              firstName,
              lastName,
              displayName: admin.name,
              WorkspaceMembership: {
                create: {
                  workspaceId: workspace.id,
                  role: 'ADMIN',
                  isPrimary: true,
                },
              },
            },
          });
          console.log(`✓ Created admin: ${admin.name} (${admin.email})`);
        }
      } else {
        console.log(`✓ Admin exists: ${admin.name} (${admin.email})`);

        // Ensure workspace membership exists
        const membership = await prisma.workspaceMembership.findFirst({
          where: {
            userId: existingUser.id,
            workspaceId: workspace.id,
          },
        });

        if (!membership) {
          await prisma.workspaceMembership.create({
            data: {
              userId: existingUser.id,
              workspaceId: workspace.id,
              isPrimary: false,
            },
          });
          console.log(`  → Added to workspace: ${workspace.name}`);
        }
      }
    }

    // 3. Ensure workspace admin users exist (regular admins, not platform superadmins)
    console.log("\n🔑 Ensuring workspace admin users...");
    for (const admin of stagingWorkspaceAdmins) {
      const workspace = await prisma.workspace.findUnique({
        where: { slug: admin.workspace },
      });

      if (!workspace) {
        console.error(`Workspace not found: ${admin.workspace}`);
        continue;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: admin.email },
      });

      if (!existingUser) {
        const supabaseUserId = await ensureSupabaseUser(admin.email, admin.name);

        if (supabaseUserId) {
          // Split name into firstName and lastName
          const { firstName, lastName } = splitFullName(admin.name);

          await prisma.user.create({
            data: {
              email: admin.email,
              supabaseUserId,
              firstName,
              lastName,
              displayName: admin.name,
              WorkspaceMembership: {
                create: {
                  workspaceId: workspace.id,
                  role: 'ADMIN',
                  isPrimary: true,
                },
              },
            },
          });
          console.log(`✓ Created workspace admin: ${admin.name} (${admin.email})`);
        }
      } else {
        console.log(`✓ Workspace admin exists: ${admin.name} (${admin.email})`);

        const membership = await prisma.workspaceMembership.findFirst({
          where: {
            userId: existingUser.id,
            workspaceId: workspace.id,
          },
        });

        if (!membership) {
          await prisma.workspaceMembership.create({
            data: {
              userId: existingUser.id,
              workspaceId: workspace.id,
              isPrimary: false,
            },
          });
          console.log(`  → Added to workspace: ${workspace.name}`);
        }
      }
    }

    // 4. Ensure manager users exist
    console.log("\n👔 Ensuring manager users...");
    for (const manager of stagingManagers) {
      const workspace = await prisma.workspace.findUnique({
        where: { slug: manager.workspace },
      });

      if (!workspace) {
        console.error(`Workspace not found: ${manager.workspace}`);
        continue;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: manager.email },
      });

      if (!existingUser) {
        const supabaseUserId = await ensureSupabaseUser(manager.email, manager.name);

        if (supabaseUserId) {
          // Split name into firstName and lastName
          const { firstName, lastName } = splitFullName(manager.name);

          await prisma.user.create({
            data: {
              email: manager.email,
              supabaseUserId,
              firstName,
              lastName,
              displayName: manager.name,
              WorkspaceMembership: {
                create: {
                  workspaceId: workspace.id,
                  role: 'ADMIN',
                  isPrimary: true,
                },
              },
            },
          });
          console.log(`✓ Created manager: ${manager.name} (${manager.email})`);
        }
      } else {
        console.log(`✓ Manager exists: ${manager.name} (${manager.email})`);

        const membership = await prisma.workspaceMembership.findFirst({
          where: {
            userId: existingUser.id,
            workspaceId: workspace.id,
          },
        });

        if (!membership) {
          await prisma.workspaceMembership.create({
            data: {
              userId: existingUser.id,
              workspaceId: workspace.id,
              isPrimary: false,
            },
          });
          console.log(`  → Added to workspace: ${workspace.name}`);
        }
      }
    }

    // 5. Ensure participant users exist
    console.log("\n👥 Ensuring participant users...");
    for (const participant of stagingParticipants) {
      const workspace = await prisma.workspace.findUnique({
        where: { slug: participant.workspace },
      });

      if (!workspace) {
        console.error(`Workspace not found: ${participant.workspace}`);
        continue;
      }

      const existingUser = await prisma.user.findUnique({
        where: { email: participant.email },
      });

      if (!existingUser) {
        const supabaseUserId = await ensureSupabaseUser(participant.email, participant.name);

        if (supabaseUserId) {
          // Split name into firstName and lastName
          const { firstName, lastName } = splitFullName(participant.name);

          await prisma.user.create({
            data: {
              email: participant.email,
              supabaseUserId,
              firstName,
              lastName,
              displayName: participant.name,
              WorkspaceMembership: {
                create: {
                  workspaceId: workspace.id,
                  role: 'PARTICIPANT',
                  isPrimary: true,
                },
              },
            },
          });
          console.log(`✓ Created participant: ${participant.name} (${participant.email})`);
        }
      } else {
        console.log(`✓ Participant exists: ${participant.name} (${participant.email})`);

        const membership = await prisma.workspaceMembership.findFirst({
          where: {
            userId: existingUser.id,
            workspaceId: workspace.id,
          },
        });

        if (!membership) {
          await prisma.workspaceMembership.create({
            data: {
              userId: existingUser.id,
              workspaceId: workspace.id,
              isPrimary: false,
            },
          });
          console.log(`  → Added to workspace: ${workspace.name}`);
        }
      }
    }

    // 6. Create comprehensive sample challenges with activities, managers, and enrollments
    console.log("\n🎯 Ensuring sample challenges...");

    // Create challenges for all workspaces
    for (const ws of stagingWorkspaces) {
      await createWorkspaceChallenges(ws.slug);
    }
  } catch (error) {
    console.error("Error during staging seed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Function to create challenges for a workspace
async function createWorkspaceChallenges(workspaceSlug: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
    include: {
      Challenge: true,
      WorkspaceMembership: {
        where: {
          role: { in: [ROLE_MANAGER, ROLE_PARTICIPANT] }
        },
        include: {
          User: true
        }
      }
    },
  });

  if (!workspace) {
    console.log(`⚠️  Workspace '${workspaceSlug}' not found, skipping challenges`);
    return;
  }

  // Check if our seed challenges already exist
  const existingChallenges = await prisma.challenge.findMany({
    where: {
      workspaceId: workspace.id,
      title: {
        in: [
          "Team Innovation Challenge",
          "Wellness Week Challenge",
          "Q1 Sales Competition",
          "Customer Service Excellence"
        ]
      }
    }
  });

  if (existingChallenges.length > 0) {
    console.log(`✓ ${workspace.name}: Seed challenges already exist (found ${existingChallenges.length}/4)`);
    return;
  }

  console.log(`\n📝 Creating challenges for ${workspace.name}...`);

  // Get managers and participants
  const managers = await prisma.user.findMany({
    where: {
      WorkspaceMembership: {
        some: {
          workspaceId: workspace.id,
        },
      },
    },
  });

  const participants = await prisma.user.findMany({
    where: {
      WorkspaceMembership: {
        some: {
          workspaceId: workspace.id,
        },
      },
    },
    take: 3, // Use first 3 participants
  });

  const adminUser = await prisma.user.findFirst({
    where: {
      WorkspaceMembership: {
        some: {
          workspaceId: workspace.id,
        },
      },
    },
  });

      // Challenge 1: Active challenge with manager, activities, and submissions
      const challenge1 = await prisma.challenge.create({
        data: {
          id: crypto.randomUUID(),
          title: "Team Innovation Challenge",
          description: "Submit your innovative ideas to improve our workplace",
          workspaceId: workspace.id,
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Started 7 days ago
          endDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000), // Ends in 23 days
          status: "PUBLISHED",
          enrollmentDeadline: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000), // Enrollment closes in 16 days
        },
      });
      console.log(`✓ Created challenge: ${challenge1.title}`);

      // Assign managers to challenge 1
      if (managers.length > 0 && adminUser) {
        await prisma.challengeAssignment.create({
          data: {
            id: crypto.randomUUID(),
            challengeId: challenge1.id,
            managerId: managers[0].id,
            assignedBy: adminUser.id,
            workspaceId: workspace.id,
          },
        });
        console.log(`  → Assigned manager: ${managers[0].email}`);
      }

      // Create activity templates for challenge 1
      const activityTemplate1 = await prisma.activityTemplate.create({
        data: {
          id: crypto.randomUUID(),
          name: "Idea Submission",
          description: "Submit your innovative idea",
          type: "TEXT_SUBMISSION",
          basePoints: 100,
          workspaceId: workspace.id,
          requiresApproval: true,
        },
      });

      const activity1 = await prisma.activity.create({
        data: {
          id: crypto.randomUUID(),
          challengeId: challenge1.id,
          templateId: activityTemplate1.id,
          pointsValue: 100,
          position: 1,
          isRequired: true,
        },
      });
      console.log(`  → Created activity: ${activityTemplate1.name}`);

      // Enroll participants and create submissions for challenge 1
      for (let i = 0; i < participants.length; i++) {
        const enrollment = await prisma.enrollment.create({
          data: {
            id: crypto.randomUUID(),
            userId: participants[i].id,
            challengeId: challenge1.id,
            status: EnrollmentStatus.ACTIVE,
            enrolledAt: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000),
          },
        });

        // Create submissions with different statuses
        if (i === 0) {
          // First participant: MANAGER_APPROVED submission
          await prisma.activitySubmission.create({
            data: {
              id: crypto.randomUUID(),
              activityId: activity1.id,
              userId: participants[i].id,
              enrollmentId: enrollment.id,
              textContent: "My innovative idea for improving team collaboration through digital tools",
              status: "MANAGER_APPROVED",
              submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
          });
        } else if (i === 1) {
          // Second participant: PENDING submission
          await prisma.activitySubmission.create({
            data: {
              id: crypto.randomUUID(),
              activityId: activity1.id,
              userId: participants[i].id,
              enrollmentId: enrollment.id,
              textContent: "A new approach to remote work flexibility",
              status: "PENDING",
              submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            },
          });
        }
        // Third participant: No submission yet

        console.log(`  → Enrolled participant: ${participants[i].email}`);
      }

      // Challenge 2: Challenge without managers or activities (basic setup)
      const challenge2 = await prisma.challenge.create({
        data: {
          id: crypto.randomUUID(),
          title: "Wellness Week Challenge",
          description: "Focus on health and wellness activities",
          workspaceId: workspace.id,
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Starts in 7 days
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // Ends in 14 days
          status: "PUBLISHED",
        },
      });
      console.log(`✓ Created challenge: ${challenge2.title} (no managers or activities)`);

      // Challenge 3: Draft challenge with activities but no enrollments
      const challenge3 = await prisma.challenge.create({
        data: {
          id: crypto.randomUUID(),
          title: "Q1 Sales Competition",
          description: "Compete for the highest sales numbers",
          workspaceId: workspace.id,
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          status: "DRAFT",
        },
      });
      console.log(`✓ Created challenge: ${challenge3.title} (draft with activities)`);

      // Create activity templates for challenge 3
      const activityTemplate2 = await prisma.activityTemplate.create({
        data: {
          id: crypto.randomUUID(),
          name: "Weekly Sales Report",
          description: "Submit your weekly sales numbers",
          type: "TEXT_SUBMISSION",
          basePoints: 50,
          workspaceId: workspace.id,
          requiresApproval: false,
        },
      });

      await prisma.activity.create({
        data: {
          id: crypto.randomUUID(),
          challengeId: challenge3.id,
          templateId: activityTemplate2.id,
          pointsValue: 50,
          position: 1,
          isRequired: true,
        },
      });

      // Assign both managers to challenge 3
      if (managers.length >= 2 && adminUser) {
        for (let i = 0; i < Math.min(2, managers.length); i++) {
          await prisma.challengeAssignment.create({
            data: {
              id: crypto.randomUUID(),
              challengeId: challenge3.id,
              managerId: managers[i].id,
              assignedBy: adminUser.id,
              workspaceId: workspace.id,
            },
          });
          console.log(`  → Assigned manager: ${managers[i].email}`);
        }
      }

      // Challenge 4: Completed challenge with points awarded
      const challenge4 = await prisma.challenge.create({
        data: {
          id: crypto.randomUUID(),
          title: "Customer Service Excellence",
          description: "Completed challenge with awarded points",
          workspaceId: workspace.id,
          startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          status: "PUBLISHED",
        },
      });
      console.log(`✓ Created challenge: ${challenge4.title} (completed with points)`);

      const activityTemplate3 = await prisma.activityTemplate.create({
        data: {
          id: crypto.randomUUID(),
          name: "Customer Feedback",
          description: "Share positive customer feedback",
          type: "LINK_SUBMISSION",
          basePoints: 75,
          workspaceId: workspace.id,
          requiresApproval: true,
        },
      });

      const activity4 = await prisma.activity.create({
        data: {
          id: crypto.randomUUID(),
          challengeId: challenge4.id,
          templateId: activityTemplate3.id,
          pointsValue: 75,
          position: 1,
          isRequired: true,
        },
      });

      // Enroll and complete activities for challenge 4
      if (participants.length > 0) {
        const enrollment4 = await prisma.enrollment.create({
          data: {
            id: crypto.randomUUID(),
            userId: participants[0].id,
            challengeId: challenge4.id,
            status: EnrollmentStatus.COMPLETED,
            enrolledAt: new Date(Date.now() - 44 * 24 * 60 * 60 * 1000),
            completedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
            totalPoints: 75,
          },
        });

        // Approved submission
        await prisma.activitySubmission.create({
          data: {
            id: crypto.randomUUID(),
            activityId: activity4.id,
            userId: participants[0].id,
            enrollmentId: enrollment4.id,
            linkUrl: "https://example.com/feedback",
            status: "APPROVED",
            submittedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            reviewedAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000),
            pointsAwarded: 75,
          },
        });

        console.log(`  → Enrolled and completed by: ${participants[0].email}`);
      }

  console.log(`✓ ${workspace.name}: Created 4 challenges with activities, managers, and submissions`);
}

// Run the seed
seedStaging().catch((error) => {
  console.error("Fatal error during staging seed:", error);
  process.exit(1);
});