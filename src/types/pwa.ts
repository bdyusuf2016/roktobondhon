export type SyncActionType =
  | 'CREATE_BLOOD_REQUEST'
  | 'UPDATE_DONOR_STATUS'
  | 'REGISTER_CAMP'
  | 'SUBMIT_FUND_DONATION'
  | 'CREATE_DONOR_PROFILE'
  | 'SYSTEM_FEEDBACK';

export interface SyncQueueItem {
  id: string;
  actionType: SyncActionType;
  endpoint?: string;
  payload: Record<string, any>;
  createdAt: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
  summaryBn: string;
}

export interface CacheStorageStats {
  cacheCount: number;
  cacheNames: string[];
  estimatedEntries: number;
}
