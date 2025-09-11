import { Page } from '@playwright/test'

export async function joinWorkspaceByInvite(page: Page, slug: string, code: string) {
  // Assuming an invite accept endpoint exists: /api/workspaces/:slug/participants with action header
  const res = await page.request.post(`/api/workspaces/${slug}/participants`, {
    headers: { 'Content-Type': 'application/json', 'X-Action': 'ACCEPT_INVITE' },
    data: { code }
  })
  return res
}

export async function reviewSubmission(page: Page, slug: string, submissionId: string, status: 'APPROVED' | 'REJECTED', pointsAwarded?: number, reviewNotes?: string) {
  const res = await page.request.post(`/api/workspaces/${slug}/submissions/${submissionId}/review`, {
    headers: { 'Content-Type': 'application/json' },
    data: { status, pointsAwarded: pointsAwarded ?? 0, reviewNotes }
  })
  return res
}


