import { prisma } from '../../../lib/prisma'
import { Role, EnrollmentStatus, SubmissionStatus, ActivityType } from '@prisma/client'
import { randomUUID } from 'crypto'

export async function ensureWorkspace(slug: string, name?: string) {
  const workspace = await prisma.workspace.upsert({
    where: { slug },
    update: { name: name || slug },
    create: { id: randomUUID(), slug, name: name || slug }
  })
  return workspace
}

export async function setUserRoleInWorkspace(email: string, slug: string, role: Role) {
  const workspace = await ensureWorkspace(slug, slug)
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email }
  })
  // Create or update workspace membership with the specified role
  await prisma.workspaceMembership.upsert({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id
      }
    },
    update: { role },
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role,
      isPrimary: false
    }
  })
  return { user, workspace }
}

export async function ensureChallenge(slug: string, title: string, description: string) {
  const workspace = await ensureWorkspace(slug, slug)
  const existing = await prisma.challenge.findFirst({ where: { title, workspaceId: workspace.id } })
  if (existing) return existing
  const now = new Date()
  const startDate = new Date(now.getTime() + 24 * 3600 * 1000)
  const endDate = new Date(startDate.getTime() + 30 * 24 * 3600 * 1000)
  return prisma.challenge.create({
    data: {
        id: randomUUID(), title, description, startDate, endDate, workspaceId: workspace.id }
  })
}

export async function ensurePendingSubmission(params: { slug: string; title: string; userEmail: string }) {
  const { slug, title, userEmail } = params
  const challenge = await ensureChallenge(slug, title, `${title} description`)

  // Ensure user is participant in workspace
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: challenge.workspaceId } })
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {},
    create: { email: userEmail }
  })

  // Create or update workspace membership with PARTICIPANT role
  await prisma.workspaceMembership.upsert({
    where: {
      userId_workspaceId: {
        userId: user.id,
        workspaceId: workspace.id
      }
    },
    update: { role: 'PARTICIPANT' },
    create: {
      userId: user.id,
      workspaceId: workspace.id,
      role: 'PARTICIPANT',
      isPrimary: false
    }
  })

  const enrollment = await prisma.enrollment.upsert({
    where: { userId_challengeId: { userId: user.id, challengeId: challenge.id } },
    update: { status: EnrollmentStatus.ENROLLED },
    create: { userId: user.id, challengeId: challenge.id, status: EnrollmentStatus.ENROLLED }
  })

  // Ensure an activity template exists for workspace
  const template = await prisma.activityTemplate.upsert({
    where: { id: (await (async () => null as any)()) || '00000000-0000-0000-0000-000000000000' },
    update: {},
    create: { id: randomUUID(), name: 'Text Submission', description: 'Text', type: ActivityType.TEXT_SUBMISSION, workspaceId: workspace.id }
  }).catch(async () => {
    return prisma.activityTemplate.create({
      data: {
        id: randomUUID(), name: 'Text Submission', description: 'Text', type: ActivityType.TEXT_SUBMISSION, workspaceId: workspace.id }
    })
  })

  const activity = await prisma.activity.create({
    data: {
        id: randomUUID(), templateId: template.id, challengeId: challenge.id, pointsValue: 10 }
  })

  const submission = await prisma.activitySubmission.create({
    data: {
        id: randomUUID(),
      activityId: activity.id,
      userId: user.id,
      enrollmentId: enrollment.id,
      textContent: 'Fixture submission',
      status: SubmissionStatus.PENDING
    }
  })

  return { challenge, enrollment, submission }
}