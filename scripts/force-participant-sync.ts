import { prisma } from '../lib/prisma';
import { syncParticipantToRewardStack } from '../lib/rewardstack/participant-sync';

async function main() {
  // Get Jack's user and workspace
  const user = await prisma.user.findUnique({
    where: { email: 'jfelke@alldigitalrewards.com' },
    select: {
      id: true,
      email: true,
      WorkspaceMembership: {
        where: {
          Workspace: { rewardStackEnabled: true }
        },
        select: {
          workspaceId: true,
          Workspace: { select: { slug: true } }
        }
      }
    }
  });

  if (!user || user.WorkspaceMembership.length === 0) {
    console.error('User or RewardSTACK-enabled workspace not found');
    process.exit(1);
  }

  console.log('Forcing sync for:', user.email);
  console.log('Workspace:', user.WorkspaceMembership[0].Workspace.slug);
  console.log('User ID:', user.id);
  console.log('Workspace ID:', user.WorkspaceMembership[0].workspaceId);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await syncParticipantToRewardStack(
    user.id,
    user.WorkspaceMembership[0].workspaceId
  );

  console.log('\n✅ Sync complete!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
