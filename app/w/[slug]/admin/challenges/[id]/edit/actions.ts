"use server";

import { getWorkspaceBySlug, upsertChallengePointsBudget } from '@/lib/db/queries'

export async function upsertChallengeBudgetAction(formData: FormData) {
  const total = Number(formData.get('totalBudget') || 0)
  const slug = String(formData.get('slug') || '')
  const challengeId = String(formData.get('challengeId') || '')
  if (!slug || !challengeId) return
  const workspace = await getWorkspaceBySlug(slug)
  if (!workspace) return
  await upsertChallengePointsBudget(challengeId, workspace.id, Number.isNaN(total) ? 0 : total)
}


