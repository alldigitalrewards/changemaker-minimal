#!/usr/bin/env node

/**
 * Generic migration application script
 * Usage: node scripts/apply-migration.js <migration-file.sql>
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function applyMigration(migrationPath) {
  const databaseUrl = process.env.PRODUCTION_DATABASE_URL || process.env.DIRECT_URL;
  
  if (!databaseUrl) {
    console.error('❌ No database URL found in environment');
    process.exit(1);
  }
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }
  
  const migrationName = path.basename(migrationPath);
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
  
  console.log(`📋 Applying migration: ${migrationName}`);
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    
    // Check if migration was already applied
    const checkTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_migrations'
      );
    `);
    
    if (!checkTableExists.rows[0].exists) {
      // Create migrations tracking table
      await client.query(`
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          applied_at TIMESTAMP DEFAULT NOW()
        );
      `);
    }
    
    // Check if this migration was already applied
    const checkMigration = await client.query(
      'SELECT name FROM _migrations WHERE name = $1',
      [migrationName]
    );
    
    if (checkMigration.rows.length > 0) {
      console.log(`⏭️  Migration ${migrationName} already applied, skipping...`);
      return;
    }
    
    // Apply the migration
    await client.query(migrationSQL);
    
    // Record the migration
    await client.query(
      'INSERT INTO _migrations (name) VALUES ($1)',
      [migrationName]
    );
    
    console.log(`✅ Migration ${migrationName} applied successfully`);
    
  } catch (error) {
    console.error(`❌ Migration ${migrationName} failed:`, error.message);
    
    if (error.message.includes('already exists')) {
      console.log('ℹ️  Some objects already exist - this may be expected');
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

// Get migration file from command line
const migrationFile = process.argv[2];

if (!migrationFile) {
  console.error('Usage: node scripts/apply-migration.js <migration-file.sql>');
  process.exit(1);
}

applyMigration(migrationFile).catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
});