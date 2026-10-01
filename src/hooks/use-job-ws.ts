import { useState, useEffect, useRef, useCallback } from 'react';
import { wsClient } from '@/services/ws-client';
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

export interface WsJobEvent {
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
// HOOK
// ============================================

/**
 * useJobWs — Robust real-time job progress tracker using WebSockets.
 *
 * Key features:
 * 1. Server-authoritative counts
 * 2. Deduplication via processed-item ID Set
 * 3. Monotonic progress (never goes backward)
 * 4. REST fetch on subscribe for reload/late-join recovery
 * 5. Uses shared WsClient singleton with auto-reconnect
 *
 * @param jobType - e.g. 'flexi-growth-offer' or 'ad-launch' — used to check for active jobs on mount
 */
export function useJobWs(jobType?: string) {
  const [jobState, setJobState] = useState<JobState>(initialState);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
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
          const activeJob = jobs[jobs.length - 1];
          applyPersistedState(activeJob);
          setActiveChannel(activeJob.channelName);
        }
      } catch {
        // No active jobs or endpoint not available
      }
    }

    checkActiveJobs();

    return () => {
      cancelled = true;
    };
  }, [jobType]);

  // ------------------------------------------
  // WebSocket subscription for activeChannel
  // ------------------------------------------
  useEffect(() => {
    if (!activeChannel) return;

    const unsubscribe = wsClient.subscribe<WsJobEvent>(activeChannel, (data) => {
      handleWsMessage(data);
    });

    return () => {
      unsubscribe();
    };
  }, [activeChannel]);

  // ------------------------------------------
  // Apply persisted state from REST response
  // ------------------------------------------
  function applyPersistedState(persisted: PersistedJobState) {
    processedIdsRef.current = new Set();
    for (const log of persisted.logs) {
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
  // WebSocket message handler (deduped + monotonic)
  // ------------------------------------------
  function handleWsMessage(data: {
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

      // Deduplicate: skip if already processed
      if (identifier && processedIdsRef.current.has(identifier)) {
        return;
      }
      if (identifier) {
        processedIdsRef.current.add(identifier);
      }

      setJobState((prev) => {
        const newProcessed = Math.max(prev.processed, data.processed ?? prev.processed);

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
        processed: prev.total,
        successCount: data.successCount ?? prev.successCount,
        failedCount: data.failedCount ?? prev.failedCount,
        failedItems: data.failedItems || prev.failedItems,
        logs: [...prev.logs, { type: 'info', message: 'Job completed.', timestamp: Date.now() }],
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

      // First fetch state from REST (late join / reload recovery)
      try {
        const response = await api.get<{ data: PersistedJobState }>(
          `/jobs/${encodeURIComponent(channelName)}/state`,
        );
        if (response?.data) {
          applyPersistedState(response.data);
        }
      } catch {
        // Job is new
      }

      setActiveChannel(channelName);
    },
    [],
  );

  // ------------------------------------------
  // Reset state
  // ------------------------------------------
  const resetJobState = useCallback(() => {
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

// Backwards compatibility alias
export { useJobWs as useTransmitJob };
