// ============================================
// ROUTE CONSTANTS
// Single source of truth for all route paths.
// ============================================

export const ROUTES = {
  // Auth
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',

  // Main
  DASHBOARD: '/dashboard',

  // Inventory
  INVENTORY: '/inventory',
  INVENTORY_ADD: '/inventory/add',
  INVENTORY_EDIT: (id: string) => `/inventory/${id}/edit` as const,
  INVENTORY_ANALYTICS: '/inventory/analytics',

  // Marketplace Accounts
  ACCOUNTS: '/accounts',
  ACCOUNT_CONNECT: '/accounts/connect',
  ACCOUNT_DETAIL: (id: string) => `/accounts/${id}` as const,

  // Tools
  ADVERTISEMENT: '/advertisement',
  ADVERTISEMENT_CONFIG: '/advertisement/config',
  FLEXI_GROWTH_OFFER: '/flexi-growth-offer',
  RETURN_OTPS: '/return-otps',
  DOWNLOAD_APP: '/download-app',
} as const;
