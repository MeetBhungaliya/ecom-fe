import { Marketplace } from '@/types';
import type { MarketplaceInfo } from '@/types';

// ============================================
// MARKETPLACE CONSTANTS
// Display metadata for each marketplace.
// ============================================

export const MARKETPLACE_INFO: Record<Marketplace, MarketplaceInfo> = {
  [Marketplace.MEESHO]: {
    id: Marketplace.MEESHO,
    name: 'Meesho',
    icon: '🟣',
    color: '#6B21A8',
    description: "India's fastest growing e-commerce platform",
  },
};

export const MARKETPLACE_LIST = Object.values(MARKETPLACE_INFO);
