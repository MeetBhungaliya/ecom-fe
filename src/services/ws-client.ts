/**
 * WsClient — Resilient, singleton WebSocket client with channel-based pub/sub.
 *
 * Features:
 * - Automatic reconnection with exponential backoff & jitter
 * - Centralized channel subscription manager with listener ref-counting
 * - Automatic re-subscription of active channels upon reconnect
 * - Token authentication via query param and in-band auth handshake
 * - Heartbeat keep-alive ping/pong
 * - Message queueing during disconnects
 */

export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export type WsMessageCallback<T = unknown> = (data: T) => void;
export type WsStatusCallback = (status: WsStatus) => void;

export class WsClient {
  private static instance: WsClient | null = null;

  private socket: WebSocket | null = null;
  private status: WsStatus = 'disconnected';
  private subscriptions: Map<string, Set<WsMessageCallback>> = new Map();
  private statusListeners: Set<WsStatusCallback> = new Set();
  private messageQueue: string[] = [];

  private reconnectAttempts = 0;
  private maxReconnectAttempts = 20;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 15000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private pingInterval = 25000;

  private manualClose = false;

  public static getInstance(): WsClient {
    if (!WsClient.instance) {
      WsClient.instance = new WsClient();
    }
    return WsClient.instance;
  }

  /**
   * Resolve WebSocket URL with authentication token
   */
  private getWsUrl(): string {
    const rawApiUrl =
      import.meta.env.VITE_WS_URL ||
      import.meta.env.VITE_API_URL ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.hostname}:8443`
        : 'http://localhost:8443');

    const wsBase = rawApiUrl.replace(/^http/, 'ws');
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('comops-access-token') : null;

    if (token) {
      const url = new URL(wsBase);
      url.searchParams.set('token', token);
      return url.toString();
    }

    return wsBase;
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (typeof window === 'undefined') return;
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.manualClose = false;
    this.setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      const url = this.getWsUrl();
      this.socket = new WebSocket(url);

      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (err) {
      console.warn('[WS] Failed to create WebSocket connection:', err);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect the WebSocket server
   */
  public disconnect(): void {
    this.manualClose = true;
    this.clearTimers();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.setStatus('disconnected');
    this.reconnectAttempts = 0;
  }

  /**
   * Get current connection status
   */
  public getStatus(): WsStatus {
    return this.status;
  }

  public isConnected(): boolean {
    return this.status === 'connected';
  }

  /**
   * Listen to status changes
   */
  public onStatusChange(callback: WsStatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  /**
   * Subscribe to a channel.
   * Multiple components can subscribe to the same channel; the server is only notified once.
   */
  public subscribe<T = unknown>(channel: string, callback: WsMessageCallback<T>): () => void {
    if (!channel) return () => {};

    let channelSubs = this.subscriptions.get(channel);
    const isFirstSubscriber = !channelSubs || channelSubs.size === 0;

    if (!channelSubs) {
      channelSubs = new Set();
      this.subscriptions.set(channel, channelSubs);
    }

    channelSubs.add(callback as WsMessageCallback);

    // Notify server to subscribe to this channel if this is the first listener
    if (isFirstSubscriber) {
      this.send({ action: 'subscribe', channel });
    }

    // Return unsubscription function
    return () => {
      const subs = this.subscriptions.get(channel);
      if (subs) {
        subs.delete(callback as WsMessageCallback);
        if (subs.size === 0) {
          this.subscriptions.delete(channel);
          this.send({ action: 'unsubscribe', channel });
        }
      }
    };
  }

  /**
   * Send a JSON message to the server (or queue it if disconnected)
   */
  public send(payload: unknown): void {
    const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(raw);
    } else {
      // Keep only up to 50 queued messages to avoid memory issues
      if (this.messageQueue.length > 50) {
        this.messageQueue.shift();
      }
      this.messageQueue.push(raw);
    }
  }

  // ----------------------------------------------------
  // Internal Event Handlers
  // ----------------------------------------------------

  private handleOpen(): void {
    this.setStatus('connected');
    this.reconnectAttempts = 0;

    // Send in-band authentication message in case token wasn't in URL
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('comops-access-token') : null;
    if (token) {
      this.send({ action: 'auth', token });
    }

    // Resubscribe to all active channels
    for (const channel of this.subscriptions.keys()) {
      this.send({ action: 'subscribe', channel });
    }

    // Flush queued messages
    while (this.messageQueue.length > 0) {
      const item = this.messageQueue.shift();
      if (item && this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(item);
      }
    }

    this.startHeartbeat();
  }

  private handleMessage(event: MessageEvent): void {
    const raw = event.data;
    if (typeof raw === 'string' && raw.trim().toUpperCase() === 'PONG') {
      return;
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Non-JSON or binary message
      return;
    }

    // Handle pong responses
    if (parsed.event === 'pong') {
      return;
    }

    // Handle channel broadcasts
    const channel = (parsed.channel || parsed.topic) as string | undefined;
    if (channel) {
      const subs = this.subscriptions.get(channel);
      if (subs && subs.size > 0) {
        // Provide payload (parsed.data || parsed) to subscribers
        const payload = parsed.data !== undefined ? parsed.data : parsed;
        for (const callback of subs) {
          try {
            callback(payload);
          } catch (err) {
            console.error(`[WS] Error in subscriber callback for channel "${channel}":`, err);
          }
        }
      }
    }
  }

  private handleClose(_event: CloseEvent): void {
    this.clearTimers();
    this.socket = null;

    if (!this.manualClose) {
      this.scheduleReconnect();
    } else {
      this.setStatus('disconnected');
    }
  }

  private handleError(err: Event): void {
    console.warn('[WS] Socket error encountered:', err);
    // On error, onclose is typically called afterwards by the browser
  }

  private scheduleReconnect(): void {
    if (this.manualClose) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('[WS] Max reconnect attempts reached. Giving up.');
      this.setStatus('disconnected');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;

    // Calculate delay with exponential backoff and jitter
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(1.5, this.reconnectAttempts) + Math.random() * 500,
      this.maxReconnectDelay,
    );

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private setStatus(newStatus: WsStatus): void {
    if (this.status === newStatus) return;
    this.status = newStatus;
    for (const listener of this.statusListeners) {
      try {
        listener(newStatus);
      } catch (err) {
        console.error('[WS] Error in status listener:', err);
      }
    }
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.send({ action: 'ping' });
      }
    }, this.pingInterval);
  }

  private clearHeartbeat(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const wsClient = WsClient.getInstance();
