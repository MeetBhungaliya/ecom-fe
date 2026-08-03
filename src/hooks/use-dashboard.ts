import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (accountIds?: string[]) => [...dashboardKeys.all, 'stats', { accountIds }] as const,
};

export type DashboardStats = {
  acceptedOrdersToday: number;
};

export function useDashboardStats(accountIds?: string[]) {
  return useQuery({
    queryKey: dashboardKeys.stats(accountIds),
    queryFn: () =>
      api.get<{ data: DashboardStats }>(
        '/accounts/dashboard/stats',
        accountIds ? { accountIds: accountIds.join(',') } : undefined
      ),
    select: (res) => res.data,
  });
}
