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
import { Search, ExternalLink, Star, Crown } from 'lucide-react';
import { isPlatformSuperAdmin } from '@/lib/auth/rbac';
import { RoleEditor } from './role-editor';
import { WorkspaceManagerDialog } from './workspace-manager-dialog';
import { BulkUploadDialog } from './bulk-upload-dialog';

interface User {
  id: string;
  email: string;
  createdAt: Date;
  WorkspaceMembership: {
    Workspace: {
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
  const [isLoading, setIsLoading] = useState(false);

  // Get unique workspaces from all memberships
  const allWorkspaces = Array.from(
    new Map(
      users
        .flatMap((u) => u.WorkspaceMembership)
        .map((m) => [m.Workspace.id, m.Workspace])
    ).values()
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Filter users
  const filteredUsers = users.filter((user) => {
    // Search filter
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase());

    // Role filter
    const matchesRole =
      roleFilter === 'ALL' ||
      user.WorkspaceMembership.some((m) => m.role === roleFilter);

    // Workspace filter
    const matchesWorkspace =
      workspaceFilter === 'ALL' ||
      user.WorkspaceMembership.some((m) => m.Workspace.id === workspaceFilter);

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

  const handleGrantSuperadmin = async (userId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/superadmin`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to grant superadmin access');
      }

      // Refresh the page to show updated status
      window.location.reload();
    } catch (error) {
      console.error('Error granting superadmin:', error);
      alert('Failed to grant superadmin access');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSuperadmin = async (userId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/superadmin`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke superadmin access');
      }

      // Refresh the page to show updated status
      window.location.reload();
    } catch (error: any) {
      console.error('Error revoking superadmin:', error);
      alert(error.message || 'Failed to revoke superadmin access');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkAction = async (action: 'change-role' | 'add-workspace' | 'remove-workspace') => {
    // TODO: Implement bulk actions
    console.log(`Bulk ${action}:`, Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="space-y-4">
      {/* Bulk Upload Button */}
      <div className="flex justify-end">
        <BulkUploadDialog onUpdate={handleRefresh} />
      </div>

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
              <TableHead className="font-semibold text-purple-900">Platform Admin</TableHead>
              <TableHead className="font-semibold text-purple-900">Workspaces</TableHead>
              <TableHead className="font-semibold text-purple-900">Roles</TableHead>
              <TableHead className="font-semibold text-purple-900">Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => {
                const primaryWorkspace = user.WorkspaceMembership.find((m) => m.isPrimary);
                const isSuperAdmin = isPlatformSuperAdmin([], user.email);

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(user.id)}
                        onCheckedChange={() => toggleSelection(user.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{user.email}</span>
                        {isSuperAdmin && (
                          <span title="Platform Superadmin">
                            <Crown className="h-4 w-4 text-purple-600" />
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {isSuperAdmin ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 border border-purple-300">
                            Superadmin
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs text-gray-500 hover:text-red-600"
                            onClick={() => {
                              if (confirm(`Revoke superadmin access from ${user.email}?`)) {
                                handleRevokeSuperadmin(user.id);
                              }
                            }}
                            disabled={isLoading}
                          >
                            Revoke
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                          onClick={() => {
                            if (confirm(`Grant superadmin access to ${user.email}?`)) {
                              handleGrantSuperadmin(user.id);
                            }
                          }}
                          disabled={isLoading}
                        >
                          Grant Access
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {user.WorkspaceMembership.length === 0 ? (
                          <span className="text-sm text-gray-400">No workspaces</span>
                        ) : (
                          user.WorkspaceMembership.map((membership) => (
                            <Link
                              key={membership.Workspace.id}
                              href={`/w/${membership.Workspace.slug}/admin/participants`}
                              className="text-sm text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1"
                            >
                              {membership.Workspace.name}
                              {membership.isPrimary && (
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              )}
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ))
                        )}
                        <WorkspaceManagerDialog
                          userId={user.id}
                          userEmail={user.email}
                          currentWorkspaces={user.WorkspaceMembership.map(m => m.Workspace)}
                          allWorkspaces={allWorkspaces}
                          onUpdate={handleRefresh}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.WorkspaceMembership.length === 0 ? (
                          <span className="text-sm text-gray-400">-</span>
                        ) : (
                          user.WorkspaceMembership.map((membership) => (
                            <RoleEditor
                              key={membership.Workspace.id}
                              userId={user.id}
                              workspaceId={membership.Workspace.id}
                              currentRole={membership.role as 'ADMIN' | 'PARTICIPANT'}
                              onUpdate={handleRefresh}
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
