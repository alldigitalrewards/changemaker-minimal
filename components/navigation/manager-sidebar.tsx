'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Trophy,
  ChevronLeft,
  ChevronRight,
  Building2,
  ClipboardList,
  User as UserIcon,
  MessageSquare,
  Briefcase,
} from 'lucide-react';

interface ManagerSidebarProps {
  workspace: {
    name: string;
    slug: string;
  };
}

const managerNavigation = [
  { name: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard },
  { name: 'Review Queue', href: '/admin/manager/queue', icon: ClipboardList },
  { name: 'My Challenges', href: '/admin/challenges', icon: Trophy },
  { name: 'Participants', href: '/admin/participants', icon: Users },
  { name: 'Announcements', href: '/admin/communications', icon: MessageSquare },
  { name: 'Profile', href: '/admin/profile', icon: UserIcon },
];

export default function ManagerSidebar({ workspace }: ManagerSidebarProps) {
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
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Briefcase className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {workspace.name}
                  </p>
                  <p className="text-xs text-blue-600 font-medium">Manager Panel</p>
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
            {/* Manager Section */}
            <div>
              {!collapsed && (
                <h3 className="px-3 text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
                  Manager Tools
                </h3>
              )}
              <ul className="space-y-2">
                {managerNavigation.map((item) => {
                  const href = `/w/${workspace.slug}${item.href}`;
                  const isActive = pathname === href;

                  return (
                    <li key={item.name}>
                      <Link
                        href={href}
                        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                        title={collapsed ? item.name : undefined}
                      >
                        <item.icon
                          className={`flex-shrink-0 h-5 w-5 ${
                            isActive ? 'text-blue-600' : 'text-blue-500 group-hover:text-blue-600'
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

        {/* Manager Badge */}
        {!collapsed && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
              <Briefcase className="h-4 w-4 text-blue-600" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-blue-900">Manager View</p>
                <p className="text-xs text-blue-600">Challenge oversight</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
