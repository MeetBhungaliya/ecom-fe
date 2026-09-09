import { useState } from 'react';
import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/constants/routes';
import {
  LayoutDashboard,
  Store,
  KeyRound,
  MoreHorizontal,
  Package,
  Sparkles,
  Download,
  X,
  LogOut,
  Megaphone,
  BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/store/auth.store';
import { getInitials } from '@/lib/formatters';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

// Priority tabs in mobile view bottom navigation
const PRIMARY_TABS: NavItem[] = [
  { label: 'Dashboard', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Marketplace', href: ROUTES.ACCOUNTS, icon: Store },
  { label: 'OTPs', href: ROUTES.RETURN_OTPS, icon: KeyRound },
];

// Secondary items accessible from the "More" drawer/sheet
const MORE_ITEMS: NavItem[] = [
  { label: 'Inventory', href: ROUTES.INVENTORY, icon: Package },
  { label: 'Flexi Offers', href: ROUTES.FLEXI_GROWTH_OFFER, icon: Sparkles },
  { label: 'Start Ads', href: ROUTES.ADVERTISEMENT, icon: Megaphone },
  { label: 'Manage Ads', href: ROUTES.ADS_MANAGEMENT, icon: BarChart3 },
  { label: 'Download App', href: ROUTES.DOWNLOAD_APP, icon: Download },
];

export function BottomNav() {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <>
      {/* Bottom Navigation Bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 shadow-lg"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-4 items-center px-2 py-1">
          {PRIMARY_TABS.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={() => setIsMoreOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-medium transition-colors relative',
                  isActive ? 'text-primary' : 'text-muted-foreground active:text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <item.icon className={cn('h-5 w-5', isActive && 'stroke-[2.5]')} />
                    {isActive && (
                      <motion.div
                        layoutId="bottomNavIndicator"
                        className="absolute -top-1.5 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-primary"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </div>
                  <span className="truncate max-w-[72px]">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(!isMoreOpen)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-medium transition-colors relative',
              isMoreOpen ? 'text-primary' : 'text-muted-foreground active:text-foreground',
            )}
          >
            <div className="relative">
              <MoreHorizontal className={cn('h-5 w-5', isMoreOpen && 'stroke-[2.5]')} />
            </div>
            <span>More</span>
          </button>
        </div>
      </nav>

      {/* More Options Sheet / Drawer */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-border bg-background p-5 shadow-2xl"
              style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
            >
              {/* Drawer Handle */}
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-muted" />

              <div className="flex items-center justify-between mb-4 pb-2 border-b border-border/50">
                <span className="text-base font-semibold text-foreground">
                  Menu & Quick Actions
                </span>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="rounded-full p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User Profile Card */}
              {user && (
                <div className="flex items-center justify-between rounded-xl bg-slate-900/40 border border-border/50 p-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {getInitials(user.name)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsMoreOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Logout
                  </button>
                </div>
              )}

              {/* More Navigation Options Grid */}
              <div className="grid grid-cols-3 gap-3 my-2">
                {MORE_ITEMS.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all',
                        isActive
                          ? 'border-primary/50 bg-primary/10 text-primary font-semibold shadow-sm'
                          : 'border-border/60 bg-card hover:bg-accent text-card-foreground',
                      )
                    }
                  >
                    <div className="rounded-xl bg-background/80 p-2.5 shadow-xs">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
