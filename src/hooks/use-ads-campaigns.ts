import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
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
