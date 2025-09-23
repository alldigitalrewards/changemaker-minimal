#!/usr/bin/env node

/**
 * Apply Prisma migrations to production database
 * Usage: pnpm db:migrate:prod
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load production database URL from .env.production
const envPath = path.join(__dirname, '..', '.env.production');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env.production file not found');
  console.error('Please create .env.production with DIRECT_URL for production database');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const directUrlMatch = envContent.match(/^DIRECT_URL=(.+)$/m);

if (!directUrlMatch) {
  console.error('Error: DIRECT_URL not found in .env.production');
  console.error('Please add DIRECT_URL with production database connection string');
  process.exit(1);
}

// Remove quotes if present
const directUrl = directUrlMatch[1].replace(/^["']|["']$/g, '');

console.log('🚀 Applying migrations to production database...');
console.log('Database:', directUrl.includes('supabase.com') ? 'Supabase Production' : 'Unknown');

try {
  // Run prisma migrate deploy with production URL
  execSync(`DATABASE_URL="${directUrl}" prisma migrate deploy`, {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: directUrl }
  });

  console.log('✅ Production migrations applied successfully!');
} catch (error) {
  console.error('❌ Failed to apply migrations:', error.message);
  process.exit(1);
}