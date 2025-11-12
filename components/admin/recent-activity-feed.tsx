import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, UserPlus, Award, Shield, CheckCircle, XCircle, FileText, Archive } from "lucide-react";
import Link from "next/link";

interface ActivityEvent {
  id: string;
  type: string;
  createdAt: Date;
  metadata: any;
  Workspace: {
    id: string;
    name: string;
    slug: string;
  };
  User_ActivityEvent_actorUserIdToUser: {
    id: string;
    email: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  Challenge: {
    id: string;
    title: string;
  } | null;
}

function getActivityIcon(type: string) {
  switch (type) {
    case "INVITE_SENT":
    case "INVITE_REDEEMED":
      return <UserPlus className="h-4 w-4" />;
    case "ENROLLED":
    case "UNENROLLED":
      return <UserPlus className="h-4 w-4" />;
    case "RBAC_ROLE_CHANGED":
      return <Shield className="h-4 w-4" />;
    case "SUBMISSION_APPROVED":
      return <CheckCircle className="h-4 w-4" />;
    case "SUBMISSION_REJECTED":
      return <XCircle className="h-4 w-4" />;
    case "SUBMISSION_CREATED":
      return <FileText className="h-4 w-4" />;
    case "CHALLENGE_CREATED":
    case "CHALLENGE_UPDATED":
    case "CHALLENGE_PUBLISHED":
      return <Award className="h-4 w-4" />;
    case "CHALLENGE_ARCHIVED":
      return <Archive className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

function getActivityColor(type: string): string {
  switch (type) {
    case "INVITE_SENT":
    case "INVITE_REDEEMED":
    case "ENROLLED":
      return "text-green-600 bg-green-50";
    case "UNENROLLED":
    case "SUBMISSION_REJECTED":
      return "text-red-600 bg-red-50";
    case "RBAC_ROLE_CHANGED":
      return "text-purple-600 bg-purple-50";
    case "SUBMISSION_APPROVED":
      return "text-blue-600 bg-blue-50";
    case "CHALLENGE_CREATED":
    case "CHALLENGE_PUBLISHED":
      return "text-amber-600 bg-amber-50";
    case "CHALLENGE_ARCHIVED":
      return "text-gray-600 bg-gray-50";
    default:
      return "text-gray-600 bg-gray-50";
  }
}

function formatActivityMessage(event: ActivityEvent): string {
  const actorName =
    event.User_ActivityEvent_actorUserIdToUser?.displayName ||
    event.User_ActivityEvent_actorUserIdToUser?.firstName ||
    event.User_ActivityEvent_actorUserIdToUser?.email?.split("@")[0] ||
    "Someone";

  const challengeTitle = event.Challenge?.title || "a challenge";

  switch (event.type) {
    case "INVITE_SENT":
      return `${actorName} sent an invitation`;
    case "INVITE_REDEEMED":
      return `${actorName} redeemed an invitation`;
    case "ENROLLED":
      return `${actorName} enrolled in ${challengeTitle}`;
    case "UNENROLLED":
      return `${actorName} unenrolled from ${challengeTitle}`;
    case "RBAC_ROLE_CHANGED":
      return `${actorName}'s role was changed`;
    case "SUBMISSION_CREATED":
      return `${actorName} submitted to ${challengeTitle}`;
    case "SUBMISSION_APPROVED":
      return `${actorName}'s submission was approved`;
    case "SUBMISSION_REJECTED":
      return `${actorName}'s submission was rejected`;
    case "CHALLENGE_CREATED":
      return `${actorName} created ${challengeTitle}`;
    case "CHALLENGE_UPDATED":
      return `${actorName} updated ${challengeTitle}`;
    case "CHALLENGE_PUBLISHED":
      return `${actorName} published ${challengeTitle}`;
    case "CHALLENGE_UNPUBLISHED":
      return `${actorName} unpublished ${challengeTitle}`;
    case "CHALLENGE_ARCHIVED":
      return `${actorName} archived ${challengeTitle}`;
    default:
      return `${actorName} performed an action`;
  }
}

export async function RecentActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-gray-600" />
            Recent Activity
          </CardTitle>
          <CardDescription>Platform-wide activity across all workspaces</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-600" />
          Recent Activity
        </CardTitle>
        <CardDescription>Platform-wide activity across all workspaces</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${getActivityColor(event.type)}`}>
                {getActivityIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{formatActivityMessage(event)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Link
                    href={`/w/${event.Workspace.slug}`}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {event.Workspace.name}
                  </Link>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
