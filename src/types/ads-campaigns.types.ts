// ============================================
// ADS CAMPAIGN TYPES
// Types for the Meesho Ads campaign list API.
// ============================================

export type CampaignPerfDetails = {
  budget_utilised: number;
  total_views: number;
  total_clicks: number;
  order_count: number;
  revenue: number;
  roi: number;
  [key: string]: unknown;
};

/**
 * A single ad campaign as returned by our lean backend GET /accounts/ads/campaigns/:accountId.
 * Only contains fields needed to render the UI.
 */
export type AdsCampaign = {
  campaign_id: number;
  campaign_name: string;
  budget: number;
  total_budget: number;
  budget_type: string;
  start_date?: string | null;
  end_date?: string | null;

  // Performance object
  perf_details?: CampaignPerfDetails;

  // Allow additional fields if any
  [key: string]: unknown;
};

export type CachedCampaignsData = {
  campaigns: AdsCampaign[];
  totalCount: number;
  isComplete?: boolean;
  syncing?: boolean;
};

/**
 * Response shape from our backend GET /accounts/ads/campaigns/:accountId
 */
export type AdsCampaignsResponse = {
  data: CachedCampaignsData;
  cached?: boolean;
  stale?: boolean;
  warning?: string;
};
