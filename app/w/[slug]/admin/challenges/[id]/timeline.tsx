'use client'

import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, Calendar, CheckCircle, Clock, Mail, FileText, UserPlus, UserMinus, Filter, Loader2 } from 'lucide-react'

type EventType =
  | 'INVITE_SENT'
  | 'INVITE_REDEEMED'
  | 'ENROLLED'
  | 'UNENROLLED'
  | 'SUBMISSION_CREATED'
  | 'SUBMISSION_APPROVED'
  | 'SUBMISSION_REJECTED'
  | 'CHALLENGE_CREATED'
  | 'CHALLENGE_DUPLICATED'
  | 'CHALLENGE_UPDATED'
  | 'CHALLENGE_PUBLISHED'
  | 'CHALLENGE_UNPUBLISHED'
  | 'CHALLENGE_ARCHIVED'
  | 'RBAC_ROLE_CHANGED'

export interface TimelineEvent {
  id: string
  type: EventType
  createdAt: string | Date
  user?: { email?: string } | null
  actor?: { email?: string } | null
}

function iconFor(type: EventType) {
  switch (type) {
    case 'INVITE_SENT':
      return <Mail className="h-4 w-4 text-coral-500" />
    case 'INVITE_REDEEMED':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'ENROLLED':
      return <UserPlus className="h-4 w-4 text-green-600" />
    case 'UNENROLLED':
      return <UserMinus className="h-4 w-4 text-gray-500" />
    case 'SUBMISSION_CREATED':
      return <FileText className="h-4 w-4 text-blue-600" />
    case 'SUBMISSION_APPROVED':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'SUBMISSION_REJECTED':
      return <CheckCircle className="h-4 w-4 text-red-600" />
    case 'CHALLENGE_CREATED':
    case 'CHALLENGE_DUPLICATED':
    case 'CHALLENGE_UPDATED':
      return <Activity className="h-4 w-4 text-purple-600" />
    case 'CHALLENGE_PUBLISHED':
    case 'CHALLENGE_UNPUBLISHED':
    case 'CHALLENGE_ARCHIVED':
      return <Calendar className="h-4 w-4 text-amber-600" />
    case 'RBAC_ROLE_CHANGED':
      return <Activity className="h-4 w-4 text-gray-600" />
    default:
      return <Clock className="h-4 w-4 text-gray-400" />
  }
}

type FilterKey = 'ALL' | 'STATUS' | 'INVITES' | 'SUBMISSIONS' | 'REVIEWS'

export function Timeline({ events }: { events: TimelineEvent[] }) {
  const [filter, setFilter] = useState<FilterKey>('ALL')
  const [limit, setLimit] = useState(50)

  const filtered = useMemo(() => {
    let evs = events.slice()
    // De-duplicate consecutive CHALLENGE_UPDATED
    evs = evs.filter((e, idx, arr) => {
      if (e.type !== 'CHALLENGE_UPDATED') return true
      const prev = arr[idx - 1]
      return !(prev && prev.type === 'CHALLENGE_UPDATED')
    })

    // Apply filter
    if (filter === 'STATUS') {
      evs = evs.filter(e => e.type.startsWith('CHALLENGE_'))
    } else if (filter === 'INVITES') {
      evs = evs.filter(e => e.type === 'INVITE_SENT' || e.type === 'INVITE_REDEEMED' || e.type === 'ENROLLED' || e.type === 'UNENROLLED')
    } else if (filter === 'SUBMISSIONS') {
      evs = evs.filter(e => e.type === 'SUBMISSION_CREATED')
    } else if (filter === 'REVIEWS') {
      evs = evs.filter(e => e.type === 'SUBMISSION_APPROVED' || e.type === 'SUBMISSION_REJECTED')
    }

    return evs
  }, [events, filter])

  const groupedByDay = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>()
    for (const e of filtered) {
      const d = new Date(e.createdAt)
      const key = format(d, 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    // Keep original order (events are expected desc by createdAt)
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [filtered])

  const visibleGroups = groupedByDay.flatMap(([day, evs]) => evs.map((e, i) => ({ day, e, i }))).slice(0, limit)
  const visibleByDay = visibleGroups.reduce<Record<string, TimelineEvent[]>>((acc, cur) => {
    acc[cur.day] = acc[cur.day] || []
    acc[cur.day].push(cur.e)
    return acc
  }, {})

  const canLoadMore = groupedByDay.flatMap(([, evs]) => evs).length > limit

  const renderLabel = (ev: TimelineEvent) => {
    const actor = ev.actor?.email || 'system'
    const subject = ev.user?.email
    switch (ev.type) {
      case 'INVITE_SENT': return `${actor} sent invite`
      case 'INVITE_REDEEMED': return `${subject || 'user'} redeemed invite`
      case 'ENROLLED': return `${subject || 'user'} enrolled`
      case 'UNENROLLED': return `${subject || 'user'} unenrolled`
      case 'SUBMISSION_CREATED': return `${subject || 'user'} submitted an activity`
      case 'SUBMISSION_APPROVED': return `${actor} approved a submission`
      case 'SUBMISSION_REJECTED': return `${actor} rejected a submission`
      case 'CHALLENGE_CREATED': return `${actor} created the challenge`
      case 'CHALLENGE_DUPLICATED': return `${actor} duplicated a challenge`
      case 'CHALLENGE_UPDATED': return `${actor} updated the challenge`
      case 'CHALLENGE_PUBLISHED': return `${actor} published the challenge`
      case 'CHALLENGE_UNPUBLISHED': return `${actor} unpublished the challenge`
      case 'CHALLENGE_ARCHIVED': return `${actor} archived the challenge`
      case 'RBAC_ROLE_CHANGED': return `${actor} changed a role`
      default: return ev.type.replace('_', ' ').toLowerCase()
    }
  }

  const filterButton = (key: FilterKey, label: string) => (
    <Button
      key={key}
      variant={filter === key ? 'default' : 'outline'}
      size="sm"
      onClick={() => setFilter(key)}
    >
      {label}
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        {filterButton('ALL', 'All')}
        {filterButton('STATUS', 'Status')}
        {filterButton('INVITES', 'Invites/Enrollments')}
        {filterButton('SUBMISSIONS', 'Submissions')}
        {filterButton('REVIEWS', 'Reviews')}
      </div>

      {Object.entries(visibleByDay).map(([day, evs]) => (
        <div key={day} className="space-y-2">
          <div className="text-xs font-semibold text-gray-500">{format(new Date(day), 'EEEE, MMM d')}</div>
          <ol className="space-y-3">
            {evs.map((ev) => (
              <li key={ev.id} className="flex items-start gap-3">
                <div className="mt-1">
                  {iconFor(ev.type)}
                </div>
                <div>
                  <div className="text-xs text-gray-500">{format(new Date(ev.createdAt), 'h:mm a')}</div>
                  <div className="text-sm text-gray-700">{renderLabel(ev)}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}

      {canLoadMore && (
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={() => setLimit(l => l + 50)}>
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}


