import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';
import { ROUTES } from '@/constants/routes';
import { LayoutDashboard, Store, Sparkles, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

type BottomNavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

const MAIN_TABS: BottomNavItem[] = [
  { label: 'Home', href: ROUTES.DASHBOARD, icon: LayoutDashboard },
  { label: 'Accounts', href: ROUTES.ACCOUNTS, icon: Store },
  { label: 'Flexi', href: ROUTES.FLEXI_GROWTH_OFFER, icon: Sparkles },
  { label: 'OTPs', href: ROUTES.RETURN_OTPS, icon: KeyRound },
];

export function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around px-2">
        {MAIN_TABS.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex min-w-[64px] flex-col items-center gap-0.5 px-3 py-2 text-[11px] transition-colors',
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
                      className="absolute -top-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
                <span className="font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
