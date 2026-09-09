import { useNavigate } from 'react-router';
import { useInventoryAnalytics } from '@/hooks/use-inventory';
import { useIsDesktop } from '@/hooks/use-media-query';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/lib/cn';
import { formatCurrency } from '@/lib/formatters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Package, DollarSign, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import type { Product } from '@/types';

// ============================================
// INVENTORY ANALYTICS DASHBOARD
// Charts, KPIs, and alerts for inventory insights
// ============================================

type StatCardProps = {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
};

function StatCard({ label, value, icon: Icon, color, bgColor }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        </div>
        <div className={cn('rounded-lg p-2.5', bgColor)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
      </div>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.02] to-transparent transition-transform duration-700 group-hover:translate-x-full" />
    </div>
  );
}

function AlertProductItem({ product, onNavigate }: { product: Product; onNavigate: () => void }) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/50 cursor-pointer"
      onClick={onNavigate}
    >
      <div
        className={cn(
          'h-2 w-2 shrink-0 rounded-full',
          product.stockStatus === 'out_of_stock' ? 'bg-red-500' : 'bg-amber-500',
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
        <p className="text-xs text-muted-foreground">
          Stock: {product.currentStock} / Min: {product.minimumStock}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function ChartTooltipContent({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}:{' '}
          {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function InventoryAnalyticsPage() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { data, isLoading } = useInventoryAnalytics();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-7 w-[200px]" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[100px] rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px] rounded-xl" />
          <Skeleton className="h-[300px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-foreground font-medium">No analytics data available</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => navigate(ROUTES.INVENTORY)}
        >
          Back to Inventory
        </Button>
      </div>
    );
  }

  const stats: StatCardProps[] = [
    {
      label: 'Total Products',
      value: data.totalProducts.toLocaleString(),
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Total Inventory Value',
      value: formatCurrency(data.totalValue),
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Low Stock Items',
      value: data.lowStockCount,
      icon: AlertTriangle,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Out of Stock',
      value: data.outOfStockCount,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={() => navigate(ROUTES.INVENTORY)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {!isDesktop && (
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Inventory Analytics
              </h1>
              <p className="text-sm text-muted-foreground">
                Insights and trends for your inventory
              </p>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Breakdown */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">Stock Value by Category</h2>
          {data.categoryBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={data.categoryBreakdown}
                margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="value"
                  name="Value (₹)"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
              No category data available
            </div>
          )}
        </div>

        {/* Stock Movements Over Time */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">
            Stock Movements (Last 30 Days)
          </h2>
          {data.stockMovements.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={data.stockMovements}
                margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
              >
                <defs>
                  <linearGradient id="addGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="deductGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="additions"
                  name="Additions"
                  stroke="#10b981"
                  fill="url(#addGradient)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="deductions"
                  name="Deductions"
                  stroke="#ef4444"
                  fill="url(#deductGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
              No movement data yet
            </div>
          )}
        </div>
      </div>

      {/* Alert Tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Low Stock */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-base font-semibold text-foreground">Low Stock Items</h2>
            {data.lowStockCount > 0 && (
              <Badge className="ml-auto bg-amber-500/10 text-amber-500 border-amber-500/20 text-xs">
                {data.lowStockCount}
              </Badge>
            )}
          </div>
          <div className="divide-y divide-border/50 px-2 py-1">
            {data.lowStockItems.length > 0 ? (
              data.lowStockItems.map((product) => (
                <AlertProductItem
                  key={product.id}
                  product={product}
                  onNavigate={() => navigate(ROUTES.INVENTORY_EDIT(String(product.id)))}
                />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No low stock items 🎉
              </p>
            )}
          </div>
        </div>

        {/* Out of Stock */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <XCircle className="h-4 w-4 text-red-500" />
            <h2 className="text-base font-semibold text-foreground">Out of Stock</h2>
            {data.outOfStockCount > 0 && (
              <Badge className="ml-auto bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                {data.outOfStockCount}
              </Badge>
            )}
          </div>
          <div className="divide-y divide-border/50 px-2 py-1">
            {data.outOfStockItems.length > 0 ? (
              data.outOfStockItems.map((product) => (
                <AlertProductItem
                  key={product.id}
                  product={product}
                  onNavigate={() => navigate(ROUTES.INVENTORY_EDIT(String(product.id)))}
                />
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                All products are in stock 🎉
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
