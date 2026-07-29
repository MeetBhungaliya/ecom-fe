import type { Marketplace } from '@/types';

// ============================================
// MARKETPLACE ADAPTER INTERFACE
// Every marketplace integration must implement
// this contract. Features code against this
// interface, not specific marketplace APIs.
// ============================================

/**
 * Abstract marketplace adapter interface.
 * Each marketplace (Meesho, Amazon, Flipkart, etc.)
 * implements this interface with its own API specifics.
 */
export interface MarketplaceAdapter {
  /** Which marketplace this adapter handles */
  readonly marketplace: Marketplace;

  /** Human-readable name */
  readonly displayName: string;

  /**
   * Test the connection to the marketplace account.
   * Used during account setup to validate credentials.
   */
  testConnection(credentials: Record<string, string>): Promise<boolean>;

  /**
   * Sync products from the marketplace into Ecom Manager.
   */
  syncProducts(accountId: string): Promise<SyncResult>;

  /**
   * Sync orders from the marketplace into Ecom Manager.
   */
  syncOrders(accountId: string): Promise<SyncResult>;

  /**
   * Push inventory updates to the marketplace.
   */
  pushInventory(accountId: string, updates: InventoryUpdate[]): Promise<SyncResult>;

  /**
   * Get marketplace-specific analytics.
   */
  getAnalytics(
    accountId: string,
    dateRange: { start: Date; end: Date },
  ): Promise<MarketplaceAnalytics>;
}

// --- Supporting types ---

export type SyncResult = {
  success: boolean;
  synced: number;
  failed: number;
  errors?: Array<{ id: string; message: string }>;
  syncedAt: string;
};

export type InventoryUpdate = {
  sku: string;
  quantity: number;
  price?: number;
};

export type MarketplaceAnalytics = {
  revenue: number;
  orders: number;
  averageOrderValue: number;
  topProducts: Array<{ name: string; revenue: number; orders: number }>;
};
