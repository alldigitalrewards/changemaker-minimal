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
import { AlertCircle, Bell, Info, Calendar, CheckCircle } from "lucide-react"

interface AnnouncementCardProps {
  communication: {
    id: string
    subject: string
    message: string
    sentAt: Date
    scope: string
    priority?: string
    tldr?: string | null
    highlights?: any
    aiDates?: any
    aiActions?: any
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

  // Parse AI-generated data
  const highlights = communication.highlights ? (Array.isArray(communication.highlights) ? communication.highlights : []) : []
  const dates = communication.aiDates ? (Array.isArray(communication.aiDates) ? communication.aiDates : []) : []
  const actions = communication.aiActions ? (Array.isArray(communication.aiActions) ? communication.aiActions : []) : []

  return (
    <>
      <div
        onClick={() => setIsOpen(true)}
        className={`border border-l-4 ${priorityConfig.borderColor} rounded-lg p-3 space-y-2 cursor-pointer hover:border-coral-300 hover:bg-coral-50/30 transition-all duration-200`}
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

        {/* TL;DR */}
        {communication.tldr && (
          <div className="bg-blue-50 border border-blue-200 rounded p-2">
            <p className="text-xs font-semibold text-blue-900 mb-1">TL;DR</p>
            <p className="text-sm text-blue-800">{communication.tldr}</p>
          </div>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <ul className="text-sm text-gray-700 space-y-1 pl-4">
            {highlights.slice(0, 3).map((highlight: string, index: number) => (
              <li key={index} className="list-disc">{highlight}</li>
            ))}
          </ul>
        )}

        {/* Action Chips */}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {actions.slice(0, 2).map((action: any, index: number) => (
              <Badge
                key={index}
                variant="outline"
                className={action.urgent ? "bg-orange-100 text-orange-800 border-orange-300" : "bg-gray-100 text-gray-700"}
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                {action.action}
              </Badge>
            ))}
            {actions.length > 2 && (
              <Badge variant="outline" className="bg-gray-100 text-gray-600">
                +{actions.length - 2} more
              </Badge>
            )}
          </div>
        )}

        {/* Date Badges */}
        {dates.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {dates.slice(0, 2).map((dateItem: any, index: number) => (
              <Badge key={index} variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                <Calendar className="w-3 h-3 mr-1" />
                {dateItem.date}: {dateItem.description}
              </Badge>
            ))}
          </div>
        )}

        {!communication.tldr && !highlights.length && (
          <div className="text-sm text-gray-700 line-clamp-3 mt-1 prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {communication.message}
            </ReactMarkdown>
          </div>
        )}

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
            {/* TL;DR in dialog */}
            {communication.tldr && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3">
                <p className="text-sm font-semibold text-blue-900 mb-2">TL;DR</p>
                <p className="text-base text-blue-800">{communication.tldr}</p>
              </div>
            )}

            {/* Highlights in dialog */}
            {highlights.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded p-3">
                <p className="text-sm font-semibold text-gray-900 mb-2">Key Highlights</p>
                <ul className="text-sm text-gray-700 space-y-1 pl-4">
                  {highlights.map((highlight: string, index: number) => (
                    <li key={index} className="list-disc">{highlight}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Items in dialog */}
            {actions.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded p-3">
                <p className="text-sm font-semibold text-orange-900 mb-2">Action Items</p>
                <div className="space-y-2">
                  {actions.map((action: any, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckCircle className={`w-4 h-4 mt-0.5 shrink-0 ${action.urgent ? 'text-orange-600' : 'text-gray-600'}`} />
                      <span className="text-sm text-gray-700">
                        {action.action}
                        {action.urgent && <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-800 border-orange-300 text-xs">Urgent</Badge>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Important Dates in dialog */}
            {dates.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded p-3">
                <p className="text-sm font-semibold text-purple-900 mb-2">Important Dates</p>
                <div className="space-y-2">
                  {dates.map((dateItem: any, index: number) => (
                    <div key={index} className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 mt-0.5 text-purple-600 shrink-0" />
                      <div className="text-sm">
                        <span className="font-medium text-purple-900">{dateItem.date}</span>
                        <span className="text-gray-700"> — {dateItem.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Message */}
            <div className="prose prose-sm max-w-none text-gray-700">
              <p className="text-sm font-semibold text-gray-900 mb-2">Full Message</p>
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
