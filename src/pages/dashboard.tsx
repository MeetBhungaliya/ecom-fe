import { InfoTooltip } from '@/components/ui/info-tooltip';
import {
  isZeroOrdersActivity,
  useClearActivities,
  useDashboardActivities,
  useDashboardStats,
  type DashboardActivity,
} from '@/hooks/use-dashboard';
import { cn } from '@/lib/cn';
import { timeAgo } from '@/lib/date';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { useAuthStore } from '@/store/auth.store';
import { useMarketplaceStore } from '@/store/marketplace.store';
import { useWebSocketChannel } from '@/context/ws-context';
import { useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Package,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// ============================================
// DASHBOARD PAGE
// Shows key metrics, recent activity, and alerts.
// Uses mock data and real data for accepted orders via SSE.
// ============================================

export type StatItem = {
  label: string;
  value: string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  tooltip?: React.ReactNode;
  valueTooltips?: [React.ReactNode, React.ReactNode];
  valueColors?: [string, string];
  subValue?: React.ReactNode;
};

// Formats amounts in compact Indian notation without currency symbol (K, L, Cr)
// Truncates (floors) without rounding up to avoid showing inflated amounts like 1.90L for 1.896L
function formatCompactAmount(value: number): string {
  const isNegative = value < 0;
  const abs = Math.abs(value);
  let str = '';

  const truncate2 = (num: number) => {
    // Floor to 2 decimal places without rounding up
    const floored = Math.floor(num * 100) / 100;
    return floored
      .toFixed(2)
      .replace(/\.00$/, '')
      .replace(/(\.\d)0$/, '$1');
  };

  if (abs >= 10000000) {
    str = `${truncate2(abs / 10000000)}Cr`;
  } else if (abs >= 100000) {
    str = `${truncate2(abs / 100000)}L`;
  } else if (abs >= 1000) {
    str = `${truncate2(abs / 1000)}K`;
  } else {
    str = `${Math.floor(abs)}`;
  }
  return isNegative ? `-${str}` : str;
}

// --- Mock data ---
const INITIAL_STATS: StatItem[] = [
  {
    label: 'Orders',
    value: '0',
    change: 0,
    trend: 'neutral' as const,
    valueTooltips: ['Accepted', 'On Hold'],
    valueColors: ['text-emerald-600 dark:text-emerald-400', 'text-amber-600 dark:text-amber-400'],
  },
  {
    label: 'Next 7 Days Payment',
    value: '0 / 0',
    change: 0,
    trend: 'neutral' as const,
    valueTooltips: ['Net Amount', 'Ads Cost'],
    valueColors: ['text-sky-600 dark:text-sky-400', 'text-rose-500 dark:text-rose-400'],
  },
  {
    label: 'Last 30 Days Payment',
    value: '0 / 0',
    change: 0,
    trend: 'neutral' as const,
    valueTooltips: ['Net Amount', 'Ads Cost'],
    valueColors: ['text-indigo-600 dark:text-indigo-400', 'text-rose-500 dark:text-rose-400'],
  },
];

// --- Components ---

function AnimatedNumber({
  value,
  tooltips,
  colors,
}: {
  value: string;
  tooltips?: [React.ReactNode, React.ReactNode];
  colors?: [string, string];
}) {
  // If value contains a slash (e.g. "12 / 13"), render formatted parts with individual tooltips and colors
  if (value.includes('/')) {
    const parts = value.split('/').map((s) => s.trim());
    return (
      <span className="inline-flex items-baseline gap-1.5 font-bold tracking-tight">
        {tooltips?.[0] ? (
          <InfoTooltip content={tooltips[0]} side="top" delayDuration={50}>
            <span className={cn('transition-opacity hover:opacity-80 cursor-default', colors?.[0])}>
              <AnimatedSingleNumber value={parts[0]} colorClass={colors?.[0]} />
            </span>
          </InfoTooltip>
        ) : (
          <span className={cn('transition-opacity', colors?.[0])}>
            <AnimatedSingleNumber value={parts[0]} colorClass={colors?.[0]} />
          </span>
        )}
        <span className="text-muted-foreground/40 font-normal text-xl select-none px-0.5">/</span>
        {tooltips?.[1] ? (
          <InfoTooltip content={tooltips[1]} side="top" delayDuration={50}>
            <span className={cn('transition-opacity hover:opacity-80 cursor-default', colors?.[1])}>
              <AnimatedSingleNumber value={parts[1]} colorClass={colors?.[1]} />
            </span>
          </InfoTooltip>
        ) : (
          <span className={cn('transition-opacity', colors?.[1])}>
            <AnimatedSingleNumber value={parts[1]} colorClass={colors?.[1]} />
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={cn(colors?.[0])}>
      <AnimatedSingleNumber value={value} colorClass={colors?.[0]} />
    </span>
  );
}

function AnimatedSingleNumber({ value, colorClass }: { value: string; colorClass?: string }) {
  const numericVal = parseFloat(value.replace(/,/g, '').replace(/[^0-9.]/g, ''));
  const isNumeric = !isNaN(numericVal);
  const hasDecimals = value.includes('.');
  const decimalPlaces = hasDecimals ? value.split('.')[1]?.match(/^\d+/)?.[0]?.length || 0 : 0;
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
        setDisplayCount(current);

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

  if (!isNumeric) return <span className={colorClass}>{value}</span>;

  const formattedNum = hasDecimals
    ? displayCount.toFixed(decimalPlaces)
    : Math.round(displayCount).toLocaleString();

  return (
    <span
      className={cn(
        'inline-block transition-all duration-300 transform',
        colorClass,
        isUpdating && 'scale-105 brightness-110 font-black',
      )}
    >
      {prefix}
      {formattedNum}
      {suffix}
    </span>
  );
}

function StatCard({
  label,
  value,
  change,
  trend,
  tooltip,
  valueTooltips,
  valueColors,
  subValue,
  loading,
}: StatItem & { loading?: boolean }) {
  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card/80 to-card p-5 shadow-sm animate-pulse">
        <div className="space-y-2.5">
          {/* Label placeholder matching uppercase tracking-wider style */}
          <div className="h-3.5 bg-muted/60 rounded-md w-28" />

          {/* Number / value placeholder matching bifurcated dual numbers */}
          <div className="flex items-baseline gap-2 pt-1">
            <div className="h-8.5 bg-muted/70 rounded-md w-20" />
            <div className="h-4 bg-muted/40 rounded w-2.5" />
            <div className="h-8.5 bg-muted/70 rounded-md w-16" />
          </div>
        </div>

        {/* Ambient subtle glow matching the main card */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-muted/10 blur-2xl pointer-events-none" />
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card/90 via-card to-card/95 p-5 transition-all duration-300 hover:border-border hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">
      {/* Top ambient glow matching card accent color */}
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 rounded-full bg-primary/[0.03] group-hover:bg-primary/[0.07] blur-2xl transition-all duration-500 pointer-events-none" />

      <div className="flex items-start justify-between relative z-10">
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
              {label}
            </p>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            {valueTooltips ? (
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <AnimatedNumber value={value} tooltips={valueTooltips} colors={valueColors} />
              </div>
            ) : tooltip ? (
              <InfoTooltip content={tooltip} side="top" delayDuration={50} className="select-none">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight transition-opacity hover:opacity-85">
                  <AnimatedNumber value={value} colors={valueColors} />
                </span>
              </InfoTooltip>
            ) : (
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                <AnimatedNumber value={value} colors={valueColors} />
              </div>
            )}
          </div>
          {subValue && <div className="pt-0.5">{subValue}</div>}
        </div>
      </div>

      {change !== 0 && (
        <div className="mt-3.5 flex items-center gap-1.5 relative z-10">
          {trend === 'up' ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-success" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />
          )}
          <span
            className={cn(
              'text-xs font-semibold',
              trend === 'up' ? 'text-success' : 'text-destructive',
            )}
          >
            {formatPercentage(Math.abs(change))}
          </span>
          <span className="text-xs text-muted-foreground/70">vs last month</span>
        </div>
      )}

      {/* Subtle shine highlight on hover */}
      <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.03] to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
    </div>
  );
}

function ActivityItem({ activity }: { activity: DashboardActivity }) {
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

      <div className="flex items-center shrink-0">
        <span className="text-[11px] text-muted-foreground">{timeAgo(activity.time)}</span>
      </div>
    </div>
  );
}

// --- Page ---

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const activeAccountIds = useMarketplaceStore((s) => s.activeAccountIds);
  const { data: statsData, isLoading: statsLoading } = useDashboardStats(activeAccountIds);

  const { data: dbActivities, isLoading: activitiesLoading } = useDashboardActivities();
  const clearMutation = useClearActivities();

  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [stats, setStats] = useState(INITIAL_STATS);

  // Sync DB activities with state
  useEffect(() => {
    if (dbActivities) {
      setActivities(dbActivities.filter((a) => !isZeroOrdersActivity(a)));
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

  const handleClearAll = () => {
    setActivities([]);
    clearMutation.mutate();
  };

  // Sync initial API stats
  useEffect(() => {
    if (statsData) {
      const accepted = statsData.acceptedOrdersToday || 0;
      const onHold = statsData.onHoldOrders || 0;
      const upcomingNet = statsData.upcomingPayment?.netAmount ?? 0;
      const upcomingAds = statsData.upcomingPayment?.adsCost ?? 0;

      setStats((prev) =>
        prev.map((stat) => {
          if (stat.label === 'Orders' || stat.label === 'Accepted Orders') {
            return {
              ...stat,
              label: 'Orders',
              value: `${accepted.toLocaleString()} / ${onHold.toLocaleString()}`,
              valueTooltips: ['Accepted', 'On Hold'],
              subValue: null,
            };
          }
          if (stat.label === 'Next 7 Days Payment') {
            return {
              ...stat,
              value: `${formatCompactAmount(upcomingNet)} / ${formatCompactAmount(upcomingAds)}`,
              valueTooltips: [
                <span>Net: {formatCurrency(upcomingNet)}</span>,
                <span>Ads: {formatCurrency(upcomingAds)}</span>,
              ],
              subValue: null,
            };
          }
          if (stat.label === 'Last 30 Days Payment') {
            const pastNet = statsData.pastPayment?.netAmount ?? 0;
            const pastAds = statsData.pastPayment?.adsCost ?? 0;
            return {
              ...stat,
              value: `${formatCompactAmount(pastNet)} / ${formatCompactAmount(pastAds)}`,
              valueTooltips: [
                <span>Net: {formatCurrency(pastNet)}</span>,
                <span>Ads: {formatCurrency(pastAds)}</span>,
              ],
              subValue: null,
            };
          }
          return stat;
        }),
      );
    }
  }, [statsData]);

  // WebSocket Listener for Live Activities
  useWebSocketChannel<{ type?: string; activity?: DashboardActivity }>(
    user?.id ? `accounts/${user.id}` : null,
    (data) => {
      const activity = data?.activity;
      if (data?.type === 'activity' && activity) {
        if (isZeroOrdersActivity(activity)) return;

        setActivities((prev) => {
          // Avoid duplicates if same ID comes in
          const filtered = prev.filter((item) => item.id !== activity.id);
          return [activity, ...filtered];
        });

        // Invalidate query to fetch fresh orders count from Meesho API
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
      }
    },
    Boolean(user?.id),
  );

  const visibleActivities = activities.filter((activity) => !isZeroOrdersActivity(activity));

  return (
    <div className="space-y-6">
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
          <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
                <span className="text-xs font-normal text-muted-foreground">(Last 24 hours)</span>
                {visibleActivities.length > 0 && (
                  <span className="relative flex h-2 w-2 ml-1">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </div>
              {visibleActivities.length > 0 && (
                <button
                  onClick={handleClearAll}
                  disabled={clearMutation.isPending}
                  title="Delete all activities permanently"
                  aria-label="Delete all activities permanently"
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="divide-y divide-border/50 px-2 py-1 max-h-[380px] overflow-y-auto">
              {activitiesLoading ? (
                // Skeletons
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg px-3 py-3 animate-pulse"
                  >
                    <div className="mt-0.5 rounded-md bg-muted p-4 w-7 h-7 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 bg-muted rounded w-1/3" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
                    <div className="shrink-0 h-3 bg-muted rounded w-12" />
                  </div>
                ))
              ) : visibleActivities.length > 0 ? (
                visibleActivities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
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
      </div>
    </div>
  );
}
