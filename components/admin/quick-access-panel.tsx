"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RoleBadge } from "@/components/ui/role-badge";
import { Building2, Star, ArrowRight, Users, Trophy } from "lucide-react";
import { getRoleColorsByString } from "@/lib/theme/role-colors";

interface WorkspaceMembership {
  workspace: {
    id: string;
    slug: string;
    name: string;
  };
  role: "ADMIN" | "PARTICIPANT" | "MANAGER";
  isPrimary: boolean;
}

interface QuickAccessPanelProps {
  memberships: WorkspaceMembership[];
  userEmail: string;
}

export function QuickAccessPanel({
  memberships,
  userEmail,
}: QuickAccessPanelProps) {
  // Sort memberships: primary first, then by role (ADMIN before PARTICIPANT), then by name
  const sortedMemberships = [...memberships].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    if (a.role !== b.role) return a.role === "ADMIN" ? -1 : 1;
    return a.workspace.name.localeCompare(b.workspace.name);
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Your Workspaces</h2>
        <p className="text-sm text-gray-600">
          Quick access to all workspaces where you're a member
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedMemberships.map((membership) => {
          const colors = getRoleColorsByString(membership.role);
          const isAdmin = membership.role === "ADMIN";
          const dashboardUrl = isAdmin
            ? `/w/${membership.workspace.slug}/admin/dashboard`
            : `/w/${membership.workspace.slug}/participant/dashboard`;

          return (
            <Card
              key={membership.workspace.id}
              className={`${colors.border} ${colors.bgGradient} hover:shadow-md transition-shadow`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 ${
                        isAdmin ? "bg-coral-500" : "bg-blue-500"
                      } rounded-lg flex items-center justify-center flex-shrink-0`}
                    >
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base truncate flex items-center gap-1">
                        {membership.workspace.name}
                        {membership.isPrimary && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                        )}
                      </CardTitle>
                      <p className="text-xs text-gray-500 truncate">
                        /w/{membership.workspace.slug}
                      </p>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <RoleBadge role={membership.role} />

                <div className="flex flex-col gap-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className={`w-full justify-between ${colors.border} ${colors.text} hover:${colors.hover}`}
                  >
                    <Link href={dashboardUrl}>
                      <span>
                        {isAdmin ? "Admin Dashboard" : "My Dashboard"}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>

                  {isAdmin && (
                    <>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between text-gray-600 hover:text-gray-900"
                      >
                        <Link
                          href={`/w/${membership.workspace.slug}/admin/participants`}
                        >
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            Manage Members
                          </span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="w-full justify-between text-gray-600 hover:text-gray-900"
                      >
                        <Link
                          href={`/w/${membership.workspace.slug}/admin/challenges`}
                        >
                          <span className="flex items-center gap-1">
                            <Trophy className="h-3 w-3" />
                            Manage Challenges
                          </span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </>
                  )}

                  {!isAdmin && (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="w-full justify-between text-gray-600 hover:text-gray-900"
                    >
                      <Link
                        href={`/w/${membership.workspace.slug}/participant/challenges`}
                      >
                        <span className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          View Challenges
                        </span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {memberships.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-center mb-2">
              No workspace memberships yet
            </p>
            <p className="text-sm text-gray-500 text-center">
              You'll see your workspaces here once you join or create one
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
