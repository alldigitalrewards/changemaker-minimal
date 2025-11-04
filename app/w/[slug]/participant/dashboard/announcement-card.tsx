"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface AnnouncementCardProps {
  communication: {
    id: string
    subject: string
    message: string
    sentAt: Date
    scope: string
    sender?: {
      email: string
      firstName?: string | null
      lastName?: string | null
      displayName?: string | null
    } | null
    challenge?: {
      title: string
    } | null
  }
}

export function AnnouncementCard({ communication }: AnnouncementCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getScopeLabel = () => {
    if (communication.scope === 'WORKSPACE') return 'Workspace Announcement'
    if (communication.scope === 'CHALLENGE') {
      return `Challenge Update${communication.challenge?.title ? ` · ${communication.challenge.title}` : ''}`
    }
    if (communication.scope === 'ACTIVITY') {
      return `Activity Update${communication.challenge?.title ? ` · ${communication.challenge.title}` : ''}`
    }
    return communication.scope
  }

  const getSenderName = () => {
    if (!communication.sender?.email) return 'System'
    if (communication.sender.displayName) return communication.sender.displayName
    if (communication.sender.firstName || communication.sender.lastName) {
      return [communication.sender.firstName, communication.sender.lastName]
        .filter(Boolean)
        .join(' ')
    }
    return communication.sender.email
  }

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className="border rounded-lg p-3 space-y-1 cursor-pointer hover:border-coral-300 hover:bg-coral-50/30 transition-all duration-200"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm text-gray-900 truncate">
            {communication.subject}
          </span>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {formatDistanceToNow(new Date(communication.sentAt), { addSuffix: true })}
          </span>
        </div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          {getScopeLabel()}
        </div>
        <p className="text-sm text-gray-700 line-clamp-3 mt-1">
          {communication.message}
        </p>
        <div className="text-xs text-gray-400">Sent by {getSenderName()}</div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 mb-2">
              <DialogTitle className="text-xl">{communication.subject}</DialogTitle>
              <Badge variant="outline" className="shrink-0">
                {communication.scope}
              </Badge>
            </div>
            <DialogDescription className="text-xs uppercase tracking-wide">
              {getScopeLabel()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{communication.message}</p>
            </div>
            <div className="flex items-center justify-between pt-4 border-t text-sm text-gray-500">
              <div>Sent by {getSenderName()}</div>
              <div>{formatDistanceToNow(new Date(communication.sentAt), { addSuffix: true })}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
