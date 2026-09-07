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
} from './index';
import type { SystemConfig } from './config';

export interface PlatformBackupMetadata {
  version: string;
  schemaVersion: number;
  exportedAt: string;
  platform: string;
  exportedBy?: {
    id: string;
    name: string;
    role: string;
  };
  itemCounts: {
    donors: number;
    bloodRequests: number;
    donorRequests: number;
    donations: number;
    locations: number;
    branches: number;
    hospitals: number;
    fundDonations: number;
    paymentMethods: number;
    donationCauses: number;
    fundDisbursements: number;
    users: number;
    auditLogs: number;
  };
  checksum?: string;
}

export interface PlatformBackupPayload {
  version?: string;
  exportedAt?: string;
  platform?: string;
  metadata?: PlatformBackupMetadata;
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
}

export type BackupCollectionKey =
  | 'orgConfig'
  | 'systemConfig'
  | 'permissionMatrix'
  | 'donors'
  | 'bloodRequests'
  | 'donorRequests'
  | 'donations'
  | 'locations'
  | 'branches'
  | 'hospitals'
  | 'fundDonations'
  | 'paymentMethods'
  | 'donationCauses'
  | 'fundDisbursements'
  | 'users'
  | 'auditLogs';

export interface BackupValidationResult {
  isValid: boolean;
  version: string;
  exportedAt?: string;
  itemCounts: Record<string, number>;
  totalRecords: number;
  warnings: string[];
  errors: string[];
  parsedPayload?: PlatformBackupPayload;
}
