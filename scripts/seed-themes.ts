import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed script to initialize workspace themes
 * Assigns diverse themes to existing workspaces for variety
 */
async function seedThemes() {
  console.log("🎨 Seeding workspace themes...");

  const workspaces = await prisma.workspace.findMany({
    select: { id: true, slug: true, name: true, theme: true },
  });

  if (workspaces.length === 0) {
    console.log("⚠️  No workspaces found. Create workspaces first.");
    return;
  }

  const themes = ["bold", "professional", "minimal", "current"];
  let updated = 0;

  for (let i = 0; i < workspaces.length; i++) {
    const workspace = workspaces[i];
    const theme = themes[i % themes.length];

    // Skip if theme is already set
    if (workspace.theme) {
      console.log(
        `  ℹ️  Workspace "${workspace.name}" already has theme: ${workspace.theme}`
      );
      continue;
    }

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { theme },
    });

    console.log(`  ✓ Set theme "${theme}" for workspace "${workspace.name}"`);
    updated++;
  }

  console.log(
    `\n✨ Theme seeding complete! Updated ${updated}/${workspaces.length} workspaces`
  );

  // Show theme distribution
  const themeCounts = await prisma.workspace.groupBy({
    by: ["theme"],
    _count: true,
  });

  console.log("\n📊 Theme distribution:");
  themeCounts.forEach(({ theme, _count }) => {
    console.log(`  ${theme || "null"}: ${_count} workspace(s)`);
  });
}

seedThemes()
  .catch((error) => {
    console.error("❌ Error seeding themes:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
