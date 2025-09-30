import { prisma } from '../../lib/prisma'
import { issueReward } from '../../lib/db/reward-issuance'

describe('reward-issuance service', () => {
  const workspaceId = '00000000-0000-0000-0000-000000000001'
  const userId = '00000000-0000-0000-0000-000000000002'

  beforeAll(async () => {
    // Ensure minimal records
    await prisma.workspace.upsert({ where: { id: workspaceId }, update: {}, create: { id: workspaceId, slug: 'unit-reward', name: 'Unit Reward' } as any })
    await prisma.user.upsert({ where: { id: userId }, update: {}, create: { id: userId, email: 'unit@user.test', role: 'PARTICIPANT', workspaceId } as any })
  })

  it('issues points reward and marks ISSUED', async () => {
    const out = await issueReward({ workspaceId, userId, type: 'points', amount: 5 })
    const found = await prisma.rewardIssuance.findMany({ where: { userId, workspaceId, type: 'points' } })
    expect(found.length).toBeGreaterThan(0)
  })

  it('issues sku reward and marks ISSUED', async () => {
    const out = await issueReward({ workspaceId, userId, type: 'sku', skuId: 'demo_sku' })
    const ri = await prisma.rewardIssuance.findFirst({ where: { userId, workspaceId, type: 'sku' } })
    expect(ri?.status).toBe('ISSUED')
  })

  it('issues monetary reward and marks ISSUED', async () => {
    const out = await issueReward({ workspaceId, userId, type: 'monetary', amount: 10, currency: 'USD' })
    const ri = await prisma.rewardIssuance.findFirst({ where: { userId, workspaceId, type: 'monetary' } })
    expect(ri?.status).toBe('ISSUED')
  })
})


