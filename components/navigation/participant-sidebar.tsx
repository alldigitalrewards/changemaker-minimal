'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Trophy,
  Building2,
} from 'lucide-react';

interface ParticipantSidebarProps {
  workspace: {
    name: string;
    slug: string;
  };
}

const navigation = [
  { name: 'Dashboard', href: '/participant/dashboard', icon: LayoutDashboard },
  { name: 'Challenges', href: '/participant/challenges', icon: Trophy },
];

export default function ParticipantSidebar({ workspace }: ParticipantSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200">
      <div className="flex flex-col h-full">
        {/* Workspace info */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {workspace.name}
              </p>
              <p className="text-xs text-gray-500">Participant View</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const href = `/w/${workspace.slug}${item.href}`;
              const isActive = pathname === href;

              return (
                <li key={item.name}>
                  <Link
                    href={href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-blue-600'
                    }`}
                  >
                    <item.icon
                      className={`flex-shrink-0 h-5 w-5 mr-3 ${
                        isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-500'
                      }`}
                    />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </aside>
  );
}