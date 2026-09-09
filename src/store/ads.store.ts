import { create } from 'zustand';

// ============================================
// ADS SYNC STORE
// Retains live background pagination sync state
// across route navigation so progress bars and
// active sync statuses never reset on page switch.
// ============================================

export interface AccountSyncProgress {
  accountId: string | number;
  accountName: string;
  current: number;
  total: number;
  percent: number;
}

interface AdsSyncState {
  syncProgress: Record<string, AccountSyncProgress>;
  setSyncProgress: (accountId: string | number, progress: AccountSyncProgress) => void;
  removeSyncProgress: (accountId: string | number) => void;
  clearAll: () => void;
}

export const useAdsSyncStore = create<AdsSyncState>()((set) => ({
  syncProgress: {},

  setSyncProgress: (accountId, progress) =>
    set((state) => ({
      syncProgress: {
        ...state.syncProgress,
        [accountId.toString()]: progress,
      },
    })),

  removeSyncProgress: (accountId) =>
    set((state) => {
      const next = { ...state.syncProgress };
      delete next[accountId.toString()];
      return { syncProgress: next };
    }),

  clearAll: () => set({ syncProgress: {} }),
}));
