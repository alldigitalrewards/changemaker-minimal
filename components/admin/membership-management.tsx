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
import { RoleBadge } from '@/components/ui/role-badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, ExternalLink, Star } from 'lucide-react';

interface User {
  id: string;
  email: string;
  createdAt: Date;
  memberships: {
    workspace: {
      id: string;
      slug: string;
      name: string;
    };
    role: string;
    isPrimary: boolean;
  }[];
}

interface MembershipManagementProps {
  users: User[];
}

type RoleFilter = 'ALL' | 'ADMIN' | 'PARTICIPANT';

export function MembershipManagement({ users }: MembershipManagementProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [workspaceFilter, setWorkspaceFilter] = useState<string>('ALL');

  // Get unique workspaces from all memberships
  const allWorkspaces = Array.from(
    new Map(
      users
        .flatMap((u) => u.memberships)
        .map((m) => [m.workspace.id, m.workspace])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Filter users
  const filteredUsers = users.filter((user) => {
    // Search filter
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase());

    // Role filter
    const matchesRole =
      roleFilter === 'ALL' ||
      user.memberships.some((m) => m.role === roleFilter);

    // Workspace filter
    const matchesWorkspace =
      workspaceFilter === 'ALL' ||
      user.memberships.some((m) => m.workspace.id === workspaceFilter);

    return matchesSearch && matchesRole && matchesWorkspace;
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
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUsers.map((u) => u.id)));
    }
  };

  const handleBulkAction = async (action: 'change-role' | 'add-workspace' | 'remove-workspace') => {
    // TODO: Implement bulk actions
    console.log(`Bulk ${action}:`, Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by workspace" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Workspaces</SelectItem>
            {allWorkspaces.map((ws) => (
              <SelectItem key={ws.id} value={ws.id}>
                {ws.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as RoleFilter)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="ADMIN">Admins</SelectItem>
            <SelectItem value="PARTICIPANT">Participants</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
          <span className="text-sm font-medium text-purple-700">
            {selectedIds.size} user{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2 ml-auto">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('change-role')}
              className="border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              Change Role
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('add-workspace')}
              className="border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              Add to Workspace
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('remove-workspace')}
              className="border-red-300 text-red-700 hover:bg-red-50"
            >
              Remove from Workspace
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
                  checked={selectedIds.size === filteredUsers.length && filteredUsers.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead className="font-semibold text-purple-900">Email</TableHead>
              <TableHead className="font-semibold text-purple-900">Workspaces</TableHead>
              <TableHead className="font-semibold text-purple-900">Roles</TableHead>
              <TableHead className="font-semibold text-purple-900">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const primaryWorkspace = user.memberships.find((m) => m.isPrimary);

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(user.id)}
                        onCheckedChange={() => toggleSelection(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-gray-900">{user.email}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {user.memberships.length === 0 ? (
                          <span className="text-sm text-gray-400">No workspaces</span>
                        ) : (
                          user.memberships.map((membership) => (
                            <Link
                              key={membership.workspace.id}
                              href={`/w/${membership.workspace.slug}/admin/participants`}
                              className="text-sm text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
                            >
                              {membership.workspace.name}
                              {membership.isPrimary && (
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              )}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.memberships.length === 0 ? (
                          <span className="text-sm text-gray-400">-</span>
                        ) : (
                          user.memberships.map((membership) => (
                            <RoleBadge
                              key={membership.workspace.id}
                              role={membership.role as 'ADMIN' | 'PARTICIPANT'}
                            />
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
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
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </div>
  );
}
