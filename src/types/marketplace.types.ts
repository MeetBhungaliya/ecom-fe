import type { BaseEntity, Status } from './common.types';

// ============================================
// MARKETPLACE TYPES — Marketplace-agnostic
// ============================================

/**
 * Supported marketplace platforms.
 * New marketplaces are added here and get an adapter implementation.
 */
export enum Marketplace {
  MEESHO = 'meesho',
}

/**
 * Marketplace display metadata.
 */
export type MarketplaceInfo = {
  id: Marketplace;
  name: string;
  icon: string;
  color: string;
  description: string;
};

/**
 * A connected marketplace seller account.
 */
export type MarketplaceAccount = BaseEntity & {
  marketplace: Marketplace;
  email: string;
  sessionStatus?: string;
  sessionError?: string;
  lastLoginAt?: string | null;
  sellerId?: string;
  status?: Status;
  lastSyncAt?: string | null;
  supplierData?: {
    id: string;
    email: string;
    phone: string;
    supplierId: number;
    name: string;
    identifier: string;
  } | null;
  metrics?: {
    totalProducts: number;
    activeListings: number;
    pendingOrders: number;
  };
};

/**
 * Marketplace-specific configuration.
 */
export type MarketplaceConfig = {
  marketplace: Marketplace;
  fields: MarketplaceField[];
};

/**
 * A config field for marketplace setup.
 */
export type MarketplaceField = {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  required: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
};
