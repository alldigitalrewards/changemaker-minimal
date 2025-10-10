'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Trophy,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  ClipboardList,
  Link2,
  User as UserIcon,
  Coins,
  Crown,
  Globe,
  UserCog,
} from 'lucide-react';

interface AdminSidebarProps {
  workspace: {
    name: string;
    slug: string;
  };
  isSuperAdmin?: boolean;
}

const workspaceNavigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Participants', href: '/admin/participants', icon: Users },
  { name: 'Challenges', href: '/admin/challenges', icon: Trophy },
  { name: 'Points', href: '/admin/points', icon: Coins },
  { name: 'Activities', href: '/admin/activity-templates', icon: ClipboardList },
  { name: 'Emails', href: '/admin/emails', icon: Settings },
  { name: 'Invites', href: '/admin/invites', icon: Link2 },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
  { name: 'Profile', href: '/admin/profile', icon: UserIcon },
];

const superAdminNavigation = [
  { name: 'Platform Overview', href: '/admin/dashboard', icon: Crown, superAdminOnly: true },
  { name: 'All Workspaces', href: '/admin/workspaces', icon: Globe, superAdminOnly: true },
  { name: 'Manage Members', href: '/admin/users', icon: UserCog, superAdminOnly: true },
  { name: 'Platform Settings', href: '/admin/platform-settings', icon: Settings, superAdminOnly: true },
];

export default function AdminSidebar({ workspace, isSuperAdmin = false }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Workspace info and collapse button */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-terracotta-600 rounded-lg flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {workspace.name}
                  </p>
                  <p className="text-xs text-gray-500">Admin Panel</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronLeft className="h-4 w-4 text-gray-500" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <div className="space-y-6">
            {/* Superadmin Section */}
            {isSuperAdmin && (
              <div>
                {!collapsed && (
                  <h3 className="px-3 text-xs font-semibold text-purple-600 uppercase tracking-wider mb-2">
                    Platform Admin
                  </h3>
                )}
                <ul className="space-y-2">
                  {superAdminNavigation.map((item) => {
                    const isActive = pathname === item.href;

                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            isActive
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'text-gray-700 hover:bg-purple-50 hover:text-purple-600'
                          }`}
                          title={collapsed ? item.name : undefined}
                        >
                          <item.icon
                            className={`flex-shrink-0 h-5 w-5 ${
                              isActive ? 'text-purple-600' : 'text-purple-500 group-hover:text-purple-600'
                            } ${collapsed ? 'mx-auto' : 'mr-3'}`}
                          />
                          {!collapsed && <span>{item.name}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Workspace Section */}
            <div>
              {!collapsed && isSuperAdmin && (
                <h3 className="px-3 text-xs font-semibold text-coral-600 uppercase tracking-wider mb-2">
                  Workspace Admin
                </h3>
              )}
              <ul className="space-y-2">
                {workspaceNavigation.map((item) => {
                  const href = `/w/${workspace.slug}${item.href}`;
                  const isActive = pathname === href;

                  return (
                    <li key={item.name}>
                      <Link
                        href={href}
                        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          isActive
                            ? 'bg-coral-50 text-coral-700 border border-coral-200'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-coral-600'
                        }`}
                        title={collapsed ? item.name : undefined}
                      >
                        <item.icon
                          className={`flex-shrink-0 h-5 w-5 ${
                            isActive ? 'text-coral-600' : 'text-gray-500 group-hover:text-coral-500'
                          } ${collapsed ? 'mx-auto' : 'mr-3'}`}
                        />
                        {!collapsed && <span>{item.name}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </nav>
      </div>
    </aside>
  );
}