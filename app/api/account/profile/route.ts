import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, withErrorHandling } from '@/lib/auth/api-auth'
import { getUserBySupabaseId } from '@/lib/db/queries'
import { prisma } from '@/lib/prisma'
import { syncParticipant } from '@/lib/rewardstack/service'

export const GET = withErrorHandling(async () => {
  const { supabaseUser, dbUser } = await requireAuth()
  return NextResponse.json({
    email: supabaseUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    displayName: dbUser.displayName,
    addressLine1: dbUser.addressLine1,
    addressLine2: dbUser.addressLine2,
    city: dbUser.city,
    state: dbUser.state,
    zipCode: dbUser.zipCode,
    country: dbUser.country,
    phone: dbUser.phone,
    userMetadata: supabaseUser.user_metadata || {}
  })
})

export const PUT = withErrorHandling(async (request: Request) => {
  const { supabaseUser, dbUser } = await requireAuth()
  const body = await request.json().catch(() => ({})) as {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    fullName?: string; // For backward compatibility - will be split into firstName/lastName
    department?: string;
    bio?: string;
    organization?: string;
    timezone?: string;
    // Address fields
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
    notificationPrefs?: {
      reviewQueue?: boolean;
      enrollmentChanges?: boolean;
      inviteEvents?: boolean;
    };
    defaultLanding?: 'dashboard' | 'participants' | 'activities' | 'emails';
    defaultWorkspaceSlug?: string;
    dateFormat?: string;
    reducedMotion?: boolean;
    uiDensity?: 'comfortable' | 'compact';
    showKeyboardHints?: boolean;
  }

  // Handle database fields (firstName, lastName, displayName, address fields)
  const dbUpdates: {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
    phone?: string;
  } = {}

  // If fullName is provided (backward compatibility), split it
  if (typeof body.fullName === 'string' && body.fullName.trim()) {
    const parts = body.fullName.trim().split(/\s+/)
    if (parts.length >= 2) {
      dbUpdates.firstName = parts[0]
      dbUpdates.lastName = parts.slice(1).join(' ')
    } else {
      dbUpdates.firstName = body.fullName.trim()
    }
  }

  // Direct field updates override fullName split
  if (typeof body.firstName === 'string') dbUpdates.firstName = body.firstName.trim()
  if (typeof body.lastName === 'string') dbUpdates.lastName = body.lastName.trim()
  if (typeof body.displayName === 'string') dbUpdates.displayName = body.displayName.trim()

  // Handle address fields
  if (typeof body.addressLine1 === 'string') dbUpdates.addressLine1 = body.addressLine1.trim() || undefined
  if (typeof body.addressLine2 === 'string') dbUpdates.addressLine2 = body.addressLine2.trim() || undefined
  if (typeof body.city === 'string') dbUpdates.city = body.city.trim() || undefined
  if (typeof body.state === 'string') dbUpdates.state = body.state.trim() || undefined
  if (typeof body.zipCode === 'string') dbUpdates.zipCode = body.zipCode.trim() || undefined
  if (typeof body.country === 'string') dbUpdates.country = body.country.trim() || undefined
  if (typeof body.phone === 'string') dbUpdates.phone = body.phone.trim() || undefined

  // Handle user_metadata fields (preferences, settings, etc.)
  const metadataUpdates: Record<string, any> = {}
  if (typeof body.department === 'string') metadataUpdates.department = body.department.trim()
  if (typeof body.bio === 'string') metadataUpdates.bio = body.bio.trim()
  if (typeof body.organization === 'string') metadataUpdates.organization = body.organization.trim()
  if (typeof body.timezone === 'string') metadataUpdates.timezone = body.timezone.trim()
  if (body.notificationPrefs && typeof body.notificationPrefs === 'object') {
    metadataUpdates.notification_prefs = {
      ...(supabaseUser.user_metadata as any)?.notification_prefs,
      ...body.notificationPrefs
    }
  }
  if (typeof body.defaultLanding === 'string') metadataUpdates.default_landing = body.defaultLanding
  if (typeof body.defaultWorkspaceSlug === 'string') metadataUpdates.default_workspace_slug = body.defaultWorkspaceSlug
  if (typeof body.dateFormat === 'string') metadataUpdates.date_format = body.dateFormat
  if (typeof body.reducedMotion === 'boolean') metadataUpdates.reduced_motion = body.reducedMotion
  if (typeof body.uiDensity === 'string') metadataUpdates.ui_density = body.uiDensity
  if (typeof body.showKeyboardHints === 'boolean') metadataUpdates.show_keyboard_hints = body.showKeyboardHints

  if (Object.keys(dbUpdates).length === 0 && Object.keys(metadataUpdates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  // Update database fields
  if (Object.keys(dbUpdates).length > 0) {
    try {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: dbUpdates
      })
    } catch (error) {
      console.error('Failed to update user profile in database:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
  }

  // Update user_metadata fields if any
  if (Object.keys(metadataUpdates).length > 0) {
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ data: metadataUpdates })
    if (error) {
      console.error('Failed to update user metadata:', error)
      return NextResponse.json({ error: 'Failed to update user preferences' }, { status: 500 })
    }
  }

  // Auto-sync to RewardSTACK if relevant fields were updated
  // Do this AFTER updates, and log errors without failing the profile update
  const shouldSync = Object.keys(dbUpdates).length > 0 && (
    dbUpdates.firstName !== undefined ||
    dbUpdates.lastName !== undefined ||
    dbUpdates.addressLine1 !== undefined ||
    dbUpdates.addressLine2 !== undefined ||
    dbUpdates.city !== undefined ||
    dbUpdates.state !== undefined ||
    dbUpdates.zipCode !== undefined ||
    dbUpdates.country !== undefined ||
    dbUpdates.phone !== undefined
  );

  if (shouldSync) {
    try {
      // Get user's workspace memberships
      const userWithWorkspaces = await prisma.user.findUnique({
        where: { id: dbUser.id },
        select: {
          id: true,
          email: true,
          WorkspaceMembership: {
            select: {
              workspaceId: true,
              Workspace: {
                select: {
                  rewardStackEnabled: true,
                  slug: true
                }
              }
            }
          }
        }
      });

      if (userWithWorkspaces) {
        // Sync to all workspaces where user is a member and RewardSTACK is enabled
        for (const membership of userWithWorkspaces.WorkspaceMembership) {
          if (membership.Workspace.rewardStackEnabled) {
            try {
              // Import dynamically to avoid circular dependency
              const { syncParticipantToRewardStack } = await import('@/lib/rewardstack/participant-sync');

              await syncParticipantToRewardStack(userWithWorkspaces.id, membership.workspaceId);

              console.log(`✅ Auto-synced participant ${userWithWorkspaces.email} to RewardSTACK for workspace ${membership.Workspace.slug}`);
            } catch (syncError: any) {
              console.error(`❌ Failed to sync participant to workspace ${membership.Workspace.slug}:`, syncError.message);
            }
          }
        }
      }
    } catch (error: any) {
      // Log but don't fail profile update
      console.error('❌ Failed to auto-sync participant to RewardSTACK:', error.message);
    }
  }

  return NextResponse.json({ success: true })
})


