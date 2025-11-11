'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronDown, MessageSquare } from 'lucide-react'
import { CommunicationComposer } from '@/components/communications/communication-composer'

interface AnnouncementComposerProps {
  slug: string
}

export function AnnouncementComposer({ slug }: AnnouncementComposerProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-gray-100 text-gray-900' : 'bg-gray-100 text-gray-600'}`}>
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Workspace announcement</CardTitle>
              <CardDescription>
                {isOpen ? 'Compose message to workspace members' : 'Send updates to your team'}
              </CardDescription>
            </div>
          </div>
          <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent>
          <CommunicationComposer
            workspaceSlug={slug}
            allowedScopes={['WORKSPACE']}
            defaultScope="WORKSPACE"
            defaultAudience="ALL"
          />
        </CardContent>
      )}
    </Card>
  )
}
