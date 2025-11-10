"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Award,
  Users,
  Package,
  TrendingUp,
  Webhook,
  ExternalLink,
} from "lucide-react";

interface RewardStackStats {
  configured: boolean;
  enabled: boolean;
  environment?: string;
  programId?: string;
  orgId?: string;
  webhookConfigured?: boolean;
  localStats: {
    syncedSkus: number;
    workspaceMembers: number;
    issuedRewards?: number;
  };
  rewardStackStats?: {
    programName?: string;
    programStatus?: string;
    programType?: string;
    availableSkus?: number;
  } | null;
  connectionStatus?: string;
  connectionError?: string;
  lastChecked?: string;
}

interface RewardStackMonitoringProps {
  workspaceId: string;
}

export function RewardStackMonitoring({ workspaceId }: RewardStackMonitoringProps) {
  const [stats, setStats] = useState<RewardStackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/workspaces/${workspaceId}/rewardstack/stats`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load statistics";
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [workspaceId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!stats) {
    return null;
  }

  if (!stats.configured) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          RewardSTACK is not configured for this workspace. Configure credentials
          below to enable integration.
        </AlertDescription>
      </Alert>
    );
  }

  const getConnectionStatusBadge = () => {
    switch (stats.connectionStatus) {
      case "connected":
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Connection Error
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Unknown
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Integration Status
                {stats.enabled && (
                  <Badge className="bg-emerald-100 text-emerald-800">Active</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Real-time connection status and monitoring
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchStats(true)}
              disabled={refreshing}
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection Status</span>
            {getConnectionStatusBadge()}
          </div>

          {stats.connectionError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{stats.connectionError}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <label className="text-sm text-gray-600">Environment</label>
              <p className="text-sm font-medium mt-1">{stats.environment || "N/A"}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Program ID</label>
              <p className="text-sm font-mono font-medium mt-1">
                {stats.programId || "N/A"}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Organization ID</label>
              <p className="text-sm font-mono font-medium mt-1">
                {stats.orgId || "N/A"}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Webhook</label>
              <div className="flex items-center gap-2 mt-1">
                {stats.webhookConfigured ? (
                  <>
                    <Webhook className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      Configured
                    </span>
                  </>
                ) : (
                  <>
                    <Webhook className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">Not configured</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {stats.lastChecked && (
            <p className="text-xs text-gray-500 pt-2 border-t">
              Last checked: {new Date(stats.lastChecked).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* RewardSTACK Program Details */}
      {stats.rewardStackStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              RewardSTACK Program Details
            </CardTitle>
            <CardDescription>
              Information from the connected RewardSTACK program
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-600">Program Name</label>
                <p className="text-sm font-medium mt-1">
                  {stats.rewardStackStats.programName || "Unknown"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Status</label>
                <p className="text-sm font-medium mt-1 capitalize">
                  {stats.rewardStackStats.programStatus || "Unknown"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Type</label>
                <p className="text-sm font-medium mt-1 capitalize">
                  {stats.rewardStackStats.programType || "Unknown"}
                </p>
              </div>
              <div>
                <label className="text-sm text-gray-600">Available SKUs</label>
                <p className="text-sm font-medium mt-1">
                  {stats.rewardStackStats.availableSkus !== undefined
                    ? stats.rewardStackStats.availableSkus
                    : "N/A"}
                </p>
              </div>
            </div>

            {stats.environment === "QA" && (
              <div className="mt-4 pt-4 border-t">
                <label className="text-sm text-gray-600 block mb-2">
                  QA Marketplace
                </label>
                <a
                  href="https://changemaker.adrsandbox.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-600 hover:text-purple-900 hover:underline flex items-center gap-1"
                >
                  changemaker.adrsandbox.com
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Integration Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Integration Statistics
          </CardTitle>
          <CardDescription>
            Local workspace data and synchronization status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.localStats.syncedSkus}</p>
                <p className="text-sm text-gray-600">Synced SKUs</p>
                <p className="text-xs text-gray-500 mt-1">
                  Available in workspace
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.localStats.workspaceMembers}
                </p>
                <p className="text-sm text-gray-600">Workspace Members</p>
                <p className="text-xs text-gray-500 mt-1">
                  Eligible participants
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Award className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.localStats.issuedRewards || 0}
                </p>
                <p className="text-sm text-gray-600">Issued Rewards</p>
                <p className="text-xs text-gray-500 mt-1">
                  Successfully processed
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
