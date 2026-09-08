import { useState, useEffect, useRef, useCallback } from 'react';
import { Transmit } from '@adonisjs/transmit-client';
import { api } from '@/lib/api-client';

// ============================================
// TYPES
// ============================================

export interface FailedItem {
  productId?: string;
  catalogId?: string;
  reason: string;
}

export interface LogEntry {
  type: 'success' | 'error' | 'info';
  message: string;
  timestamp: number;
}

export interface JobState {
  status: 'idle' | 'started' | 'progress' | 'completed' | 'error';
  total: number;
  processed: number;
  successCount: number;
  failedCount: number;
  failedItems: FailedItem[];
  errorMessage: string;
  logs: LogEntry[];
}

/** Shape of the persisted state returned by the REST endpoint */
interface PersistedJobState {
  channelName: string;
  status: 'started' | 'progress' | 'completed' | 'error';
  total: number;
  processed: number;
  successCount: number;
  failedCount: number;
  failedItems: FailedItem[];
  errorMessage: string;
  logs: LogEntry[];
  startedAt: number;
  updatedAt: number;
}

const initialState: JobState = {
  status: 'idle',
  total: 0,
  processed: 0,
  successCount: 0,
  failedCount: 0,
  failedItems: [],
  errorMessage: '',
  logs: [],
};

// ============================================
// SINGLETON TRANSMIT CLIENT
// ============================================

let sharedTransmit: Transmit | null = null;

function getTransmit(): Transmit {
  if (!sharedTransmit) {
    sharedTransmit = new Transmit({
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
  return sharedTransmit;
}

// ============================================
// HOOK
// ============================================

/**
 * useTransmitJob — Robust real-time job progress tracker.
 *
 * Key improvements over the previous version:
 * 1. Server-authoritative counts (never increments client-side)
 * 2. Deduplication via processed-item ID Set (SSE replay safe)
 * 3. Monotonic progress (Math.max prevents backward jumps)
 * 4. REST fetch on subscribe for reload/late-join recovery
 * 5. Shared Transmit singleton (no duplicate SSE connections)
 *
 * @param jobType - e.g. 'flexi-growth-offer' or 'ad-launch' — used to check for active jobs on mount
 */
export function useTransmitJob(jobType?: string) {
  const [jobState, setJobState] = useState<JobState>(initialState);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const subscriptionRef = useRef<ReturnType<Transmit['subscription']> | null>(null);
  const processedIdsRef = useRef<Set<string>>(new Set());
  const callbacksRef = useRef<{
    onCompleted?: () => void;
    onError?: (msg: string) => void;
  }>({});

  // ------------------------------------------
  // Auto-check for active jobs on mount
  // ------------------------------------------
  useEffect(() => {
    if (!jobType) return;

    let cancelled = false;

    async function checkActiveJobs() {
      try {
        const response = await api.get<{ data: PersistedJobState[] }>(
          `/jobs/active?type=${encodeURIComponent(jobType!)}`,
        );

        if (cancelled) return;

        const jobs = response?.data;
        if (jobs && jobs.length > 0) {
          // Pick the most recent active job
          const activeJob = jobs[jobs.length - 1];
          // Restore state from persisted data
          applyPersistedState(activeJob);
          setActiveChannel(activeJob.channelName);
        }
      } catch {
        // No active jobs or endpoint not available — that's fine
      }
    }

    checkActiveJobs();

    return () => {
      cancelled = true;
    };
  }, [jobType]);

  // ------------------------------------------
  // Subscribe to SSE when activeChannel changes
  // ------------------------------------------
  useEffect(() => {
    if (!activeChannel) return;

    let cancelled = false;
    const transmit = getTransmit();

    async function subscribe() {
      if (cancelled) return;

      // Clean up previous subscription
      if (subscriptionRef.current) {
        try {
          await subscriptionRef.current.delete();
        } catch {}
        subscriptionRef.current = null;
      }

      const subscription = transmit.subscription(activeChannel!);
      subscriptionRef.current = subscription;

      try {
        await subscription.create();
      } catch (err) {
        console.error('Failed to create SSE subscription:', err);
        return;
      }

      if (cancelled) {
        subscription.delete().catch(() => {});
        return;
      }

      subscription.onMessage(handleSSEMessage);
    }

    subscribe();

    return () => {
      cancelled = true;
      if (subscriptionRef.current) {
        subscriptionRef.current.delete().catch(() => {});
        subscriptionRef.current = null;
      }
    };
  }, [activeChannel]);

  // ------------------------------------------
  // Apply persisted state from REST response
  // ------------------------------------------
  function applyPersistedState(persisted: PersistedJobState) {
    // Rebuild the processed IDs set from logs
    processedIdsRef.current = new Set();
    for (const log of persisted.logs) {
      // Extract item ID from log message pattern "Successfully processed X" or "Failed to process X: reason"
      const successMatch = log.message.match(/^Successfully processed (.+)$/);
      const failMatch = log.message.match(/^Failed to process (.+?):/);
      const id = successMatch?.[1] || failMatch?.[1];
      if (id) {
        processedIdsRef.current.add(id);
      }
    }

    setJobState({
      status: persisted.status,
      total: persisted.total,
      processed: persisted.processed,
      successCount: persisted.successCount,
      failedCount: persisted.failedCount,
      failedItems: persisted.failedItems,
      errorMessage: persisted.errorMessage,
      logs: persisted.logs,
    });
  }

  // ------------------------------------------
  // SSE message handler (deduped + monotonic)
  // ------------------------------------------
  function handleSSEMessage(data: {
    type: 'started' | 'progress' | 'completed' | 'error';
    total?: number;
    processed?: number;
    status?: 'success' | 'failed';
    productId?: string;
    catalogId?: string;
    error?: string;
    successCount?: number;
    failedCount?: number;
    failedItems?: FailedItem[];
    message?: string;
  }) {
    if (data.type === 'started') {
      processedIdsRef.current = new Set();
      setJobState({
        status: 'started',
        total: data.total ?? 0,
        processed: 0,
        successCount: 0,
        failedCount: 0,
        failedItems: [],
        errorMessage: '',
        logs: [
          {
            type: 'info',
            message: `Job started. Processing ${data.total} items...`,
            timestamp: Date.now(),
          },
        ],
      });
    } else if (data.type === 'progress') {
      const identifier = data.productId || data.catalogId || '';

      // Deduplicate: skip if we've already processed this item
      if (identifier && processedIdsRef.current.has(identifier)) {
        return;
      }
      if (identifier) {
        processedIdsRef.current.add(identifier);
      }

      setJobState((prev) => {
        // Monotonic progress: never go backward
        const newProcessed = Math.max(prev.processed, data.processed ?? prev.processed);

        // Use server-authoritative counts when available, otherwise increment
        const newSuccessCount =
          data.successCount !== undefined
            ? Math.max(prev.successCount, data.successCount)
            : data.status === 'success'
              ? prev.successCount + 1
              : prev.successCount;

        const newFailedCount =
          data.failedCount !== undefined
            ? Math.max(prev.failedCount, data.failedCount)
            : data.status === 'failed'
              ? prev.failedCount + 1
              : prev.failedCount;

        const newLogs = [...prev.logs];
        const displayId = identifier || 'Item';

        if (data.status === 'success') {
          newLogs.push({
            type: 'success',
            message: `Successfully processed ${displayId}`,
            timestamp: Date.now(),
          });
        } else if (data.status === 'failed') {
          newLogs.push({
            type: 'error',
            message: `Failed to process ${displayId}: ${data.error}`,
            timestamp: Date.now(),
          });
        }

        const newFailedItems =
          data.status === 'failed' && (data.productId || data.catalogId) && data.error
            ? [
                ...prev.failedItems,
                {
                  productId: data.productId,
                  catalogId: data.catalogId,
                  reason: data.error,
                },
              ]
            : prev.failedItems;

        return {
          ...prev,
          status: 'progress',
          processed: newProcessed,
          successCount: newSuccessCount,
          failedCount: newFailedCount,
          failedItems: newFailedItems,
          logs: newLogs,
        };
      });
    } else if (data.type === 'completed') {
      setJobState((prev) => ({
        ...prev,
        status: 'completed',
        processed: prev.total, // ensure 100%
        successCount: data.successCount ?? prev.successCount,
        failedCount: data.failedCount ?? prev.failedCount,
        failedItems: data.failedItems || prev.failedItems,
        logs: [
          ...prev.logs,
          { type: 'info', message: 'Job completed.', timestamp: Date.now() },
        ],
      }));
      callbacksRef.current.onCompleted?.();
    } else if (data.type === 'error') {
      const errMsg = data.message || 'An error occurred during job execution';
      setJobState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: errMsg,
        logs: [
          ...prev.logs,
          { type: 'error', message: `Fatal error: ${errMsg}`, timestamp: Date.now() },
        ],
      }));
      callbacksRef.current.onError?.(errMsg);
    }
  }

  // ------------------------------------------
  // Subscribe to a specific job channel
  // ------------------------------------------
  const subscribeToJob = useCallback(
    async (
      channelName: string,
      callbacks?: {
        onCompleted?: () => void;
        onError?: (msg: string) => void;
      },
    ) => {
      callbacksRef.current = callbacks || {};
      processedIdsRef.current = new Set();

      // First, try to fetch current state from REST (handles reload / late join)
      try {
        const response = await api.get<{ data: PersistedJobState }>(
          `/jobs/${encodeURIComponent(channelName)}/state`,
        );
        if (response?.data) {
          applyPersistedState(response.data);
        }
      } catch {
        // Job doesn't exist yet (new job) — that's expected
      }

      // Then start SSE subscription
      setActiveChannel(channelName);
    },
    [],
  );

  // ------------------------------------------
  // Reset state
  // ------------------------------------------
  const resetJobState = useCallback(() => {
    // Unsubscribe from current channel
    if (subscriptionRef.current) {
      subscriptionRef.current.delete().catch(() => {});
      subscriptionRef.current = null;
    }
    setActiveChannel(null);
    processedIdsRef.current = new Set();
    callbacksRef.current = {};
    setJobState(initialState);
  }, []);

  return {
    ...jobState,
    activeChannel,
    subscribeToJob,
    resetJobState,
  };
}
