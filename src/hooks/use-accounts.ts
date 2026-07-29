import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { MarketplaceAccount } from '@/types';

// ============================================
// ACCOUNTS HOOKS
// Manage connected marketplace accounts
// ============================================

export const accountsKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountsKeys.all, 'list'] as const,
};

export function useAccounts() {
  return useQuery({
    queryKey: accountsKeys.lists(),
    queryFn: () => api.get<{ data: MarketplaceAccount[] }>('/accounts'),
    select: (res) => res.data,
  });
}

export function useAddAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Record<string, string>) =>
      api.post<{ data: MarketplaceAccount }>('/accounts/add-account', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountsKeys.lists() });
    },
  });
}
