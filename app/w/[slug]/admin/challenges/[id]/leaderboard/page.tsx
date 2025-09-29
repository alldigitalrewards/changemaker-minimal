import { prisma } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

export default async function LeaderboardPage({ params }: PageProps) {
  const { id } = await params
  // Compute leaderboard by summing approved submissions points within this challenge
  const activities = await prisma.activity.findMany({
    where: { challengeId: id },
    include: { submissions: { where: { status: 'APPROVED' }, include: { user: true } } }
  })

  const byUser: Record<string, { email: string; points: number }> = {}
  for (const a of activities) {
    for (const s of a.submissions) {
      const key = s.userId
      const pts = (s as any).pointsAwarded || (a as any).pointsValue || 0
      if (!byUser[key]) byUser[key] = { email: s.user.email, points: 0 }
      byUser[key].points += pts
    }
  }

  const top = Object.entries(byUser)
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 50)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
          <CardDescription>Top participants by approved points</CardDescription>
        </CardHeader>
        <CardContent>
          {top.length === 0 ? (
            <div className="text-sm text-gray-600">No leaderboard yet.</div>
          ) : (
            <div className="space-y-2">
              {top.map((t, idx) => (
                <div key={t.userId} className="flex items-center justify-between p-2 border rounded">
                  <div className="text-sm font-medium">#{idx + 1} {t.email.split('@')[0]}</div>
                  <div className="text-sm">{t.points} pts</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}


