import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
};

export type DashboardStats = {
  acceptedOrdersToday: number;
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => api.get<{ data: DashboardStats }>('/dashboard/stats'),
    select: (res) => res.data,
  });
}
