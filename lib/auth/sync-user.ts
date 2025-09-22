import { prisma } from '@/lib/prisma'
import { type User } from '@supabase/supabase-js'
import { type Role } from '@/lib/types'

export async function syncSupabaseUser(supabaseUser: User): Promise<void> {
  if (!supabaseUser?.id || !supabaseUser?.email) {
    throw new Error('Invalid user data: missing id or email')
  }

  try {
    const role = (supabaseUser.user_metadata?.role as Role) || 'PARTICIPANT'
    
    // Use transaction to handle race conditions and existing placeholder rows
    await prisma.$transaction(async (tx: any) => {
      // If a placeholder user exists with this email, attach supabaseUserId to it
      const placeholder = await tx.user.findUnique({ where: { email: supabaseUser.email! } })
      if (placeholder && !placeholder.supabaseUserId) {
        await tx.user.update({
          where: { id: placeholder.id },
          data: {
            supabaseUserId: supabaseUser.id,
            // keep existing role unless role metadata provided
            ...(supabaseUser.user_metadata?.role && { role: supabaseUser.user_metadata.role as Role })
          }
        })
        return
      }

      // Otherwise upsert by supabaseUserId
      await tx.user.upsert({
        where: { supabaseUserId: supabaseUser.id },
        update: {
          email: supabaseUser.email!,
          ...(supabaseUser.user_metadata?.role && { role: supabaseUser.user_metadata.role as Role })
        },
        create: {
          supabaseUserId: supabaseUser.id,
          email: supabaseUser.email!,
          role,
        }
      })
    }, {
      maxWait: 5000,
      timeout: 10000,
    })
  } catch (error) {
    console.error('Failed to sync Supabase user to Prisma:', error)
    // More specific error messages
    if (error instanceof Error) {
      if (error.message.includes('unique constraint')) {
        throw new Error('User sync failed: duplicate user')
      }
      if (error.message.includes('foreign key')) {
        throw new Error('User sync failed: invalid workspace reference')
      }
    }
    throw new Error('User sync failed')
  }
}

export async function ensureUserExists(supabaseUserId: string): Promise<boolean> {
  if (!supabaseUserId) {
    return false
  }

  try {
    const user = await prisma.user.findUnique({
      where: { supabaseUserId },
      select: { id: true } // Only fetch what we need
    })
    
    return user !== null
  } catch (error) {
    console.error('Failed to check user existence:', error)
    return false
  }
}

export async function getUserRole(supabaseUserId: string): Promise<Role | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { supabaseUserId },
      select: { role: true }
    })
    
    return user?.role || null
  } catch (error) {
    console.error('Failed to get user role:', error)
    return null
  }
}