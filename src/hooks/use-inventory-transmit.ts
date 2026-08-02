import { useEffect, useRef } from 'react';
import { Transmit } from '@adonisjs/transmit-client';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/constants/query-keys';
import { useAuthStore } from '@/store/auth.store';
import { toast } from 'sonner';

// ============================================
// INVENTORY TRANSMIT HOOK
// SSE subscription for real-time inventory updates
// ============================================

type InventoryEvent = {
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

export function useInventoryTransmit() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const transmitRef = useRef<Transmit | null>(null);
  const subscriptionRef = useRef<ReturnType<Transmit['subscription']> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Initialize Transmit client
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

    const channelName = `inventory/${user.id}`;

    async function subscribe() {
      const transmit = transmitRef.current;
      if (!transmit) return;

      try {
        const subscription = transmit.subscription(channelName);
        await subscription.create();
        subscriptionRef.current = subscription;

        subscription.onMessage((data: InventoryEvent) => {
          // Invalidate relevant queries to refresh data
          queryClient.invalidateQueries({ queryKey: queryKeys.inventory.lists() });
          queryClient.invalidateQueries({ queryKey: queryKeys.inventory.alerts() });

          // Show alerts for low stock
          if (data.alert) {
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
        });
      } catch {
        // Silently handle subscription errors — will reconnect on next mount
      }
    }

    subscribe();

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.delete().catch(() => {});
        subscriptionRef.current = null;
      }
    };
  }, [user?.id, queryClient]);
}
