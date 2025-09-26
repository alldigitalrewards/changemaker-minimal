import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { revalidatePath } from 'next/cache'

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

export default async function PointsPage({ params }: PageProps) {
  const { slug, id } = await params
  const challenge = await prisma.challenge.findUnique({ where: { id }, select: { workspaceId: true } })
  const workspaceId = challenge?.workspaceId || ''
  const budget = await prisma.challengePointsBudget.findUnique({ where: { challengeId: id } })
  const workspaceBudget = await prisma.workspacePointsBudget.findUnique({ where: { workspaceId } })

  // Recent ledger for this challenge
  const recent = await prisma.pointsLedger.findMany({
    where: { challengeId: id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { toUser: { select: { email: true } } }
  })

  const workspaceRemaining = Math.max(0, (workspaceBudget?.totalBudget || 0) - (workspaceBudget?.allocated || 0))
  const challengeRemaining = Math.max(0, (budget?.totalBudget || 0) - (budget?.allocated || 0))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Budgets</CardTitle>
          <CardDescription>Challenge and workspace budgets for awarding points</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-700">
            Challenge total: {budget?.totalBudget || 0} · allocated: {budget?.allocated || 0} · remaining: {challengeRemaining}
          </div>
          <div className="text-sm text-gray-700">
            Workspace total: {workspaceBudget?.totalBudget || 0} · allocated: {workspaceBudget?.allocated || 0} · remaining: {workspaceRemaining}
          </div>
          <form
            action={async (formData: FormData) => {
              'use server'
              const total = Number(formData.get('totalBudget') || 0)
              const { getWorkspaceBySlug, upsertChallengePointsBudget } = await import('@/lib/db/queries')
              const ws = await getWorkspaceBySlug(slug)
              if (!ws) return
              await upsertChallengePointsBudget(id, ws.id, Number.isNaN(total) ? 0 : Math.max(0, total))
              revalidatePath(`/w/${slug}/admin/challenges/${id}/points`)
            }}
            className="flex items-end gap-2 max-w-md"
          >
            <div className="flex-1">
              <Label htmlFor="totalBudget">Set Challenge Total Budget</Label>
              <Input id="totalBudget" name="totalBudget" type="number" min={0} step={1} defaultValue={budget?.totalBudget || 0} />
            </div>
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Award</CardTitle>
          <CardDescription>Award points and deduct from challenge/workspace budget</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={async (formData: FormData) => {
              'use server'
              const email = String(formData.get('email') || '')
              const amount = Number(formData.get('amount') || 0)
              const { awardPointsWithBudget } = await import('@/lib/db/queries')
              const user = await prisma.user.findUnique({ where: { email } })
              if (!user || !challenge?.workspaceId) return
              await awardPointsWithBudget({ workspaceId: challenge.workspaceId, challengeId: id, toUserId: user.id, amount })
              revalidatePath(`/w/${slug}/admin/challenges/${id}/points`)
            }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl"
          >
            <div>
              <Label htmlFor="email">User Email</Label>
              <Input id="email" name="email" type="email" placeholder="user@example.com" />
            </div>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" name="amount" type="number" min={1} step={1} />
            </div>
            <div className="flex items-end">
              <Button type="submit">Award</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Ledger</CardTitle>
          <CardDescription>Latest awards for this challenge</CardDescription>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="text-sm text-gray-600">No awards yet.</div>
          ) : (
            <div className="space-y-2">
              {recent.map((e) => (
                <div key={e.id} className="flex items-center justify-between border rounded p-2 text-sm">
                  <div>
                    <div className="font-medium">{e.toUser.email}</div>
                    <div className="text-gray-500">{new Date(e.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="font-medium">+{e.amount}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


