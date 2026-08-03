import { useState, useEffect, useRef, useCallback } from 'react';
import { Transmit } from '@adonisjs/transmit-client';

export interface FailedItem {
  productId?: string;
  catalogId?: string;
  reason: string;
}

export interface JobState {
  status: 'idle' | 'started' | 'progress' | 'completed' | 'error';
  total: number;
  processed: number;
  successCount: number;
  failedCount: number;
  failedItems: FailedItem[];
  errorMessage: string;
  logs: { type: 'success' | 'error' | 'info'; message: string; timestamp: number }[];
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

export function useTransmitJob() {
  const [jobState, setJobState] = useState<JobState>(initialState);
  const transmitRef = useRef<Transmit | null>(null);

  useEffect(() => {
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

    return () => {
      // Cleanup can be done here if necessary
    };
  }, []);

  const subscribeToJob = useCallback(
    async (
      channelName: string,
      callbacks?: {
        onCompleted?: () => void;
        onError?: (msg: string) => void;
      },
    ) => {
      const transmit = transmitRef.current;
      if (!transmit) return null;

      const subscription = transmit.subscription(channelName);
      await subscription.create();

      subscription.onMessage(
        (data: {
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
        }) => {
          if (data.type === 'started') {
            setJobState((prev) => ({
              ...prev,
              status: 'started',
              total: data.total ?? 0,
              processed: 0,
              successCount: 0,
              failedCount: 0,
              failedItems: [],
              logs: [{ type: 'info', message: `Job started. Processing ${data.total} items...`, timestamp: Date.now() }],
            }));
          } else if (data.type === 'progress') {
            setJobState((prev) => {
              const newState = {
                ...prev,
                status: 'progress' as const,
                processed: data.processed ?? prev.processed,
                logs: [...prev.logs]
              };
              
              const identifier = data.productId || data.catalogId || 'Item';
              if (data.status === 'success') {
                newState.successCount = prev.successCount + 1;
                newState.logs.push({ type: 'success', message: `Successfully processed ${identifier}`, timestamp: Date.now() });
              } else if (data.status === 'failed') {
                newState.failedCount = prev.failedCount + 1;
                newState.logs.push({ type: 'error', message: `Failed to process ${identifier}: ${data.error}`, timestamp: Date.now() });
                if ((data.productId || data.catalogId) && data.error) {
                  newState.failedItems = [
                    ...prev.failedItems,
                    { 
                      productId: data.productId, 
                      catalogId: data.catalogId,
                      reason: data.error 
                    },
                  ];
                }
              }
              return newState;
            });
          } else if (data.type === 'completed') {
            setJobState((prev) => ({
              ...prev,
              status: 'completed',
              successCount: data.successCount ?? prev.successCount,
              failedCount: data.failedCount ?? prev.failedCount,
              failedItems: data.failedItems || prev.failedItems,
              logs: [...prev.logs, { type: 'info', message: 'Job completed.', timestamp: Date.now() }]
            }));
            callbacks?.onCompleted?.();
          } else if (data.type === 'error') {
            const errMsg = data.message || 'An error occurred during job execution';
            setJobState((prev) => ({
              ...prev,
              status: 'error',
              errorMessage: errMsg,
              logs: [...prev.logs, { type: 'error', message: `Fatal error: ${errMsg}`, timestamp: Date.now() }]
            }));
            callbacks?.onError?.(errMsg);
          }
        },
      );

      return subscription;
    },
    [],
  );

  const resetJobState = useCallback(() => {
    setJobState(initialState);
  }, []);

  return {
    ...jobState,
    subscribeToJob,
    resetJobState,
  };
}
