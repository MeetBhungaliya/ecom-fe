import { useQueryClient } from '@tanstack/react-query';
import { accountsKeys } from '@/hooks/use-accounts';
import { useAuthStore } from '@/store/auth.store';
import { useWebSocketChannel } from '@/context/ws-context';
import type { MarketplaceAccount } from '@/types';
import { toast } from 'sonner';

export type AccountEvent = {
  type: string;
  account: MarketplaceAccount;
};

/**
 * useAccountsWs — WebSocket real-time listener for Marketplace Account status updates.
 * Listens to `accounts/:userId` channel for status transitions (e.g. pending, active, failed)
 * and automatically updates React Query cache and notifies user with toasts.
 */
export function useAccountsWs() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  useWebSocketChannel<AccountEvent>(
    user?.id ? `accounts/${user.id}` : null,
    (data) => {
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
    },
    Boolean(user?.id),
  );
}

// Backwards compatibility alias
export { useAccountsWs as useAccountsTransmit };
