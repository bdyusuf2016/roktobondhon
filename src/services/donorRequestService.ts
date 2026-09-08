import { supabase, isSupabaseConfigured } from '../supabase/config';
import type { DonorRequest, DonorRequestStatus, Donor, BloodRequest, BloodGroup, EmergencyLevel } from '../types';

function mapDonorRequestRow(row: any): DonorRequest {
  return {
    id: row.id,
    bloodRequestId: row.blood_request_id,
    donorId: row.donor_id,
    donorUserId: row.donor_user_id,
    requesterUserId: row.requester_user_id,
    status: row.status as DonorRequestStatus,
    declineReason: row.decline_reason || undefined,
    matchScore: Number(row.match_score) || 85,
    patientName: row.patient_name || '',
    hospital: row.hospital || '',
    bloodGroup: row.blood_group as BloodGroup,
    emergencyLevel: (row.emergency_level as EmergencyLevel) || 'NORMAL',
    respondedAt: row.responded_at || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

/**
 * Send a contact request to a donor for a blood request
 */
export async function sendDonorContactRequest(
  bloodRequest: BloodRequest,
  donor: Donor,
  requesterUserId: string,
  matchScore: number
): Promise<DonorRequest> {
  if (isSupabaseConfigured && supabase) {
    // Check duplicate
    const { data: existing } = await supabase
      .from('donor_requests')
      .select('*')
      .eq('blood_request_id', bloodRequest.id)
      .eq('donor_id', donor.id)
      .maybeSingle();

    if (existing) {
      return mapDonorRequestRow(existing);
    }
  }

  const id = `dreq-${Date.now()}`;
  const newRequest: DonorRequest = {
    id,
    bloodRequestId: bloodRequest.id,
    donorId: donor.id,
    donorUserId: donor.userId,
    requesterUserId,
    status: 'pending',
    matchScore,
    patientName: bloodRequest.patientName,
    hospital: bloodRequest.hospital,
    bloodGroup: bloodRequest.bloodGroup,
    emergencyLevel: bloodRequest.emergencyLevel,
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('donor_requests').insert({
        id: newRequest.id,
        blood_request_id: newRequest.bloodRequestId,
        donor_id: newRequest.donorId,
        donor_user_id: newRequest.donorUserId,
        requester_user_id: newRequest.requesterUserId,
        status: newRequest.status,
        match_score: newRequest.matchScore,
        patient_name: newRequest.patientName,
        hospital: newRequest.hospital,
        blood_group: newRequest.bloodGroup,
        emergency_level: newRequest.emergencyLevel,
        created_at: newRequest.createdAt,
      });
    } catch (err) {
      console.error('Error inserting donor request in Supabase:', err);
    }
  }

  return newRequest;
}

/**
 * Fetch requests received by a specific donor
 */
export async function getRequestsForDonor(donorUserId: string): Promise<DonorRequest[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('donor_requests')
      .select('*')
      .eq('donor_user_id', donorUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching donor requests from Supabase:', error);
      return [];
    }

    return (data || []).map(mapDonorRequestRow);
  } catch (err) {
    console.error('Exception fetching donor requests:', err);
    return [];
  }
}

/**
 * Donor response to a contact request
 */
export async function respondToDonorRequest(
  requestId: string,
  status: 'accepted' | 'maybe' | 'declined',
  declineReason?: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('donor_requests')
    .update({
      status,
      decline_reason: declineReason || null,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error responding to donor request in Supabase:', error);
  }
}

/**
 * Donor volunteers to donate blood for a blood request ("আমি রক্ত দিতে চাই")
 */
export async function volunteerForBloodRequest(
  bloodRequest: BloodRequest,
  donor: Donor
): Promise<{ success: boolean; isDuplicate: boolean; donorRequest: DonorRequest }> {
  // Check duplicate in Supabase
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: existing } = await supabase
        .from('donor_requests')
        .select('*')
        .eq('blood_request_id', bloodRequest.id)
        .eq('donor_id', donor.id)
        .maybeSingle();

      if (existing) {
        return { success: true, isDuplicate: true, donorRequest: mapDonorRequestRow(existing) };
      }
    } catch (checkErr) {
      console.warn('Duplicate check error in Supabase:', checkErr);
    }
  }

  const id = `dreq-${Date.now()}`;
  const newRequest: DonorRequest = {
    id,
    bloodRequestId: bloodRequest.id,
    donorId: donor.id,
    donorUserId: donor.userId,
    requesterUserId: bloodRequest.userId,
    status: 'accepted',
    matchScore: 95,
    patientName: bloodRequest.patientName,
    hospital: bloodRequest.hospital,
    bloodGroup: bloodRequest.bloodGroup,
    emergencyLevel: bloodRequest.emergencyLevel,
    respondedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.from('donor_requests').insert({
        id: newRequest.id,
        blood_request_id: newRequest.bloodRequestId,
        donor_id: newRequest.donorId,
        donor_user_id: newRequest.donorUserId,
        requester_user_id: newRequest.requesterUserId,
        status: newRequest.status,
        match_score: newRequest.matchScore,
        patient_name: newRequest.patientName,
        hospital: newRequest.hospital,
        blood_group: newRequest.bloodGroup,
        emergency_level: newRequest.emergencyLevel,
        responded_at: newRequest.respondedAt,
        created_at: newRequest.createdAt,
      });
      if (error) {
        console.error('Error inserting volunteer donor request in Supabase:', error);
      }
    } catch (err) {
      console.error('Exception inserting volunteer donor request:', err);
    }
  }

  return { success: true, isDuplicate: false, donorRequest: newRequest };
}
