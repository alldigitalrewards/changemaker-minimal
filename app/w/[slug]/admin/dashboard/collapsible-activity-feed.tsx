'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, Activity } from 'lucide-react'
import { ActivityFeed } from './activity-feed'

interface CollapsibleActivityFeedProps {
  workspaceId: string
  slug: string
  events: any[]
  pendingSubmissions: any[]
}

export function CollapsibleActivityFeed({ workspaceId, slug, events, pendingSubmissions }: CollapsibleActivityFeedProps) {
  const [isOpen, setIsOpen] = useState(true)

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-coral-100 text-coral-600' : 'bg-gray-100 text-gray-600'}`}>
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Activity Feed</CardTitle>
              <CardDescription>
                {isOpen ? 'Recent workspace activity and pending submissions' : `${events.length} recent activities, ${pendingSubmissions.length} pending`}
              </CardDescription>
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="pt-0">
          <ActivityFeed
            workspaceId={workspaceId}
            slug={slug}
            events={events}
            pendingSubmissions={pendingSubmissions}
          />
        </CardContent>
      )}
    </Card>
  )
}
