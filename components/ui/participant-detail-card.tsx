import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Mail, User, Calendar, Shield, UserCheck } from "lucide-react"
import { Role } from "@/lib/types"
import { InlineProfile } from "@/app/w/[slug]/admin/participants/[id]/inline-profile"

interface ParticipantDetailCardProps {
  participant: {
    id: string
    email: string
    createdAt: Date
    Enrollment: any[]
    WorkspaceMembership?: { role: Role }[]
  }
  slug?: string
}

export function ParticipantDetailCard({ participant, slug }: ParticipantDetailCardProps) {
  const role = participant.WorkspaceMembership?.[0]?.role

  const getRoleBadgeProps = (role: Role) => {
    if (role === "ADMIN") {
      return {
        className: "bg-blue-100 text-blue-800 border-blue-200",
        icon: Shield
      }
    }
    return {
      className: "bg-gray-100 text-gray-800 border-gray-200",
      icon: UserCheck
    }
  }

  const { className: badgeClassName, icon: RoleIcon } = role ? getRoleBadgeProps(role) : { className: "bg-gray-100 text-gray-800 border-gray-200", icon: UserCheck }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Participant Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-500" />
            <div className="flex-1">
              {slug && role ? (
                <InlineProfile slug={slug} participantId={participant.id} email={participant.email} role={role} />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{participant.email}</p>
                    <p className="text-sm text-gray-500">Email Address</p>
                  </div>
                  {role && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={badgeClassName}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {role}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-500" />
            <div>
              <p className="font-medium">
                Joined {new Date(participant.createdAt).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500">Member since</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <UserCheck className="h-5 w-5 text-gray-500" />
            <div>
              <p className="font-medium">
                {participant.Enrollment.length} challenge{participant.Enrollment.length !== 1 ? 's' : ''}
              </p>
              <p className="text-sm text-gray-500">Total enrollments</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}