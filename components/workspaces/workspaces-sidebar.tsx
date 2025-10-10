'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building,
  Search,
  Mail,
  Plus,
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkspaceMembership {
  workspaceId: string;
  role: 'ADMIN' | 'PARTICIPANT';
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
}

interface WorkspacesSidebarProps {
  memberships: WorkspaceMembership[];
  currentView?: 'my-workspaces' | 'discover' | 'invitations';
  userRole: 'ADMIN' | 'PARTICIPANT';
  isAdmin: boolean;
  className?: string;
}

export default function WorkspacesSidebar({
  memberships,
  currentView = 'my-workspaces',
  userRole,
  isAdmin,
  className
}: WorkspacesSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    {
      label: 'My Workspaces',
      icon: Building,
      href: '/workspaces',
      active: currentView === 'my-workspaces',
      show: true
    },
    {
      label: 'Invitations',
      icon: Mail,
      href: '/workspaces?view=invitations',
      active: currentView === 'invitations',
      show: true,
      badge: 0 // TODO: Add pending invitation count
    },
    {
      label: 'Discover',
      icon: Search,
      href: '/workspaces?view=discover',
      active: currentView === 'discover',
      show: isAdmin
    },
  ];

  return (
    <aside
      className={cn(
        'bg-white border-r border-gray-200 transition-all duration-300 flex flex-col',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-terracotta-600 rounded-lg flex items-center justify-center">
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
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => {
          if (!item.show) return null;

          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start',
                  item.active && 'bg-coral-50 text-coral-700 hover:bg-coral-100',
                  collapsed && 'justify-center px-2'
                )}
              >
                <Icon className={cn('h-4 w-4', !collapsed && 'mr-3')} />
                {!collapsed && (
                  <span className="flex-1 text-left">{item.label}</span>
                )}
                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-auto bg-coral-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
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
                    membership.role === 'ADMIN' ? 'admin' : 'participant'
                  }/dashboard`}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-sm"
                  >
                    <Home className="h-3 w-3 mr-2" />
                    <span className="truncate">{membership.workspace.name}</span>
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
              'w-full bg-coral-500 hover:bg-coral-600',
              collapsed && 'px-2'
            )}
            size="sm"
          >
            <Plus className={cn('h-4 w-4', !collapsed && 'mr-2')} />
            {!collapsed && 'New Workspace'}
          </Button>
        </div>
      )}
    </aside>
  );
}
