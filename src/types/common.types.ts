// ============================================
// COMMON TYPES — Shared across all features
// ============================================

/**
 * Standard paginated API response.
 */
export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

/**
 * Standard single-item API response.
 */
export type ApiResponse<T> = {
  data: T;
  message?: string;
};

/**
 * Pagination params for list queries.
 */
export type PaginationParams = {
  page?: number;
  pageSize?: number;
};

/**
 * Sort params for list queries.
 */
export type SortParams = {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

/**
 * Combined list query params.
 */
export type ListParams = PaginationParams &
  SortParams & {
    search?: string;
  };

/**
 * Generic ID reference.
 */
export type WithId = {
  id: string;
};

/**
 * Timestamps for all entities.
 */
export type WithTimestamps = {
  createdAt: string;
  updatedAt: string;
};

/**
 * Base entity with ID and timestamps.
 */
export type BaseEntity = WithId & WithTimestamps;

/**
 * Trend direction for metrics.
 */
export type Trend = 'up' | 'down' | 'neutral';

/**
 * Status type used across features.
 */
export type Status = 'active' | 'inactive' | 'pending' | 'error' | 'syncing';

/**
 * Bulk action result.
 */
export type BulkActionResult = {
  success: number;
  failed: number;
  errors?: Array<{ id: string; message: string }>;
};
