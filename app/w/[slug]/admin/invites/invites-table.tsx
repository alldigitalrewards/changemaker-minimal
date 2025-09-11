'use client'

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Copy, Clock, Users, Link as LinkIcon } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { useToast } from "@/hooks/use-toast"
import type { InviteCodeWithDetails } from "@/lib/types"

interface InvitesTableProps {
  inviteCodes: InviteCodeWithDetails[]
}

export function InvitesTable({ inviteCodes }: InvitesTableProps) {
  const { toast } = useToast()

  const handleCopyLink = async (code: string) => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/invite/${code}`
      )
      toast({
        title: "Link copied!",
        description: "The invite link has been copied to your clipboard.",
      })
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try copying the link manually.",
        variant: "destructive",
      })
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Usage</TableHead>
          <TableHead>Expires</TableHead>
          <TableHead>Created By</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {inviteCodes.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center text-muted-foreground">
              No invite codes created yet
            </TableCell>
          </TableRow>
        ) : (
          inviteCodes.map((invite) => {
            const isExpired = new Date(invite.expiresAt) < new Date()
            const isFullyUsed = invite.usedCount >= invite.maxUses
            const isActive = !isExpired && !isFullyUsed

            return (
              <TableRow key={invite.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                      {invite.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLink(invite.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {invite.challengeId ? (
                      <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                        Challenge
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-green-50 text-green-700">
                        Workspace
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {invite.role}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={isActive ? "default" : "secondary"}
                    className={
                      isActive 
                        ? "bg-green-100 text-green-800 border-green-200" 
                        : isExpired
                        ? "bg-red-100 text-red-800 border-red-200"
                        : "bg-gray-100 text-gray-800 border-gray-200"
                    }
                  >
                    {isActive ? (
                      <>
                        <LinkIcon className="h-3 w-3 mr-1" />
                        Active
                      </>
                    ) : isExpired ? (
                      <>
                        <Clock className="h-3 w-3 mr-1" />
                        Expired
                      </>
                    ) : (
                      <>
                        <Users className="h-3 w-3 mr-1" />
                        Full
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{invite.usedCount}</span>
                    <span className="text-muted-foreground">/ {invite.maxUses}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(invite.expiresAt), { addSuffix: true })}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{invite.creator.email}</span>
                </TableCell>
              </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}