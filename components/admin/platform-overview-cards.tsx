'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Trophy, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlatformStats {
  totalWorkspaces: number;
  activeWorkspaces: number;
  totalUsers: number;
  totalChallenges: number;
  totalPoints: number;
  trends: {
    workspaces: number;
    users: number;
    challenges: number;
    points: number;
  };
}

interface PlatformOverviewCardsProps {
  stats: PlatformStats;
}

function TrendIndicator({ value, className }: { value: number; className?: string }) {
  if (value === 0) return null;

  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <div className={cn('flex items-center gap-1 text-xs font-medium', color, className)}>
      <Icon className="h-3 w-3" />
      <span>{Math.abs(value)}%</span>
    </div>
  );
}

export function PlatformOverviewCards({ stats }: PlatformOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Workspaces */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Workspaces</CardTitle>
          <Building2 className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalWorkspaces}</div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.activeWorkspaces} active
              </p>
            </div>
            <TrendIndicator value={stats.trends.workspaces} />
          </div>
        </CardContent>
      </Card>

      {/* Total Users */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Users</CardTitle>
          <Users className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalUsers}</div>
              <p className="text-xs text-gray-500 mt-1">
                Across all workspaces
              </p>
            </div>
            <TrendIndicator value={stats.trends.users} />
          </div>
        </CardContent>
      </Card>

      {/* Total Challenges */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Challenges</CardTitle>
          <Trophy className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalChallenges}</div>
              <p className="text-xs text-gray-500 mt-1">
                Platform-wide
              </p>
            </div>
            <TrendIndicator value={stats.trends.challenges} />
          </div>
        </CardContent>
      </Card>

      {/* Total Points */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Points</CardTitle>
          <Trophy className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-3xl font-bold text-gray-900">{stats.totalPoints.toLocaleString()}</div>
              <p className="text-xs text-gray-500 mt-1">
                Awarded globally
              </p>
            </div>
            <TrendIndicator value={stats.trends.points} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
