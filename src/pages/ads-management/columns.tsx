// ============================================
// COLUMN DEFINITIONS — Ads Campaigns Table
// Uses TanStack Table v9 createColumnHelper.
// ============================================

import { createColumnHelper } from '@tanstack/react-table';
import { type EnrichedAdsCampaign, usePauseAdsCampaign } from '@/hooks/use-ads-campaigns';
import { features } from './table-features';
import { format, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Pause, Loader2, Eye } from 'lucide-react';

const col = createColumnHelper<typeof features, EnrichedAdsCampaign>();

// --- Formatters ---

function formatCampaignDate(dateVal: unknown): string | null {
  if (!dateVal) return null;
  if (typeof dateVal === 'number') {
    const d = new Date(dateVal);
    if (isValid(d)) return format(d, 'dd MMM yyyy');
  }
  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    if (!trimmed || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
      return null;
    }
    if (/^\d{10,13}$/.test(trimmed)) {
      const num = Number(trimmed);
      const d = new Date(num > 1e11 ? num : num * 1000);
      if (isValid(d)) return format(d, 'dd MMM yyyy');
    }
    const parsedIso = parseISO(trimmed);
    if (isValid(parsedIso)) return format(parsedIso, 'dd MMM yyyy');

    const parts = trimmed.split(/[/ -]/);
    if (parts.length === 3) {
      const [p1, p2, p3] = parts;
      if (p3.length === 4) {
        const d = new Date(Number(p3), Number(p2) - 1, Number(p1));
        if (isValid(d)) return format(d, 'dd MMM yyyy');
      }
    }

    const fallbackDate = new Date(trimmed);
    if (isValid(fallbackDate)) return format(fallbackDate, 'dd MMM yyyy');
  }
  return null;
}

function formatBudgetType(rawType: unknown): string {
  if (!rawType) return 'Daily';
  const str = String(rawType).trim();
  // Strip '_budget' or split by '_' (e.g. "daily_budget" -> "Daily", "total_budget" -> "Total")
  const cleaned = str.replace(/_budget$/i, '').split('_')[0];
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase() : 'Daily';
}

const fmtCurrency = (value: number | undefined | null) => {
  if (value == null || isNaN(value)) return '—';
  return `₹ ${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};

// --- Columns ---

export const columns = col.columns([
  col.display({
    id: 'select',
    header: ({ table }) => {
      // Custom handler: merges visible-row selection into existing state
      // instead of replacing the entire rowSelection (which would wipe
      // selections from accounts currently hidden by the account-pill filter).
      const filteredRows = table.getFilteredRowModel().rows;
      const allFilteredSelected =
        filteredRows.length > 0 && filteredRows.every((r) => r.getIsSelected());
      const someFilteredSelected = filteredRows.some((r) => r.getIsSelected());

      const handleToggleAll = () => {
        if (allFilteredSelected) {
          // Deselect only visible rows; keep other accounts' selections intact
          table.setRowSelection((prev) => {
            const next = { ...prev };
            filteredRows.forEach((r) => {
              delete next[r.id];
            });
            return next;
          });
        } else {
          // Select all visible rows, merging with existing cross-account selections
          table.setRowSelection((prev) => {
            const next = { ...prev };
            filteredRows.forEach((r) => {
              next[r.id] = true;
            });
            return next;
          });
        }
      };

      return (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={allFilteredSelected}
            ref={(input) => {
              if (input) {
                input.indeterminate = someFilteredSelected && !allFilteredSelected;
              }
            }}
            onChange={handleToggleAll}
            className="h-3.5 w-3.5 rounded-sm border-zinc-300 bg-transparent text-primary focus:ring-primary/20 accent-primary cursor-pointer"
          />
        </div>
      );
    },
    size: 44,
    enableHiding: false,
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="h-3.5 w-3.5 rounded-sm border-zinc-300 bg-transparent text-primary focus:ring-primary/20 accent-primary cursor-pointer"
        />
      </div>
    ),
  }),

  // 1. Campaign Column (Campaign name + Account Badge + ID + Date range)
  col.accessor((row) => `${row.campaign_name || ''} ${row.campaign_id || ''}`, {
    id: 'campaign_name',
    header: 'CAMPAIGN',
    size: 320,
    enableSorting: false,
    cell: ({ row }) => {
      const campaignName = row.original.campaign_name || `Campaign ${row.original.campaign_id}`;
      const campaignId = row.original.campaign_id;
      const accountName = row.original.account_name;
      const startDateStr = formatCampaignDate(row.original.start_date);
      const endDateStr = formatCampaignDate(row.original.end_date);

      const dateLine = startDateStr
        ? `${startDateStr} - ${endDateStr || 'No end date'}`
        : row.original.start_date
          ? `${row.original.start_date} - ${endDateStr || 'No end date'}`
          : endDateStr
            ? `Until ${endDateStr}`
            : null;

      return (
        <div className="flex flex-col justify-center py-1 gap-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            {accountName && (
              <span
                className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold rounded tracking-wider bg-[#0ea5e9]/15 text-[#0ea5e9] border border-[#0ea5e9]/25 shrink-0"
                title={`Account: ${accountName}`}
              >
                {accountName}
              </span>
            )}
            <span
              className="font-mono text-xs font-medium text-foreground truncate block"
              title={campaignName}
            >
              {campaignName}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
            <span className="text-zinc-600 dark:text-zinc-300 font-medium">{campaignId}</span>
            {dateLine && (
              <>
                <span className="text-zinc-300 dark:text-zinc-700">•</span>
                <span>{dateLine}</span>
              </>
            )}
          </div>
        </div>
      );
    },
  }),

  // 2. Budget Column (e.g. ₹ 165 Daily)
  col.accessor((row) => Number(row.total_budget ?? row.budget ?? 0), {
    id: 'budget',
    header: 'BUDGET',
    size: 130,
    enableSorting: true,
    cell: ({ row }) => {
      const budget = row.original.total_budget ?? row.original.budget;
      const rawBudgetType =
        row.original.budget_type ||
        (row.original as any).sub_type ||
        (row.original as any).campaign_type;
      const budgetTypeLabel = formatBudgetType(rawBudgetType);

      return (
        <div className="flex items-center gap-1.5 font-mono whitespace-nowrap">
          <span className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
            {fmtCurrency(budget)}
          </span>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">{budgetTypeLabel}</span>
        </div>
      );
    },
  }),

  // 3. Budget Utilized Column (from perf_details.budget_utilised)
  col.accessor(
    (row) =>
      row.perf_details?.budget_utilised ?? row.budget_spent ?? (row as any).budget_utilized ?? 0,
    {
      id: 'budget_utilized',
      header: 'SPENT',
      size: 120,
      enableSorting: true,
      cell: (info) => {
        const val = info.getValue() as number;
        return (
          <span className="font-mono text-xs text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
            {fmtCurrency(val)}
          </span>
        );
      },
    },
  ),

  // 4. Views Column (from perf_details.total_views)
  col.accessor(
    (row) => Number(row.perf_details?.total_views ?? row.views ?? row.impressions ?? 0),
    {
      id: 'views',
      header: 'VIEWS',
      size: 90,
      enableSorting: true,
      cell: (info) => {
        const val = Number(info.getValue());
        return (
          <span className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
            {val.toLocaleString('en-IN')}
          </span>
        );
      },
    },
  ),

  // 5. Clicks Column (from perf_details.total_clicks)
  col.accessor((row) => Number(row.perf_details?.total_clicks ?? row.clicks ?? 0), {
    id: 'clicks',
    header: 'CLICKS',
    size: 90,
    enableSorting: true,
    cell: (info) => {
      const val = Number(info.getValue());
      return (
        <span className="font-mono text-xs text-zinc-900 dark:text-zinc-100">
          {val.toLocaleString('en-IN')}
        </span>
      );
    },
  }),

  // 5. Orders Column (from perf_details.order_count)
  col.accessor(
    (row) => Number(row.perf_details?.order_count ?? row.orders ?? (row as any).total_orders ?? 0),
    {
      id: 'orders',
      header: 'ORDERS',
      size: 90,
      enableSorting: true,
      cell: (info) => {
        const val = Number(info.getValue());
        if (!val || isNaN(val)) {
          return <span className="font-mono text-xs text-zinc-400">-</span>;
        }
        return (
          <span className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100">
            {val}
          </span>
        );
      },
    },
  ),

  // 6. Revenue Column (from perf_details.revenue)
  col.accessor(
    (row) => Number(row.perf_details?.revenue ?? row.revenue ?? (row as any).total_revenue ?? 0),
    {
      id: 'revenue',
      header: 'REVENUE',
      size: 100,
      enableSorting: true,
      cell: (info) => {
        const val = Number(info.getValue());
        if (!val || isNaN(val)) {
          return <span className="font-mono text-xs text-zinc-400">-</span>;
        }
        return (
          <span className="font-mono text-xs font-medium text-zinc-900 dark:text-zinc-100">
            {val}
          </span>
        );
      },
    },
  ),

  // 7. Avg ROI Column (from perf_details.roi)
  col.accessor((row) => Number(row.perf_details?.roi ?? row.roas ?? (row as any).avg_roi ?? 0), {
    id: 'avg_roi',
    header: 'AVG ROI',
    size: 90,
    enableSorting: true,
    cell: (info) => {
      const val = Number(info.getValue());
      if (!val || isNaN(val)) {
        return <span className="font-mono text-xs text-zinc-400">-</span>;
      }
      return (
        <span className="font-mono text-xs font-semibold text-zinc-900 dark:text-zinc-100">
          {val.toFixed(2)}
        </span>
      );
    },
  }),

  // 8. Action Column (Pause + View Campaign)
  col.display({
    id: 'actions',
    header: () => <div className="text-center">ACTION</div>,
    size: 72,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row, table }) => {
      const onView = (table.options.meta as any)?.onViewCampaign;
      return <ActionCell campaign={row.original} onView={onView} />;
    },
  }),
]);

// ============================================
// ACTION CELL COMPONENT
// Eye (view detail) + Pause icon buttons
// ============================================

function ActionCell({
  campaign,
  onView,
}: {
  campaign: EnrichedAdsCampaign;
  onView?: (c: EnrichedAdsCampaign) => void;
}) {
  const pauseMutation = usePauseAdsCampaign();

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    pauseMutation.mutate({
      accountId: campaign.account_id,
      campaign_id: campaign.campaign_id,
      supplier_id: (campaign as any).supplier_id,
      pause_nudge_status: 'DETAILS_PAGE',
    });
  };

  return (
    <div className="flex items-center justify-center gap-1">
      {/* View details */}
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          onView?.(campaign);
        }}
        className="h-7 w-7 rounded-lg text-zinc-400 hover:text-[#0ea5e9] hover:bg-[#0ea5e9]/10 transition-colors cursor-pointer"
        title={`View details for campaign #${campaign.campaign_id}`}
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>

      {/* Pause */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePause}
        disabled={pauseMutation.isPending}
        className="h-7 w-7 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 transition-colors cursor-pointer disabled:opacity-50"
        title={`Pause campaign #${campaign.campaign_id}`}
      >
        {pauseMutation.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Pause className="h-3.5 w-3.5 fill-current" />
        )}
      </Button>
    </div>
  );
}
