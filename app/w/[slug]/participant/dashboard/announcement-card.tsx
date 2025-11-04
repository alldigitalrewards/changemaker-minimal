"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, Bell, Info } from "lucide-react"

interface AnnouncementCardProps {
  communication: {
    id: string
    subject: string
    message: string
    sentAt: Date
    scope: string
    priority?: string
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

  const getPriorityConfig = () => {
    const priority = communication.priority || 'NORMAL'
    switch (priority) {
      case 'URGENT':
        return {
          label: 'Urgent',
          className: 'bg-red-100 text-red-800 border-red-300',
          icon: AlertCircle,
          borderColor: 'border-l-red-500'
        }
      case 'IMPORTANT':
        return {
          label: 'Important',
          className: 'bg-orange-100 text-orange-800 border-orange-300',
          icon: Bell,
          borderColor: 'border-l-orange-500'
        }
      default:
        return {
          label: 'Info',
          className: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: Info,
          borderColor: 'border-l-coral-500'
        }
    }
  }

  const priorityConfig = getPriorityConfig()
  const PriorityIcon = priorityConfig.icon

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className={`border border-l-4 ${priorityConfig.borderColor} rounded-lg p-3 space-y-1 cursor-pointer hover:border-coral-300 hover:bg-coral-50/30 transition-all duration-200`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-semibold text-sm text-gray-900 truncate">
              {communication.subject}
            </span>
            {communication.priority && communication.priority !== 'NORMAL' && (
              <Badge variant="outline" className={`${priorityConfig.className} shrink-0`}>
                <PriorityIcon className="w-3 h-3 mr-1" />
                {priorityConfig.label}
              </Badge>
            )}
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {formatDistanceToNow(new Date(communication.sentAt), { addSuffix: true })}
          </span>
        </div>
        <div className="text-xs text-muted-foreground uppercase tracking-wide">
          {getScopeLabel()}
        </div>
        <div className="text-sm text-gray-700 line-clamp-3 mt-1 prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {communication.message}
          </ReactMarkdown>
        </div>
        <div className="text-xs text-gray-400">Sent by {getSenderName()}</div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4 mb-2">
              <DialogTitle className="text-xl">{communication.subject}</DialogTitle>
              <div className="flex gap-2 shrink-0">
                {communication.priority && communication.priority !== 'NORMAL' && (
                  <Badge variant="outline" className={priorityConfig.className}>
                    <PriorityIcon className="w-3 h-3 mr-1" />
                    {priorityConfig.label}
                  </Badge>
                )}
                <Badge variant="outline">
                  {communication.scope}
                </Badge>
              </div>
            </div>
            <DialogDescription className="text-xs uppercase tracking-wide">
              {getScopeLabel()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="prose prose-sm max-w-none text-gray-700">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {communication.message}
              </ReactMarkdown>
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
