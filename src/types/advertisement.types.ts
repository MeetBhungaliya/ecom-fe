import type { BaseEntity } from './common.types';

// ============================================
// ADVERTISEMENT TYPES
// ============================================

/**
 * Ad account configuration stored on the backend.
 * One config per marketplace account.
 */
export type AdAccountConfig = BaseEntity & {
  accountId: number;
  apiUrl: string;
  payload: Record<string, unknown>;
  dynamicFields: string[];
};
