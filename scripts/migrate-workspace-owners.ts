#!/usr/bin/env tsx

/**
 * OBSOLETE: Migration script for ownerId field
 * 
 * This script is no longer needed as the ownerId field has been removed
 * from the Workspace model in favor of using WorkspaceMembership with
 * isPrimary flag to determine ownership.
 * 
 * Ownership is now determined by:
 * WorkspaceMembership.role = 'ADMIN' AND WorkspaceMembership.isPrimary = true
 * 
 * This file is kept for historical reference but should not be run.
 */

console.log('❌ This migration script is obsolete.')
console.log('💡 Ownership is now handled via WorkspaceMembership with isPrimary flag.')
console.log('🔧 Use the isWorkspaceOwner() function from /lib/db/workspace-membership.ts')
process.exit(1)