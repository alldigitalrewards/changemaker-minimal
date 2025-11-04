import { NextRequest, NextResponse } from 'next/server'
import { requireWorkspaceAdmin, withErrorHandling } from '@/lib/auth/api-auth'
import { createWorkspaceCommunication, DatabaseError } from '@/lib/db/queries'
import { prisma } from '@/lib/prisma'
import { CommunicationScope, CommunicationAudience, CommunicationPriority } from '@prisma/client'
import { sendCommunicationEmail } from '@/lib/email/communications'
import { revalidatePath } from 'next/cache'
import { generateTldrHighlights, extractDatesActions, suggestPriority } from '@/lib/ai/announcement-enhancements'

const BATCH_SIZE = 50

function normalizeEmails(emails: (string | null | undefined)[]): string[] {
  const unique = new Set<string>()
  emails.forEach(email => {
    if (email) {
      unique.add(email.toLowerCase())
    }
  })
  return Array.from(unique)
}

function chunkRecipients(recipients: string[], size: number) {
  const chunks: string[][] = []
  for (let i = 0; i < recipients.length; i += size) {
    chunks.push(recipients.slice(i, i + size))
  }
  return chunks
}

async function getRecipientsForCommunication(params: {
  workspaceId: string
  scope: CommunicationScope
  audience: CommunicationAudience
  challengeId?: string | null
  activityId?: string | null
}): Promise<string[]> {
  const { workspaceId, scope, audience, challengeId, activityId } = params

  if (scope === CommunicationScope.WORKSPACE) {
    const members = await prisma.workspaceMembership.findMany({
      where: { workspaceId },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            isPending: true,
            firstName: true,
            lastName: true,
            displayName: true,
          }
        }
      }
    })
    return normalizeEmails(
      members
        .filter(member => !!member.User?.email && !member.User.isPending)
        .map(member => member.User.email)
    )
  }

  const statusFilters: Record<CommunicationAudience, ('INVITED' | 'ENROLLED' | 'WITHDRAWN')[]> = {
    [CommunicationAudience.ALL]: ['INVITED', 'ENROLLED', 'WITHDRAWN'],
    [CommunicationAudience.ENROLLED]: ['ENROLLED'],
    [CommunicationAudience.INVITED]: ['INVITED'],
    [CommunicationAudience.COMPLETED]: ['WITHDRAWN']
  }

  if (!challengeId && scope !== CommunicationScope.ACTIVITY) {
    throw new DatabaseError('Challenge ID is required to target challenge audience', 'COMMUNICATION_CHALLENGE_REQUIRED')
  }

  if (scope === CommunicationScope.CHALLENGE) {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        challengeId: challengeId!,
        status: { in: statusFilters[audience] }
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            isPending: true,
            firstName: true,
            lastName: true,
            displayName: true,
          }
        }
      }
    })

    return normalizeEmails(
      enrollments
        .filter(enrollment => !!enrollment.User?.email && !enrollment.User.isPending)
        .map(enrollment => enrollment.User.email)
    )
  }

  if (!activityId) {
    throw new DatabaseError('Activity ID is required to target activity audience', 'COMMUNICATION_ACTIVITY_REQUIRED')
  }

  const enrollments = await prisma.enrollment.findMany({
    where: {
      challengeId: challengeId!,
      status: { in: statusFilters[audience] }
    },
    include: {
      User: {
        select: {
          id: true,
          email: true,
          isPending: true,
          firstName: true,
          lastName: true,
          displayName: true,
        }
      }
    }
  })

  return normalizeEmails(
    enrollments
      .filter(enrollment => !!enrollment.User?.email && !enrollment.User.isPending)
      .map(enrollment => enrollment.User.email)
  )
}

export const POST = withErrorHandling(async (request: NextRequest, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params
  const { workspace, user } = await requireWorkspaceAdmin(slug)
  const payload = await request.json()

  const rawScope = (payload.scope || '').toUpperCase()
  const rawAudience = (payload.audience || 'ALL').toUpperCase()
  const rawPriority = (payload.priority || 'NORMAL').toUpperCase()

  if (!Object.values(CommunicationScope).includes(rawScope as CommunicationScope)) {
    return NextResponse.json({ error: 'Invalid communication scope' }, { status: 400 })
  }

  if (!Object.values(CommunicationAudience).includes(rawAudience as CommunicationAudience)) {
    return NextResponse.json({ error: 'Invalid communication audience' }, { status: 400 })
  }

  if (!Object.values(CommunicationPriority).includes(rawPriority as CommunicationPriority)) {
    return NextResponse.json({ error: 'Invalid communication priority' }, { status: 400 })
  }

  const scope = rawScope as CommunicationScope
  const audience = rawAudience as CommunicationAudience
  const priority = rawPriority as CommunicationPriority

  // Generate AI enhancements in parallel
  const [tldrHighlightsResult, datesActionsResult, prioritySuggestionResult] = await Promise.allSettled([
    generateTldrHighlights(payload.subject, payload.message),
    extractDatesActions(payload.subject, payload.message),
    suggestPriority(payload.subject, payload.message),
  ])

  const tldrHighlights = tldrHighlightsResult.status === 'fulfilled' ? tldrHighlightsResult.value : null
  const datesActions = datesActionsResult.status === 'fulfilled' ? datesActionsResult.value : null
  const prioritySuggestion = prioritySuggestionResult.status === 'fulfilled' ? prioritySuggestionResult.value : null

  const communication = await createWorkspaceCommunication(
    workspace.id,
    {
      subject: payload.subject,
      message: payload.message,
      scope,
      audience,
      priority,
      challengeId: payload.challengeId ?? null,
      activityId: payload.activityId ?? null,
      // AI enhancements
      tldr: tldrHighlights?.tldr,
      highlights: tldrHighlights?.highlights,
      aiDates: datesActions?.dates,
      aiActions: datesActions?.actions,
      aiPrioritySuggestion: prioritySuggestion ? JSON.stringify(prioritySuggestion) : undefined,
    },
    user.dbUser.id
  )

  const recipients = await getRecipientsForCommunication({
    workspaceId: workspace.id,
    scope: communication.scope,
    audience: communication.audience,
    challengeId: communication.challengeId,
    activityId: communication.activityId
  })

  if (recipients.length > 0) {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2 style="color: #ef4444; margin-bottom: 12px;">${communication.subject}</h2>
        <p style="white-space: pre-wrap; color: #111827;">${communication.message}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="font-size: 12px; color: #6b7280;">This message was sent by ${user.dbUser.email} via Changemaker.</p>
      </div>
    `

    const batches = chunkRecipients(recipients, BATCH_SIZE)
    for (const batch of batches) {
      await sendCommunicationEmail({
        subject: communication.subject,
        html,
        bcc: batch
      })
    }
  }

  // Revalidate key admin views and participant dashboard
  revalidatePath(`/w/${slug}/admin/dashboard`)
  revalidatePath(`/w/${slug}/participant/dashboard`)
  if (communication.challengeId) {
    revalidatePath(`/w/${slug}/admin/challenges/${communication.challengeId}`)
    revalidatePath(`/w/${slug}/participant/challenges/${communication.challengeId}`)
  }

  return NextResponse.json({ communication })
})
