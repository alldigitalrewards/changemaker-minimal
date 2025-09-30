'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LogOut, Settings, User, ChevronDown, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoutButton } from '@/components/auth/logout-button';
import WorkspaceSwitcher from '@/components/workspace-switcher';

interface User {
  email?: string;
  user_metadata?: {
    full_name?: string;
  };
}

interface DashboardHeaderProps {
  title: string;
  workspace: {
    name: string;
    slug: string;
  };
  user: User;
  role: 'ADMIN' | 'PARTICIPANT';
  showRoleSwitcher?: boolean;
  pointsBadge?: { label: string; value: string } | null;
  budgetBadge?: { label: string; value: string } | null;
}

export default function DashboardHeader({
  title,
  workspace,
  user,
  role,
  showRoleSwitcher = false,
  pointsBadge,
  budgetBadge,
}: DashboardHeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      {/* Coral accent bar */}
      <div className="h-1 bg-gradient-to-r from-coral-500 to-terracotta-600" />

      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo, workspace and title */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-terracotta-600 rounded-lg flex items-center justify-center">
                <Target className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-navy-900">Changemaker</span>
            </Link>

            <div className="border-l border-gray-200 pl-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                <p className="text-sm text-gray-600">{workspace.name}</p>
              </div>
            </div>
          </div>

          {/* Right side - Workspace switcher, role badge, user menu */}
          <div className="flex items-center space-x-4">
            {/* Workspace Switcher */}
            <WorkspaceSwitcher />

            {/* Role badge */}
            <div className={`px-3 py-1 text-xs font-medium rounded-full ${
              role === 'ADMIN'
                ? 'bg-coral-100 text-coral-800'
                : 'bg-blue-100 text-blue-800'
            }`}>
              {role === 'ADMIN' ? 'Admin' : 'Participant'}
            </div>

            {/* Optional points/budget badges */}
            {pointsBadge && (
              <div className="px-3 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-900">
                {pointsBadge.label}: {pointsBadge.value}
              </div>
            )}
            {budgetBadge && (
              <div className="px-3 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-900">
                {budgetBadge.label}: {budgetBadge.value}
              </div>
            )}

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-coral-400 to-terracotta-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">{userInitials}</span>
                </div>
                <span className="text-sm font-medium text-gray-700">{userName}</span>
                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${
                  showUserMenu ? 'rotate-180' : ''
                }`} />
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{userName}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>

                  <div className="px-4 py-2">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Workspace</p>
                    <p className="text-sm text-gray-900">{workspace.name}</p>
                    <p className="text-xs text-gray-500">{workspace.slug}</p>
                  </div>

                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <Link href="/account">
                      <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                        <Settings className="h-4 w-4" />
                        <span>My Account Settings</span>
                      </button>
                    </Link>

                    <form action="/auth/logout" method="POST">
                      <button type="submit" className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2">
                        <LogOut className="h-4 w-4" />
                        <span>Log out</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
