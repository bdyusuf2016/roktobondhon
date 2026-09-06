import { supabase, isSupabaseConfigured } from '../supabase/config';
import type { Donation, BloodGroup, DonationType } from '../types';

function mapDonationRow(row: any): Donation {
  return {
    id: row.id,
    donorId: row.donor_id,
    donorUserId: row.donor_user_id,
    donorName: row.donor_name,
    bloodGroup: row.blood_group as BloodGroup,
    requestId: row.request_id || undefined,
    donationDate: row.donation_date,
    hospital: row.hospital,
    units: row.units || 1,
    donationType: (row.donation_type as DonationType) || 'Whole Blood',
    verifiedBy: row.verified_by,
    verificationDate: row.verification_date || row.created_at,
    notes: row.notes || undefined,
  };
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
      .order('donation_date', { ascending: false });

    if (error) {
      console.error('Error fetching donations from Supabase:', error);
      return [];
    }

    return (data || []).map(mapDonationRow);
  } catch (err) {
    console.error('Exception fetching donations:', err);
    return [];
  }
}

/**
 * Record a verified donation (authorized staff only)
 */
export async function recordDonationInFirestore(
  donation: Omit<Donation, 'id'>
): Promise<Donation> {
  const id = `don-${Date.now()}`;
  const newDonation: Donation = {
    ...donation,
    id,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('donations').insert({
        id: newDonation.id,
        donor_id: newDonation.donorId,
        donor_user_id: newDonation.donorUserId,
        donor_name: newDonation.donorName,
        blood_group: newDonation.bloodGroup,
        request_id: newDonation.requestId || null,
        donation_date: newDonation.donationDate,
        hospital: newDonation.hospital,
        units: newDonation.units,
        donation_type: newDonation.donationType,
        verified_by: newDonation.verifiedBy,
        verification_date: newDonation.verificationDate || new Date().toISOString(),
        notes: newDonation.notes || null,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error inserting donation in Supabase:', error);
      }
    } catch (err) {
      console.error('Exception recording donation:', err);
    }
  }

  return newDonation;
}
