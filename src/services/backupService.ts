import type {
  PlatformBackupPayload,
  PlatformBackupMetadata,
  BackupValidationResult,
  BackupCollectionKey,
} from '../types/backup';
import type {
  Donor,
  BloodRequest,
  DonorRequest,
  Donation,
  LocationItem,
  Branch,
  Hospital,
  FundDonation,
  PaymentMethodConfig,
  DonationCauseConfig,
  FundDisbursement,
  User,
  AuditLog,
  RolePermissionMatrix,
} from '../types';
import type { SystemConfig } from '../types/config';

/**
 * Generate a simple hash/checksum string for integrity verification
 */
export function calculateBackupChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `crc32-${Math.abs(hash).toString(16).padStart(8, '0')}`;
}

export interface BackupDataSource {
  orgConfig?: any;
  systemConfig?: SystemConfig;
  permissionMatrix?: RolePermissionMatrix;
  donors?: Donor[];
  bloodRequests?: BloodRequest[];
  donorRequests?: DonorRequest[];
  donations?: Donation[];
  locations?: LocationItem[];
  branches?: Branch[];
  hospitals?: Hospital[];
  fundDonations?: FundDonation[];
  paymentMethods?: PaymentMethodConfig[];
  donationCauses?: DonationCauseConfig[];
  fundDisbursements?: FundDisbursement[];
  users?: User[];
  auditLogs?: AuditLog[];
  exportedBy?: {
    id: string;
    name: string;
    role: string;
  };
}

/**
 * Generates a full standard v2.0.0 platform backup payload
 */
export function generatePlatformBackup(source: BackupDataSource): {
  payload: PlatformBackupPayload;
  jsonString: string;
} {
  const itemCounts = {
    donors: source.donors?.length || 0,
    bloodRequests: source.bloodRequests?.length || 0,
    donorRequests: source.donorRequests?.length || 0,
    donations: source.donations?.length || 0,
    locations: source.locations?.length || 0,
    branches: source.branches?.length || 0,
    hospitals: source.hospitals?.length || 0,
    fundDonations: source.fundDonations?.length || 0,
    paymentMethods: source.paymentMethods?.length || 0,
    donationCauses: source.donationCauses?.length || 0,
    fundDisbursements: source.fundDisbursements?.length || 0,
    users: source.users?.length || 0,
    auditLogs: source.auditLogs?.length || 0,
  };

  const exportedAt = new Date().toISOString();

  const metadata: PlatformBackupMetadata = {
    version: '2.0.0',
    schemaVersion: 2,
    exportedAt,
    platform: 'RoktoBondon Master Blood Donation Platform',
    exportedBy: source.exportedBy,
    itemCounts,
  };

  const payload: PlatformBackupPayload = {
    version: '2.0.0',
    exportedAt,
    platform: metadata.platform,
    metadata,
    orgConfig: source.orgConfig,
    systemConfig: source.systemConfig,
    permissionMatrix: source.permissionMatrix,
    donors: source.donors || [],
    bloodRequests: source.bloodRequests || [],
    donorRequests: source.donorRequests || [],
    donations: source.donations || [],
    locations: source.locations || [],
    branches: source.branches || [],
    hospitals: source.hospitals || [],
    fundDonations: source.fundDonations || [],
    paymentMethods: source.paymentMethods || [],
    donationCauses: source.donationCauses || [],
    fundDisbursements: source.fundDisbursements || [],
    users: source.users || [],
    auditLogs: source.auditLogs || [],
  };

  const rawJson = JSON.stringify(payload);
  const checksum = calculateBackupChecksum(rawJson);
  metadata.checksum = checksum;
  payload.metadata = metadata;

  const jsonString = JSON.stringify(payload, null, 2);
  return { payload, jsonString };
}

/**
 * Validates a JSON backup file content (supports both v1 and v2 backups)
 */
export function validateBackupPayload(jsonStr: string): BackupValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!jsonStr || typeof jsonStr !== 'string' || !jsonStr.trim()) {
    return {
      isValid: false,
      version: 'unknown',
      itemCounts: {},
      totalRecords: 0,
      warnings: [],
      errors: ['ব্যাকআপ ফাইলটি খালি অথবা সঠিক JSON নয়।'],
    };
  }

  let data: any;
  try {
    data = JSON.parse(jsonStr);
  } catch (err: any) {
    return {
      isValid: false,
      version: 'unknown',
      itemCounts: {},
      totalRecords: 0,
      warnings: [],
      errors: [`JSON পার্স করতে ব্যর্থ: ${err.message}`],
    };
  }

  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      version: 'unknown',
      itemCounts: {},
      totalRecords: 0,
      warnings: [],
      errors: ['ব্যাকআপ অবজেক্টের ফরম্যাট সঠিক নয়।'],
    };
  }

  const version = data.metadata?.version || data.version || '1.0.0';
  const exportedAt = data.metadata?.exportedAt || data.exportedAt;

  const itemCounts: Record<string, number> = {
    donors: Array.isArray(data.donors) ? data.donors.length : 0,
    bloodRequests: Array.isArray(data.bloodRequests) ? data.bloodRequests.length : 0,
    donorRequests: Array.isArray(data.donorRequests) ? data.donorRequests.length : 0,
    donations: Array.isArray(data.donations) ? data.donations.length : 0,
    locations: Array.isArray(data.locations) ? data.locations.length : 0,
    branches: Array.isArray(data.branches) ? data.branches.length : 0,
    hospitals: Array.isArray(data.hospitals) ? data.hospitals.length : 0,
    fundDonations: Array.isArray(data.fundDonations) ? data.fundDonations.length : 0,
    paymentMethods: Array.isArray(data.paymentMethods) ? data.paymentMethods.length : 0,
    donationCauses: Array.isArray(data.donationCauses) ? data.donationCauses.length : 0,
    fundDisbursements: Array.isArray(data.fundDisbursements) ? data.fundDisbursements.length : 0,
    users: Array.isArray(data.users) ? data.users.length : 0,
    auditLogs: Array.isArray(data.auditLogs) ? data.auditLogs.length : 0,
  };

  const totalRecords = Object.values(itemCounts).reduce((a, b) => a + b, 0);

  if (data.orgConfig) itemCounts['orgConfig'] = 1;
  if (data.systemConfig) itemCounts['systemConfig'] = 1;
  if (data.permissionMatrix) itemCounts['permissionMatrix'] = 1;

  if (totalRecords === 0 && !data.orgConfig && !data.permissionMatrix && !data.systemConfig) {
    warnings.push('ব্যাকআপ ফাইলে কোনো কার্যকর ডেটা বা কনফিগারেশন খুঁজে পাওয়া যায়নি।');
  }

  return {
    isValid: errors.length === 0,
    version,
    exportedAt,
    itemCounts,
    totalRecords,
    warnings,
    errors,
    parsedPayload: data as PlatformBackupPayload,
  };
}

/**
 * Trigger file download in browser
 */
export function downloadFile(filename: string, content: string, mimeType: string = 'application/json') {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('File download failed:', err);
    return false;
  }
}

/**
 * Converts an array of objects into a properly formatted UTF-8 CSV with Bengali BOM support
 */
export function convertCollectionToCsv(items: any[], headers?: { key: string; label: string }[]): string {
  if (!items || items.length === 0) return '\uFEFF';

  const effectiveHeaders =
    headers ||
    Object.keys(items[0]).map((key) => ({
      key,
      label: key,
    }));

  const headerRow = effectiveHeaders.map((h) => `"${h.label.replace(/"/g, '""')}"`).join(',');

  const dataRows = items.map((item) => {
    return effectiveHeaders
      .map((h) => {
        let val = item[h.key];
        if (val === null || val === undefined) {
          return '""';
        }
        if (typeof val === 'object') {
          val = JSON.stringify(val);
        } else {
          val = String(val);
        }
        return `"${val.replace(/"/g, '""')}"`;
      })
      .join(',');
  });

  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Filter and resolve selective restore payload
 */
export function resolveSelectiveRestore(
  backupData: PlatformBackupPayload,
  selectedKeys: BackupCollectionKey[],
  strategy: 'replace' | 'merge' = 'replace',
  currentData?: Partial<BackupDataSource>
): {
  restoredCounts: Record<string, number>;
  restoredData: Partial<PlatformBackupPayload>;
} {
  const restoredCounts: Record<string, number> = {};
  const restoredData: Partial<PlatformBackupPayload> = {};

  for (const key of selectedKeys) {
    const backupCollection = (backupData as any)[key];
    if (backupCollection !== undefined) {
      if (Array.isArray(backupCollection)) {
        if (strategy === 'merge' && currentData && Array.isArray((currentData as any)[key])) {
          const currentList = (currentData as any)[key] as any[];
          const existingIds = new Set(currentList.map((i) => i.id));
          const newItems = backupCollection.filter((i) => !existingIds.has(i.id));
          const merged = [...currentList, ...newItems];
          (restoredData as any)[key] = merged;
          restoredCounts[key] = backupCollection.length;
        } else {
          (restoredData as any)[key] = backupCollection;
          restoredCounts[key] = backupCollection.length;
        }
      } else {
        (restoredData as any)[key] = backupCollection;
        restoredCounts[key] = 1;
      }
    }
  }

  return { restoredCounts, restoredData };
}
