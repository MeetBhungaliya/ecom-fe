import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// MARKETPLACE STORE
// Tracks the currently active marketplace
// accounts across the app.
// ============================================

type MarketplaceState = {
  activeAccountIds: string[];
};

type MarketplaceActions = {
  toggleActiveAccount: (accountId: string) => void;
  clearActiveAccounts: () => void;
};

export const useMarketplaceStore = create<MarketplaceState & MarketplaceActions>()(
  persist(
    (set) => ({
      activeAccountIds: [],

      toggleActiveAccount: (accountId) =>
        set((state) => {
          const isSelected = state.activeAccountIds.includes(accountId);
          if (isSelected) {
            return { activeAccountIds: state.activeAccountIds.filter((id) => id !== accountId) };
          } else {
            return { activeAccountIds: [...state.activeAccountIds, accountId] };
          }
        }),

      clearActiveAccounts: () => set({ activeAccountIds: [] }),
    }),
    {
      name: 'comops-marketplace-multiselect',
    },
  ),
);
