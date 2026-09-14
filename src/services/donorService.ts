import { supabase, isSupabaseConfigured } from '../supabase/config';
import { generateDonorId, getLocationCode } from './idGenerator';
import type {
  Donor,
  DonorPublic,
  DonorPrivate,
  VerificationStatus,
  BloodGroup,
} from '../types';

export interface DonorSearchFilters {
  bloodGroup?: string;
  district?: string;
  upazila?: string;
  availability?: boolean;
  verificationStatus?: VerificationStatus;
  emergencyAvailable?: boolean;
  organizationId?: string;
}

/**
 * Map database row to composite Donor
 */
export function mapDonorRow(row: any): Donor {
  const privacy =
    typeof row.privacy === 'string'
      ? JSON.parse(row.privacy)
      : row.privacy || {
          showPhone: false,
          showGender: false,
          showAge: false,
          allowDirectContact: true,
        };

  return {
    id: row.id,
    donorId: row.donor_id || row.id,
    userId: row.user_id || row.id,
    fullName: row.full_name || 'স্বেচ্ছাসেবী রক্তদাতা',
    photoUrl: row.photo_url || undefined,
    bloodGroup: row.blood_group as BloodGroup,
    division: row.division || 'Dhaka',
    districtId: row.district_id || 'dist-dhaka',
    district: row.district || 'ঢাকা',
    upazilaId: row.upazila_id || 'upa-dhamrai',
    upazila: row.upazila || 'ধামরাই',
    areaId: row.area_id || undefined,
    area: row.area || 'ধামরাই সদর',
    locationLabel: row.location_label || undefined,
    availability: Boolean(row.availability),
    emergencyAvailable: Boolean(row.emergency_available),
    lastDonationDate: row.last_donation_date || undefined,
    firstDonationDate: row.first_donation_date || undefined,
    totalDonations: row.total_donations || 0,
    verificationStatus: (row.verification_status as VerificationStatus) || 'pending',
    organizationId: row.organization_id || 'org-roktobondon',
    branchId: row.branch_id || 'br-dhm',
    phone: row.phone || '',
    email: row.email || undefined,
    gender: row.gender || undefined,
    dateOfBirth: row.date_of_birth || undefined,
    exactAddress: row.exact_address || undefined,
    emergencyContact: row.emergency_contact || undefined,
    adminNotes: row.admin_notes || undefined,
    nidOrIdNumber: row.nid_or_id_number || undefined,
    privacy,
    verifiedBy: row.verified_by || undefined,
    verifiedAt: row.verified_at || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Query public donor directory with filters
 */
export async function searchDonorsPublic(filters: DonorSearchFilters): Promise<DonorPublic[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    // 1. Primary query on secure donors_public_search view (zero sensitive PII)
    let query = supabase.from('donors_public_search').select('*');

    if (filters.bloodGroup) {
      query = query.eq('blood_group', filters.bloodGroup);
    }
    if (filters.district) {
      query = query.eq('district', filters.district);
    }
    if (filters.upazila) {
      query = query.eq('upazila', filters.upazila);
    }
    if (filters.availability !== undefined) {
      query = query.eq('availability', filters.availability);
    }
    if (filters.verificationStatus) {
      query = query.eq('verification_status', filters.verificationStatus);
    }
    if (filters.emergencyAvailable) {
      query = query.eq('emergency_available', true);
    }
    if (filters.organizationId) {
      query = query.eq('organization_id', filters.organizationId);
    }

    const { data, error } = await query;
    if (!error && data) {
      return data.map(mapDonorRow);
    }

    // 2. Fallback if donors_public_search view is not yet applied
    const SAFE_PUBLIC_COLUMNS = 'id, donor_id, user_id, full_name, photo_url, blood_group, division, district_id, district, upazila_id, upazila, area_id, area, location_label, age, availability, emergency_available, last_donation_date, total_donations, verification_status, organization_id, branch_id, gender, privacy, created_at, updated_at';
    let fallbackQuery = supabase.from('donors').select(SAFE_PUBLIC_COLUMNS);

    if (filters.bloodGroup) fallbackQuery = fallbackQuery.eq('blood_group', filters.bloodGroup);
    if (filters.district) fallbackQuery = fallbackQuery.eq('district', filters.district);
    if (filters.upazila) fallbackQuery = fallbackQuery.eq('upazila', filters.upazila);
    if (filters.availability !== undefined) fallbackQuery = fallbackQuery.eq('availability', filters.availability);
    if (filters.verificationStatus) fallbackQuery = fallbackQuery.eq('verification_status', filters.verificationStatus);
    if (filters.emergencyAvailable) fallbackQuery = fallbackQuery.eq('emergency_available', true);
    if (filters.organizationId) fallbackQuery = fallbackQuery.eq('organization_id', filters.organizationId);

    const fallbackRes = await fallbackQuery;
    return (fallbackRes.data || []).map(mapDonorRow);
  } catch (err) {
    console.error('Exception searching donors in Supabase:', err);
    return [];
  }
}

/**
 * Fetch a single donor profile by ID (Owner/Staff gets full profile; Public gets public view)
 */
export async function getDonorById(donorId: string): Promise<Donor | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    // 1. Try raw donors table (authorized for owner or staff)
    const { data, error } = await supabase
      .from('donors')
      .select('*')
      .or(`id.eq.${donorId},donor_id.eq.${donorId}`)
      .maybeSingle();

    if (data && !error) {
      return mapDonorRow(data);
    }

    // 2. Fallback to public-safe view for anonymous or non-staff visitors
    const { data: publicData } = await supabase
      .from('donors_public_search')
      .select('*')
      .or(`id.eq.${donorId},donor_id.eq.${donorId}`)
      .maybeSingle();

    return publicData ? mapDonorRow(publicData) : null;
  } catch (err) {
    console.error('Exception fetching donor profile:', err);
    return null;
  }
}

/**
 * Create/Register a donor record in Supabase
 */
/**
 * Query the database to find the absolute highest numeric donor ID suffix.
 */
export async function fetchHighestDonorSequence(): Promise<number> {
  if (!isSupabaseConfigured || !supabase) return 100;
  try {
    const { data } = await supabase
      .from('donors')
      .select('donor_id');
    if (data && data.length > 0) {
      let maxNum = 100;
      for (const row of data) {
        if (!row.donor_id) continue;
        const match = row.donor_id.match(/(\d+)$/);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!isNaN(n) && n > maxNum) maxNum = n;
        }
      }
      return maxNum;
    }
  } catch (err) {
    console.warn('Could not fetch highest donor sequence from Supabase:', err);
  }
  return 100;
}

/**
 * Create/Register a donor record in Supabase
 */
export async function createDonorRecord(
  publicData: DonorPublic,
  privateData: DonorPrivate
): Promise<Donor> {
  let targetDonorId = publicData.donorId;
  const composite: Donor = {
    ...publicData,
    donorId: targetDonorId,
    userId: privateData.userId,
    phone: privateData.phone,
    gender: privateData.gender,
    dateOfBirth: privateData.dateOfBirth,
    email: privateData.email,
    branchId: publicData.branchId || 'br-dhm',
    privacy: privateData.privacy,
    adminNotes: privateData.adminNotes,
    nidOrIdNumber: privateData.nidOrIdNumber,
    verifiedBy: privateData.verifiedBy,
    verifiedAt: privateData.verifiedAt,
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const buildRow = (dId: string) => ({
      id: composite.id,
      donor_id: dId,
      user_id: composite.userId,
      full_name: composite.fullName,
      photo_url: composite.photoUrl || null,
      blood_group: composite.bloodGroup,
      division: composite.division || 'Dhaka',
      district_id: composite.districtId || 'dist-dhaka',
      district: composite.district || 'ঢাকা',
      upazila_id: composite.upazilaId || 'upa-dhamrai',
      upazila: composite.upazila || 'ধামরাই',
      area_id: composite.areaId || null,
      area: composite.area || 'ধামরাই সদর',
      location_label: composite.locationLabel || null,
      availability: composite.availability ?? true,
      emergency_available: composite.emergencyAvailable ?? true,
      last_donation_date: (composite.lastDonationDate && composite.lastDonationDate.trim() !== '') ? composite.lastDonationDate.trim() : null,
      first_donation_date: (composite.firstDonationDate && composite.firstDonationDate.trim() !== '') ? composite.firstDonationDate.trim() : null,
      total_donations: composite.totalDonations || 0,
      verification_status: composite.verificationStatus || 'pending',
      organization_id: composite.organizationId || 'org-roktobondon',
      branch_id: composite.branchId || 'br-dhm',
      phone: composite.phone,
      email: composite.email?.trim() || null,
      gender: composite.gender || null,
      date_of_birth: (composite.dateOfBirth && composite.dateOfBirth.trim() !== '') ? composite.dateOfBirth.trim() : null,
      exact_address: composite.exactAddress?.trim() || null,
      emergency_contact: composite.emergencyContact?.trim() || null,
      admin_notes: composite.adminNotes?.trim() || null,
      nid_or_id_number: composite.nidOrIdNumber?.trim() || null,
      privacy: composite.privacy || {
        showPhone: false,
        showGender: false,
        showAge: false,
        allowDirectContact: true,
      },
      verified_by: composite.verifiedBy || null,
      verified_at: composite.verifiedAt || null,
      created_at: composite.createdAt || new Date().toISOString(),
      updated_at: composite.updatedAt || new Date().toISOString(),
    });

    let { error } = await supabase.from('donors').insert(buildRow(targetDonorId));

    // If duplicate key on donor_id or id, auto-resolve with fresh next sequence and retry
    if (error && (error.code === '23505' || error.message.includes('unique') || error.message.includes('duplicate') || error.message.includes('donor_id'))) {
      console.warn(`[createDonorRecord] Unique collision on donor_id "${targetDonorId}", resolving next sequence...`);
      const highestSeq = await fetchHighestDonorSequence();
      const locCode = getLocationCode(composite.upazila, composite.district);
      targetDonorId = generateDonorId(locCode, highestSeq + 1);
      composite.donorId = targetDonorId;

      const retryRes = await supabase.from('donors').insert(buildRow(targetDonorId));
      error = retryRes.error;
    }

    if (error) {
      console.error('Error inserting donor in Supabase:', error);
      throw new Error(error.message || 'রক্তদাতা তথ্য ডাটাবেজে সংরক্ষণ করা যায়নি।');
    }
  }

  return composite;
}

/**
 * Update donor profile
 */
export async function updateDonorRecord(
  donorId: string,
  updates: Partial<Donor>
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
  if (updates.photoUrl !== undefined) dbUpdates.photo_url = updates.photoUrl;
  if (updates.bloodGroup !== undefined) dbUpdates.blood_group = updates.bloodGroup;
  if (updates.division !== undefined) dbUpdates.division = updates.division;
  if (updates.district !== undefined) dbUpdates.district = updates.district;
  if (updates.upazila !== undefined) dbUpdates.upazila = updates.upazila;
  if (updates.area !== undefined) dbUpdates.area = updates.area;
  if (updates.locationLabel !== undefined) dbUpdates.location_label = updates.locationLabel;
  if (updates.availability !== undefined) dbUpdates.availability = updates.availability;
  if (updates.emergencyAvailable !== undefined) dbUpdates.emergency_available = updates.emergencyAvailable;
  if (updates.lastDonationDate !== undefined) {
    dbUpdates.last_donation_date = (updates.lastDonationDate && updates.lastDonationDate.trim() !== '') ? updates.lastDonationDate.trim() : null;
  }
  if (updates.totalDonations !== undefined) dbUpdates.total_donations = updates.totalDonations;
  if (updates.verificationStatus !== undefined) dbUpdates.verification_status = updates.verificationStatus;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.email !== undefined) dbUpdates.email = updates.email?.trim() || null;
  if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
  if (updates.dateOfBirth !== undefined) {
    dbUpdates.date_of_birth = (updates.dateOfBirth && updates.dateOfBirth.trim() !== '') ? updates.dateOfBirth.trim() : null;
  }
  if (updates.exactAddress !== undefined) dbUpdates.exact_address = updates.exactAddress;
  if (updates.emergencyContact !== undefined) dbUpdates.emergency_contact = updates.emergencyContact;
  if (updates.adminNotes !== undefined) dbUpdates.admin_notes = updates.adminNotes;
  if (updates.nidOrIdNumber !== undefined) dbUpdates.nid_or_id_number = updates.nidOrIdNumber;
  if (updates.privacy !== undefined) dbUpdates.privacy = updates.privacy;
  if (updates.verifiedBy !== undefined) dbUpdates.verified_by = updates.verifiedBy;
  if (updates.verifiedAt !== undefined) dbUpdates.verified_at = updates.verifiedAt;

  const { error } = await supabase.from('donors').update(dbUpdates).eq('id', donorId);
  if (error) {
    console.error('Error updating donor in Supabase:', error);
    throw new Error(error.message || 'রক্তদাতা তথ্য আপডেট করতে সমস্যা হয়েছে।');
  }
}

/**
 * Result returned by donor verification
 */
export interface VerifyDonorResult {
  success: boolean;
  alreadyVerified?: boolean;
  donorId: string;
  humanId?: string;
  status: VerificationStatus;
  verifiedBy: string;
  verifiedAt: string;
  logId?: string;
}

/**
 * Verify a donor (authorized staff only)
 * Executes atomic PostgreSQL transaction via verify_donor RPC,
 * with strict row-count validation, idempotency guards, and fallback sync.
 */
export async function verifyDonorStatus(
  donorId: string,
  status: VerificationStatus,
  verifierName: string,
  notes?: string
): Promise<VerifyDonorResult> {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured || !supabase) {
    return {
      success: true,
      donorId,
      status,
      verifiedBy: verifierName,
      verifiedAt: now,
    };
  }

  // Verify authenticated session exists to prevent sending anonymous requests that fail with Unauthorized
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    throw new Error('অননুমোদিত: আপনার সুপাবেজ অথেন্টিকেশন সেশন নিষ্ক্রিয় বা পাওয়া যায়নি। দয়া করে লগআউট করে আপনার অ্যাডমিন অ্যাকাউন্টে পুনরায় লগইন করুন। (Unauthorized: No active Supabase Auth session. Please log in again.)');
  }

  // 1. Primary Path: Execute atomic PostgreSQL RPC function (single ACID transaction)
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('verify_donor', {
      p_donor_id: donorId,
      p_status: status,
      p_notes: notes || '',
    });

    if (!rpcError && rpcData && rpcData.success) {
      return {
        success: true,
        alreadyVerified: Boolean(rpcData.already_verified),
        donorId: rpcData.donor_id || donorId,
        humanId: rpcData.human_id,
        status: (rpcData.status as VerificationStatus) || status,
        verifiedBy: rpcData.verified_by || verifierName,
        verifiedAt: rpcData.verified_at || now,
        logId: rpcData.log_id,
      };
    }

    if (rpcError) {
      const msg = rpcError.message || '';
      // If error is an explicit domain authorization or validation failure, reject immediately
      if (
        msg.includes('Unauthorized') ||
        msg.includes('not found') ||
        msg.includes('Invalid verification status')
      ) {
        throw new Error(msg);
      }
      console.warn('RPC verify_donor failed, attempting guarded fallback:', msg);
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('Unauthorized') || err.message.includes('not found'))) {
      throw err;
    }
    console.warn('Exception during RPC verify_donor call:', err);
  }

  // 2. Fallback Path: Coordinated mutation with row-count verification and idempotency check
  // Locate target donor row by id or human-readable donor_id
  const { data: existingDonor, error: lookupError } = await supabase
    .from('donors')
    .select('id, donor_id, verification_status, verified_by, verified_at')
    .or(`id.eq.${donorId},donor_id.eq.${donorId}`)
    .maybeSingle();

  if (lookupError || !existingDonor) {
    throw new Error(`রক্তদাতা পাওয়া যায়নি (Donor not found: ${donorId})`);
  }

  // Idempotency: prevent duplicate verification logs if already in target status
  if (existingDonor.verification_status === status) {
    return {
      success: true,
      alreadyVerified: true,
      donorId: existingDonor.id,
      humanId: existingDonor.donor_id,
      status,
      verifiedBy: existingDonor.verified_by || verifierName,
      verifiedAt: existingDonor.verified_at || now,
    };
  }

  // Execute UPDATE on public.donors FIRST and verify exactly 1 row was updated
  const { data: updatedDonors, error: updateError } = await supabase
    .from('donors')
    .update({
      verification_status: status,
      verified_by: verifierName,
      verified_at: now,
      admin_notes: notes || '',
      updated_at: now,
    })
    .eq('id', existingDonor.id)
    .select('id, donor_id, verification_status, verified_by, verified_at');

  if (updateError) {
    throw new Error(`ডোনার স্ট্যাটাস পরিবর্তন ব্যর্থ হয়েছে: ${updateError.message}`);
  }

  if (!updatedDonors || updatedDonors.length === 0) {
    throw new Error(
      'ডোনার ডাটাবেজ আপডেট ব্যর্থ হয়েছে (০ টি রেকর্ড পরিবর্তিত হয়েছে)। আপনার অনুমতি বা আরএলএস পলিসি পরীক্ষা করুন।'
    );
  }

  // Insert verification log ONLY after donor row update has succeeded
  const logId = `vlog-${Date.now()}`;
  const { error: logError } = await supabase.from('verification_logs').insert({
    id: logId,
    donor_id: existingDonor.id, // Primary key donors.id
    status,
    verified_by: verifierName,
    notes: notes || '',
    timestamp: now,
  });

  if (logError) {
    console.error('Notice: Verification log insert failed after donor update:', logError);
  }

  const updatedRecord = updatedDonors[0];
  return {
    success: true,
    donorId: updatedRecord.id,
    humanId: updatedRecord.donor_id,
    status,
    verifiedBy: updatedRecord.verified_by || verifierName,
    verifiedAt: updatedRecord.verified_at || now,
    logId,
  };
}

/**
 * Result returned by donor deletion
 */
export interface DeleteDonorResult {
  success: boolean;
  isStaff?: boolean;
  authDeleted?: boolean;
  donorId: string;
  humanId?: string;
  message: string;
}

/**
 * Delete a donor account / profile (Super Admin & Admin only)
 * Executes via secure Edge Function (admin-delete-donor) with fallback to admin_delete_donor RPC.
 */
export async function deleteDonorAccount(donorId: string): Promise<DeleteDonorResult> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: true,
      donorId,
      message: 'ডোনার সফলভাবে ডিলিট করা হয়েছে (Local State)।',
    };
  }

  // 1. Primary Path: Call Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke('admin-delete-donor', {
      body: { donorId },
    });

    if (!error && data && data.success) {
      return {
        success: true,
        isStaff: Boolean(data.isStaff),
        authDeleted: Boolean(data.authDeleted),
        donorId: data.donorId || donorId,
        humanId: data.humanId,
        message: data.message || 'ডোনার সফলভাবে ডিলিট করা হয়েছে।',
      };
    }

    if (error) {
      const errMsg = error.message || '';
      if (errMsg.includes('অনুমতি') || errMsg.includes('Unauthorized') || errMsg.includes('Forbidden')) {
        throw new Error(errMsg);
      }
      console.warn('Edge Function admin-delete-donor failed, attempting RPC fallback:', errMsg);
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('অনুমতি') || err.message.includes('Unauthorized'))) {
      throw err;
    }
    console.warn('Exception calling admin-delete-donor Edge Function:', err);
  }

  // 2. Fallback Path: Call admin_delete_donor PostgreSQL RPC
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('admin_delete_donor', {
      p_donor_id: donorId,
    });

    if (!rpcError && rpcData && rpcData.success) {
      return {
        success: true,
        isStaff: Boolean(rpcData.is_staff),
        donorId: rpcData.donor_id || donorId,
        humanId: rpcData.human_id,
        message: rpcData.is_staff
          ? 'স্টাফ মেম্বারের রক্তদাতা প্রোফাইল ডিলিট করা হয়েছে (স্টাফ অ্যাকাউন্ট অক্ষত রাখা হয়েছে)।'
          : 'রক্তদাতার প্রোফাইল সফলভাবে ডিলিট করা হয়েছে।',
      };
    }

    if (rpcError) {
      throw new Error(`ডোনার ডিলিট ব্যর্থ হয়েছে: ${rpcError.message}`);
    }
  } catch (rpcErr: any) {
    console.error('RPC admin_delete_donor failed:', rpcErr);
    // Direct RLS delete fallback
    const { error: directErr } = await supabase.from('donors').delete().or(`id.eq.${donorId},donor_id.eq.${donorId}`);
    if (directErr) {
      throw new Error(`ডোনার ডিলিট ব্যর্থ হয়েছে: ${directErr.message}`);
    }
  }

  return {
    success: true,
    donorId,
    message: 'ডোনার সফলভাবে ডিলিট করা হয়েছে।',
  };
}


