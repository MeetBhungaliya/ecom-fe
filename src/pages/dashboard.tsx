import { useEffect, useState, useRef } from 'react';
import { Transmit } from '@adonisjs/transmit-client';
import { useAuthStore } from '@/store/auth.store';
import { useMarketplaceStore } from '@/store/marketplace.store';
import { useDashboardStats } from '@/hooks/use-dashboard';
import {
  Package,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  Activity,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { timeAgo } from '@/lib/date';
import { useIsDesktop } from '@/hooks/use-media-query';

// ============================================
// DASHBOARD PAGE
// Shows key metrics, recent activity, and alerts.
// Uses mock data and real data for accepted orders via SSE.
// ============================================

// --- Mock data ---
const INITIAL_STATS = [
  {
    label: 'Accepted Orders',
    value: '0',
    change: 0,
    trend: 'neutral' as const,
    icon: CheckCircle2,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    label: 'Total Revenue',
    value: formatCurrency(1847293),
    change: 0.124,
    trend: 'up' as const,
    icon: TrendingUp,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    label: 'Products Listed',
    value: '1,847',
    change: 0.058,
    trend: 'up' as const,
    icon: Package,
    color: 'text-chart-5',
    bgColor: 'bg-chart-5/10',
  },
  {
    label: 'Connected Accounts',
    value: '4',
    change: 0,
    trend: 'neutral' as const,
    icon: Store,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
];

const INITIAL_RECENT_ACTIVITY: Array<{
  id: string;
  action: string;
  detail: string;
  time: string;
  type: string;
}> = [];

const ALERTS = [
  { id: '1', title: '3 orders pending dispatch', severity: 'warning' as const },
  { id: '2', title: '7 products out of stock', severity: 'danger' as const },
  { id: '3', title: 'Meesho account sync overdue', severity: 'warning' as const },
];

// --- Components ---

function AnimatedNumber({ value }: { value: string }) {
  const numericVal = parseFloat(value.replace(/,/g, '').replace(/[^0-9.]/g, ''));
  const isNumeric = !isNaN(numericVal);
  const prefix = value.match(/^[^\d]*/)?.[0] || '';
  const suffix = value.match(/[^\d]*$/)?.[0] || '';

  const [displayCount, setDisplayCount] = useState<number>(isNumeric ? numericVal : 0);
  const [isUpdating, setIsUpdating] = useState(false);
  const prevValRef = useRef(numericVal);

  useEffect(() => {
    if (!isNumeric) return;

    if (prevValRef.current !== numericVal) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 700);

      const start = prevValRef.current;
      const end = numericVal;
      const startTime = performance.now();
      const duration = 600;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Easing function (easeOutExpo)
        const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = start + (end - start) * ease;
        setDisplayCount(Math.round(current));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          prevValRef.current = end;
        }
      };

      requestAnimationFrame(animate);
      return () => clearTimeout(timer);
    }
  }, [numericVal, isNumeric]);

  if (!isNumeric) return <span>{value}</span>;

  return (
    <span
      className={cn(
        'inline-block transition-all duration-300 transform',
        isUpdating && 'scale-110 text-primary font-extrabold'
      )}
    >
      {prefix}
      {displayCount.toLocaleString()}
      {suffix}
    </span>
  );
}

function StatCard({
  label,
  value,
  change,
  trend,
  icon: Icon,
  color,
  bgColor,
}: (typeof INITIAL_STATS)[0]) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-border/80 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            <AnimatedNumber value={value} />
          </p>
        </div>
        <div className={cn('rounded-lg p-2.5 transition-transform duration-300 group-hover:scale-110', bgColor)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
      </div>

      {change !== 0 && (
        <div className="mt-3 flex items-center gap-1.5">
          {trend === 'up' ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-success" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
          )}
          <span
            className={cn(
              'text-xs font-medium',
              trend === 'up' ? 'text-success' : 'text-destructive',
            )}
          >
            {formatPercentage(Math.abs(change))}
          </span>
          <span className="text-xs text-muted-foreground">vs last month</span>
        </div>
      )}

      {/* Subtle gradient highlight on hover */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.02] to-transparent transition-transform duration-700 group-hover:translate-x-full" />
    </div>
  );
}

function ActivityItem({ activity }: { activity: any }) {
  const iconMap = {
    order: ShoppingCart,
    sync: Activity,
    alert: AlertCircle,
    product: Package,
  };
  const Icon = iconMap[activity.type as keyof typeof iconMap] || Activity;

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="mt-0.5 rounded-md bg-muted p-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{activity.action}</p>
        <p className="text-xs text-muted-foreground truncate">{activity.detail}</p>
      </div>
      <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(activity.time)}</span>
    </div>
  );
}

// --- Page ---

export default function DashboardPage() {
  const isDesktop = useIsDesktop();
  const user = useAuthStore((s) => s.user);
  const activeAccountIds = useMarketplaceStore((s) => s.activeAccountIds);
  const { data: statsData } = useDashboardStats(activeAccountIds);

  const [activities, setActivities] = useState(INITIAL_RECENT_ACTIVITY);
  const [stats, setStats] = useState(INITIAL_STATS);
  const transmitRef = useRef<Transmit | null>(null);

  // Sync initial API stats
  useEffect(() => {
    if (statsData) {
      setStats((prev) =>
        prev.map((stat) =>
          stat.label === 'Accepted Orders'
            ? { ...stat, value: statsData.acceptedOrdersToday.toLocaleString() }
            : stat,
        ),
      );
    }
  }, [statsData]);

  // Transmit SSE Listener for Live Activities
  useEffect(() => {
    if (!user?.id) return;

    if (!transmitRef.current) {
      transmitRef.current = new Transmit({
        baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3333',
        eventSourceFactory: (url, options) => {
          return new EventSource(url, { ...options, withCredentials: true });
        },
        beforeSubscribe: (request) => {
          const token = localStorage.getItem('comops-access-token');
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`);
          }
        },
        beforeUnsubscribe: (request) => {
          const token = localStorage.getItem('comops-access-token');
          if (token) {
            request.headers.set('Authorization', `Bearer ${token}`);
          }
        },
      });
    }

    const transmit = transmitRef.current;
    let subscription: ReturnType<Transmit['subscription']> | null = null;

    async function subscribe() {
      if (!transmit || !user?.id) return;

      try {
        subscription = transmit.subscription(`accounts/${user.id}`);
        await subscription.create();

        subscription.onMessage((data: any) => {
          if (data?.type === 'activity' && data.activity) {
            // Prepend new activity
            setActivities((prev) => [data.activity, ...prev].slice(0, 10)); // keep last 10

            // Update Accepted Orders Stat Card
            if (data.acceptedOrdersToday !== undefined) {
              setStats((prev) =>
                prev.map((stat) =>
                  stat.label === 'Accepted Orders'
                    ? { ...stat, value: data.acceptedOrdersToday.toLocaleString() }
                    : stat,
                ),
              );
            }
          }
        });
      } catch (err) {
        console.error('Failed to subscribe to dashboard Transmit SSE:', err);
      }
    }

    subscribe();

    return () => {
      if (subscription) {
        subscription.delete().catch(() => {});
      }
    };
  }, [user?.id]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      {!isDesktop && (
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your commerce operations across all marketplaces.
          </p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Recent Activity */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
                <span className="relative flex h-2 w-2 ml-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
              </div>
              <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                View all
              </button>
            </div>
            <div className="divide-y divide-border/50 px-2 py-1">
              {activities.length > 0 ? (
                activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No recent activity yet. Live events (e.g. auto-accepted orders) will appear here in real-time.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alerts & Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Alerts */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <AlertCircle className="h-4 w-4 text-warning" />
              <h2 className="text-base font-semibold text-foreground">Alerts</h2>
              <span className="ml-auto rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-warning">
                {ALERTS.length}
              </span>
            </div>
            <div className="space-y-1 px-3 py-2">
              {ALERTS.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm',
                    alert.severity === 'danger'
                      ? 'bg-destructive/5 text-destructive'
                      : 'bg-warning/5 text-warning',
                  )}
                >
                  <div
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full',
                      alert.severity === 'danger' ? 'bg-destructive' : 'bg-warning',
                    )}
                  />
                  <span className="font-medium">{alert.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-base font-semibold text-foreground">Quick Actions</h2>
            </div>
            <div className="p-3">
              <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-4 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-[0.98] cursor-pointer">
                <Store className="h-5 w-5" />
                <span className="text-xs">Connect Account</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
