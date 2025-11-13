'use client'

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Award,
  DollarSign,
  Package,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { RewardIssuanceDialog } from './reward-issuance-dialog';
import { RewardIssuanceDetailDialog } from './reward-issuance-detail-dialog';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
}

interface RewardIssuance {
  id: string;
  userId: string;
  workspaceId: string;
  challengeId: string | null;
  amount: number | null;
  status: string;
  type: string;
  skuId: string | null;
  description: string | null;
  rewardStackTransactionId: string | null;
  createdAt: Date;
  issuedAt: Date | null;
  User: User;
  IssuedByUser: User | null;
  Challenge?: { id: string; title: string } | null;
}

interface Workspace {
  id: string;
  name: string;
  slug: string;
  rewardStackEnabled: boolean;
}

interface StatusCounts {
  PENDING: number;
  ISSUED: number;
  FAILED: number;
  CANCELLED: number;
}

interface PlatformRewardsClientProps {
  workspace: Workspace;
  issuances: RewardIssuance[];
  totalCount: number;
  statusCounts: StatusCounts;
  totalIssued: number;
  page: number;
  pageSize: number;
}

export function PlatformRewardsClient({
  workspace,
  issuances,
  totalCount,
  statusCounts,
  totalIssued,
  page,
  pageSize,
}: PlatformRewardsClientProps) {
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardIssuance | null>(null);
  const [localIssuances, setLocalIssuances] = useState(issuances);

  const handleIssueSuccess = () => {
    // Refresh the page to show new issuance
    window.location.reload();
  };

  const handleRowClick = (reward: RewardIssuance) => {
    setSelectedReward(reward);
    setDetailDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Issued
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Failed
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getUserDisplayName = (user: User | null) => {
    if (!user) return 'System';
    if (user.displayName) return user.displayName;
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.email;
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const skip = (page - 1) * pageSize;

  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/admin/workspaces" className="hover:text-purple-700">
              Workspaces
            </Link>
            <span>/</span>
            <Link
              href={`/admin/workspaces/${workspace.id}`}
              className="hover:text-purple-700"
            >
              {workspace.name}
            </Link>
            <span>/</span>
            <span className="text-gray-900">Rewards</span>
          </div>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">Reward Issuances</h1>
                {workspace.rewardStackEnabled && (
                  <Badge className="bg-emerald-100 text-emerald-800 flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    RewardSTACK Enabled
                  </Badge>
                )}
              </div>
              <p className="text-gray-600">
                Monitor and manage reward issuances for {workspace.name}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIssueDialogOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Issue Reward
              </Button>
              <Link href={`/admin/workspaces/${workspace.id}`}>
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Issued</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${(totalIssued / 100).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {statusCounts.ISSUED} successful issuances
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.PENDING}</div>
              <p className="text-xs text-muted-foreground">Awaiting processing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statusCounts.FAILED}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
              <p className="text-xs text-muted-foreground">All time issuances</p>
            </CardContent>
          </Card>
        </div>

        {/* Issuances Table */}
        <Card>
          <CardHeader>
            <CardTitle>Reward Issuances</CardTitle>
            <CardDescription>
              View all reward issuances for this workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            {localIssuances.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Award className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-lg font-medium mb-2">No rewards issued yet</p>
                <p className="text-sm">
                  Rewards issued in this workspace will appear here
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr className="text-left">
                        <th className="pb-3 text-sm font-medium text-gray-600">
                          Recipient
                        </th>
                        <th className="pb-3 text-sm font-medium text-gray-600">Type</th>
                        <th className="pb-3 text-sm font-medium text-gray-600">
                          Amount
                        </th>
                        <th className="pb-3 text-sm font-medium text-gray-600">
                          Status
                        </th>
                        <th className="pb-3 text-sm font-medium text-gray-600">
                          Issued By
                        </th>
                        <th className="pb-3 text-sm font-medium text-gray-600">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {localIssuances.map((issuance) => (
                        <tr
                          key={issuance.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => handleRowClick(issuance)}
                        >
                          <td className="py-4">
                            <div>
                              <p className="font-medium text-gray-900">
                                {getUserDisplayName(issuance.User)}
                              </p>
                              <p className="text-sm text-gray-500">
                                {issuance.User.email}
                              </p>
                            </div>
                          </td>
                          <td className="py-4">
                            <Badge variant="outline" className="capitalize">
                              {issuance.type}
                            </Badge>
                          </td>
                          <td className="py-4">
                            {issuance.type === 'points' ? (
                              <span className="font-medium">
                                {issuance.amount ?? 0} pts
                              </span>
                            ) : (
                              <span className="font-medium">
                                ${((issuance.amount ?? 0) / 100).toFixed(2)}
                              </span>
                            )}
                          </td>
                          <td className="py-4">{getStatusBadge(issuance.status)}</td>
                          <td className="py-4">
                            <span className="text-sm text-gray-600">
                              {getUserDisplayName(issuance.IssuedByUser)}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className="text-sm text-gray-600">
                              {new Date(issuance.createdAt).toLocaleDateString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t">
                    <p className="text-sm text-gray-600">
                      Showing {skip + 1} to {Math.min(skip + pageSize, totalCount)} of{' '}
                      {totalCount} results
                    </p>
                    <div className="flex gap-2">
                      {page > 1 && (
                        <Link href={`?page=${page - 1}`}>
                          <Button variant="outline" size="sm">
                            Previous
                          </Button>
                        </Link>
                      )}
                      {page < totalPages && (
                        <Link href={`?page=${page + 1}`}>
                          <Button variant="outline" size="sm">
                            Next
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <RewardIssuanceDialog
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
        onSuccess={handleIssueSuccess}
        workspaceSlug={workspace.slug}
      />
      <RewardIssuanceDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        reward={selectedReward as any}
      />
    </>
  );
}
