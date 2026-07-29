// ============================================
// TANSTACK QUERY KEY FACTORY
// Structured query keys for cache management.
// ============================================

import type { ListParams } from '@/types';

export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    user: () => [...queryKeys.auth.all, 'user'] as const,
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => [...queryKeys.dashboard.all, 'stats'] as const,
    recentActivity: () => [...queryKeys.dashboard.all, 'recent-activity'] as const,
    charts: (range: string) => [...queryKeys.dashboard.all, 'charts', range] as const,
  },

  // Products
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (params: ListParams) => [...queryKeys.products.lists(), params] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },

  // Categories
  categories: {
    all: ['categories'] as const,
    tree: () => [...queryKeys.categories.all, 'tree'] as const,
  },

  // Orders
  orders: {
    all: ['orders'] as const,
    lists: () => [...queryKeys.orders.all, 'list'] as const,
    list: (params: ListParams) => [...queryKeys.orders.lists(), params] as const,
    details: () => [...queryKeys.orders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.orders.details(), id] as const,
    counts: () => [...queryKeys.orders.all, 'counts'] as const,
  },

  // Inventory
  inventory: {
    all: ['inventory'] as const,
    lists: () => [...queryKeys.inventory.all, 'list'] as const,
    list: (params: ListParams) => [...queryKeys.inventory.lists(), params] as const,
    detail: (sku: string) => [...queryKeys.inventory.all, 'detail', sku] as const,
    alerts: () => [...queryKeys.inventory.all, 'alerts'] as const,
  },

  // Marketplace Accounts
  accounts: {
    all: ['accounts'] as const,
    lists: () => [...queryKeys.accounts.all, 'list'] as const,
    list: (params?: ListParams) => [...queryKeys.accounts.lists(), params] as const,
    detail: (id: string) => [...queryKeys.accounts.all, 'detail', id] as const,
  },

  // Listings
  listings: {
    all: ['listings'] as const,
    lists: () => [...queryKeys.listings.all, 'list'] as const,
    list: (params: ListParams) => [...queryKeys.listings.lists(), params] as const,
    detail: (id: string) => [...queryKeys.listings.all, 'detail', id] as const,
  },

  // Analytics
  analytics: {
    all: ['analytics'] as const,
    overview: (range: string) => [...queryKeys.analytics.all, 'overview', range] as const,
    marketplace: (marketplace: string, range: string) =>
      [...queryKeys.analytics.all, 'marketplace', marketplace, range] as const,
  },

  // Media
  media: {
    all: ['media'] as const,
    lists: () => [...queryKeys.media.all, 'list'] as const,
    list: (params: ListParams) => [...queryKeys.media.lists(), params] as const,
    detail: (id: string) => [...queryKeys.media.all, 'detail', id] as const,
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    lists: () => [...queryKeys.notifications.all, 'list'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
  },
} as const;
