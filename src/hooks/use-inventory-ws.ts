import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store/auth.store';
import { useWebSocketChannel } from '@/context/ws-context';
import { toast } from 'sonner';

export type InventoryEvent = {
  type: 'product_created' | 'product_updated' | 'product_deleted' | 'stock_adjusted';
  product?: {
    name: string;
    currentStock: number;
    minimumStock: number;
    stockStatus: string;
  };
  productId?: number;
  alert?: {
    type: 'low_stock' | 'out_of_stock';
    productName: string;
    currentStock: number;
    minimumStock: number;
  };
};

/**
 * useInventoryWs — WebSocket subscription for real-time inventory updates.
 * Listens to `inventory/:userId` and auto-invalidates queries & displays low-stock alerts.
 */
export function useInventoryWs() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  useWebSocketChannel<InventoryEvent>(
    user?.id ? `inventory/${user.id}` : null,
    (data) => {
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alerts() });

      // Show alerts for low stock
      if (data?.alert) {
        if (data.alert.type === 'out_of_stock') {
          toast.error(`Out of Stock: ${data.alert.productName}`, {
            description: 'This product has no stock remaining.',
          });
        } else if (data.alert.type === 'low_stock') {
          toast.warning(`Low Stock: ${data.alert.productName}`, {
            description: `Only ${data.alert.currentStock} units remaining (minimum: ${data.alert.minimumStock}).`,
          });
        }
      }
    },
    Boolean(user?.id),
  );
}

// Backwards compatibility alias
export { useInventoryWs as useInventoryTransmit };
