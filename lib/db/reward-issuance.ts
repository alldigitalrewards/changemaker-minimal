import { prisma } from '@/lib/db'

type RewardType = 'points' | 'sku' | 'monetary'

export async function issueReward(params: {
  workspaceId: string
  userId: string
  challengeId?: string | null
  submissionId?: string | null
  type: RewardType
  amount?: number | null
  currency?: string | null
  skuId?: string | null
  provider?: string | null
  actorUserId?: string | null
}) {
  const { workspaceId, userId, challengeId, submissionId, type, amount, currency, skuId, provider } = params

  // Create RewardIssuance in PENDING
  const issuance = await prisma.rewardIssuance.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      workspaceId,
      challengeId: challengeId || null,
      type,
      amount: amount ?? null,
      currency: currency ?? null,
      skuId: skuId ?? null,
      provider: provider ?? null,
      status: 'PENDING',
      metadata: submissionId ? { submissionId } : undefined
    }
  })

  // Link issuance to submission record (one-to-one via ActivitySubmission.rewardIssuanceId)
  if (submissionId) {
    await prisma.activitySubmission.update({
      where: { id: submissionId },
      data: { rewardIssuanceId: issuance.id, rewardIssued: true }
    }).catch(() => undefined)
  }

  // Return the issuance in PENDING status
  // The reward will be processed by a background job or manual approval
  return issuance
}


