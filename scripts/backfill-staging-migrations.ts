import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const STAGING_DATABASE_URL = process.env.STAGING_DATABASE_URL || process.env.DIRECT_URL;

if (!STAGING_DATABASE_URL) {
  console.error('❌ STAGING_DATABASE_URL or DIRECT_URL must be set');
  process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: STAGING_DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🔍 Checking migration status on staging...\n');

  // Get applied migrations from staging
  const appliedMigrations = await prisma.$queryRaw<Array<{
    migration_name: string;
    checksum: string;
    finished_at: Date;
  }>>`
    SELECT migration_name, checksum, finished_at
    FROM _prisma_migrations
    ORDER BY finished_at
  `;

  const appliedNames = new Set(appliedMigrations.map(m => m.migration_name));

  console.log('✅ Applied migrations on staging:');
  appliedMigrations.forEach(m => console.log(`   - ${m.migration_name}`));
  console.log('');

  // Get all local migrations
  const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
  const localMigrations = fs.readdirSync(migrationsDir)
    .filter(name => {
      if (name.startsWith('.') || name === 'migration_lock.toml') return false;
      // Only include directories (valid migrations)
      const fullPath = path.join(migrationsDir, name);
      return fs.statSync(fullPath).isDirectory();
    })
    .sort();

  console.log(`📋 Found ${localMigrations.length} local migrations\n`);

  // Find missing migrations
  const missingMigrations = localMigrations.filter(name => !appliedNames.has(name));

  if (missingMigrations.length === 0) {
    console.log('✨ All migrations are already recorded!');
    return;
  }

  console.log(`⚠️  Found ${missingMigrations.length} missing migration records:\n`);

  // Group missing migrations and show them
  const missingByMonth: Record<string, string[]> = {};
  missingMigrations.forEach(name => {
    const month = name.substring(0, 6); // YYYYMM
    if (!missingByMonth[month]) missingByMonth[month] = [];
    missingByMonth[month].push(name);
  });

  Object.entries(missingByMonth).forEach(([month, names]) => {
    console.log(`   ${month}:`);
    names.forEach(name => console.log(`      - ${name}`));
  });
  console.log('');

  // Calculate checksums and prepare records
  const records = missingMigrations.map(migrationName => {
    const migrationPath = path.join(migrationsDir, migrationName, 'migration.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');

    // Use a timestamp that places these migrations between the existing ones
    // Extract timestamp from migration name (first 14 chars: YYYYMMDDHHMMSS)
    const timestamp = migrationName.substring(0, 14);
    const year = parseInt(timestamp.substring(0, 4));
    const month = parseInt(timestamp.substring(4, 6)) - 1;
    const day = parseInt(timestamp.substring(6, 8));
    const hour = parseInt(timestamp.substring(8, 10));
    const minute = parseInt(timestamp.substring(10, 12));
    const second = parseInt(timestamp.substring(12, 14));

    const finishedAt = new Date(year, month, day, hour, minute, second);

    return {
      migrationName,
      checksum,
      finishedAt,
      sql,
    };
  });

  console.log('🔧 Preparing to backfill migration records...\n');
  console.log('This will:');
  console.log('  1. Insert migration records into _prisma_migrations');
  console.log('  2. NOT run any SQL (schema is already correct)');
  console.log('  3. Mark migrations as applied with their original timestamps\n');

  // Insert the records
  for (const record of records) {
    try {
      await prisma.$executeRaw`
        INSERT INTO _prisma_migrations (
          id,
          checksum,
          finished_at,
          migration_name,
          logs,
          rolled_back_at,
          started_at,
          applied_steps_count
        ) VALUES (
          gen_random_uuid(),
          ${record.checksum},
          ${record.finishedAt},
          ${record.migrationName},
          NULL,
          NULL,
          ${record.finishedAt},
          1
        )
      `;
      console.log(`✅ Recorded: ${record.migrationName}`);
    } catch (error: any) {
      if (error.code === '23505') {
        // Unique constraint violation - already exists
        console.log(`⏭️  Skipped (already exists): ${record.migrationName}`);
      } else {
        console.error(`❌ Failed to record ${record.migrationName}:`, error.message);
        throw error;
      }
    }
  }

  console.log('\n✨ Migration history backfilled successfully!');

  // Verify
  const finalCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) as count FROM _prisma_migrations
  `;
  console.log(`\n📊 Total migrations recorded: ${finalCount[0].count}`);
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
