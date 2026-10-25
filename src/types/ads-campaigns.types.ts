// ============================================
// ADS CAMPAIGN TYPES
// Types for the Meesho Ads campaign list API.
// Now backed by PostgreSQL (not ephemeral Redis cache).
// ============================================

export type CampaignPerfDetails = {
  budget_utilised: number;
  total_views: number;
  total_clicks: number;
  order_count: number;
  revenue: number;
  roi: number;
  cpc?: number;
  conversion_rate?: number;
  [key: string]: unknown;
};

/**
 * Sync visibility: PRESENT = campaign exists in Meesho, MISSING = disappeared from API.
 * This is independent of campaign status (LIVE/PAUSED/UPCOMING).
 */
export type CampaignSyncStatus = 'PRESENT' | 'MISSING';

/**
 * A single ad campaign as returned by GET /accounts/ads/campaigns/:accountId.
 * Source of truth: PostgreSQL (meesho_campaigns table).
 */
export type AdsCampaign = {
  campaign_id: number;
  supplier_id?: number;
  campaign_name: string;
  budget: number;
  total_budget: number;
  budget_type: string;
  start_date?: string | null;
  end_date?: string | null;
  /** Meesho campaign status: LIVE / PAUSED / UPCOMING */
  status?: string;
  campaign_type?: string | null;
  catalog_id?: number | null;
  /** Sync visibility: PRESENT = in Meesho, MISSING = disappeared from API */
  sync_status?: CampaignSyncStatus;

  // Performance object
  perf_details?: CampaignPerfDetails;

  // Allow additional fields if any
  [key: string]: unknown;
};
