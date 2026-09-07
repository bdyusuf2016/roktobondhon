import { useState, useEffect, useCallback } from 'react';
import {
  getSyncQueue,
  processSyncQueue,
  registerAppServiceWorker,
  clearSyncQueue,
} from '../services/pwaService';
import type { SyncQueueItem } from '../types/pwa';

export interface UsePWAResult {
  isOnline: boolean;
  isInstallable: boolean;
  isInstalled: boolean;
  syncQueue: SyncQueueItem[];
  pendingSyncCount: number;
  promptInstall: () => Promise<boolean>;
  triggerSync: () => Promise<{ processed: number; failed: number }>;
  clearQueue: () => void;
  refreshQueue: () => void;
}

export function usePWA(): UsePWAResult {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);

  const refreshQueue = useCallback(() => {
    const queue = getSyncQueue();
    setSyncQueue(queue);
  }, []);

  useEffect(() => {
    // Initial load
    refreshQueue();
    registerAppServiceWorker();

    // Online / Offline listeners
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync when coming back online
      processSyncQueue().then(() => {
        refreshQueue();
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Install prompt listener
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    // Installed listener
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already in standalone display mode
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true)
    ) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [refreshQueue]);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  const triggerSync = async () => {
    const result = await processSyncQueue();
    refreshQueue();
    return result;
  };

  const clearQueue = () => {
    clearSyncQueue();
    refreshQueue();
  };

  const pendingSyncCount = syncQueue.filter(
    (i) => i.status === 'pending' || i.status === 'failed'
  ).length;

  return {
    isOnline,
    isInstallable,
    isInstalled,
    syncQueue,
    pendingSyncCount,
    promptInstall,
    triggerSync,
    clearQueue,
    refreshQueue,
  };
}
