import { useContext, useEffect, useRef } from 'react';
import { WebSocketContext, type WebSocketContextValue } from '@/context/ws-context';
import { wsClient } from '@/services/ws-client';

/**
 * useWebSocket — Hook to access WebSocket status and operations.
 */
export function useWebSocket(): WebSocketContextValue {
  const context = useContext(WebSocketContext);
  if (!context) {
    // Return direct wsClient fallback if used outside provider
    return {
      status: wsClient.getStatus(),
      isConnected: wsClient.isConnected(),
      subscribe: wsClient.subscribe.bind(wsClient),
      send: wsClient.send.bind(wsClient),
      reconnect: () => {
        wsClient.disconnect();
        wsClient.connect();
      },
    };
  }
  return context;
}

/**
 * useWebSocketChannel — Declarative hook for subscribing to a specific channel.
 *
 * Handles:
 * - Automatic subscription on mount
 * - Automatic cleanup on unmount or channel change
 * - Preserves latest callback reference without causing re-subscribes
 *
 * @param channel Channel name (e.g. `accounts/1` or `flexi-growth-offer:job123`)
 * @param onMessage Handler callback for incoming events
 * @param enabled Whether the subscription is active (default: true)
 */
export function useWebSocketChannel<T = unknown>(
  channel: string | null | undefined,
  onMessage: (data: T) => void,
  enabled: boolean = true,
) {
  const { subscribe } = useWebSocket();
  const onMessageRef = useRef(onMessage);

  // Keep latest reference to onMessage callback to avoid re-subscribing on every render
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!channel || !enabled) return;

    const unsubscribe = subscribe<T>(channel, (data) => {
      onMessageRef.current(data);
    });

    return () => {
      unsubscribe();
    };
  }, [channel, enabled, subscribe]);
}
