import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentWorkspace, getUserWorkspaceRole } from '@/lib/workspace-context'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CommunicationComposer } from '@/components/communications/communication-composer'
import { MessageSquare, Send, AlertCircle, Bell, Info } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export const metadata = {
  title: 'Communications - Changemaker',
  description: 'Send announcements and updates to your workspace',
}

export default async function CommunicationsPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const role = await getUserWorkspaceRole(slug)
  if (!role || role !== 'ADMIN') {
    redirect('/workspaces')
  }

  const workspace = await getCurrentWorkspace(slug)
  if (!workspace) {
    redirect('/workspaces')
  }

  // Get recent communications
  const recentCommunications = await prisma.workspaceCommunication.findMany({
    where: { workspaceId: workspace.id },
    include: {
      sender: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          displayName: true,
        },
      },
    },
    orderBy: { sentAt: 'desc' },
    take: 10,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Communications</h1>
        <p className="text-muted-foreground mt-2">
          Send announcements and updates to workspace members
        </p>
      </div>

      {/* Composer */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 text-gray-900">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>New Announcement</CardTitle>
              <CardDescription>Compose a message to workspace members</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CommunicationComposer
            workspaceSlug={slug}
            allowedScopes={['WORKSPACE']}
            defaultScope="WORKSPACE"
            defaultAudience="ALL"
          />
        </CardContent>
      </Card>

      {/* Recent Communications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Recent Announcements</CardTitle>
              <CardDescription>Your recently sent messages</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentCommunications.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">
                No announcements yet
              </h3>
              <p className="text-sm text-gray-600">
                Your sent announcements will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentCommunications.map((comm) => {
                const senderName = comm.sender
                  ? comm.sender.displayName ||
                    `${comm.sender.firstName || ''} ${comm.sender.lastName || ''}`.trim() ||
                    comm.sender.email
                  : 'System'

                const getPriorityConfig = () => {
                  const priority = comm.priority || 'NORMAL'
                  switch (priority) {
                    case 'URGENT':
                      return {
                        label: 'Urgent',
                        className: 'bg-red-100 text-red-800',
                        icon: AlertCircle
                      }
                    case 'IMPORTANT':
                      return {
                        label: 'Important',
                        className: 'bg-orange-100 text-orange-800',
                        icon: Bell
                      }
                    default:
                      return null
                  }
                }

                const priorityConfig = getPriorityConfig()

                return (
                  <div
                    key={comm.id}
                    className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{comm.subject}</h3>
                          {priorityConfig && (
                            <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded flex items-center gap-1 ${priorityConfig.className}`}>
                              {priorityConfig.icon && <priorityConfig.icon className="w-3 h-3" />}
                              {priorityConfig.label}
                            </span>
                          )}
                          <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {comm.scope}
                          </span>
                          <span className="shrink-0 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            {comm.audience}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{comm.message}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>Sent by {senderName}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(comm.sentAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
