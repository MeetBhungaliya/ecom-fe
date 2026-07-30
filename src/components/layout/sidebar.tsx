import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';
import { useUIStore } from '@/store/ui.store';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import { ROUTES } from '@/constants/routes';
import { LayoutDashboard, Store, ChevronLeft, ChevronRight, LogOut, KeyRound } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getInitials } from '@/lib/formatters';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Accounts', href: ROUTES.ACCOUNTS, icon: Store },
  { label: 'Flexi Offers', href: ROUTES.FLEXI_GROWTH_OFFER, icon: Store },
  { label: 'Return OTPs', href: ROUTES.RETURN_OTPS, icon: KeyRound },
];

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggleCollapsed = useUIStore((s) => s.toggleSidebarCollapsed);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // ⌘B to toggle sidebar
  useKeyboardShortcut({ key: 'b', meta: true }, () => toggleCollapsed());

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      {/* Logo / Brand */}
      <div
        className={cn(
          'flex h-14 items-center border-b border-sidebar-border px-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            E
          </div>
          {!collapsed && (
            <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
              Ecom Manager
            </span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <NavLink
                to={item.href}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    collapsed && 'justify-center px-0',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-primary'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  )
                }
              >
                <item.icon className={cn('h-4.5 w-4.5 shrink-0', collapsed && 'h-5 w-5')} />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border flex flex-col gap-1 p-2">
        {/* User profile */}
        <div
          className={cn(
            'flex items-center gap-3 rounded-lg px-2 py-2 transition-colors',
            collapsed && 'justify-center px-0',
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {user ? getInitials(user.name) : 'U'}
          </div>
          {!collapsed && user && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-sidebar-foreground truncate">
                {user.name}
              </span>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => logout()}
              className="shrink-0 p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-sidebar-accent"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            onClick={() => logout()}
            className="flex w-full items-center justify-center rounded-lg py-2 text-muted-foreground hover:bg-sidebar-accent hover:text-destructive"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          className={cn(
            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
            collapsed && 'justify-center',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="flex-1 text-left">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
