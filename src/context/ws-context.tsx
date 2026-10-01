import React, { createContext, useEffect, useState } from 'react';
import { wsClient, type WsStatus, type WsMessageCallback } from '@/services/ws-client';
import { useAuthStore } from '@/store/auth.store';

export interface WebSocketContextValue {
  status: WsStatus;
  isConnected: boolean;
  subscribe: <T = unknown>(channel: string, callback: WsMessageCallback<T>) => () => void;
  send: (payload: unknown) => void;
  reconnect: () => void;
}

export const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export interface WebSocketProviderProps {
  children: React.ReactNode;
}

/**
 * WebSocketProvider — Top-level provider for real-time WebSocket communication.
 * Automatically coordinates connection lifecycle with authentication state.
 */
export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [status, setStatus] = useState<WsStatus>(wsClient.getStatus());
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    // Listen to status updates
    const unsubscribeStatus = wsClient.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      unsubscribeStatus();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      wsClient.connect();
    } else {
      wsClient.disconnect();
    }
  }, [isAuthenticated]);

  const value: WebSocketContextValue = {
    status,
    isConnected: status === 'connected',
    subscribe: wsClient.subscribe.bind(wsClient),
    send: wsClient.send.bind(wsClient),
    reconnect: () => {
      wsClient.disconnect();
      wsClient.connect();
    },
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export { useWebSocket, useWebSocketChannel } from '@/hooks/use-websocket';
