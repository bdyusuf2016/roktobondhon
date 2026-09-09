import { supabase, isSupabaseConfigured } from '../supabase/config';
import type { Donation, BloodGroup, DonationType } from '../types';

export function mapDonationRow(row: any): Donation {
  return {
    id: row.id,
    donorId: row.donor_id,
    donorUserId: row.donor_user_id || undefined,
    donorName: row.donor_name || 'নামহীন ডোনার',
    bloodGroup: row.blood_group as BloodGroup,
    requestId: row.request_id || row.blood_request_id || undefined,
    bloodRequestId: row.blood_request_id || row.request_id || undefined,
    campId: row.camp_id || undefined,
    location: row.location || row.hospital || undefined,
    donationDate: row.donation_date,
    hospital: row.hospital || 'ধামরাই রক্তদান কেন্দ্র',
    units: Number(row.units) || 1,
    donationType: (row.donation_type as DonationType) || 'Whole Blood',
    source: (row.source as any) || 'manual',
    verifiedBy: row.verified_by || 'এডমিন',
    verificationDate: row.verification_date || row.created_at || new Date().toISOString().split('T')[0],
    notes: row.notes || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Fetch all digital donation records from Supabase
 */
export async function getAllDonationsFromSupabase(): Promise<Donation[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .order('donation_date', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching all donations from Supabase:', error);
      return [];
    }

    return (data || []).map(mapDonationRow);
  } catch (err) {
    console.error('Exception fetching all donations:', err);
    return [];
  }
}

/**
 * Fetch donation records for a specific donor
 */
export async function getDonationsForDonor(donorId: string): Promise<Donation[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('donations')
      .select('*')
      .eq('donor_id', donorId)
      .order('donation_date', { ascending: false, nullsFirst: false });

    if (error) {
      console.error('Error fetching donations for donor from Supabase:', error);
      return [];
    }

    return (data || []).map(mapDonationRow);
  } catch (err) {
    console.error('Exception fetching donations for donor:', err);
    return [];
  }
}

/**
 * Record a verified donation (authorized staff only)
 */
export async function recordDonationInSupabase(
  donation: Omit<Donation, 'id'>
): Promise<Donation> {
  const id = `don-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const nowIso = new Date().toISOString();
  const newDonation: Donation = {
    ...donation,
    id,
    source: donation.source || 'manual',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('donations').insert({
        id: newDonation.id,
        donor_id: newDonation.donorId,
        donor_user_id: newDonation.donorUserId || null,
        donor_name: newDonation.donorName,
        blood_group: newDonation.bloodGroup,
        request_id: newDonation.requestId || newDonation.bloodRequestId || null,
        blood_request_id: newDonation.bloodRequestId || newDonation.requestId || null,
        camp_id: newDonation.campId || null,
        location: newDonation.location || newDonation.hospital || 'ধামরাই রক্তদান কেন্দ্র',
        donation_date: newDonation.donationDate || null,
        hospital: newDonation.hospital || newDonation.location || 'ধামরাই রক্তদান কেন্দ্র',
        units: newDonation.units || 1,
        donation_type: newDonation.donationType || 'Whole Blood',
        source: newDonation.source || 'manual',
        verified_by: newDonation.verifiedBy || 'এডমিন',
        verification_date: newDonation.verificationDate || new Date().toISOString().split('T')[0],
        notes: newDonation.notes || null,
        created_at: nowIso,
        updated_at: nowIso,
      });

      if (error) {
        console.error('Error inserting donation in Supabase:', error);
        throw new Error(error.message || 'ডাটাবেজে রক্তদান রেকর্ড সংরক্ষণ করতে ব্যর্থ হয়েছে।');
      }
    } catch (err: any) {
      console.error('Exception recording donation:', err);
      throw err;
    }
  }

  return newDonation;
}

/**
 * Update an existing donation record (authorized admin/staff only)
 */
export async function updateDonationInSupabase(
  donationId: string,
  updates: Partial<Donation>
): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;
  try {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.donationDate !== undefined) payload.donation_date = updates.donationDate;
    if (updates.hospital !== undefined) payload.hospital = updates.hospital;
    if (updates.location !== undefined) payload.location = updates.location;
    if (updates.units !== undefined) payload.units = updates.units;
    if (updates.donationType !== undefined) payload.donation_type = updates.donationType;
    if (updates.source !== undefined) payload.source = updates.source;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.bloodRequestId !== undefined) payload.blood_request_id = updates.bloodRequestId;
    if (updates.campId !== undefined) payload.camp_id = updates.campId;
    if (updates.verifiedBy !== undefined) payload.verified_by = updates.verifiedBy;

    const { error } = await supabase
      .from('donations')
      .update(payload)
      .eq('id', donationId);

    if (error) {
      console.error('Error updating donation in Supabase:', error);
      throw new Error(error.message || 'রক্তদান রেকর্ড হালনাগাদ করা যায়নি।');
    }
    return true;
  } catch (err) {
    console.error('Exception updating donation in Supabase:', err);
    throw err;
  }
}

/**
 * Delete a donation record (authorized admin only)
 */
export async function deleteDonationInSupabase(donationId: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return true;
  try {
    const { error } = await supabase.from('donations').delete().eq('id', donationId);
    if (error) {
      console.error('Error deleting donation in Supabase:', error);
      throw new Error(error.message || 'রক্তদান রেকর্ড মুছে ফেলা যায়নি।');
    }
    return true;
  } catch (err) {
    console.error('Exception deleting donation in Supabase:', err);
    throw err;
  }
}

/**
 * Calculate summary metrics and reports from donations list
 */
export function getDonationReports(donations: Donation[]) {
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthPrefix = todayStr.slice(0, 7); // YYYY-MM

  const todayCount = donations.filter((d) => d.donationDate === todayStr).length;
  const thisMonthCount = donations.filter((d) => d.donationDate && d.donationDate.startsWith(thisMonthPrefix)).length;
  const totalUnits = donations.reduce((sum, d) => sum + (d.units || 1), 0);

  const byBloodGroup: Record<BloodGroup, number> = {
    'A+': 0, 'A-': 0, 'B+': 0, 'B-': 0,
    'AB+': 0, 'AB-': 0, 'O+': 0, 'O-': 0,
  };

  const bySource: Record<string, number> = {
    manual: 0,
    camp: 0,
    request: 0,
    imported: 0,
    other: 0,
  };

  for (const d of donations) {
    if (d.bloodGroup && byBloodGroup[d.bloodGroup] !== undefined) {
      byBloodGroup[d.bloodGroup] += 1;
    }
    const src = d.source || 'manual';
    bySource[src] = (bySource[src] || 0) + 1;
  }

  return {
    totalDonations: donations.length,
    totalUnits,
    todayCount,
    thisMonthCount,
    byBloodGroup,
    bySource,
  };
}

// Compatibility aliases
export const recordDonationInFirestore = recordDonationInSupabase;
export const deleteDonationInFirestore = deleteDonationInSupabase;
