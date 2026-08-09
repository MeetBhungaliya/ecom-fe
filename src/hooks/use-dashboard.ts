import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (accountIds?: string[]) => [...dashboardKeys.all, 'stats', { accountIds }] as const,
  activities: () => [...dashboardKeys.all, 'activities'] as const,
};

export type DashboardStats = {
  acceptedOrdersToday: number;
};

export type DashboardActivity = {
  id: string;
  action: string;
  detail: string;
  time: string;
  type: string;
  read: boolean;
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

export function useDashboardActivities() {
  return useQuery({
    queryKey: dashboardKeys.activities(),
    queryFn: () => api.get<{ data: DashboardActivity[] }>('/accounts/dashboard/activities'),
    select: (res) => res.data,
  });
}

export function useMarkActivityRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ data: DashboardActivity }>(`/accounts/dashboard/activities/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activities() });
    },
  });
}

export function useDeleteActivity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<{ message: string }>(`/accounts/dashboard/activities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dashboardKeys.activities() });
    },
  });
}

export function useClearActivities() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<{ message: string }>('/accounts/dashboard/activities/clear'),
    onSuccess: () => {
      queryClient.setQueryData(dashboardKeys.activities(), []);
    },
  });
}
