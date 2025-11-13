import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBobWilson() {
  const user = await prisma.user.findUnique({
    where: { email: 'bob.wilson@acme.com' },
    include: {
      PointsBalance: {
        include: { Workspace: true }
      }
    }
  });

  console.log('Bob Wilson Points:', JSON.stringify(user?.PointsBalance, null, 2));

  await prisma.$disconnect();
}

checkBobWilson();
