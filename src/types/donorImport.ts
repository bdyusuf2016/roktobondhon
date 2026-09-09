import type { BloodGroup, Gender } from './index';

export type DuplicateClassification = 'NEW' | 'POSSIBLE_DUPLICATE' | 'EXACT_DUPLICATE' | 'CONFLICT';

export type ImportRowValidationStatus = 'VALID' | 'WARNING' | 'ERROR' | 'DUPLICATE';

export interface RawImportRow {
  __rowNum__: number;
  [columnKey: string]: any;
}

export interface NormalizedImportedDonor {
  rowNumber: number;
  fullName: string;
  phone: string;
  alternatePhone?: string;
  bloodGroup: BloodGroup;
  gender?: Gender;
  dateOfBirth?: string;
  exactAddress?: string;
  area?: string;
  district?: string;
  upazila?: string;
  lastDonationDate?: string;
  totalDonations?: number;
  availability?: boolean;
  notes?: string;
}

export interface DonorImportRowValidation {
  rowNumber: number;
  rawData: Record<string, any>;
  normalizedData?: NormalizedImportedDonor;
  status: ImportRowValidationStatus;
  classification: DuplicateClassification;
  errors: string[];
  warnings: string[];
  matchedExistingDonorId?: string;
  matchedExistingDonorName?: string;
  matchReason?: string;
}

export interface DonorImportMapping {
  [sourceHeader: string]: string; // e.g. "Mobile No" -> "phone"
}

export interface DonorImportBatchSummary {
  id: string;
  filename: string;
  importedBy: string;
  importedByName?: string;
  totalRows: number;
  successCount: number;
  duplicateCount: number;
  errorCount: number;
  status: 'processing' | 'completed' | 'completed_with_errors' | 'failed' | 'rolled_back';
  createdAt: string;
  rolledBackAt?: string;
  rolledBackBy?: string;
  errorDetails?: Array<{
    rowNumber: number;
    name?: string;
    phone?: string;
    status: string;
    reason: string;
  }>;
}

export interface DonorImportExecutionResult {
  success: boolean;
  batchId: string;
  totalProcessed: number;
  importedCount: number;
  skippedCount: number;
  duplicateCount: number;
  errorCount: number;
  importedDonors: any[];
  errors: Array<{
    rowNumber: number;
    name?: string;
    phone?: string;
    status: string;
    reason: string;
  }>;
}
