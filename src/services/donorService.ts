import { supabase, isSupabaseConfigured } from '../supabase/config';
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
    const PUBLIC_DONOR_COLUMNS = 'id, donor_id, user_id, full_name, photo_url, blood_group, division, district_id, district, upazila_id, upazila, area_id, area, location_label, age, availability, emergency_available, last_donation_date, next_eligible_date, first_donation_date, total_donations, verification_status, organization_id, branch_id, phone, gender, privacy, verified_by, verified_at, created_at, updated_at';
    let query = supabase.from('donors').select(PUBLIC_DONOR_COLUMNS);

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
    if (error) {
      console.error('Error searching donors in Supabase:', error);
      return [];
    }

    return (data || []).map((row) => {
      const donor = mapDonorRow(row);
      // Mask phone if privacy setting forbids public view
      return {
        ...donor,
        phone: donor.privacy.showPhone ? donor.phone : '',
      };
    });
  } catch (err) {
    console.error('Exception searching donors in Supabase:', err);
    return [];
  }
}

/**
 * Fetch a single donor profile by ID
 */
export async function getDonorById(donorId: string): Promise<Donor | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('donors')
      .select('*')
      .or(`id.eq.${donorId},donor_id.eq.${donorId}`)
      .maybeSingle();

    if (error) {
      console.error('Error fetching donor profile:', error);
      return null;
    }

    return data ? mapDonorRow(data) : null;
  } catch (err) {
    console.error('Exception fetching donor profile:', err);
    return null;
  }
}

/**
 * Create/Register a donor record in Supabase
 */
export async function createDonorRecord(
  publicData: DonorPublic,
  privateData: DonorPrivate
): Promise<Donor> {
  const composite: Donor = {
    ...publicData,
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
    try {
      const { error } = await supabase.from('donors').insert({
        id: composite.id,
        donor_id: composite.donorId,
        user_id: composite.userId,
        full_name: composite.fullName,
        photo_url: composite.photoUrl || null,
        blood_group: composite.bloodGroup,
        division: composite.division || 'Dhaka',
        district_id: composite.districtId || 'dist-dhaka',
        district: composite.district,
        upazila_id: composite.upazilaId || 'upa-dhamrai',
        upazila: composite.upazila,
        area_id: composite.areaId || null,
        area: composite.area,
        location_label: composite.locationLabel || null,
        availability: composite.availability,
        emergency_available: composite.emergencyAvailable,
        last_donation_date: composite.lastDonationDate || null,
        first_donation_date: composite.firstDonationDate || null,
        total_donations: composite.totalDonations,
        verification_status: composite.verificationStatus,
        organization_id: composite.organizationId,
        branch_id: composite.branchId,
        phone: composite.phone,
        email: composite.email || null,
        gender: composite.gender || null,
        date_of_birth: composite.dateOfBirth || null,
        exact_address: composite.exactAddress || null,
        emergency_contact: composite.emergencyContact || null,
        admin_notes: composite.adminNotes || null,
        nid_or_id_number: composite.nidOrIdNumber || null,
        privacy: composite.privacy,
        created_at: composite.createdAt,
        updated_at: composite.updatedAt,
      });

      if (error) {
        console.error('Error inserting donor in Supabase:', error);
      }
    } catch (err) {
      console.error('Exception creating donor record:', err);
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
  if (updates.lastDonationDate !== undefined) dbUpdates.last_donation_date = updates.lastDonationDate;
  if (updates.totalDonations !== undefined) dbUpdates.total_donations = updates.totalDonations;
  if (updates.verificationStatus !== undefined) dbUpdates.verification_status = updates.verificationStatus;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
  if (updates.dateOfBirth !== undefined) dbUpdates.date_of_birth = updates.dateOfBirth;
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
  }
}

/**
 * Verify a donor (authorized staff only)
 */
export async function verifyDonorStatus(
  donorId: string,
  status: VerificationStatus,
  verifierName: string,
  notes?: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const now = new Date().toISOString();

  // Update donor status
  await supabase
    .from('donors')
    .update({
      verification_status: status,
      verified_by: verifierName,
      verified_at: now,
      admin_notes: notes || '',
      updated_at: now,
    })
    .eq('id', donorId);

  // Insert verification log
  await supabase.from('verification_logs').insert({
    id: `vlog-${Date.now()}`,
    donor_id: donorId,
    status,
    verified_by: verifierName,
    notes: notes || '',
    timestamp: now,
  });
}
