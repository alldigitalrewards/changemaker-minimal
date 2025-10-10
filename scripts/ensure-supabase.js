#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function checkSupabaseStatus() {
  try {
    const { stdout } = await execAsync('supabase status');
    
    // Check if Supabase is running and all services are ready
    const hasApiUrl = stdout.includes('API URL: http://');
    const hasStoppedServices = stdout.includes('Stopped services:');
    const isStarting = stdout.includes('container is not ready: starting');
    
    // Only consider it fully running if API URL exists and no services are stopped/starting
    return hasApiUrl && !hasStoppedServices && !isStarting;
  } catch (error) {
    // If status command fails, Supabase is not running
    return false;
  }
}

async function waitForSupabase(maxAttempts = 30, delay = 2000) {
  console.log('⏳ Waiting for Supabase to be ready...');
  
  for (let i = 0; i < maxAttempts; i++) {
    const isReady = await checkSupabaseStatus();
    if (isReady) {
      console.log('✅ Supabase is ready');
      return true;
    }
    
    if (i < maxAttempts - 1) {
      process.stdout.write('.');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log('\n⚠️  Supabase is taking longer than expected to start');
  console.log('You can continue with: pnpm dev:only');
  return false;
}

async function startSupabase() {
  console.log('🚀 Starting Supabase...');
  
  try {
    // First, try to stop any partial/stuck instances
    try {
      await execAsync('supabase stop');
      console.log('🔄 Cleaned up previous instance');
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      // Ignore errors if nothing to stop
    }
    
    // Now start fresh
    const { stdout, stderr } = await execAsync('supabase start');
    
    // Check if it's already running (from the error message)
    if (stderr && stderr.includes('supabase start is already running')) {
      console.log('⏳ Supabase is starting up...');
      return await waitForSupabase();
    }
    
    console.log('✅ Supabase started successfully');
    return true;
  } catch (error) {
    // Handle the case where it's partially running
    if (error.message.includes('supabase start is already running')) {
      console.log('⏳ Supabase is already starting...');
      return await waitForSupabase();
    }
    
    console.error('❌ Failed to start Supabase:', error.message);
    console.error('Make sure Docker Desktop is running');
    process.exit(1);
  }
}

async function ensureSupabase() {
  if (process.env.SKIP_SUPABASE === '1' || /^true$/i.test(process.env.SKIP_SUPABASE || '')) {
    console.log('⚠️  SKIP_SUPABASE is set - skipping Supabase startup');
    return;
  }

  const isRunning = await checkSupabaseStatus();
  
  if (isRunning) {
    console.log('✅ Supabase is already running');
    return;
  }
  
  await startSupabase();
}

if (require.main === module) {
  ensureSupabase().catch((error) => {
    console.error('❌ Error ensuring Supabase:', error.message);
    process.exit(1);
  });
}

module.exports = { ensureSupabase, checkSupabaseStatus };
