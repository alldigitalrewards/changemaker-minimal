import { test, expect } from '@playwright/test'
import { ADMIN_EMAIL, DEFAULT_PASSWORD, loginWithCredentials } from './support/auth'
import { ensurePendingSubmission } from './support/fixtures'
import { reviewSubmissionWithReward } from './support/api'
import { prisma } from '../../lib/prisma'

test.describe('Approvals with multi-reward issuance', () => {
  const slug = 'e2e-reward-slug'
  const participant = 'participant+rewards@test.com'
  let submissionId: string
  let challengeId: string

  test.beforeAll(async () => {
    const { submission, challenge } = await ensurePendingSubmission({ slug, title: 'Rewards Flow', userEmail: participant })
    submissionId = submission.id
    challengeId = challenge.id
  })

  test('Approve with points', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD)
    const res = await reviewSubmissionWithReward(page, slug, submissionId, {
      status: 'APPROVED',
      reward: { type: 'points', amount: 25 }
    })
    expect(res.ok()).toBeTruthy()

    const ri = await prisma.rewardIssuance.findFirst({ where: { ActivitySubmission: { id: submissionId }, type: 'points' } })
    expect(ri?.status).toBe('ISSUED')
  })

  test('Approve with SKU', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD)
    const res = await reviewSubmissionWithReward(page, slug, submissionId, {
      status: 'APPROVED',
      reward: { type: 'sku', skuId: 'giftcard_25' }
    })
    expect(res.ok()).toBeTruthy()

    const ri = await prisma.rewardIssuance.findFirst({ where: { ActivitySubmission: { id: submissionId }, type: 'sku' } })
    expect(ri?.status).toBe('ISSUED')
  })

  test('Approve with monetary', async ({ page }) => {
    await loginWithCredentials(page, ADMIN_EMAIL, DEFAULT_PASSWORD)
    const res = await reviewSubmissionWithReward(page, slug, submissionId, {
      status: 'APPROVED',
      reward: { type: 'monetary', amount: 10, currency: 'USD' }
    })
    expect(res.ok()).toBeTruthy()

    const ri = await prisma.rewardIssuance.findFirst({ where: { ActivitySubmission: { id: submissionId }, type: 'monetary' } })
    expect(ri?.status).toBe('ISSUED')
  })
})


