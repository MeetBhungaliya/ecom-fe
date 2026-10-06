import { useEffect } from 'react';
import { useQuery, useMutation, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api-client';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store/auth.store';
import { wsClient } from '@/services/ws-client';
import type { AdsCampaign, AdsCampaignsResponse, CachedCampaignsData } from '@/types';

// ============================================
// ADS CAMPAIGNS HOOKS
// Fetches 100% of campaigns per account in order.
// Cached in TanStack Query (in-memory). PostgreSQL backed.
// ============================================

export function useAdsCampaigns(accountId?: number, status: string = 'LIVE') {
  return useQuery({
    queryKey: [...queryKeys.adsCampaigns.list(accountId), status],
    queryFn: () =>
      api.get<AdsCampaignsResponse>(`/accounts/ads/campaigns/${accountId}`, { status }),
    select: (res) => res.data?.campaigns ?? [],
    enabled: !!accountId,
    staleTime: 10 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export type EnrichedAdsCampaign = AdsCampaign & {
  account_id?: string | number;
  account_name?: string;
};

export interface AccountCampaignError {
  accountId: string | number;
  accountName: string;
  message: string;
  status?: number;
}

export interface MergedFetchStatus {
  isFetching: boolean;
  totalFetched: number;
  totalRecords: number;
}

export interface AccountFetchProgress {
  fetched: number;
  total: number;
  isComplete: boolean;
}

// ============================================
// MULTI-ACCOUNT HOOK (POSTGRESQL-BACKED SYNC)
// ============================================

export interface InfiniteAdsParams {
  accountIds: string[];
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  // numeric filters
  budgetMin?: number;
  budgetMax?: number;
  spentMin?: number;
  spentMax?: number;
  roiMin?: number;
  roiMax?: number;
  ordersMin?: number;
  ordersMax?: number;
  revenueMin?: number;
  revenueMax?: number;
  viewsMin?: number;
  viewsMax?: number;
  clicksMin?: number;
  clicksMax?: number;
}

export function useInfiniteAdsCampaigns(
  params: InfiniteAdsParams,
  accountsMap?: Record<string, string>,
) {
  const user = useAuthStore((s) => s.user);

  // Subscribe to live WebSocket events to invalidate query on sync completion
  useEffect(() => {
    if (!user?.id) return;
    const unsubscribe = wsClient.subscribe<Record<string, unknown>>(
      `accounts/${user.id}`,
      (data: any) => {
        if (!data.accountId) return;
        const accId = data.accountId.toString();

        if (data.type === 'ads.sync.completed' && params.accountIds.includes(accId)) {
          // Invalidate the infinite list to refetch from page 1
          queryClient.invalidateQueries({
            queryKey: queryKeys.adsCampaigns.infiniteList(params),
          });
        }
      },
    );
    return () => unsubscribe();
  }, [user?.id, params]);

  return useInfiniteQuery({
    queryKey: queryKeys.adsCampaigns.infiniteList(params),
    queryFn: async ({ pageParam }) => {
      if (params.accountIds.length === 0) {
        return { data: [], pagination: { hasMore: false, nextCursor: null }, meta: { total: 0 } };
      }

      const queryParams: Record<string, any> = {
        ...params,
        accountIds: params.accountIds.join(','),
        cursor: pageParam,
      };

      const res = await api.get<{
        data: EnrichedAdsCampaign[];
        pagination: { hasMore: boolean; nextCursor: string | null };
        meta: { total: number; aggregates?: Record<string, { min: number; max: number }> };
      }>('/accounts/ads/campaigns', queryParams);

      const rawData: EnrichedAdsCampaign[] = res.data || [];
      const pagination = res.pagination || { hasMore: false, nextCursor: null };
      const meta = res.meta || { total: 0 };

      // Enrich campaigns with account name
      const enrichedData = rawData.map((c) => ({
        ...c,
        account_name: accountsMap?.[c.account_id?.toString() || ''] || `Account ${c.account_id}`,
      }));

      return {
        data: enrichedData,
        pagination,
        meta,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore ? lastPage.pagination.nextCursor : undefined,
    initialPageParam: null as string | null,
    enabled: params.accountIds.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
}

export interface PauseCampaignPayload {
  accountId?: string | number;
  campaign_id: number;
  supplier_id?: number;
  pause_nudge_status?: string;
}

export interface EditCatalogBidPayload {
  accountId: number | string;
  campaign_id: number | string;
  supplier_id?: number;
  catalog_id: number | string;
  bid: number;
  prefilled_input_value?: number;
}

export function useEditCatalogBid() {
  return useMutation({
    mutationFn: async (payload: EditCatalogBidPayload) =>
      api.post<{ success: boolean; message: string; data?: unknown }>(
        '/accounts/ads/campaigns/edit-catalogs',
        {
          accountId: payload.accountId,
          campaign_id: payload.campaign_id,
          supplier_id: payload.supplier_id,
          catalog_id: payload.catalog_id,
          bid: payload.bid,
          prefilled_input_value: payload.prefilled_input_value || payload.bid,
        },
      ),
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['campaign-details', variables.campaign_id, variables.accountId],
      });
      toast.success(res.message || 'Bid updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error?.message || 'Failed to update bid');
    },
  });
}

export function usePauseAdsCampaign() {
  return useMutation({
    mutationFn: async (payload: PauseCampaignPayload) => {
      return api.post<{ success: boolean; message: string; data?: unknown }>(
        '/accounts/ads/campaigns/pause',
        {
          accountId: payload.accountId,
          campaign_id: payload.campaign_id,
          supplier_id: payload.supplier_id,
          pause_nudge_status: payload.pause_nudge_status || 'DETAILS_PAGE',
        },
      );
    },
    onSuccess: (_, variables) => {
      const campaignId = variables.campaign_id;
      const accountId = variables.accountId;

      // 1. Immediately update TanStack Query cache for this account
      if (accountId) {
        queryClient.setQueryData<CachedCampaignsData>(
          [...queryKeys.adsCampaigns.list(Number(accountId)), 'LIVE'],
          (old) => {
            if (!old || !old.campaigns) return old;
            const remaining = old.campaigns.filter((c) => c.campaign_id !== campaignId);
            return {
              ...old,
              campaigns: remaining,
              totalCount: Math.max(0, (old.totalCount || remaining.length) - 1),
            };
          },
        );
      } else {
        queryClient.invalidateQueries({
          queryKey: queryKeys.adsCampaigns.all,
        });
      }

      toast.success('Campaign paused successfully');
    },
    onError: (err: any) => {
      const msg = err?.message || err?.error || 'Failed to pause campaign';
      toast.error(msg);
    },
  });
}

// ============================================
// BULK PAUSE CAMPAIGNS HOOK
// ============================================

export interface BulkPauseCampaignItem {
  campaign_id: number;
  accountId: string | number;
  supplier_id?: number;
}

export interface BulkPausePayload {
  items: BulkPauseCampaignItem[];
}

export function useBulkPauseAdsCampaigns() {
  return useMutation({
    mutationFn: async (payload: BulkPausePayload) => {
      return api.post<{ message: string; jobId: string; total: number }>(
        '/accounts/ads/campaigns/bulk-pause',
        payload,
      );
    },
    onSuccess: (_, variables) => {
      const items = variables.items;

      // Group by accountId to update caches
      const byAccount = new Map<string, number[]>();
      for (const it of items) {
        const accId = it.accountId.toString();
        const list = byAccount.get(accId) || [];
        list.push(it.campaign_id);
        byAccount.set(accId, list);
      }

      byAccount.forEach((pausedIds, accId) => {
        const pausedSet = new Set(pausedIds);

        queryClient.setQueryData<CachedCampaignsData>(
          [...queryKeys.adsCampaigns.list(Number(accId)), 'LIVE'],
          (old) => {
            if (!old || !old.campaigns) return old;
            const remaining = old.campaigns.filter((c) => !pausedSet.has(c.campaign_id));
            return {
              ...old,
              campaigns: remaining,
              totalCount: Math.max(0, (old.totalCount || remaining.length) - pausedIds.length),
            };
          },
        );
      });

      toast.success(`Queued pause for ${items.length} campaigns`);
    },
    onError: (err: any) => {
      const msg = err?.message || err?.error || 'Failed to queue bulk pause';
      toast.error(msg);
    },
  });
}

// ============================================
// CAMPAIGN DETAILS HOOK
// ============================================

export interface CampaignDetailsPayload {
  accountId?: string | number;
  campaign_id: number | string;
  supplier_id?: number;
  page_number?: number;
  page_size?: number;
  start_date?: string | null;
  end_date?: string | null;
  is_graph_required?: boolean;
  date_window?: string;
}

export function useCampaignDetails(payload: CampaignDetailsPayload | null) {
  return useQuery({
    queryKey: ['campaign-details', payload?.campaign_id, payload?.accountId],
    queryFn: () =>
      api.post<{ success: boolean; data: any }>('/accounts/ads/campaigns/details', {
        accountId: payload!.accountId,
        campaign_id: payload!.campaign_id,
        supplier_id: payload!.supplier_id,
        page_number: payload!.page_number ?? 1,
        page_size: payload!.page_size ?? 10,
        start_date: payload!.start_date ?? null,
        end_date: payload!.end_date ?? null,
        is_graph_required: payload!.is_graph_required ?? true,
        date_window: payload!.date_window ?? 'AUTO',
      }),
    enabled: !!payload?.campaign_id,
    staleTime: 2 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });
}
