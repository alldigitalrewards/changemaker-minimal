import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

async function main() {
  const workspaces = await prisma.workspace.findMany({
    include: {
      Challenge: {
        select: {
          id: true,
          title: true,
          status: true,
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log('\n📊 Challenge Distribution by Workspace:\n');

  for (const workspace of workspaces) {
    console.log(`${workspace.name} (${workspace.slug}):`);
    console.log(`  Total Challenges: ${workspace.Challenge.length}`);

    if (workspace.Challenge.length > 0) {
      workspace.Challenge.forEach(challenge => {
        console.log(`    - ${challenge.title} (${challenge.status})`);
      });
    } else {
      console.log('    (no challenges)');
    }
    console.log('');
  }
}

main().finally(() => prisma.$disconnect());
