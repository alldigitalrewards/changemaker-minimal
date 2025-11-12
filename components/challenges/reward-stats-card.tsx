'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ShoppingCart, AlertTriangle, CheckCircle2, Clock, XCircle, RotateCw } from 'lucide-react'
import { format } from 'date-fns'

interface RewardIssuance {
  id: string
  amount: number | null
  status: string
  rewardStackStatus: string | null
  rewardStackTransactionId: string | null
  issuedAt: Date | string | null
  createdAt: Date | string
  User: {
    email: string
    firstName: string | null
    lastName: string | null
    displayName: string | null
  }
  skuId: string | null
}

interface RewardStatsCardProps {
  challengeId: string
  workspaceSlug: string
  rewardIssuances: RewardIssuance[]
}

export function RewardStatsCard({ challengeId, workspaceSlug, rewardIssuances }: RewardStatsCardProps) {
  const totalIssued = rewardIssuances.filter((r) => r.status === 'ISSUED').length
  const pending = rewardIssuances.filter((r) => r.status === 'PENDING').length
  const failed = rewardIssuances.filter((r) => r.status === 'FAILED').length
  const totalValue = rewardIssuances
    .filter((r) => r.status === 'ISSUED')
    .reduce((sum, r) => sum + (r.amount || 0), 0)

  const recentIssuances = rewardIssuances.slice(0, 5)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  const getUserDisplay = (reward: RewardIssuance) => {
    if (reward.User.displayName) return reward.User.displayName
    if (reward.User.firstName && reward.User.lastName) {
      return `${reward.User.firstName} ${reward.User.lastName}`
    }
    return reward.User.email
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>RewardSTACK Integration</CardTitle>
          <Badge variant="outline">
            <ShoppingCart className="h-3 w-3 mr-1" />
            Marketplace Rewards
          </Badge>
        </div>
        <CardDescription>
          Track reward issuances from the AllDigitalRewards marketplace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Reward statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-sm font-medium text-green-700 mb-1">Total Issued</div>
            <div className="text-2xl font-bold text-green-900">{totalIssued}</div>
          </div>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="text-sm font-medium text-amber-700 mb-1">Pending</div>
            <div className="text-2xl font-bold text-amber-900">{pending}</div>
          </div>
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm font-medium text-red-700 mb-1">Failed</div>
            <div className="text-2xl font-bold text-red-900">{failed}</div>
          </div>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-700 mb-1">Total Value</div>
            <div className="text-2xl font-bold text-blue-900">${(totalValue / 100).toFixed(2)}</div>
          </div>
        </div>

        {/* Recent issuances table */}
        {recentIssuances.length > 0 && (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentIssuances.map((reward) => (
                  <TableRow key={reward.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-sm">{getUserDisplay(reward)}</div>
                        <div className="text-xs text-gray-500">{reward.User.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      ${((reward.amount || 0) / 100).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(reward.status)}
                        <Badge variant="outline" className="text-xs">
                          {reward.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {reward.issuedAt
                        ? format(new Date(reward.issuedAt), 'MMM d, h:mm a')
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Failed issuances alert */}
        {failed > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Failed Reward Issuances</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{failed} reward issuances failed.</span>
              <Button variant="link" size="sm" asChild>
                <a href={`/w/${workspaceSlug}/admin/rewards?status=FAILED&challengeId=${challengeId}`}>
                  View & Retry
                </a>
              </Button>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
