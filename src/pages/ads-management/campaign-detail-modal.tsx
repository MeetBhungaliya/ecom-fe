// ============================================
// CAMPAIGN DETAIL MODAL
// Shows fetched Meesho campaign details inside a modal.
// Sections: Header → Summary Stats → Catalogs (with images, bid, status)
// ============================================

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  TrendingUp,
  Eye,
  MousePointerClick,
  ShoppingBag,
  BarChart2,
  Wallet,
  Loader2,
  AlertCircle,
  ImageOff,
  Calendar,
  Info,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Hash,
  Pause,
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import type { EnrichedAdsCampaign } from '@/hooks/use-ads-campaigns';
import { useCampaignDetails, usePauseAdsCampaign } from '@/hooks/use-ads-campaigns';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtCurrency(value: number | undefined | null) {
  if (value == null || isNaN(Number(value))) return '—';
  return `₹ ${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function fmtNum(value: number | undefined | null) {
  if (value == null || isNaN(Number(value))) return '—';
  return Number(value).toLocaleString('en-IN');
}

function fmtDate(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === 'number') {
    const d = new Date(raw);
    return isValid(d) ? format(d, 'dd MMM yyyy') : null;
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^\d{10,13}$/.test(trimmed)) {
      const n = Number(trimmed);
      const d = new Date(n > 1e11 ? n : n * 1000);
      return isValid(d) ? format(d, 'dd MMM yyyy') : null;
    }
    const iso = parseISO(trimmed);
    if (isValid(iso)) return format(iso, 'dd MMM yyyy');
  }
  return null;
}

function statusMeta(raw: string | undefined | null) {
  const s = String(raw ?? '').toUpperCase();
  if (s === 'ACTIVE' || s === 'LIVE' || s === 'RUNNING')
    return {
      label: s || 'ACTIVE',
      cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
    };
  if (s === 'PAUSED')
    return {
      label: 'PAUSED',
      cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
    };
  if (s === 'DELETED' || s === 'STOPPED')
    return { label: s, cls: 'bg-red-500/10 text-red-500 dark:text-red-400 border-red-500/25' };
  if (s)
    return { label: s, cls: 'bg-zinc-500/10 text-zinc-500 dark:text-zinc-400 border-zinc-500/20' };
  return null;
}

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  accent = 'text-[#0ea5e9]',
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl px-4 py-3 border border-zinc-200/80 dark:border-zinc-700/50">
      <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
        <span className={accent}>{icon}</span>
        {label}
      </div>
      <span className="text-sm font-semibold font-mono text-zinc-900 dark:text-zinc-100">
        {value}
      </span>
    </div>
  );
}

// ─── Image Strip (carousel for catalog_image_urls) ───────────────────────────

function ImageStrip({ urls, name }: { urls: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const filtered = urls.filter(Boolean);

  if (filtered.length === 0) {
    return (
      <div className="w-20 h-20 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200/80 dark:border-zinc-700/50">
        <ImageOff className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
      </div>
    );
  }

  return (
    <div className="relative shrink-0 group" style={{ width: 80, height: 80 }}>
      <img
        key={filtered[idx]}
        src={filtered[idx]}
        alt={name}
        className="w-20 h-20 rounded-xl object-cover border border-zinc-200/80 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src =
            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' fill='none' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%23f4f4f5'/%3E%3Cpath stroke='%23a1a1aa' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E";
        }}
      />
      {filtered.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => (i - 1 + filtered.length) % filtered.length);
            }}
            className="absolute left-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <ChevronLeft className="h-2.5 w-2.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIdx((i) => (i + 1) % filtered.length);
            }}
            className="absolute right-0.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            <ChevronRight className="h-2.5 w-2.5" />
          </button>
          {/* dot indicators */}
          <div className="absolute bottom-0.5 left-0 right-0 flex justify-center gap-0.5">
            {filtered.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIdx(i);
                }}
                className={`h-1 rounded-full transition-all cursor-pointer ${i === idx ? 'w-3 bg-white' : 'w-1 bg-white/50'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Catalog Card ─────────────────────────────────────────────────────────────

function CatalogCard({ catalog }: { catalog: any }) {
  const images: string[] =
    catalog.catalog_image_urls ||
    catalog.catalogImageUrls ||
    catalog.image_urls ||
    (catalog.catalog_image_url ? [catalog.catalog_image_url] : []) ||
    [];

  const catalogId = catalog.catalog_id ?? catalog.catalogId ?? catalog.id;
  const catalogName =
    catalog.catalog_name ?? catalog.catalogName ?? catalog.name ?? `Catalog #${catalogId}`;
  const bid = catalog.bid ?? catalog.max_bid ?? catalog.cpo ?? catalog.max_cpo;
  const statusRaw = catalog.catalog_status ?? catalog.status;
  const st = statusMeta(statusRaw);

  const perf = catalog.perf_details || catalog.perfDetails || {};
  const views = perf.total_views ?? perf.totalViews ?? catalog.views;
  const clicks = perf.total_clicks ?? perf.totalClicks ?? catalog.clicks;
  const orders = perf.order_count ?? perf.orderCount ?? catalog.orders;
  const spent = perf.budget_utilised ?? perf.budgetUtilised ?? catalog.budget_utilised;

  return (
    <div className="flex gap-4 px-4 py-4 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/20 transition-colors">
      {/* Image strip */}
      <ImageStrip urls={images} name={catalogName} />

      {/* Main info */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Name + Status */}
        <div className="flex items-start gap-2 min-w-0">
          <span
            className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100 leading-snug flex-1 min-w-0"
            title={catalogName}
          >
            {catalogName}
          </span>
          {st && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded tracking-wider shrink-0 border ${st.cls}`}
            >
              {st.label}
            </span>
          )}
        </div>

        {/* IDs row */}
        <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
          {catalogId != null && (
            <span className="flex items-center gap-0.5">
              <Hash className="h-2.5 w-2.5 text-zinc-400" />
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">{catalogId}</span>
            </span>
          )}
        </div>

        {/* Metrics row */}
        {(views != null || clicks != null || orders != null || spent != null) && (
          <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 dark:text-zinc-400 flex-wrap">
            {spent != null && (
              <span className="flex items-center gap-1">
                <Wallet className="h-2.5 w-2.5 text-orange-400" />
                {fmtCurrency(spent)}
              </span>
            )}
            {views != null && (
              <span className="flex items-center gap-1">
                <Eye className="h-2.5 w-2.5 text-[#0ea5e9]" />
                {fmtNum(views)}
              </span>
            )}
            {clicks != null && (
              <span className="flex items-center gap-1">
                <MousePointerClick className="h-2.5 w-2.5 text-emerald-500" />
                {fmtNum(clicks)}
              </span>
            )}
            {orders != null && (
              <span className="flex items-center gap-1">
                <ShoppingBag className="h-2.5 w-2.5 text-pink-500" />
                {fmtNum(orders)}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bid — prominent right column */}
      <div className="shrink-0 flex flex-col items-end justify-between gap-2">
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-[9px] font-mono font-semibold tracking-widest text-zinc-400 uppercase">
            Bid / CPO
          </span>
          <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 leading-none">
            {bid != null ? fmtCurrency(bid) : '—'}
          </span>
        </div>
        {/* Edit bid button — placeholder for future edit capability */}
        <button
          type="button"
          disabled
          title="Edit bid (coming soon)"
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono font-medium rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 opacity-60 cursor-not-allowed transition-colors hover:opacity-80"
        >
          <Pencil className="h-2.5 w-2.5" />
          Edit
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────

export interface CampaignDetailModalProps {
  campaign: EnrichedAdsCampaign | null;
  onClose: () => void;
}

export function CampaignDetailModal({ campaign, onClose }: CampaignDetailModalProps) {
  const detailsPayload = campaign
    ? {
        accountId: campaign.account_id,
        campaign_id: campaign.campaign_id,
        supplier_id: (campaign as any).supplier_id,
      }
    : null;

  const { data, isLoading, isError, error } = useCampaignDetails(detailsPayload);
  const pauseMutation = usePauseAdsCampaign();

  const handlePause = () => {
    if (!campaign) return;
    pauseMutation.mutate(
      {
        accountId: campaign.account_id,
        campaign_id: campaign.campaign_id,
        supplier_id: (campaign as any).supplier_id,
        pause_nudge_status: 'DETAILS_PAGE',
      },
      {
        onSuccess: () => {
          onClose();
        },
      },
    );
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (campaign) document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [campaign]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const raw = data?.data;

  // Campaign-level perf (check multiple paths Meesho might return)
  const campaignObj =
    raw?.data?.campaign_data ?? raw?.campaign_data ?? raw?.campaignData ?? raw?.data ?? raw ?? {};
  const perf =
    campaignObj?.campaign_performance ??
    campaignObj?.perf_details ??
    campaignObj?.perfDetails ??
    {};

  const budgetUtilised = perf.total_budget_utilized ?? perf.budget_utilised ?? perf.budgetUtilised;
  const totalViews = perf.total_views ?? perf.totalViews;
  const totalClicks = perf.total_clicks ?? perf.totalClicks;
  const orderCount = perf.total_orders ?? perf.order_count ?? perf.orderCount;
  const revenue = perf.total_revenue ?? perf.revenue;
  const roi = perf.roi ?? perf.roas;

  // Catalogs array — primary path
  const catalogs: any[] =
    raw?.data?.catalogs ??
    raw?.catalogs ??
    raw?.catalog_list ??
    raw?.catalogList ??
    campaignObj?.catalogs ??
    // fallback to old "ads" fields
    raw?.data?.ads ??
    raw?.ads ??
    raw?.ad_list ??
    campaignObj?.ads ??
    [];

  const totalBudget = campaignObj?.total_budget ?? campaign?.total_budget ?? campaign?.budget;
  const startDateStr = fmtDate(campaignObj?.start_date ?? campaign?.start_date);
  const endDateStr = fmtDate(campaignObj?.end_date ?? campaign?.end_date);
  return (
    <AnimatePresence>
      {campaign && (
        <>
          {/* Backdrop */}
          <motion.div
            key="campaign-detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm"
          />

          {/* Panel */}
          <motion.div
            key="campaign-detail-modal"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex items-stretch justify-end pointer-events-none"
          >
            <div
              className="relative w-screen max-w-xl bg-white dark:bg-zinc-900 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Header ─────────────────────────────────────────────── */}
              <div className="flex items-start gap-3 px-5 py-4 border-b border-zinc-200/80 dark:border-zinc-800/80 shrink-0 bg-white dark:bg-zinc-900">
                <div className="flex-1 min-w-0 space-y-1">
                  {/* Badges row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {campaign.account_name && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold rounded tracking-wider bg-[#0ea5e9]/15 text-[#0ea5e9] border border-[#0ea5e9]/25 shrink-0">
                        {campaign.account_name}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                      <Hash className="h-2.5 w-2.5" />
                      {campaign.campaign_id}
                    </span>
                  </div>

                  {/* Campaign name */}
                  <h2 className="text-sm font-bold font-mono text-zinc-900 dark:text-zinc-100 leading-snug">
                    {campaign.campaign_name || `Campaign #${campaign.campaign_id}`}
                  </h2>

                  {/* Date range */}
                  {(startDateStr || endDateStr) && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                      <Calendar className="h-2.5 w-2.5" />
                      {startDateStr || '—'} → {endDateStr || 'No end date'}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePause}
                    disabled={pauseMutation.isPending || campaign.status === 'PAUSED'}
                    className="h-7 px-2.5 text-xs font-mono font-medium rounded-lg text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-500/10 dark:hover:bg-amber-500/15 border-amber-200/80 dark:border-amber-800/60 shadow-2xs transition-colors gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {pauseMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Pause className="h-3 w-3 fill-current" />
                    )}
                    {campaign.status === 'PAUSED' ? 'Paused' : 'Pause'}
                  </Button>

                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* ── Static Summary Stats ───────────────────────────────────── */}
              <div className="px-5 pt-4 pb-4 grid grid-cols-3 gap-2 shrink-0 border-b border-zinc-200/80 dark:border-zinc-800/80">
                <StatCard
                  icon={<Wallet className="h-3 w-3" />}
                  label="Budget"
                  value={fmtCurrency(totalBudget)}
                  accent="text-violet-500"
                />
                <StatCard
                  icon={<Wallet className="h-3 w-3" />}
                  label="Spent"
                  value={
                    isLoading
                      ? '…'
                      : fmtCurrency(budgetUtilised ?? campaign.perf_details?.budget_utilised)
                  }
                  accent="text-orange-500"
                />
                <StatCard
                  icon={<Eye className="h-3 w-3" />}
                  label="Views"
                  value={isLoading ? '…' : fmtNum(totalViews ?? campaign.perf_details?.total_views)}
                  accent="text-[#0ea5e9]"
                />
                <StatCard
                  icon={<MousePointerClick className="h-3 w-3" />}
                  label="Clicks"
                  value={
                    isLoading ? '…' : fmtNum(totalClicks ?? campaign.perf_details?.total_clicks)
                  }
                  accent="text-emerald-500"
                />
                <StatCard
                  icon={<ShoppingBag className="h-3 w-3" />}
                  label="Orders"
                  value={isLoading ? '…' : fmtNum(orderCount ?? campaign.perf_details?.order_count)}
                  accent="text-pink-500"
                />
                <StatCard
                  icon={<TrendingUp className="h-3 w-3" />}
                  label="ROI"
                  value={
                    isLoading
                      ? '…'
                      : (roi ?? campaign.perf_details?.roi) != null
                        ? Number(roi ?? campaign.perf_details?.roi).toFixed(2)
                        : '—'
                  }
                  accent="text-amber-500"
                />
                {!isLoading && revenue != null && (
                  <StatCard
                    icon={<BarChart2 className="h-3 w-3" />}
                    label="Revenue"
                    value={fmtCurrency(revenue)}
                    accent="text-teal-500"
                  />
                )}
              </div>

              {/* ── Scrollable Catalogs section ───────────────────────────── */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-5 py-4">
                  {/* Section header */}
                  <div className="flex items-center justify-between mb-2.5 pt-1">
                    <h3 className="text-[10px] font-mono font-semibold tracking-widest text-zinc-400 uppercase">
                      Catalogs
                    </h3>
                    {!isLoading && !isError && catalogs.length > 0 && (
                      <span className="text-[10px] font-mono text-zinc-400">
                        {catalogs.length} {catalogs.length === 1 ? 'catalog' : 'catalogs'}
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/50 overflow-hidden">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center gap-3 py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-[#0ea5e9]" />
                        <span className="text-xs font-mono text-zinc-400">
                          Fetching catalog details…
                        </span>
                      </div>
                    ) : isError ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                        <span className="text-xs font-mono text-zinc-500">
                          {(error as any)?.message || 'Failed to fetch campaign details'}
                        </span>
                      </div>
                    ) : catalogs.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-10">
                        <Info className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
                        <span className="text-xs font-mono text-zinc-400">
                          No catalogs returned for this campaign
                        </span>
                      </div>
                    ) : (
                      catalogs.map((catalog: any, idx: number) => (
                        <CatalogCard
                          key={catalog.catalog_id ?? catalog.id ?? idx}
                          catalog={catalog}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
