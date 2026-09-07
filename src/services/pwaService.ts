/**
 * PWA, Offline Queue & Sync Management Service
 * Provides offline queueing, background synchronization, cache storage inspector, and SW lifecycle.
 */

import type { SyncQueueItem, SyncActionType, CacheStorageStats } from '../types/pwa';
import type { PwaSettingsConfig } from '../types/config';

const OFFLINE_QUEUE_STORAGE_KEY = 'roktobondon_offline_sync_queue';

function getStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch {
    // Memory fallback
  }
  return null;
}

let inMemoryQueue: SyncQueueItem[] = [];

/**
 * Get all queued offline actions
 */
export function getSyncQueue(): SyncQueueItem[] {
  const storage = getStorage();
  if (storage) {
    try {
      const data = storage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.warn('[pwaService] Error parsing offline sync queue:', e);
    }
  }
  return inMemoryQueue;
}

/**
 * Save sync queue state
 */
function saveSyncQueue(queue: SyncQueueItem[]): void {
  inMemoryQueue = queue;
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (e) {
      console.warn('[pwaService] Error persisting offline sync queue:', e);
    }
  }
}

/**
 * Enqueue an action to be executed when back online
 */
export function enqueueOfflineAction(
  actionType: SyncActionType,
  payload: Record<string, any>,
  summaryBn: string,
  endpoint?: string
): SyncQueueItem {
  const currentQueue = getSyncQueue();
  const newItem: SyncQueueItem = {
    id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    actionType,
    endpoint,
    payload,
    createdAt: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
    summaryBn,
  };

  const updatedQueue = [newItem, ...currentQueue];
  saveSyncQueue(updatedQueue);
  return newItem;
}

/**
 * Remove an item from the sync queue
 */
export function removeSyncQueueItem(id: string): void {
  const currentQueue = getSyncQueue();
  const updatedQueue = currentQueue.filter((item) => item.id !== id);
  saveSyncQueue(updatedQueue);
}

/**
 * Clear the entire offline sync queue
 */
export function clearSyncQueue(): void {
  saveSyncQueue([]);
}

/**
 * Process pending items in sync queue
 */
export async function processSyncQueue(
  handler?: (item: SyncQueueItem) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  const queue = getSyncQueue();
  const pendingItems = queue.filter((i) => i.status === 'pending' || i.status === 'failed');

  let processed = 0;
  let failed = 0;

  for (const item of pendingItems) {
    item.status = 'syncing';
    saveSyncQueue([...queue]);

    try {
      let isSuccess = true;
      if (handler) {
        isSuccess = await handler(item);
      } else {
        // Default simulated processor for standard actions
        await new Promise((resolve) => setTimeout(resolve, 300));
        isSuccess = true;
      }

      if (isSuccess) {
        item.status = 'completed';
        processed++;
      } else {
        item.status = 'failed';
        item.retryCount += 1;
        item.lastError = 'সার্ভার রেসপন্স ত্রুটি';
        failed++;
      }
    } catch (err: any) {
      item.status = 'failed';
      item.retryCount += 1;
      item.lastError = err?.message || 'অজানা ত্রুটি';
      failed++;
    }
  }

  // Remove completed items from persistent queue to keep it clean
  const remainingQueue = queue.filter((i) => i.status !== 'completed');
  saveSyncQueue(remainingQueue);

  return { processed, failed };
}

/**
 * Get Service Worker and Cache Storage statistics
 */
export async function getCacheStorageStats(): Promise<CacheStorageStats> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { cacheCount: 0, cacheNames: [], estimatedEntries: 0 };
  }

  try {
    const keys = await caches.keys();
    let entries = 0;
    for (const key of keys) {
      const cache = await caches.open(key);
      const reqs = await cache.keys();
      entries += reqs.length;
    }
    return {
      cacheCount: keys.length,
      cacheNames: keys,
      estimatedEntries: entries,
    };
  } catch (err) {
    console.warn('[pwaService] Error inspecting caches:', err);
    return { cacheCount: 0, cacheNames: [], estimatedEntries: 0 };
  }
}

/**
 * Clear all PWA caches and force reload cache
 */
export async function clearAllAppCaches(): Promise<boolean> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return false;
  }

  try {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    }
    return true;
  } catch (err) {
    console.error('[pwaService] Error clearing caches:', err);
    return false;
  }
}

/**
 * Register Service Worker safely
 */
export async function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (err) {
    console.warn('[pwaService] Service Worker registration failed:', err);
    return null;
  }
}

/**
 * Validate PWA config settings
 */
export function validatePwaConfig(config: Partial<PwaSettingsConfig>): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.appName || !config.appName.trim()) {
    errors.push('অ্যাপের নাম (English) প্রদান করা আবশ্যক।');
  }
  if (!config.appNameBn || !config.appNameBn.trim()) {
    errors.push('অ্যাপের বাংলা নাম প্রদান করা আবশ্যক।');
  }
  if (!config.shortName || !config.shortName.trim()) {
    errors.push('শর্ট নেম প্রদান করা আবশ্যক।');
  }
  if (!config.themeColor || !/^#[0-9A-Fa-f]{6}$/.test(config.themeColor)) {
    errors.push('থিম কালার সঠিক হেক্স কোড (যেমন: #dc2626) হতে হবে।');
  }
  if (!config.backgroundColor || !/^#[0-9A-Fa-f]{6}$/.test(config.backgroundColor)) {
    errors.push('ব্যাকগ্রাউন্ড কালার সঠিক হেক্স কোড (যেমন: #ffffff) হতে হবে।');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
