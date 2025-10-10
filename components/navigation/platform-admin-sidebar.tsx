'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Globe,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
  Crown,
  Building2,
  BookOpen,
  FileCode,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

const platformNavigation = [
  { name: 'Platform Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'All Workspaces', href: '/admin/workspaces', icon: Globe },
  { name: 'Manage Members', href: '/admin/users', icon: UserCog },
  { name: 'Platform Settings', href: '/admin/settings', icon: Settings },
];

const documentationLinks = [
  { name: 'Public API Docs', href: '/docs/public-api', icon: FileCode, external: false },
  { name: 'Platform Help', href: '/help', icon: HelpCircle, external: false },
  { name: 'Workspace Help', href: '/help/workspace', icon: BookOpen, external: false },
];

export default function PlatformAdminSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg flex items-center justify-center">
                  <Crown className="h-5 w-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    Platform Admin
                  </p>
                  <p className="text-xs text-purple-600">Superadmin Panel</p>
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
            {/* Platform Management Section */}
            <div className="space-y-1">
              {!collapsed && (
                <h3 className="px-3 text-xs font-semibold text-purple-600 uppercase tracking-wider mb-2">
                  Platform Management
                </h3>
              )}
              <ul className="space-y-1">
                {platformNavigation.map((item) => {
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

            {/* Documentation Section */}
            <div className="space-y-1">
              {!collapsed && (
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Documentation
                </h3>
              )}
              <ul className="space-y-1">
                {documentationLinks.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          isActive
                            ? 'bg-gray-50 text-gray-900 border border-gray-200'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                        title={collapsed ? item.name : undefined}
                      >
                        <item.icon
                          className={`flex-shrink-0 h-5 w-5 ${
                            isActive ? 'text-gray-700' : 'text-gray-400 group-hover:text-gray-600'
                          } ${collapsed ? 'mx-auto' : 'mr-3'}`}
                        />
                        {!collapsed && (
                          <span className="flex items-center justify-between flex-1">
                            {item.name}
                            <span className="text-xs text-gray-400 ml-1">(Soon)</span>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </nav>

        {/* Footer - Back to Workspaces */}
        <div className="p-4 border-t border-gray-200">
          <Link
            href="/workspaces"
            className={`flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
          >
            <Building2 className={`h-4 w-4 ${collapsed ? '' : 'mr-2'}`} />
            {!collapsed && 'Back to Workspaces'}
          </Link>
        </div>
      </div>
    </aside>
  );
}
