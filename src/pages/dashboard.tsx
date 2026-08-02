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
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCurrency, formatPercentage } from '@/lib/formatters';
import { timeAgo } from '@/lib/date';

// ============================================
// DASHBOARD PAGE
// Shows key metrics, recent activity, and alerts.
// Uses mock data until API is connected.
// ============================================

// --- Mock data ---
const STATS = [
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
    label: 'Active Orders',
    value: '342',
    change: -0.032,
    trend: 'down' as const,
    icon: ShoppingCart,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
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

const RECENT_ACTIVITY = [
  {
    id: '1',
    action: 'New order received',
    detail: 'Order #ORD-7842 from Meesho',
    time: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    type: 'order',
  },
  {
    id: '2',
    action: 'Product synced',
    detail: '12 products synced to Meesho',
    time: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
    type: 'sync',
  },
  {
    id: '3',
    action: 'Low stock alert',
    detail: 'SKU-4521 has only 3 units left',
    time: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    type: 'alert',
  },
  {
    id: '4',
    action: 'Order dispatched',
    detail: 'Order #ORD-7838 marked as shipped',
    time: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    type: 'order',
  },
  {
    id: '5',
    action: 'Price updated',
    detail: 'Bulk price update on 24 products',
    time: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    type: 'product',
  },
];

const ALERTS = [
  { id: '1', title: '3 orders pending dispatch', severity: 'warning' as const },
  { id: '2', title: '7 products out of stock', severity: 'danger' as const },
  { id: '3', title: 'Meesho account sync overdue', severity: 'warning' as const },
];

// --- Components ---

function StatCard({ label, value, change, trend, icon: Icon, color, bgColor }: (typeof STATS)[0]) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-200 hover:border-border/80 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={cn('rounded-lg p-2.5', bgColor)}>
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

function ActivityItem({ activity }: { activity: (typeof RECENT_ACTIVITY)[0] }) {
  const iconMap = {
    order: ShoppingCart,
    sync: Activity,
    alert: AlertCircle,
    product: Package,
  };
  const Icon = iconMap[activity.type as keyof typeof iconMap] || Activity;

  return (
    <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50">
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

import { useIsDesktop } from '@/hooks/use-media-query';

// --- Page ---

export default function DashboardPage() {
  const isDesktop = useIsDesktop();

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
        {STATS.map((stat) => (
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
              </div>
              <button className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                View all
              </button>
            </div>
            <div className="divide-y divide-border/50 px-2 py-1">
              {RECENT_ACTIVITY.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
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
              <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-4 text-sm font-medium text-foreground transition-all hover:border-primary/30 hover:bg-primary/5 hover:text-primary active:scale-[0.98]">
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
