"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CoralButton } from "@/components/ui/coral-button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Eye, Shield, UserCheck, Users, Upload, UserPlus, X } from "lucide-react"
import Link from "next/link"
import { getUserDisplayName } from "@/lib/user-utils"
import { AddParticipantPanel } from "./add-participant-panel"
import { BulkInvitePanel } from "./bulk-invite-panel"
import { ParticipantManagementDialog } from "./participant-management-dialog"

type PanelType = "add" | "bulk" | null

type ParticipantRow = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  displayName: string | null
  role: string
  enrollments: Array<{
    status: string
    Challenge: { title: string }
  }>
  createdAt: Date
  isPending: boolean
  totalPoints: number
  availablePoints: number
}

interface ParticipantsClientProps {
  slug: string
  participants: ParticipantRow[]
  pointsFilter: string
  sort: string
  dir: "asc" | "desc"
}

export function ParticipantsClient({
  slug,
  participants,
  pointsFilter,
  sort,
  dir,
}: ParticipantsClientProps) {
  const [activePanel, setActivePanel] = useState<PanelType>(null)

  const togglePanel = (panel: PanelType) => {
    setActivePanel(activePanel === panel ? null : panel)
  }

  // Query string builder - handles URL parameters for filtering and sorting
  const qs = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    if (pointsFilter) p.set('points', pointsFilter)
    if (sort) p.set('sort', sort)
    if (dir) p.set('dir', dir)
    Object.entries(overrides).forEach(([k, v]) => {
      if (v === undefined || v === '') p.delete(k)
      else p.set(k, v)
    })
    const s = p.toString()
    return s ? `?${s}` : ''
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>All Participants</CardTitle>
            <CardDescription>View and manage workspace participants</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Filters (MVP) */}
            <form className="hidden md:flex items-center gap-2" method="GET">
              <select name="status" className="border rounded px-2 py-1 text-sm">
                <option value="">All statuses</option>
                <option value="INVITED">Invited</option>
                <option value="ENROLLED">Enrolled</option>
                <option value="WITHDRAWN">Withdrawn</option>
              </select>
              <input type="text" name="email" placeholder="Filter by email" className="border rounded px-2 py-1 text-sm" />
              <select name="points" defaultValue={pointsFilter} className="border rounded px-2 py-1 text-sm">
                <option value="">All points</option>
                <option value="has">Has points</option>
                <option value="none">0 points</option>
              </select>
            </form>
            <a href={`/api/workspaces/${slug}/participants/export`} className="border rounded px-2 py-1 text-sm">Export CSV</a>

            <Button
              variant={activePanel === "bulk" ? "default" : "outline"}
              className="gap-2"
              onClick={() => togglePanel("bulk")}
            >
              <Upload className="h-4 w-4" />
              Bulk Invite
            </Button>

            <CoralButton
              variant={activePanel === "add" ? "default" : "outline"}
              onClick={() => togglePanel("add")}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Participant
            </CoralButton>
          </div>
        </div>
      </CardHeader>

      {/* Inline Panels */}
      {activePanel === "add" && (
        <div className="border-b bg-gray-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Participant</h3>
              <Button variant="ghost" size="sm" onClick={() => setActivePanel(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AddParticipantPanel slug={slug} onClose={() => setActivePanel(null)} />
          </div>
        </div>
      )}

      {activePanel === "bulk" && (
        <div className="border-b bg-gray-50">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Bulk Invite Participants</h3>
              <Button variant="ghost" size="sm" onClick={() => setActivePanel(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <BulkInvitePanel slug={slug} onClose={() => setActivePanel(null)} />
          </div>
        </div>
      )}

      <CardContent>
        {participants.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">{/* Bulk select placeholder */}</TableHead>
                <TableHead>Participant</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>
                  <Link href={qs({ sort: 'points-avail', dir: sort === 'points-avail' && dir === 'asc' ? 'desc' : 'asc' })} className="underline-offset-2 hover:underline">Points</Link>
                </TableHead>
                <TableHead>Enrollments</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {participants.map((participant) => (
                <TableRow
                  key={participant.id}
                  className="hover:bg-gray-50"
                >
                  <TableCell><input type="checkbox" /></TableCell>
                  <TableCell>
                    <Link href={`/w/${slug}/admin/participants/${participant.id}`} className="block">
                      <div>
                        <p className="font-medium">{getUserDisplayName(participant)}</p>
                        <p className="text-sm text-gray-500">{participant.email}</p>
                        <p className="text-sm text-gray-500">
                      {participant.enrollments.length} enrollment{participant.enrollments.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/w/${slug}/admin/participants/${participant.id}`} className="block">
                      <Badge
                        variant="outline"
                        className={
                          participant.role === "ADMIN"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : participant.role === "MANAGER"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-gray-100 text-gray-800 border-gray-200"
                        }
                      >
                        {participant.role === "ADMIN" ? (
                          <Shield className="h-3 w-3 mr-1" />
                        ) : participant.role === "MANAGER" ? (
                          <Users className="h-3 w-3 mr-1" />
                        ) : (
                          <UserCheck className="h-3 w-3 mr-1" />
                        )}
                        {participant.role}
                      </Badge>
                      {participant.isPending && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-yellow-50 px-2 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-200">Pending</span>
                      )}
                    </Link>
                  </TableCell>
                  {/* Points balance */}
                  <TableCell>
                    <Link href={`/w/${slug}/admin/participants/${participant.id}`} className="block">
                  <span className="text-sm text-gray-700" title={`Available / Total`}>
                    {participant.availablePoints}/{participant.totalPoints}
                  </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/w/${slug}/admin/participants/${participant.id}`} className="block">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          {participant.enrollments.length}
                        </Badge>
                        {participant.enrollments.length > 0 && (
                          <div className="flex gap-1">
                            {participant.enrollments.filter(e => e.status === 'ENROLLED').length > 0 && (
                              <div className="h-2 w-2 rounded-full bg-green-500" title={`${participant.enrollments.filter(e => e.status === 'ENROLLED').length} active`}></div>
                            )}
                            {participant.enrollments.filter(e => e.status === 'INVITED').length > 0 && (
                              <div className="h-2 w-2 rounded-full bg-yellow-500" title={`${participant.enrollments.filter(e => e.status === 'INVITED').length} invited`}></div>
                            )}
                            {participant.enrollments.filter(e => e.status === 'WITHDRAWN').length > 0 && (
                              <div className="h-2 w-2 rounded-full bg-blue-500" title={`${participant.enrollments.filter(e => e.status === 'WITHDRAWN').length} completed`}></div>
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/w/${slug}/admin/participants/${participant.id}`} className="block">
                      <span className="text-sm text-gray-500">
                        {new Date(participant.createdAt).toLocaleDateString()}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/w/${slug}/admin/participants/${participant.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {participant.role === "PARTICIPANT" && (
                        <ParticipantManagementDialog
                          slug={slug}
                          mode="remove"
                          participantId={participant.id}
                          participantEmail={participant.email}
                        />
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-center py-8 text-gray-500">
            No participants in this workspace yet
          </p>
        )}
      </CardContent>
    </Card>
  )
}
