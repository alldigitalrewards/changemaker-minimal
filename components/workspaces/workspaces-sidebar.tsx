"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building,
  Search,
  Mail,
  Plus,
  ChevronLeft,
  ChevronRight,
  Home,
  Crown,
  Globe,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkspaceMembership {
  workspaceId: string;
  role: "ADMIN" | "PARTICIPANT" | "MANAGER";
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
}

interface WorkspacesSidebarProps {
  memberships: WorkspaceMembership[];
  currentView?: "my-workspaces" | "discover" | "invitations";
  userRole: "ADMIN" | "PARTICIPANT" | "MANAGER";
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  className?: string;
}

export default function WorkspacesSidebar({
  memberships,
  currentView = "my-workspaces",
  userRole,
  isAdmin,
  isSuperAdmin = false,
  className,
}: WorkspacesSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const superAdminNavItems = [
    {
      label: "Platform Overview",
      icon: Crown,
      href: "/admin/dashboard",
      active: pathname === "/admin/dashboard",
      show: isSuperAdmin,
    },
    {
      label: "All Workspaces",
      icon: Globe,
      href: "/admin/workspaces",
      active: pathname === "/admin/workspaces",
      show: isSuperAdmin,
    },
    {
      label: "Manage Members",
      icon: UserCog,
      href: "/admin/users",
      active: pathname === "/admin/users",
      show: isSuperAdmin,
    },
  ];

  const navItems = [
    {
      label: "My Workspaces",
      icon: Building,
      href: "/workspaces",
      active: currentView === "my-workspaces",
      show: true,
    },
    {
      label: "Invitations",
      icon: Mail,
      href: "/workspaces?view=invitations",
      active: currentView === "invitations",
      show: true,
      badge: 0, // TODO: Add pending invitation count
    },
    {
      label: "Discover",
      icon: Search,
      href: "/workspaces?view=discover",
      active: currentView === "discover",
      show: isAdmin,
    },
  ];

  return (
    <aside
      className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
        collapsed ? "w-16" : "w-64",
        className,
      )}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-terracotta-600 rounded-lg flex items-center justify-center">
              <Building className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">Workspaces</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {/* Superadmin Section */}
        {isSuperAdmin && (
          <>
            {!collapsed && (
              <div className="px-3 pt-2 pb-2">
                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">
                  Platform Admin
                </span>
              </div>
            )}
            {superAdminNavItems.map((item) => {
              if (!item.show) return null;
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      item.active &&
                        "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200",
                      !item.active &&
                        "hover:bg-purple-50 hover:text-purple-600",
                      collapsed && "justify-center px-2",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        item.active ? "text-purple-600" : "text-purple-500",
                        !collapsed && "mr-3",
                      )}
                    />
                    {!collapsed && (
                      <span className="flex-1 text-left">{item.label}</span>
                    )}
                  </Button>
                </Link>
              );
            })}

            {/* Divider */}
            <div className="py-2">
              <div className="border-t border-gray-200" />
            </div>

            {!collapsed && (
              <div className="px-3 pb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  My Workspaces
                </span>
              </div>
            )}
          </>
        )}

        {navItems.map((item) => {
          if (!item.show) return null;

          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  item.active &&
                    "bg-gray-50 text-gray-800 hover:bg-gray-100",
                  collapsed && "justify-center px-2",
                )}
              >
                <Icon className={cn("h-4 w-4", !collapsed && "mr-3")} />
                {!collapsed && (
                  <span className="flex-1 text-left">{item.label}</span>
                )}
                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-gray-900 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Button>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="py-2">
          <div className="border-t border-gray-200" />
        </div>

        {/* Quick Workspace Links */}
        {!collapsed && memberships.length > 0 && (
          <div className="pt-2">
            <div className="px-3 pb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Quick Access
              </span>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {memberships.slice(0, 5).map((membership) => (
                <Link
                  key={membership.workspaceId}
                  href={`/w/${membership.workspace.slug}/${
                    membership.role === "ADMIN" ? "admin" : "participant"
                  }/dashboard`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm"
                  >
                    <Home className="h-3 w-3 mr-2" />
                    <span className="truncate">
                      {membership.workspace.name}
                    </span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Create Workspace Button (Admins Only) */}
      {isAdmin && (
        <div className="p-3 border-t border-gray-200">
          <Button
            variant="default"
            className={cn(
              "w-full bg-gray-900 hover:bg-gray-800",
              collapsed && "px-2",
            )}
            size="sm"
          >
            <Plus className={cn("h-4 w-4", !collapsed && "mr-2")} />
            {!collapsed && "New Workspace"}
          </Button>
        </div>
      )}
    </aside>
  );
}
