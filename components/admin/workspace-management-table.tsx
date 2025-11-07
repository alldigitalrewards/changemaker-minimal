'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MoreVertical, ExternalLink, Users, Trophy, Search, Award, DollarSign, Settings } from 'lucide-react';
import { getUserDisplayName } from '@/lib/user-utils';

interface Workspace {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  published: boolean;
  rewardStackEnabled: boolean;
  createdAt: Date;
  _count: {
    WorkspaceMembership: number;
    Challenge: number;
  };
  WorkspaceMembership: {
    User: {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      displayName: string | null;
    };
    role: string;
  }[];
}

interface WorkspaceManagementTableProps {
  workspaces: Workspace[];
}

type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
type SortField = 'name' | 'created' | 'members' | 'challenges';
type SortOrder = 'asc' | 'desc';

export function WorkspaceManagementTable({ workspaces }: WorkspaceManagementTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [sortField, setSortField] = useState<SortField>('created');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filter and sort workspaces
  const filteredWorkspaces = workspaces
    .filter((workspace) => {
      // Search filter
      const matchesSearch =
        workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workspace.slug.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && workspace.active && workspace.published) ||
        (statusFilter === 'INACTIVE' && (!workspace.active || !workspace.published)) ||
        (statusFilter === 'ARCHIVED' && !workspace.active && !workspace.published);

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'members':
          comparison = a._count.WorkspaceMembership - b._count.WorkspaceMembership;
          break;
        case 'challenges':
          comparison = a._count.Challenge - b._count.Challenge;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredWorkspaces.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredWorkspaces.map((w) => w.id)));
    }
  };

  const getWorkspaceStatus = (workspace: Workspace): string => {
    if (!workspace.active && !workspace.published) return 'ARCHIVED';
    if (workspace.active && workspace.published) return 'ACTIVE';
    return 'INACTIVE';
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    // TODO: Implement bulk actions
    console.log(`Bulk ${action}:`, Array.from(selectedIds));
    // Clear selection after action
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search workspaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Workspaces</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={`${sortField}-${sortOrder}`}
          onValueChange={(v) => {
            const [field, order] = v.split('-');
            setSortField(field as SortField);
            setSortOrder(order as SortOrder);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created-desc">Newest First</SelectItem>
            <SelectItem value="created-asc">Oldest First</SelectItem>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="members-desc">Most Members</SelectItem>
            <SelectItem value="challenges-desc">Most Challenges</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <span className="text-sm font-medium text-purple-700">
            {selectedIds.size} workspace{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('activate')}
              className="border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              Activate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('deactivate')}
              className="border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              Deactivate
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('delete')}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-purple-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-purple-50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === filteredWorkspaces.length && filteredWorkspaces.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-purple-900">Workspace</TableHead>
              <TableHead className="font-semibold text-purple-900">Status</TableHead>
              <TableHead className="font-semibold text-purple-900">RewardSTACK</TableHead>
              <TableHead className="font-semibold text-purple-900">Members</TableHead>
              <TableHead className="font-semibold text-purple-900">Challenges</TableHead>
              <TableHead className="font-semibold text-purple-900">Admin</TableHead>
              <TableHead className="font-semibold text-purple-900">Created</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredWorkspaces.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                  No workspaces found
                </TableCell>
              </TableRow>
            ) : (
              filteredWorkspaces.map((workspace) => {
                const admin = workspace.WorkspaceMembership.find((m) => m.role === 'ADMIN');
                const status = getWorkspaceStatus(workspace);

                return (
                  <TableRow key={workspace.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(workspace.id)}
                        onCheckedChange={() => toggleSelection(workspace.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <Link
                          href={`/admin/workspaces/${workspace.id}`}
                          className="font-medium text-purple-700 hover:text-purple-900 hover:underline"
                        >
                          {workspace.name}
                        </Link>
                        <span className="text-xs text-gray-500">/w/{workspace.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell>
                      {workspace.rewardStackEnabled ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <Award className="h-4 w-4" />
                          <span>Enabled</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not enabled</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-gray-700">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span>{workspace._count.WorkspaceMembership}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-gray-700">
                        <Trophy className="h-4 w-4 text-gray-500" />
                        <span>{workspace._count.Challenge}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {admin ? (
                        <div>
                          <span className="text-sm text-gray-900">{getUserDisplayName(admin.User)}</span>
                          <p className="text-xs text-gray-500">{admin.User.email}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No admin</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {new Date(workspace.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/workspaces/${workspace.id}`} className="flex items-center gap-2">
                              <Settings className="h-4 w-4" />
                              Manage Workspace
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/workspaces/${workspace.id}?tab=rewardstack`} className="flex items-center gap-2">
                              <Award className="h-4 w-4" />
                              RewardSTACK Config
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/workspaces/${workspace.id}?tab=points`} className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4" />
                              Points Budget
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/w/${workspace.slug}/admin/dashboard`} className="flex items-center gap-2">
                              <ExternalLink className="h-4 w-4" />
                              View as Admin
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Results count */}
      <div className="text-sm text-gray-600">
        Showing {filteredWorkspaces.length} of {workspaces.length} workspaces
      </div>
    </div>
  );
}
