'use server'

import { createClient } from '@/lib/supabase/server'
import { syncSupabaseUser } from '@/lib/auth/sync-user'
import { redirect } from 'next/navigation'
import { type Role } from '@/lib/types'
import { prisma } from '@/lib/prisma'
import { acceptInviteCode } from '@/lib/db/queries'
import { sendInviteEmail } from '@/lib/email/smtp'
import { renderWelcomeEmail } from '@/lib/email/templates/welcome'

export async function signupAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const firstName = formData.get('firstName') as string | null
  const lastName = formData.get('lastName') as string | null
  const role = (formData.get('role') as Role) || 'PARTICIPANT'
  const inviteCode = formData.get('inviteCode') as string | null

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  if (!firstName || !lastName) {
    return { error: 'First name and last name are required' }
  }

  try {
    const supabase = await createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    console.log('[SIGNUP] Starting signup:', {
      email,
      firstName,
      lastName,
      role,
      hasInviteCode: !!inviteCode
    })

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role,
          firstName,
          lastName
        },
        emailRedirectTo: `${appUrl}/auth/callback`
      }
    })

    if (error) {
      console.error('[SIGNUP] Supabase signup error:', error)
      return { error: error.message }
    }

    // If email is not confirmed, user needs to check their email
    if (data.user && !data.user.email_confirmed_at) {
      console.log('[SIGNUP] Email confirmation required')
      redirect('/auth/login?message=Please check your email to confirm your account')
    }

    // If email is auto-confirmed (dev mode), sync user and handle invite
    if (data.user) {
      console.log('[SIGNUP] User created, syncing to database:', data.user.id)

      try {
        // Sync user to database
        await syncSupabaseUser(data.user)

        // Fetch the synced user from database
        const dbUser = await prisma.user.findUnique({
          where: { supabaseUserId: data.user.id }
        })

        if (!dbUser) {
          console.error('[SIGNUP] User not found after sync')
          throw new Error('Failed to sync user to database')
        }

        console.log('[SIGNUP] User synced to database:', {
          userId: dbUser.id,
          email: dbUser.email
        })

        // Update user with firstName/lastName if not already set
        if (firstName || lastName) {
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              firstName: firstName || undefined,
              lastName: lastName || undefined
            }
          })
          console.log('[SIGNUP] Updated user profile with name:', { firstName, lastName })
        }

        // Send welcome email (non-blocking, errors logged but don't fail signup)
        try {
          // Get workspace info if invite exists, otherwise use default
          let workspaceInfo = {
            name: 'Changemaker',
            slug: '',
            dashboardUrl: `${appUrl}/dashboard`
          }

          if (inviteCode) {
            const invite = await prisma.inviteCode.findUnique({
              where: { code: inviteCode },
              include: { Workspace: true }
            })
            if (invite) {
              workspaceInfo = {
                name: invite.Workspace.name,
                slug: invite.Workspace.slug,
                dashboardUrl: `${appUrl}/w/${invite.Workspace.slug}/${role === 'ADMIN' ? 'admin' : 'participant'}/dashboard`
              }
            }
          }

          const welcomeEmailHtml = renderWelcomeEmail({
            userFirstName: firstName,
            userLastName: lastName,
            userDisplayName: null,
            userEmail: email,
            workspaceName: workspaceInfo.name,
            workspaceSlug: workspaceInfo.slug,
            dashboardUrl: workspaceInfo.dashboardUrl,
            role: role
          })

          await sendInviteEmail({
            to: email,
            subject: `Welcome to ${workspaceInfo.name}!`,
            html: welcomeEmailHtml
          })

          console.log('[SIGNUP] Welcome email sent successfully to:', email)
        } catch (emailError) {
          // Log error but don't fail signup
          console.error('[SIGNUP] Failed to send welcome email:', emailError)
        }

        // Auto-accept invite if present
        if (inviteCode) {
          console.log('[SIGNUP] Auto-accepting invite:', inviteCode)

          try {
            const result = await acceptInviteCode(inviteCode, dbUser.id, dbUser.email)

            console.log('[SIGNUP] Invite accepted successfully:', {
              workspace: result.workspace.slug,
              role: result.role
            })

            // Redirect to workspace dashboard
            const slug = result.workspace.slug
            const redirectRole = (result.role || 'PARTICIPANT') as 'ADMIN' | 'PARTICIPANT'
            const dashboard = redirectRole === 'ADMIN'
              ? `/w/${slug}/admin/dashboard`
              : `/w/${slug}/participant/dashboard`

            redirect(dashboard)
          } catch (inviteError: any) {
            // Re-throw NEXT_REDIRECT errors - they're not failures, just Next.js redirect mechanism
            if (inviteError?.message?.includes('NEXT_REDIRECT') || inviteError?.digest?.includes('NEXT_REDIRECT')) {
              throw inviteError
            }

            console.error('[SIGNUP] Failed to accept invite:', inviteError)
            // Still allow signup to complete, just redirect to login
            redirect('/auth/login?message=Account created! Please sign in to accept your invitation.')
          }
        } else {
          // No invite, standard signup flow
          redirect('/auth/login?message=Account created successfully! Please sign in.')
        }
      } catch (syncError: any) {
        // Re-throw NEXT_REDIRECT errors - they're not failures, just Next.js redirect mechanism
        if (syncError?.message?.includes('NEXT_REDIRECT') || syncError?.digest?.includes('NEXT_REDIRECT')) {
          throw syncError
        }

        console.error('[SIGNUP] Failed to sync user during signup:', syncError)
        redirect('/auth/login?message=Account created! Please sign in to continue.')
      }
    }

    return { error: 'Signup failed - no user data returned' }
  } catch (error: any) {
    // Re-throw NEXT_REDIRECT errors - they're not failures, just Next.js redirect mechanism
    if (error?.message?.includes('NEXT_REDIRECT') || error?.digest?.includes('NEXT_REDIRECT')) {
      throw error
    }

    console.error('[SIGNUP] Unexpected error:', error)
    return { error: 'An unexpected error occurred during signup' }
  }
}
