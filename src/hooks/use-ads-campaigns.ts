import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueries, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, type ApiError } from '@/lib/api-client';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store/auth.store';
import { Transmit } from '@adonisjs/transmit-client';
import type { AdsCampaign, AdsCampaignsResponse, CachedCampaignsData } from '@/types';
import {
  saveCampaignsToIdb,
  getCampaignsFromIdb,
  clearAccountCampaignsFromIdb,
} from '@/lib/ads-db';

// ============================================
// SEQUENTIAL REQUEST QUEUE
// Ensures accounts are fetched strictly in order,
// account by account, without bursting or race conditions.
// ============================================

class RequestQueue {
  private queue = Promise.resolve();

  enqueue<T>(task: () => Promise<T>): Promise<T> {
    const res = this.queue.then(task, task);
    this.queue = res.then(
      () => {},
      () => {},
    );
    return res;
  }
}

export const adsFetchQueue = new RequestQueue();

// ============================================
// ADS CAMPAIGNS HOOKS
// Fetches 100% of campaigns per account in order.
// Cached in TanStack Query (in-memory) & Redis (server).
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
// SINGLETON TRANSMIT CLIENT FOR LIVE FETCH COUNTS
// ============================================

let sharedTransmit: Transmit | null = null;

function getSharedTransmit(): Transmit {
  if (!sharedTransmit) {
    sharedTransmit = new Transmit({
      baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8443',
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
  return sharedTransmit;
}

// ============================================
// MULTI-ACCOUNT HOOK (CONCURRENT QUEUE-BACKED SYNC)
// ============================================

export function useMultiAccountAdsCampaigns(
  accountIds: (number | string)[],
  accountsMap?: Record<string, string>,
  status: string = 'LIVE',
) {
  const user = useAuthStore((s) => s.user);
  const [accountProgress, setAccountProgress] = useState<Record<string, AccountFetchProgress>>({});
  const forceRefreshSetRef = useRef<Set<string>>(new Set());
  const activeTargetIdsRef = useRef<string[]>([]);

  // Hydrate from IndexedDB on initial mount or when accountIds change
  useEffect(() => {
    let isCancelled = false;

    accountIds.forEach(async (id) => {
      try {
        const cached = await getCampaignsFromIdb(id, status);
        if (isCancelled || !cached || !cached.campaigns || cached.campaigns.length === 0) return;

        queryClient.setQueryData<CachedCampaignsData>(
          [...queryKeys.adsCampaigns.list(Number(id)), status],
          (old) => {
            if (old && old.campaigns && old.campaigns.length >= cached.campaigns.length) {
              return old;
            }
            const prev = old?.campaigns || [];
            const seen = new Set(prev.map((c) => c.campaign_id));
            const fresh = cached.campaigns.filter((c) => !seen.has(c.campaign_id));
            const merged = [...prev, ...fresh];

            return {
              campaigns: merged,
              totalCount: cached.totalCount || merged.length,
              isComplete: false,
            };
          },
        );
      } catch (err) {
        console.warn('[Ads IDB] Hydration error for account', id, err);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [accountIds, status]);

  // Subscribe to live SSE events for records progress across concurrent accounts
  useEffect(() => {
    if (!user?.id) return;
    const transmit = getSharedTransmit();
    const subscription = transmit.subscription(`accounts/${user.id}`);

    subscription
      .create()
      .then(() => {
        subscription.onMessage((data: any) => {
          if (data?.type === 'ads_fetch_progress' && data.accountId) {
            const accId = data.accountId.toString();
            const current = Number(data.currentRecords || 0);
            const total = Number(data.totalRecords || 0);
            const isDone = Boolean(data.isComplete || (total > 0 && current >= total));

            setAccountProgress((prev) => ({
              ...prev,
              [accId]: {
                fetched: current,
                total,
                isComplete: isDone,
              },
            }));

            // Live progressive streaming into TanStack Query cache and IndexedDB
            if (
              data.newCampaigns &&
              Array.isArray(data.newCampaigns) &&
              data.newCampaigns.length > 0
            ) {
              queryClient.setQueryData<CachedCampaignsData>(
                [...queryKeys.adsCampaigns.list(Number(data.accountId)), status],
                (old) => {
                  const prev = old?.campaigns || [];
                  const seen = new Set(prev.map((c) => c.campaign_id));
                  const fresh = data.newCampaigns.filter((c: any) => !seen.has(c.campaign_id));
                  const merged = [...prev, ...fresh];

                  // Persist to client disk (IndexedDB) immediately so reload never loses data
                  saveCampaignsToIdb(
                    data.accountId,
                    status,
                    merged,
                    data.totalRecords || merged.length,
                  ).catch(() => {});

                  return {
                    campaigns: merged,
                    totalCount: data.totalRecords || merged.length,
                    isComplete: isDone,
                  };
                },
              );
            }
          } else if (data?.type === 'ads_fetch_error' && data.accountId) {
            const accId = data.accountId.toString();
            setAccountProgress((prev) => ({
              ...prev,
              [accId]: {
                fetched: prev[accId]?.fetched || 0,
                total: prev[accId]?.total || 0,
                isComplete: true,
              },
            }));
          }
        });
      })
      .catch((err) => {
        console.error('[Ads SSE] Subscription error:', err);
      });

    return () => {
      subscription.delete().catch(() => {});
    };
  }, [user?.id, status]);

  const queryResults = useQueries({
    queries: accountIds.map((id) => ({
      queryKey: [...queryKeys.adsCampaigns.list(Number(id)), status],
      queryFn: async (): Promise<CachedCampaignsData> => {
        const isForce = forceRefreshSetRef.current.has(id.toString());
        forceRefreshSetRef.current.delete(id.toString());

        const params: Record<string, unknown> = { status };
        if (isForce) {
          params.refresh = 'true';
        }

        const res = await api.get<AdsCampaignsResponse>(`/accounts/ads/campaigns/${id}`, params);
        const count = res.data?.campaigns?.length || res.data?.totalCount || 0;
        const isDone = Boolean(res.cached || res.data?.isComplete);

        setAccountProgress((prev) => ({
          ...prev,
          [id.toString()]: {
            fetched: count,
            total: res.data?.totalCount || count,
            isComplete: isDone,
          },
        }));

        const existingQueryData = queryClient.getQueryData<CachedCampaignsData>([
          ...queryKeys.adsCampaigns.list(Number(id)),
          status,
        ]);

        if (res.data?.campaigns && res.data.campaigns.length > 0) {
          saveCampaignsToIdb(id, status, res.data.campaigns, count).catch(() => {});
        }

        if (
          (!res.data?.campaigns || res.data.campaigns.length === 0) &&
          existingQueryData &&
          existingQueryData.campaigns.length > 0
        ) {
          return existingQueryData;
        }

        return res.data;
      },
      enabled: !!id,
      staleTime: 10 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    })),
  });

  // Calculate merged progress metrics across all active accounts
  const relevantIds = accountIds.map(String);
  let mergedFetched = 0;
  let mergedTotal = 0;
  let hasActiveSync = false;

  for (const id of relevantIds) {
    const p = accountProgress[id];
    if (p) {
      mergedFetched += p.fetched;
      mergedTotal += p.total;
      if (!p.isComplete) {
        hasActiveSync = true;
      }
    }
  }

  const isQueryFetching = queryResults.some((r) => r.isFetching);
  const isFetching = isQueryFetching || hasActiveSync;

  const mergedFetch: MergedFetchStatus = {
    isFetching,
    totalFetched: mergedFetched,
    totalRecords: mergedTotal,
  };

  const isLoading = queryResults.some((r) => r.isLoading);
  const isError = queryResults.some((r) => r.isError);
  const isAllError = queryResults.length > 0 && queryResults.every((r) => r.isError);

  // Aggregate errors across accounts
  const failedAccounts: AccountCampaignError[] = [];
  queryResults.forEach((r, idx) => {
    if (r.isError) {
      const id = accountIds[idx];
      const accountName = accountsMap?.[id.toString()] || `Account ${id}`;
      const err = r.error as ApiError | Error;
      const message =
        'message' in err && err.message ? err.message : 'Failed to fetch campaigns from Meesho';
      const errStatus = 'status' in err ? (err as ApiError).status : undefined;

      failedAccounts.push({
        accountId: id,
        accountName,
        message,
        status: errStatus,
      });
    }
  });

  // Extract merged campaigns in account order
  const campaigns: EnrichedAdsCampaign[] = [];
  queryResults.forEach((r, idx) => {
    const id = accountIds[idx];
    if (!id) return;
    const accIdStr = id.toString();
    const accountName = accountsMap?.[accIdStr] || `Account ${id}`;
    const accountCampaigns = r.data?.campaigns || [];

    for (const c of accountCampaigns) {
      campaigns.push({
        ...c,
        account_id: id,
        account_name: accountName,
      });
    }
  });

  // Targeted refresh: only refetches accounts selected in data table and clears old data first
  const refresh = useCallback(
    (targetAccountIds?: (string | number)[] | string | number) => {
      const ids = targetAccountIds
        ? Array.isArray(targetAccountIds)
          ? targetAccountIds.map(String)
          : [targetAccountIds.toString()]
        : accountIds.map(String);

      activeTargetIdsRef.current = ids;

      setAccountProgress((prev) => {
        const next = { ...prev };
        for (const id of ids) {
          next[id] = { fetched: 0, total: 0, isComplete: false };
        }
        return next;
      });

      ids.forEach((id) => {
        // 1. Clear IndexedDB cache for this account so old records are not reloaded
        clearAccountCampaignsFromIdb(id, status).catch(() => {});

        // 2. Immediately wipe old records from TanStack Query cache for this account
        queryClient.setQueryData<CachedCampaignsData>(
          [...queryKeys.adsCampaigns.list(Number(id)), status],
          { campaigns: [], totalCount: 0, isComplete: false },
        );
        // 3. Mark for forced live API refresh
        forceRefreshSetRef.current.add(id);
        // 4. Invalidate query to trigger refetch
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.adsCampaigns.list(Number(id)), status],
        });
      });
    },
    [accountIds, status],
  );

  // Soft refetch without forcing Meesho live call if already cached
  const refetch = useCallback(() => {
    queryResults.forEach((r) => r.refetch());
  }, [queryResults]);

  return {
    campaigns,
    isLoading,
    isFetching,
    mergedFetch,
    isError,
    isAllError,
    failedAccounts,
    refresh,
    refetch,
  };
}

// ============================================
// PAUSE CAMPAIGN HOOK
// Pauses a campaign on Meesho Ads via backend proxy.
// Evicts campaign from query cache and IndexedDB.
// ============================================

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

        // 2. Remove campaign from IndexedDB cache
        getCampaignsFromIdb(accountId, 'LIVE')
          .then((cached) => {
            if (cached && cached.campaigns) {
              const remaining = cached.campaigns.filter((c) => c.campaign_id !== campaignId);
              saveCampaignsToIdb(
                accountId,
                'LIVE',
                remaining,
                Math.max(0, (cached.totalCount || remaining.length) - 1),
              ).catch(() => {});
            }
          })
          .catch(() => {});
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
// Enqueues background AdonisJS queue job to pause multiple campaigns.
// Optimistically evicts paused campaigns across accounts.
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

        // 1. Immediately update TanStack Query cache for this account
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

        // 2. Remove paused campaigns from IndexedDB cache
        getCampaignsFromIdb(accId, 'LIVE')
          .then((cached) => {
            if (cached && cached.campaigns) {
              const remaining = cached.campaigns.filter((c) => !pausedSet.has(c.campaign_id));
              saveCampaignsToIdb(
                accId,
                'LIVE',
                remaining,
                Math.max(0, (cached.totalCount || remaining.length) - pausedIds.length),
              ).catch(() => {});
            }
          })
          .catch(() => {});
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
// Fetches per-campaign details (ads + graph) from Meesho
// via the proxied backend endpoint.
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
