'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, ExternalLink, Activity } from 'lucide-react';
import { getUserDisplayName } from '@/lib/user-utils';
import { formatDistanceToNow } from 'date-fns';

interface AuditEvent {
  id: string;
  type: string;
  metadata: any;
  createdAt: Date;
  User_ActivityEvent_actorUserIdToUser?: {
    id: string;
    email: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  } | null;
  Workspace?: {
    id: string;
    slug: string;
    name: string;
  } | null;
  Challenge?: {
    id: string;
    title: string;
  } | null;
}

interface AuditLogData {
  events: AuditEvent[];
  total: number;
  pages: number;
  currentPage: number;
}

interface Workspace {
  id: string;
  slug: string;
  name: string;
}

interface AuditLogTableProps {
  auditLog: AuditLogData;
  workspaces: Workspace[];
  currentFilters: {
    eventType: string;
    workspaceId: string;
  };
}

export function AuditLogTable({ auditLog, workspaces, currentFilters }: AuditLogTableProps) {
  const router = useRouter();
  const [eventType, setEventType] = useState(currentFilters.eventType);
  const [workspaceId, setWorkspaceId] = useState(currentFilters.workspaceId);

  const getEventDescription = (event: AuditEvent) => {
    const actor = event.User_ActivityEvent_actorUserIdToUser
      ? getUserDisplayName(event.User_ActivityEvent_actorUserIdToUser)
      : 'System';

    switch (event.type) {
      case 'CHALLENGE_CREATED':
        return `${actor} created a new challenge`;
      case 'CHALLENGE_UPDATED':
        return `${actor} updated a challenge`;
      case 'CHALLENGE_DELETED':
        return `${actor} deleted a challenge`;
      case 'ENROLLMENT_CREATED':
        return `${actor} enrolled in a challenge`;
      case 'POINTS_AWARDED':
        return `Points were awarded to ${actor}`;
      case 'REWARD_ISSUED':
        return `Reward was issued to ${actor}`;
      case 'WORKSPACE_CREATED':
        return `${actor} created a workspace`;
      case 'USER_JOINED':
        return `${actor} joined the workspace`;
      default:
        return event.type.replace(/_/g, ' ').toLowerCase();
    }
  };

  const handleFilterChange = (newEventType: string, newWorkspaceId: string) => {
    const params = new URLSearchParams();
    if (newEventType !== 'ALL') params.set('eventType', newEventType);
    if (newWorkspaceId !== 'ALL') params.set('workspaceId', newWorkspaceId);
    router.push(`/admin/audit-log${params.toString() ? '?' + params.toString() : ''}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    params.set('page', page.toString());
    if (eventType !== 'ALL') params.set('eventType', eventType);
    if (workspaceId !== 'ALL') params.set('workspaceId', workspaceId);
    router.push(`/admin/audit-log?${params.toString()}`);
  };

  const getEventTypeColor = (type: string) => {
    const typeMap: Record<string, string> = {
      'CHALLENGE_CREATED': 'text-green-700 bg-green-50',
      'CHALLENGE_UPDATED': 'text-blue-700 bg-blue-50',
      'CHALLENGE_DELETED': 'text-red-700 bg-red-50',
      'ENROLLMENT_CREATED': 'text-purple-700 bg-purple-50',
      'POINTS_AWARDED': 'text-amber-700 bg-amber-50',
      'REWARD_ISSUED': 'text-emerald-700 bg-emerald-50',
      'WORKSPACE_CREATED': 'text-indigo-700 bg-indigo-50',
      'USER_JOINED': 'text-cyan-700 bg-cyan-50',
    };
    return typeMap[type] || 'text-gray-700 bg-gray-50';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={eventType}
          onValueChange={(v) => {
            setEventType(v);
            handleFilterChange(v, workspaceId);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by event type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Event Types</SelectItem>
            <SelectItem value="CHALLENGE_CREATED">Challenge Created</SelectItem>
            <SelectItem value="CHALLENGE_UPDATED">Challenge Updated</SelectItem>
            <SelectItem value="ENROLLMENT_CREATED">Enrollment Created</SelectItem>
            <SelectItem value="POINTS_AWARDED">Points Awarded</SelectItem>
            <SelectItem value="REWARD_ISSUED">Reward Issued</SelectItem>
            <SelectItem value="WORKSPACE_CREATED">Workspace Created</SelectItem>
            <SelectItem value="USER_JOINED">User Joined</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={workspaceId}
          onValueChange={(v) => {
            setWorkspaceId(v);
            handleFilterChange(eventType, v);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Workspaces</SelectItem>
            {workspaces.map((workspace) => (
              <SelectItem key={workspace.id} value={workspace.id}>
                {workspace.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {auditLog.events.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Activity className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No audit events found
            </h3>
            <p className="text-sm text-gray-600 text-center max-w-md">
              No events match your current filters. Try adjusting the filters or check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="border border-purple-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-purple-50">
                <TableHead className="font-semibold text-purple-900">Event Type</TableHead>
                <TableHead className="font-semibold text-purple-900">Description</TableHead>
                <TableHead className="font-semibold text-purple-900">Actor</TableHead>
                <TableHead className="font-semibold text-purple-900">Workspace</TableHead>
                <TableHead className="font-semibold text-purple-900">Time</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLog.events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventTypeColor(
                        event.type
                      )}`}
                    >
                      {event.type.replace(/_/g, ' ')}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-md">
                      <p className="text-sm text-gray-900">{getEventDescription(event)}</p>
                      {event.Challenge && (
                        <p className="text-xs text-gray-500 mt-1">
                          Challenge: {event.Challenge.title}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {event.User_ActivityEvent_actorUserIdToUser ? (
                      <div>
                        <p className="text-sm text-gray-900">
                          {getUserDisplayName(event.User_ActivityEvent_actorUserIdToUser)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {event.User_ActivityEvent_actorUserIdToUser.email}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">System</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {event.Workspace ? (
                      <Link
                        href={`/admin/workspaces/${event.Workspace.id}`}
                        className="text-sm text-purple-700 hover:text-purple-900 hover:underline"
                      >
                        {event.Workspace.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-400">N/A</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                    </span>
                  </TableCell>
                  <TableCell>
                    {event.Workspace && (
                      <Link href={`/w/${event.Workspace.slug}/admin/dashboard`}>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {auditLog.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(auditLog.currentPage - 1) * 50 + 1} to{' '}
            {Math.min(auditLog.currentPage * 50, auditLog.total)} of {auditLog.total} events
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(auditLog.currentPage - 1)}
              disabled={auditLog.currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(auditLog.currentPage + 1)}
              disabled={auditLog.currentPage === auditLog.pages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
