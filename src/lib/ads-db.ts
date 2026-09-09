import type { AdsCampaign } from '@/types';

// ============================================
// INDEXEDDB PERSISTENCE FOR ADS CAMPAIGNS
// Persists campaigns to client disk across browser
// reloads (Cmd+R / F5) and session restarts so
// fetched campaigns are never lost.
// ============================================

const DB_NAME = 'comops_ads_store';
const DB_VERSION = 1;
const STORE_NAME = 'campaigns';

export interface PersistedAccountCampaigns {
  key: string; // `${accountId}:${status}`
  accountId: string | number;
  status: string;
  campaigns: AdsCampaign[];
  totalCount: number;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save or append campaigns for an account into IndexedDB
 */
export async function saveCampaignsToIdb(
  accountId: string | number,
  status: string,
  campaigns: AdsCampaign[],
  totalCount: number,
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: PersistedAccountCampaigns = {
      key: `${accountId}:${status}`,
      accountId,
      status,
      campaigns,
      totalCount,
      updatedAt: Date.now(),
    };

    store.put(record);

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[Ads IDB] Failed to save campaigns:', err);
  }
}

/**
 * Retrieve cached campaigns for an account from IndexedDB
 */
export async function getCampaignsFromIdb(
  accountId: string | number,
  status: string = 'LIVE',
): Promise<PersistedAccountCampaigns | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const key = `${accountId}:${status}`;
    const req = store.get(key);

    return new Promise((resolve) => {
      req.onsuccess = () => {
        resolve(req.result || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Delete cached campaigns for a specific account (e.g. on force refresh)
 */
export async function clearAccountCampaignsFromIdb(
  accountId: string | number,
  status: string = 'LIVE',
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const key = `${accountId}:${status}`;
    store.delete(key);

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

/**
 * Clear all cached campaigns
 */
export async function clearAllCampaignsFromIdb(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}
