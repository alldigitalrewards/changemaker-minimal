"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Crown, Shield, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface MembershipUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
}

interface MembershipData {
  id: string;
  userId: string;
  role: "ADMIN" | "MANAGER" | "PARTICIPANT";
  isOwner: boolean;
  joinedAt: Date;
  user: MembershipUser;
}

interface WorkspaceMembershipsProps {
  memberships: MembershipData[];
  currentUserId: string;
}

export function WorkspaceMemberships({
  memberships,
  currentUserId,
}: WorkspaceMembershipsProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter to only admins and managers, sorted by role then isOwner
  const filteredMemberships = memberships
    .filter((m) => m.role === "ADMIN" || m.role === "MANAGER")
    .sort((a, b) => {
      // Workspace owner first
      if (a.isOwner && !b.isOwner) return -1;
      if (!a.isOwner && b.isOwner) return 1;

      // Then by role (ADMIN before MANAGER)
      if (a.role === "ADMIN" && b.role === "MANAGER") return -1;
      if (a.role === "MANAGER" && b.role === "ADMIN") return 1;

      // Then by join date (oldest first)
      return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
    });

  const getDisplayName = (user: MembershipUser) => {
    if (user.displayName) return user.displayName;
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    return user.email;
  };

  const getRoleIcon = (role: string, isOwner: boolean) => {
    if (isOwner) return <Crown className="h-4 w-4 text-yellow-600" />;
    if (role === "ADMIN") return <Shield className="h-4 w-4 text-blue-600" />;
    return <User className="h-4 w-4 text-purple-600" />;
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "ADMIN") return "default";
    if (role === "MANAGER") return "secondary";
    return "outline";
  };

  return (
    <div className="space-y-2">
      {filteredMemberships.length === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">
          No admins or managers found
        </div>
      ) : (
        filteredMemberships.map((membership) => {
          const isExpanded = expandedIds.has(membership.id);
          const isCurrentUser = membership.userId === currentUserId;

          return (
            <div
              key={membership.id}
              className={`border rounded-lg transition-colors ${
                isCurrentUser ? "bg-muted/50" : "hover:bg-muted/30"
              }`}
            >
              {/* Row Header */}
              <button
                onClick={() => toggleExpanded(membership.id)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                {/* Expand Icon */}
                <div className="shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* Role Icon */}
                <div className="shrink-0">
                  {getRoleIcon(membership.role, membership.isOwner)}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {getDisplayName(membership.user)}
                    </span>
                    {isCurrentUser && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {membership.user.email}
                  </div>
                </div>

                {/* Role Badge */}
                <div className="shrink-0 flex items-center gap-2">
                  {membership.isOwner && (
                    <Badge variant="default" className="bg-yellow-600 hover:bg-yellow-700">
                      Workspace Owner
                    </Badge>
                  )}
                  <Badge variant={getRoleBadgeVariant(membership.role)}>
                    {membership.role}
                  </Badge>
                </div>
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">User ID:</span>
                      <div className="font-mono text-xs mt-1 break-all">
                        {membership.userId}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Joined:</span>
                      <div className="mt-1">
                        {formatDistanceToNow(new Date(membership.joinedAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                  </div>

                  {membership.isOwner && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <Crown className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-yellow-900">
                            Workspace Owner
                          </p>
                          <p className="text-yellow-700 mt-1">
                            This user created the workspace and has full control
                            over all settings, including the ability to delete the
                            workspace and transfer ownership.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {membership.role === "MANAGER" && (
                    <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
                        <div className="text-sm">
                          <p className="font-medium text-purple-900">
                            Manager Permissions
                          </p>
                          <p className="text-purple-700 mt-1">
                            Can review submissions, communicate with participants,
                            and manage challenge activities.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Info Footer */}
      <div className="text-xs text-muted-foreground mt-4 p-3 bg-muted/50 rounded-md">
        <p>
          Only workspace owners can modify workspace settings. Managers have
          limited permissions for challenge and participant management.
        </p>
        <p className="mt-2">
          Platform super admins are not listed here as they have platform-wide
          access to all workspaces.
        </p>
      </div>
    </div>
  );
}
