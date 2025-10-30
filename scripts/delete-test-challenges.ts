import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.challenge.deleteMany({
    where: {
      title: {
        in: [
          'Team Innovation Challenge',
          'Wellness Week Challenge', 
          'Q1 Sales Competition',
          'Customer Service Excellence',
          'Welcome Challenge',
          'Innovation Sprint'
        ]
      }
    }
  });
  console.log(`Deleted ${result.count} challenges`);
}

main().finally(() => prisma.$disconnect());
