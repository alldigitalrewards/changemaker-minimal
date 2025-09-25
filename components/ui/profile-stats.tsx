import { Card, CardContent } from "@/components/ui/card"
import { Trophy, CheckCircle, Clock, Coins } from "lucide-react"

export default function ProfileStats({
  points,
  enrollments
}: {
  points: { total: number; available: number }
  enrollments: { total: number; active: number; withdrawn: number; invited: number }
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="border-l-4 border-l-amber-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Points</p>
              <p className="text-3xl font-bold text-amber-600">{points.total}</p>
            </div>
            <Coins className="h-8 w-8 text-amber-500 opacity-75" />
          </div>
          <p className="text-xs text-gray-500 mt-1">Available: {points.available}</p>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-coral-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Enrollments</p>
              <p className="text-3xl font-bold text-coral-600">{enrollments.total}</p>
            </div>
            <Trophy className="h-8 w-8 text-coral-500 opacity-75" />
          </div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-green-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-3xl font-bold text-green-600">{enrollments.active}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500 opacity-75" />
          </div>
        </CardContent>
      </Card>
      <Card className="border-l-4 border-l-yellow-500">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Invited</p>
              <p className="text-3xl font-bold text-yellow-600">{enrollments.invited}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-500 opacity-75" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


