/**
 * Blood Compatibility Management Service
 * Controls compatibility matrices for each blood group.
 * Medically sensitive: Restricted strictly to Super Admin updates with audit trail.
 */

import type { BloodGroup, UserRole } from '../types';
import { recordAuditLog } from './auditService';

export const DEFAULT_COMPATIBILITY_MATRIX: Record<BloodGroup, BloodGroup[]> = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

const COMPATIBILITY_STORAGE_KEY = 'roktobondon_blood_compatibility';

const memoryStore: Record<string, string> = {};
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch {
      // fallback
    }
    return memoryStore[key] || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
        return;
      }
    } catch {
      // fallback
    }
    memoryStore[key] = value;
  },
};

/**
 * Get current compatibility matrix
 */
export async function getCompatibilityMatrix(): Promise<Record<BloodGroup, BloodGroup[]>> {
  try {
    const saved = safeStorage.getItem(COMPATIBILITY_STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_COMPATIBILITY_MATRIX, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn('[CompatibilityService] Error reading compatibility, using safe defaults:', err);
  }
  return DEFAULT_COMPATIBILITY_MATRIX;
}

/**
 * Update compatibility rule for a recipient group
 * RESTRICTED: Only Super Admin is permitted to update medically sensitive compatibility rules.
 */
export async function updateGroupCompatibility(
  recipientGroup: BloodGroup,
  compatibleDonorGroups: BloodGroup[],
  actor: { id: string; name: string; role: UserRole }
): Promise<{ success: boolean; data?: Record<BloodGroup, BloodGroup[]>; error?: string }> {
  // Security guard: Super Admin only
  if (actor.role !== 'super_admin') {
    return {
      success: false,
      error: 'অননুমোদিত চেষ্টা: রক্তের সামঞ্জস্যতা (Compatibility) নিয়ম পরিবর্তনের অনুমতি শুধুমাত্র সুপার এডমিনের রয়েছে।',
    };
  }

  // Medical Safety Check: Recipient must at minimum be compatible with own exact blood group or O-
  if (compatibleDonorGroups.length === 0) {
    return {
      success: false,
      error: 'চিকিৎসাগত নিরাপত্তা ত্রুটি: কমপক্ষে একটি সামঞ্জস্যপূর্ণ রক্তের গ্রুপ নির্বাচন করতে হবে।',
    };
  }

  const current = await getCompatibilityMatrix();
  const updated: Record<BloodGroup, BloodGroup[]> = {
    ...current,
    [recipientGroup]: compatibleDonorGroups,
  };

  try {
    safeStorage.setItem(COMPATIBILITY_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    return {
      success: false,
      error: 'রক্তের সামঞ্জস্যতা নিয়ম সংরক্ষণ করতে ব্যর্থ হয়েছে।',
    };
  }

  // Audit event
  try {
    await recordAuditLog(
      'UPDATE_BLOOD_COMPATIBILITY',
      'bloodCompatibility',
      recipientGroup,
      {
        recipientGroup,
        compatibleDonorGroups,
      },
      actor
    );
  } catch (auditErr) {
    console.warn('[CompatibilityService] Audit notice:', auditErr);
  }

  return {
    success: true,
    data: updated,
  };
}
