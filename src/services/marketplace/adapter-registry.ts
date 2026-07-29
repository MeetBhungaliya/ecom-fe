import { Marketplace } from '@/types';
import type { MarketplaceAdapter } from './marketplace.adapter';

// ============================================
// ADAPTER REGISTRY
// Factory pattern — register adapters by
// marketplace and retrieve them at runtime.
// ============================================

class AdapterRegistry {
  private adapters = new Map<Marketplace, MarketplaceAdapter>();

  /**
   * Register a marketplace adapter.
   * Called once during app initialization.
   */
  register(adapter: MarketplaceAdapter): void {
    this.adapters.set(adapter.marketplace, adapter);
  }

  /**
   * Get the adapter for a specific marketplace.
   * Throws if no adapter is registered.
   */
  get(marketplace: Marketplace): MarketplaceAdapter {
    const adapter = this.adapters.get(marketplace);
    if (!adapter) {
      throw new Error(
        `No adapter registered for marketplace: ${marketplace}. ` +
          `Did you forget to register it in adapter-registry.ts?`,
      );
    }
    return adapter;
  }

  /**
   * Check if an adapter exists for a marketplace.
   */
  has(marketplace: Marketplace): boolean {
    return this.adapters.has(marketplace);
  }

  /**
   * Get all registered marketplaces.
   */
  getRegistered(): Marketplace[] {
    return Array.from(this.adapters.keys());
  }
}

/** Singleton registry — import and use throughout the app */
export const adapterRegistry = new AdapterRegistry();
