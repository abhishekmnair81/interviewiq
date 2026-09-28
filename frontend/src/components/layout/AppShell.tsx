/**
 * components/layout/AppShell.tsx
 * Dashboard-style layout shell.
 * Provides: Topbar + optional side nav column + main content area.
 *
 * The live interview room does NOT use AppShell — it's full-screen.
 * AppShell is used by: dashboard, report, settings pages.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  PlayCircle,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Topbar, type BreadcrumbItem } from './Topbar';
import type { ConnectionStatus } from '@/hooks/useInterviewSocket';

/* ── Sidebar nav items ────────────────────────────────────────── */

const NAV_ITEMS = [
  { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/interview/live', icon: PlayCircle,    label: 'Start Interview' },
  { href: '/report',       icon: BarChart3,       label: 'Reports' },
  { href: '/settings',     icon: Settings,        label: 'Settings' },
] as const;

/* ── Sidebar ──────────────────────────────────────────────────── */

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col',
        'border-r border-surface bg-surface-1',
        'transition-all duration-300 ease-spring flex-shrink-0',
        collapsed ? 'w-16' : 'w-60'
      )}
      aria-label="Main navigation"
    >
      {/* Nav items */}
      <nav className="flex-1 py-4 space-y-1 px-2" role="navigation">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              aria-label={collapsed ? label : undefined}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-150',
                'text-sm font-medium',
                isActive
                  ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400'
                  : 'text-secondary-color hover:bg-surface-2 hover:text-primary-color'
              )}
            >
              <Icon
                className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-primary-500')}
                aria-hidden="true"
              />
              {!collapsed && (
                <span className="truncate">{label}</span>
              )}
              {isActive && !collapsed && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 flex-shrink-0" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <div className="p-2 border-t border-surface">
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'w-full flex items-center justify-center',
            'h-8 rounded-lg text-muted-color hover:text-primary-color hover:bg-surface-2',
            'transition-colors'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          ) : (
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      </div>
    </aside>
  );
}

/* ── AppShell ─────────────────────────────────────────────────── */

export interface AppShellProps {
  children: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  wsStatus?: ConnectionStatus;
  userName?: string;
  userInitials?: string;
  onSignOut?: () => void;
  showSidebar?: boolean;
}

export function AppShell({
  children,
  breadcrumbs,
  wsStatus,
  userName,
  userInitials,
  onSignOut,
  showSidebar = true,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen-dvh flex flex-col bg-surface-0">
      <Topbar
        breadcrumbs={breadcrumbs}
        wsStatus={wsStatus}
        userName={userName}
        userInitials={userInitials}
        onSignOut={onSignOut}
      />

      <div className="flex flex-1 overflow-hidden">
        {showSidebar && (
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(prev => !prev)}
          />
        )}

        <main
          id="main-content"
          className="flex-1 overflow-auto"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
