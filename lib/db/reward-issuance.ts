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

  try {
    if (type === 'points') {
      // Points issuance is already handled via awardPointsWithBudget; mark as ISSUED
      await prisma.rewardIssuance.update({
        where: { id: issuance.id },
        data: { status: 'ISSUED', issuedAt: new Date() }
      })
      return issuance
    }

    // For sku/monetary, integrate with provider here. This is a stub that marks issued.
    await prisma.rewardIssuance.update({
      where: { id: issuance.id },
      data: { status: 'ISSUED', issuedAt: new Date() }
    })
    return issuance
  } catch (error: any) {
    await prisma.rewardIssuance.update({
      where: { id: issuance.id },
      data: { status: 'FAILED', error: String(error) }
    })
    throw error
  }
}


