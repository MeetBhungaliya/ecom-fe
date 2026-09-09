import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTable, flexRender } from '@tanstack/react-table';
import type { SortingState, RowSelectionState } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAccounts } from '@/hooks/use-accounts';
import { useMarketplaceStore } from '@/store/marketplace.store';
import { useMultiAccountAdsCampaigns } from '@/hooks/use-ads-campaigns';
import { features } from './table-features';
import { columns } from './columns';
import { cn } from '@/lib/cn';
import { Search, RotateCw, AlertCircle, AlertTriangle, ChevronUp, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

// ============================================
// CONSTANTS
// ============================================

const ROW_HEIGHT = 56;
const OVERSCAN = 10;

const getColumnLabel = (id: string) => {
  switch (id) {
    case 'campaign_name':
      return 'Campaign';
    case 'budget':
      return 'Budget';
    case 'budget_utilized':
      return 'Spent';
    case 'views':
      return 'Views';
    case 'clicks':
      return 'Clicks';
    case 'orders':
      return 'Orders';
    case 'revenue':
      return 'Revenue';
    case 'avg_roi':
      return 'Avg ROI';
    default:
      return id;
  }
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function AdsManagementPage() {
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const activeAccountIds = useMarketplaceStore((s) => s.activeAccountIds);

  // Accounts enabled in the top header selector
  const enabledAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter((a) => activeAccountIds.includes(a.id.toString()));
  }, [accounts, activeAccountIds]);

  const enabledAccountIds = useMemo(() => {
    return enabledAccounts.map((a) => a.id.toString());
  }, [enabledAccounts]);

  const accountsMap = useMemo(() => {
    const map: Record<string, string> = {};
    accounts?.forEach((a) => {
      map[a.id.toString()] = a.supplierData?.name || a.email || `Account ${a.id}`;
    });
    return map;
  }, [accounts]);

  // Fetch campaigns for ONLY the accounts currently enabled in the header
  const {
    campaigns,
    isLoading: campaignsLoading,
    isFetching: campaignsFetching,
    mergedFetch,
    failedAccounts,
    refresh: refreshCampaigns,
  } = useMultiAccountAdsCampaigns(enabledAccountIds, accountsMap);

  // In-table account filter state (user can toggle accounts on/off directly)
  const [tableFilterAccountIds, setTableFilterAccountIds] = useState<string[]>(
    () => enabledAccountIds,
  );
  const [isInitialized, setIsInitialized] = useState(() => enabledAccountIds.length > 0);

  // Keep in-table filter synchronized whenever header selection changes
  useEffect(() => {
    setTableFilterAccountIds((prev) => {
      if (!isInitialized) {
        if (enabledAccountIds.length > 0) {
          setIsInitialized(true);
          return enabledAccountIds;
        }
        return prev;
      }
      const valid = prev.filter((id) => enabledAccountIds.includes(id));
      const newlyAdded = enabledAccountIds.filter((id) => !valid.includes(id));
      const next = [...valid, ...newlyAdded];
      return next.length > 0 ? next : enabledAccountIds;
    });
  }, [enabledAccountIds, isInitialized]);

  const handleAccountClick = (accId: string) => {
    setTableFilterAccountIds((prev) => {
      if (prev.includes(accId)) {
        return prev.filter((id) => id !== accId);
      } else {
        return [...prev, accId];
      }
    });
  };

  // Table state
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});

  // Filter campaigns to match the in-table account filter
  const data = useMemo(() => {
    const activeFilters =
      tableFilterAccountIds.length > 0 ? tableFilterAccountIds : enabledAccountIds;
    return campaigns.filter((c) =>
      c.account_id ? activeFilters.includes(c.account_id.toString()) : false,
    );
  }, [campaigns, tableFilterAccountIds, enabledAccountIds]);

  // Count records per account to show on datatable account pills
  const accountCampaignCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    campaigns.forEach((c) => {
      if (c.account_id) {
        const idStr = c.account_id.toString();
        counts[idStr] = (counts[idStr] || 0) + 1;
      }
    });
    return counts;
  }, [campaigns]);

  // Table instance
  const table = useTable({
    features,
    data,
    columns,
    state: {
      sorting,
      globalFilter,
      rowSelection,
      columnVisibility,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: (updater: any) => {
      setColumnVisibility((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    },
  });

  const { rows } = table.getRowModel();

  // Column toggles directly from table's hideable columns
  const toggleableColumns = table.getAllLeafColumns().filter((column) => column.getCanHide());

  // Virtualization
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: useCallback(() => ROW_HEIGHT, []),
    overscan: OVERSCAN,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const paddingTop = virtualItems.length > 0 ? virtualItems[0].start : 0;
  const paddingBottom =
    virtualItems.length > 0
      ? virtualizer.getTotalSize() - (virtualItems[virtualItems.length - 1]?.end ?? 0)
      : 0;

  const selectedCount = Object.keys(rowSelection).length;

  const isLoading = accountsLoading || (campaignsLoading && campaigns.length === 0);
  const hasFatalError = campaigns.length === 0 && failedAccounts.length > 0 && !isLoading;

  return (
    <div className="w-full space-y-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      >
        {/* Toolbar */}
        <div className="px-6 py-5 space-y-3.5 border-b border-zinc-200/80 dark:border-zinc-800/80">
          {/* Row 1: Search, Refresh & Account Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                placeholder="Search campaigns..."
                className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0ea5e9]/30 placeholder:text-zinc-400 font-mono transition-shadow"
              />
            </div>

            {/* Right Toolbar: Refresh + Account Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => refreshCampaigns(tableFilterAccountIds)}
                disabled={campaignsFetching}
                title="Refresh campaigns for selected accounts"
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono font-medium rounded-lg border border-zinc-200 dark:border-zinc-700/60 bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                <RotateCw
                  className={cn('h-3.5 w-3.5', campaignsFetching && 'animate-spin text-[#0ea5e9]')}
                />
                <span>REFRESH</span>
              </button>

              {enabledAccounts.length > 0 && (
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/50 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700/50 gap-1 overflow-x-auto">
                  {enabledAccounts.map((acc) => {
                    const accId = acc.id.toString();
                    const isSelected = tableFilterAccountIds.includes(accId);
                    const name = acc.supplierData?.name || acc.email || `Account ${acc.id}`;
                    const count = accountCampaignCounts[accId] || 0;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => handleAccountClick(accId)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono font-semibold rounded-md tracking-wider transition-colors cursor-pointer whitespace-nowrap',
                          isSelected
                            ? 'bg-[#0ea5e9] text-white shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200',
                        )}
                      >
                        <span>{name}</span>
                        {count > 0 && (
                          <span
                            className={cn(
                              'px-1.5 py-0.2 rounded text-[10px] font-mono font-normal',
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300',
                            )}
                          >
                            {count.toLocaleString()}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Column Toggle Filters & Selection Counts */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Column Toggle Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {toggleableColumns.map((col) => {
                const isVisible = col.getIsVisible();
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => col.toggleVisibility()}
                    className={cn(
                      'px-3 py-1 text-[11px] font-mono rounded transition-colors cursor-pointer select-none',
                      isVisible
                        ? 'text-zinc-800 dark:text-zinc-200 bg-zinc-200/80 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-700/80'
                        : 'text-zinc-400 dark:text-zinc-500 bg-zinc-100/60 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 line-through opacity-50 hover:opacity-75',
                    )}
                  >
                    {getColumnLabel(col.id)}
                  </button>
                );
              })}
            </div>

            {/* Row and Selection Count */}
            <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400 tracking-widest uppercase">
              {mergedFetch.isFetching && (
                <div className="flex items-center gap-1.5 text-[#0ea5e9] bg-[#0ea5e9]/10 px-2 py-0.5 rounded border border-[#0ea5e9]/20 font-bold">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0ea5e9] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#0ea5e9]"></span>
                  </span>
                  <span>
                    FETCHING ({mergedFetch.totalFetched.toLocaleString()}
                    {mergedFetch.totalRecords > 0
                      ? ` / ${mergedFetch.totalRecords.toLocaleString()}`
                      : ''}
                    )
                  </span>
                </div>
              )}
              <span>
                {rows.length} ROWS · {selectedCount} SELECTED
              </span>
              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setRowSelection({})}
                  className="px-2 py-0.5 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded tracking-widest uppercase transition-colors cursor-pointer"
                >
                  CLEAR SELECTION
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Partial Failure Warning Banner (shows if some accounts succeeded and some failed) */}
        {failedAccounts.length > 0 && campaigns.length > 0 && (
          <div className="mx-6 mt-4 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs font-mono text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <div className="flex-1 space-y-1">
              <span className="font-semibold">Some accounts could not be fetched:</span>
              <ul className="list-disc list-inside space-y-0.5 text-zinc-600 dark:text-zinc-400 text-[11px]">
                {failedAccounts.map((acc) => (
                  <li key={acc.accountId}>
                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                      {acc.accountName}:
                    </span>{' '}
                    {acc.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Table Area with Stable Height to Eliminate Flicker */}
        <div
          ref={scrollContainerRef}
          className="overflow-auto relative h-[calc(100vh-280px)] min-h-[500px]"
        >
          {/* Zero-height top progress line while background streaming */}
          {mergedFetch.isFetching && data.length > 0 && (
            <div className="sticky top-0 left-0 right-0 h-0.5 z-20 bg-zinc-200/40 dark:bg-zinc-800/40 overflow-hidden pointer-events-none">
              <div
                className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] transition-all duration-300"
                style={{
                  width: `${
                    mergedFetch.totalRecords > 0
                      ? Math.min(
                          100,
                          Math.round((mergedFetch.totalFetched / mergedFetch.totalRecords) * 100),
                        )
                      : 15
                  }%`,
                }}
              />
            </div>
          )}
          {isLoading || (campaignsFetching && data.length === 0) ? (
            <div className="h-full min-h-[500px] w-full flex flex-col items-center justify-center text-center p-8 gap-4 font-mono">
              <div className="relative flex items-center justify-center">
                <div className="h-12 w-12 rounded-full border-2 border-[#0ea5e9]/20 border-t-[#0ea5e9] animate-spin" />
                <span className="absolute flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0ea5e9] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#0ea5e9]"></span>
                </span>
              </div>
              <div className="space-y-1.5 max-w-md">
                <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  {mergedFetch.isFetching ? 'Fetching campaigns...' : 'Loading campaigns...'}
                </h4>
                {mergedFetch.isFetching && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                      <span>
                        <strong className="text-[#0ea5e9]">
                          {mergedFetch.totalFetched.toLocaleString()}
                        </strong>
                        {mergedFetch.totalRecords > 0 ? (
                          <>
                            {' '}
                            of <strong>{mergedFetch.totalRecords.toLocaleString()}</strong> records
                          </>
                        ) : (
                          ' records fetched'
                        )}
                      </span>
                    </div>
                    {mergedFetch.totalRecords > 0 && (
                      <div className="w-56 mx-auto h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#0ea5e9] to-[#38bdf8] transition-all duration-300 rounded-full"
                          style={{
                            width: `${Math.min(100, Math.round((mergedFetch.totalFetched / mergedFetch.totalRecords) * 100))}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : enabledAccountIds.length === 0 ? (
            <div className="h-full min-h-[500px] w-full flex flex-col items-center justify-center text-center p-8 gap-2 font-mono">
              <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800/80 mb-2 border border-zinc-200 dark:border-zinc-700/60">
                <AlertCircle className="h-6 w-6 text-zinc-400" />
              </div>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                No Accounts Selected in Header
              </span>
              <span className="text-xs text-zinc-500 max-w-sm">
                Select one or more accounts from the header selector at the top right to view and
                manage campaigns.
              </span>
            </div>
          ) : tableFilterAccountIds.length === 0 ? (
            <div className="h-full min-h-[500px] w-full flex flex-col items-center justify-center text-center p-8 gap-2 font-mono">
              <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800/80 mb-2 border border-zinc-200 dark:border-zinc-700/60">
                <AlertCircle className="h-6 w-6 text-zinc-400" />
              </div>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                No Accounts Selected in Filter
              </span>
              <span className="text-xs text-zinc-500 max-w-sm">
                Click on one or more account pills above to display campaigns.
              </span>
            </div>
          ) : hasFatalError ? (
            <div className="h-full min-h-[500px] w-full flex flex-col items-center justify-center text-center p-8 font-mono">
              <div className="p-8 max-w-md mx-auto space-y-4">
                <div className="mx-auto w-12 h-12 rounded-full bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-red-500">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Unable to Fetch Meesho Campaigns
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-sans">
                    Meesho has rejected the request (HTTP 403 Forbidden / Rate limit). Automatic
                    retries are paused to avoid further blocks.
                  </p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 text-left text-xs space-y-1">
                  {failedAccounts.map((acc) => (
                    <div key={acc.accountId} className="text-zinc-600 dark:text-zinc-300">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                        {acc.accountName}:
                      </span>{' '}
                      {acc.message}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => refreshCampaigns()}
                    disabled={campaignsFetching}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#0ea5e9] hover:bg-[#0284c7] text-white text-xs font-mono font-medium rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RotateCw className={cn('h-3.5 w-3.5', campaignsFetching && 'animate-spin')} />
                    <span>{campaignsFetching ? 'Retrying...' : 'Try Again'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className="h-full min-h-[500px] w-full flex flex-col items-center justify-center text-center p-8 gap-2 font-mono">
              <div className="p-3 rounded-full bg-zinc-100 dark:bg-zinc-800/80 mb-1 border border-zinc-200 dark:border-zinc-700/60">
                <Search className="h-5 w-5 text-zinc-400" />
              </div>
              <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                No campaigns found
              </span>
              <span className="text-xs text-zinc-500 max-w-sm">
                Try adjusting your search terms or account filters above.
              </span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse table-fixed min-w-[700px]">
              <colgroup>
                {table.getVisibleLeafColumns().map((col) => (
                  <col
                    key={col.id}
                    style={{ width: col.id === 'campaign_name' ? undefined : col.getSize() }}
                  />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-xs">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isSorted = header.column.getIsSorted();
                      const canSort = header.column.getCanSort();

                      return (
                        <th
                          key={header.id}
                          aria-sort={
                            isSorted === 'asc'
                              ? 'ascending'
                              : isSorted === 'desc'
                                ? 'descending'
                                : undefined
                          }
                          className="px-4 py-3 text-[10px] font-mono font-semibold tracking-[0.15em] text-zinc-400 uppercase select-none whitespace-nowrap"
                        >
                          {header.isPlaceholder ? null : canSort ? (
                            <button
                              type="button"
                              onClick={header.column.getToggleSortingHandler()}
                              className={cn(
                                'flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.15em] uppercase transition-colors cursor-pointer select-none focus-visible:outline-none',
                                isSorted
                                  ? 'text-zinc-900 dark:text-zinc-100'
                                  : 'text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200',
                              )}
                            >
                              <span>
                                {flexRender(header.column.columnDef.header, header.getContext())}
                              </span>
                              {isSorted === 'asc' ? (
                                <ChevronUp className="h-3 w-3 text-[#0ea5e9] shrink-0" />
                              ) : isSorted === 'desc' ? (
                                <ChevronDown className="h-3 w-3 text-[#0ea5e9] shrink-0" />
                              ) : null}
                            </button>
                          ) : (
                            flexRender(header.column.columnDef.header, header.getContext())
                          )}
                        </th>
                      );
                    })}
                  </tr>
                ))}
              </thead>
              <tbody>
                {paddingTop > 0 && (
                  <tr>
                    <td
                      style={{ height: `${paddingTop}px`, padding: 0, border: 0 }}
                      colSpan={table.getVisibleLeafColumns().length}
                    />
                  </tr>
                )}
                {virtualItems.map((virtualRow) => {
                  const row = rows[virtualRow.index];
                  if (!row) return null;
                  return (
                    <tr
                      key={row.id}
                      data-index={virtualRow.index}
                      ref={(node) => virtualizer.measureElement(node)}
                      className="group border-b border-zinc-100 dark:border-zinc-800/40 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors h-[56px]"
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-2.5 align-middle">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
                {paddingBottom > 0 && (
                  <tr>
                    <td
                      style={{ height: `${paddingBottom}px`, padding: 0, border: 0 }}
                      colSpan={table.getVisibleLeafColumns().length}
                    />
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}
