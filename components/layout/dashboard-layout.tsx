'use client';

import { ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';

interface DashboardLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  header: ReactNode;
}

export default function DashboardLayout({
  children,
  sidebar,
  header,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      {header}

      <div className="flex">
        {/* Sidebar */}
        {sidebar}

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}