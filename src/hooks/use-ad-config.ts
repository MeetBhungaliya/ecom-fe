import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { AdAccountConfig } from '@/types';

// ============================================
// AD CONFIG HOOKS
// Manage per-account ad configuration
// ============================================

export const adConfigKeys = {
  all: ['ad-config'] as const,
  byAccount: (accountId: string | number) => [...adConfigKeys.all, String(accountId)] as const,
};

/**
 * Fetch the ad config for a specific account.
 * Returns null if no config exists yet.
 */
export function useAdConfig(accountId: string | number | undefined) {
  return useQuery({
    queryKey: adConfigKeys.byAccount(accountId ?? ''),
    queryFn: () => api.get<{ data: AdAccountConfig | null }>(`/ad-config/${accountId}`),
    select: (res) => res.data,
    enabled: !!accountId,
  });
}

/**
 * Upsert (create or update) the ad config for an account.
 */
export function useSaveAdConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      accountId: number;
      apiUrl: string;
      payload: Record<string, unknown>;
      dynamicFields: string[];
    }) => api.post<{ data: AdAccountConfig; message: string }>('/ad-config', data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: adConfigKeys.byAccount(variables.accountId),
      });
    },
  });
}

/**
 * Delete the ad config for an account.
 */
export function useDeleteAdConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string | number) =>
      api.delete<{ message: string }>(`/ad-config/${accountId}`),
    onSuccess: (_data, accountId) => {
      queryClient.invalidateQueries({
        queryKey: adConfigKeys.byAccount(accountId),
      });
    },
  });
}
