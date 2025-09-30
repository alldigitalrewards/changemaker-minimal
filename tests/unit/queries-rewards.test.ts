import { prisma } from '../../lib/prisma'
import { createChallenge, updateChallenge, createActivity, updateActivity } from '../../lib/db/queries'

describe('queries: challenge rewards and activity rewardRules', () => {
  let workspaceId = '00000000-0000-0000-0000-000000000010'
  let challengeId: string
  let templateId: string

  beforeAll(async () => {
    const ws = await prisma.workspace.upsert({ where: { id: workspaceId }, update: {}, create: { id: workspaceId, slug: 'unit-queries', name: 'Unit Queries' } as any })
    const tmpl = await prisma.activityTemplate.create({ data: { name: 'T', description: 'D', type: 'TEXT_SUBMISSION', workspaceId } as any })
    templateId = tmpl.id
  })

  it('creates/updates challenge with reward fields', async () => {
    const start = new Date(Date.now() + 86400000)
    const end = new Date(Date.now() + 86400000 * 2)
    const c = await createChallenge({ title: 'C', description: 'D', startDate: start, endDate: end, rewardType: 'sku', rewardConfig: { allowedSkus: ['A'] } }, workspaceId)
    challengeId = c.id
    expect(c.rewardType).toBe('sku')

    const u = await updateChallenge(c.id, { rewardType: 'monetary', rewardConfig: { currency: 'USD' } }, workspaceId)
    expect(u.rewardType).toBe('monetary')
  })

  it('creates/updates activity with rewardRules', async () => {
    const a = await createActivity({ templateId, challengeId, pointsValue: 5, rewardRules: [{ submissionIndex: 1, type: 'points', amount: 5 }] } as any, workspaceId)
    const up = await updateActivity(a.id, workspaceId, { rewardRules: [{ submissionIndex: 1, type: 'sku', skuId: 'giftcard' }] })
    expect(Array.isArray(up.rewardRules)).toBe(true)
  })
})


