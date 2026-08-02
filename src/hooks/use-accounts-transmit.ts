import { useEffect, useRef } from 'react';
import { Transmit } from '@adonisjs/transmit-client';
import { useQueryClient } from '@tanstack/react-query';
import { accountsKeys } from '@/hooks/use-accounts';
import { useAuthStore } from '@/store/auth.store';
import type { MarketplaceAccount } from '@/types';
import { toast } from 'sonner';

/**
 * useAccountsTransmit — SSE real-time listener for Marketplace Account status updates.
 * Listens to `accounts/:userId` channel for status transitions (e.g. pending, active, failed)
 * and automatically updates React Query cache and notifies user with toasts.
 */
export function useAccountsTransmit() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const transmitRef = useRef<Transmit | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    if (!transmitRef.current) {
      transmitRef.current = new Transmit({
        baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3333',
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

    const transmit = transmitRef.current;
    let subscription: ReturnType<Transmit['subscription']> | null = null;

    async function subscribe() {
      if (!transmit || !user?.id) return;

      try {
        subscription = transmit.subscription(`accounts/${user.id}`);
        await subscription.create();

        subscription.onMessage((data: { type: string; account: MarketplaceAccount }) => {
          if (data?.account) {
            const updatedAccount = data.account;

            queryClient.setQueryData(
              accountsKeys.lists(),
              (old: { data: MarketplaceAccount[] } | MarketplaceAccount[] | undefined) => {
                if (!old) return old;
                if (Array.isArray(old)) {
                  return old.map((acc) =>
                    acc.id === updatedAccount.id ? { ...acc, ...updatedAccount } : acc,
                  );
                }
                if (old.data) {
                  return {
                    ...old,
                    data: old.data.map((acc) =>
                      acc.id === updatedAccount.id ? { ...acc, ...updatedAccount } : acc,
                    ),
                  };
                }
                return old;
              },
            );

            // Notify user on session completion/failure
            if (updatedAccount.sessionStatus === 'active') {
              toast.success(
                `Session reconnected for ${updatedAccount.supplierData?.name || updatedAccount.email}`,
              );
            } else if (updatedAccount.sessionStatus === 'failed' && updatedAccount.sessionError) {
              toast.error(`Session sync failed: ${updatedAccount.sessionError}`);
            }
          }
        });
      } catch (err) {
        console.error('Failed to subscribe to accounts Transmit SSE:', err);
      }
    }

    subscribe();

    return () => {
      if (subscription) {
        subscription.delete().catch(() => {});
      }
    };
  }, [user?.id, queryClient]);
}
