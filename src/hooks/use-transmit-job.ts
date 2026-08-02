import { useState, useEffect, useRef, useCallback } from 'react';
import { Transmit } from '@adonisjs/transmit-client';

export interface FailedItem {
  productId: string;
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
}

const initialState: JobState = {
  status: 'idle',
  total: 0,
  processed: 0,
  successCount: 0,
  failedCount: 0,
  failedItems: [],
  errorMessage: '',
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
            }));
          } else if (data.type === 'progress') {
            setJobState((prev) => {
              const newState = {
                ...prev,
                status: 'progress' as const,
                processed: data.processed ?? prev.processed,
              };
              if (data.status === 'success') {
                newState.successCount = prev.successCount + 1;
              } else if (data.status === 'failed') {
                newState.failedCount = prev.failedCount + 1;
                if (data.productId && data.error) {
                  newState.failedItems = [
                    ...prev.failedItems,
                    { productId: data.productId, reason: data.error },
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
            }));
            callbacks?.onCompleted?.();
          } else if (data.type === 'error') {
            const errMsg = data.message || 'An error occurred during job execution';
            setJobState((prev) => ({
              ...prev,
              status: 'error',
              errorMessage: errMsg,
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
