import { useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { cn } from '@/lib/cn';
import { useUIStore } from '@/store/ui.store';
import { useKeyboardShortcut } from '@/hooks/use-keyboard-shortcut';
import { ROUTES } from '@/constants/routes';
import {
  LayoutDashboard,
  Store,
  ChevronLeft,
  ChevronRight,
  LogOut,
  KeyRound,
  Download,
  Package,
  Megaphone,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { getInitials } from '@/lib/formatters';

type NavItem = {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: string;
  subItems?: { label: string; href: string }[];
};

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Marketplace', href: ROUTES.ACCOUNTS, icon: Store },
  { label: 'Return OTPs', href: ROUTES.RETURN_OTPS, icon: KeyRound },
  { label: 'Inventory', href: ROUTES.INVENTORY, icon: Package },
  { label: 'Flexi Offers', href: ROUTES.FLEXI_GROWTH_OFFER, icon: Store },
  {
    label: 'Ads',
    icon: Megaphone,
    subItems: [
      { label: 'Start', href: ROUTES.ADVERTISEMENT },
      { label: 'Manage', href: ROUTES.ADS_MANAGEMENT },
    ],
  },
  { label: 'Download App', href: ROUTES.DOWNLOAD_APP, icon: Download },
];

function NavItemRenderer({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const isActiveGroup = item.subItems?.some((sub) => location.pathname.startsWith(sub.href));
  const [isOpen, setIsOpen] = useState(isActiveGroup);

  if (item.subItems) {
    return (
      <li className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            collapsed && 'justify-center px-0',
            isActiveGroup && !isOpen
              ? 'bg-sidebar-accent text-sidebar-primary'
              : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className={cn('h-4.5 w-4.5 shrink-0', collapsed && 'h-5 w-5')} />
            {!collapsed && <span>{item.label}</span>}
          </div>
          {!collapsed && (
            <ChevronDown className={cn('h-4 w-4 transition-transform', !isOpen && '-rotate-90')} />
          )}
        </button>
        {!collapsed && isOpen && (
          <ul className="mt-1 space-y-0.5 px-3 pb-1 pl-9">
            {item.subItems.map((subItem) => (
              <li key={subItem.href}>
                <NavLink
                  to={subItem.href}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-md px-2 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                        : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
                    )
                  }
                >
                  {subItem.label}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  }

  return (
    <li>
      <NavLink
        to={item.href!}
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
  );
}

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
          {NAV_ITEMS.map((item, index) => (
            <NavItemRenderer key={item.href || `item-${index}`} item={item} collapsed={collapsed} />
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
