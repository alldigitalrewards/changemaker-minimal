import { Card, CardContent } from "@/components/ui/card"
import { Avatar } from "./avatar"
import { MedalBadge } from "./medal-badge"
import { RankChangeIndicator } from "./rank-change-indicator"

interface Performer {
  userId: string
  name: string
  email: string
  activityCount: number
  rankChange?: number
  avatarUrl?: string | null
}

interface TopPerformersProps {
  performers: [Performer | undefined, Performer | undefined, Performer | undefined]
}

export function TopPerformers({ performers }: TopPerformersProps) {
  const [second, first, third] = performers

  return (
    <Card>
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold text-slate-800 mb-6 text-center">
          Top Performers
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Second Place */}
          {second && (
            <div className="flex flex-col items-center space-y-3 order-2 md:order-1">
              <MedalBadge rank={2} />
              <Avatar
                name={second.name}
                email={second.email}
                avatarUrl={second.avatarUrl}
                size="lg"
              />
              <div className="text-center space-y-1">
                <p className="font-semibold text-slate-900">{second.name}</p>
                <p className="text-sm text-slate-500">{second.email}</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-3xl font-bold text-slate-400">{second.activityCount}</p>
                <p className="text-xs text-slate-500">activities</p>
              </div>
              <RankChangeIndicator change={second.rankChange} />
              <div className="text-2xl font-bold text-slate-400">#2</div>
              <div className="px-3 py-1 rounded-full bg-slate-100 text-sm text-slate-600">
                Silver Tier
              </div>
            </div>
          )}

          {/* First Place */}
          {first && (
            <div className="flex flex-col items-center space-y-3 order-1 md:order-2">
              <MedalBadge rank={1} />
              <Avatar
                name={first.name}
                email={first.email}
                avatarUrl={first.avatarUrl}
                size="xl"
              />
              <div className="text-center space-y-1">
                <p className="font-bold text-lg text-slate-900">{first.name}</p>
                <p className="text-sm text-slate-500">{first.email}</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-4xl font-bold text-amber-500">{first.activityCount}</p>
                <p className="text-sm text-slate-500">activities</p>
              </div>
              <RankChangeIndicator change={first.rankChange} />
              <div className="text-3xl font-bold text-amber-500">#1</div>
              <div className="px-4 py-1.5 rounded-full bg-amber-100 text-sm font-semibold text-amber-700">
                Gold Tier
              </div>
            </div>
          )}

          {/* Third Place */}
          {third && (
            <div className="flex flex-col items-center space-y-3 order-3">
              <MedalBadge rank={3} />
              <Avatar
                name={third.name}
                email={third.email}
                avatarUrl={third.avatarUrl}
                size="lg"
              />
              <div className="text-center space-y-1">
                <p className="font-semibold text-slate-900">{third.name}</p>
                <p className="text-sm text-slate-500">{third.email}</p>
              </div>
              <div className="text-center space-y-1">
                <p className="text-3xl font-bold text-amber-700">{third.activityCount}</p>
                <p className="text-xs text-slate-500">activities</p>
              </div>
              <RankChangeIndicator change={third.rankChange} />
              <div className="text-2xl font-bold text-amber-700">#3</div>
              <div className="px-3 py-1 rounded-full bg-amber-100 text-sm text-amber-700">
                Bronze Tier
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
