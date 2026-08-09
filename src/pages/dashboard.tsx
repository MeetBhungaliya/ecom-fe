import { useEffect, useState, useRef } from 'react';
import { Transmit } from '@adonisjs/transmit-client';
import { useAuthStore } from '@/store/auth.store';
import { useMarketplaceStore } from '@/store/marketplace.store';
import { useQueryClient } from '@tanstack/react-query';
import {
  useDashboardStats,
  useDashboardActivities,
  useMarkActivityRead,
  useDeleteActivity,
  useClearActivities,
  type DashboardActivity,
} from '@/hooks/use-dashboard';
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
  Check,
  Trash2,
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
        isUpdating && 'scale-110 text-primary font-extrabold',
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
  loading,
}: (typeof INITIAL_STATS)[0] & { loading?: boolean }) {
  if (loading) {
    return (
      <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 animate-pulse">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1 mr-4">
            <div className="h-4 bg-muted rounded w-24" />
            <div className="h-7 bg-muted rounded w-16" />
          </div>
          <div className="rounded-lg p-5 bg-muted/40 w-10 h-10 shrink-0" />
        </div>
        <div className="mt-3 flex items-center gap-1.5">
          <div className="h-3.5 bg-muted rounded w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-border/80 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">
            <AnimatedNumber value={value} />
          </p>
        </div>
        <div
          className={cn(
            'rounded-lg p-2.5 transition-transform duration-300 group-hover:scale-110',
            bgColor,
          )}
        >
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

function ActivityItem({
  activity,
  onMarkAsRead,
  onDelete,
}: {
  activity: DashboardActivity;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const iconMap = {
    order: ShoppingCart,
    sync: Activity,
    alert: AlertCircle,
    product: Package,
  };
  const Icon = iconMap[activity.type as keyof typeof iconMap] || Activity;

  return (
    <div
      className={cn(
        'group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50 animate-in fade-in slide-in-from-top-2 duration-300',
        activity.read && 'opacity-60 bg-muted/20',
      )}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <div className="mt-0.5 rounded-md bg-muted p-1.5 shrink-0">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{activity.action}</p>
            {!activity.read && (
              <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" title="Unread" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{activity.detail}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[11px] text-muted-foreground">{timeAgo(activity.time)}</span>
        <div className="flex items-center gap-1">
          {!activity.read && (
            <button
              onClick={() => onMarkAsRead(activity.id)}
              title="Mark as read"
              className="rounded-md p-1 text-muted-foreground opacity-70 hover:opacity-100 hover:bg-accent hover:text-foreground transition-all flex items-center gap-1 text-xs"
            >
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span className="hidden group-hover:inline text-[11px]">Mark read</span>
            </button>
          )}
          <button
            onClick={() => onDelete(activity.id)}
            title="Remove"
            className="rounded-md p-1 text-muted-foreground opacity-70 hover:opacity-100 hover:bg-accent hover:text-destructive transition-all flex items-center gap-1 text-xs"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden group-hover:inline text-[11px]">Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Page ---

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const isDesktop = useIsDesktop();
  const user = useAuthStore((s) => s.user);
  const activeAccountIds = useMarketplaceStore((s) => s.activeAccountIds);
  const { data: statsData, isLoading: statsLoading } = useDashboardStats(activeAccountIds);

  const { data: dbActivities, isLoading: activitiesLoading } = useDashboardActivities();
  const markReadMutation = useMarkActivityRead();
  const deleteMutation = useDeleteActivity();
  const clearMutation = useClearActivities();

  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [stats, setStats] = useState(INITIAL_STATS);
  const transmitRef = useRef<Transmit | null>(null);

  // Sync DB activities with state
  useEffect(() => {
    if (dbActivities) {
      setActivities(dbActivities);
    }
  }, [dbActivities]);

  // Periodic cleanup for activities > 24 hours old in UI
  useEffect(() => {
    const cleanup = () => {
      setActivities((prev) => {
        const now = Date.now();
        const updated = prev.filter((item) => {
          const itemTime = new Date(item.time).getTime();
          return !isNaN(itemTime) && now - itemTime < 24 * 60 * 60 * 1000;
        });
        return updated;
      });
    };

    cleanup();
    const interval = setInterval(cleanup, 60000); // check every minute
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = (id: string) => {
    // Optimistic read status update
    setActivities((prev) => prev.map((act) => (act.id === id ? { ...act, read: true } : act)));
    markReadMutation.mutate(id);
  };

  const handleDelete = (id: string) => {
    // Optimistic delete from UI
    setActivities((prev) => prev.filter((act) => act.id !== id));
    deleteMutation.mutate(id);
  };

  const handleClearAll = () => {
    setActivities([]);
    clearMutation.mutate();
  };

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
            setActivities((prev) => {
              // Avoid duplicates if same ID comes in
              const filtered = prev.filter((item) => item.id !== data.activity.id);
              return [data.activity, ...filtered];
            });

            // Invalidate query to fetch fresh orders count from Meesho API
            queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
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
          <StatCard key={stat.label} {...stat} loading={statsLoading} />
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
                <span className="text-xs font-normal text-muted-foreground">(Last 24 hours)</span>
                {activities.length > 0 && (
                  <span className="relative flex h-2 w-2 ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </div>
              {activities.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="divide-y divide-border/50 px-2 py-1">
              {activitiesLoading ? (
                // Skeletons
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-3 animate-pulse">
                    <div className="mt-0.5 rounded-md bg-muted p-4 w-7 h-7 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                    <div className="shrink-0 h-3 bg-muted rounded w-12" />
                  </div>
                ))
              ) : activities.length > 0 ? (
                activities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    activity={activity}
                    onMarkAsRead={handleMarkAsRead}
                    onDelete={handleDelete}
                  />
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No recent activity in the last 24 hours. Live events (e.g. auto-accepted orders)
                  will appear here in real-time.
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
