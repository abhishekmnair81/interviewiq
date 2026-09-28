/**
 * components/layout/Topbar.tsx
 * App topbar with: logo, breadcrumbs, WS status indicator,
 * dark mode toggle, and user avatar menu.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Sun, Moon, Wifi, WifiOff, ChevronRight, LogOut, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface TopbarProps {
  breadcrumbs?: BreadcrumbItem[];
  wsStatus?: 'connected' | 'connecting' | 'disconnected' | 'error';
  userName?: string;
  userInitials?: string;
  onSignOut?: () => void;
  className?: string;
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center',
        'text-muted-color hover:text-primary-color hover:bg-surface-2',
        'transition-colors'
      )}
    >
      {isDark ? (
        <Sun className="w-4 h-4" aria-hidden="true" />
      ) : (
        <Moon className="w-4 h-4" aria-hidden="true" />
      )}
    </button>
  );
}

function WsIndicator({ status }: { status: TopbarProps['wsStatus'] }) {
  if (!status || status === 'disconnected') return null;

  const configs = {
    connected: {
      icon: <Wifi className="w-3 h-3" />,
      label: 'Connected',
      className: 'text-emerald-500',
      dotClass: 'bg-emerald-500',
    },
    connecting: {
      icon: <Wifi className="w-3 h-3" />,
      label: 'Connecting…',
      className: 'text-amber-500',
      dotClass: 'bg-amber-500 animate-pulse',
    },
    error: {
      icon: <WifiOff className="w-3 h-3" />,
      label: 'Disconnected',
      className: 'text-rose-500',
      dotClass: 'bg-rose-500',
    },
    disconnected: { icon: null, label: '', className: '', dotClass: '' },
  };

  const config = configs[status];
  if (!config.label) return null;

  return (
    <div
      className={cn('flex items-center gap-1.5 text-xs font-medium', config.className)}
      title={`WebSocket: ${config.label}`}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dotClass)} aria-hidden="true" />
      <span className="hidden sm:inline">{config.label}</span>
    </div>
  );
}

export function Topbar({
  breadcrumbs,
  wsStatus,
  userName,
  userInitials,
  onSignOut,
  className,
}: TopbarProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header
      className={cn(
        'nav-glass sticky top-0 z-[200]',
        'h-topbar flex items-center px-4 sm:px-6 gap-4',
        className
      )}
      role="banner"
    >
      {/* Logo */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2.5 flex-shrink-0"
        aria-label="InterviewIQ home"
      >
        <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center shadow-glow-primary">
          <span className="text-[11px] font-black text-white tracking-tight">IQ</span>
        </div>
        <span className="text-sm font-bold text-primary-color hidden sm:block">
          Interview<span className="text-primary-600 dark:text-primary-400">IQ</span>
        </span>
      </Link>

      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs">
          <ChevronRight className="w-3 h-3 text-muted-color flex-shrink-0" aria-hidden="true" />
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <ChevronRight className="w-3 h-3 text-muted-color flex-shrink-0" aria-hidden="true" />
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="text-secondary-color hover:text-primary-color transition-colors font-medium"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-primary-color font-semibold" aria-current="page">
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {wsStatus && <WsIndicator status={wsStatus} />}

        <ThemeToggle />

        {/* User menu */}
        {userInitials && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(prev => !prev)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label={`User menu for ${userName || 'user'}`}
              className={cn(
                'w-8 h-8 rounded-full avatar',
                'text-[11px] font-bold flex-shrink-0',
                'cursor-pointer hover:ring-2 hover:ring-primary-500/50 transition-all'
              )}
            >
              {userInitials}
            </button>

            {/* Dropdown */}
            {menuOpen && (
              <div
                className={cn(
                  'absolute right-0 top-10 w-48',
                  'bg-surface-1 border border-surface rounded-xl shadow-xl',
                  'py-1 z-[201] animate-slide-up'
                )}
                role="menu"
              >
                {userName && (
                  <div className="px-3 py-2 border-b border-surface mb-1">
                    <p className="text-xs font-semibold text-primary-color truncate">{userName}</p>
                  </div>
                )}
                <Link
                  href="/settings"
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-secondary-color hover:text-primary-color hover:bg-surface-2 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                  Settings
                </Link>
                {onSignOut && (
                  <button
                    role="menuitem"
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors"
                    onClick={() => { setMenuOpen(false); onSignOut(); }}
                  >
                    <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                    Sign out
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
