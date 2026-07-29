import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ApiError } from './api-client';

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return (error as ApiError).message;
  }
  return 'An unexpected error occurred';
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes — data is "fresh"
      gcTime: 1000 * 60 * 30, // 30 minutes — cache retained
      retry: 2, // Retry failed requests twice
      refetchOnWindowFocus: true, // Refetch when tab regains focus
      refetchOnReconnect: true, // Refetch when network reconnects
    },
    mutations: {
      onError: (error: unknown) => {
        toast.error(getErrorMessage(error));
      },
    },
  },
});
