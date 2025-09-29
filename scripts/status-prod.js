#!/usr/bin/env node

/**
 * Show Prisma migration status for the production database
 * Usage: pnpm db:status:prod
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load production database URL from .env.production
const envPath = path.join(__dirname, '..', '.env.production');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.production file not found');
  console.error('Please create .env.production with DIRECT_URL (preferred) or DATABASE_URL');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const directUrlMatch = envContent.match(/^DIRECT_URL=(.+)$/m);
const databaseUrlMatch = envContent.match(/^DATABASE_URL=(.+)$/m);

if (!directUrlMatch && !databaseUrlMatch) {
  console.error('Error: Neither DIRECT_URL nor DATABASE_URL found in .env.production');
  process.exit(1);
}

const parsedDirect = directUrlMatch ? directUrlMatch[1].replace(/^["']|["']$/g, '') : null;
const parsedDatabase = databaseUrlMatch ? databaseUrlMatch[1].replace(/^["']|["']$/g, '') : null;
const effectiveUrl = parsedDirect || parsedDatabase;

console.log('🔍 Checking production migration status...');
try {
  execSync(`DATABASE_URL="${effectiveUrl}" pnpm prisma migrate status | cat`, {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: effectiveUrl }
  });
} catch (error) {
  console.error('❌ Failed to get migration status:', error.message);
  process.exit(1);
}



