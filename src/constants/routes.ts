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

  // Marketplace Accounts
  ACCOUNTS: '/accounts',
  ACCOUNT_CONNECT: '/accounts/connect',
  ACCOUNT_DETAIL: (id: string) => `/accounts/${id}` as const,

  // Tools
  FLEXI_GROWTH_OFFER: '/flexi-growth-offer',
  RETURN_OTPS: '/return-otps',
} as const;
