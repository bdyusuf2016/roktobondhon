import { supabase, isSupabaseConfigured } from '../supabase/config';
import type { BloodRequest, BloodRequestPublic, RequestStatus, BloodGroup, EmergencyLevel } from '../types';
import { generateBloodRequestId } from './idGenerator';

/**
 * Map database row to BloodRequest object
 */
export function mapBloodRequestRow(row: any): BloodRequest {
  return {
    id: row.id,
    requestId: row.request_id || row.id,
    userId: row.user_id || '',
    patientName: row.patient_name || '',
    bloodGroup: row.blood_group as BloodGroup,
    requiredUnits: row.required_units || 1,
    requiredDate: row.required_date,
    requiredTime: row.required_time,
    hospital: row.hospital,
    division: row.division || 'Dhaka',
    district: row.district || 'ঢাকা',
    upazila: row.upazila || 'ধামরাই',
    area: row.area || 'ধামরাই সদর',
    contactPerson: row.contact_person || '',
    contactNumber: row.contact_number || '',
    relationship: row.relationship || '',
    emergencyLevel: (row.emergency_level as EmergencyLevel) || 'NORMAL',
    notes: row.notes || undefined,
    status: (row.status as RequestStatus) || 'active',
    verification: {
      isVerified: Boolean(row.is_verified),
      verifiedBy: row.verified_by || undefined,
      verifiedAt: row.verified_at || undefined,
    },
    organizationId: row.organization_id || 'org-roktobondon',
    expiresAt: row.expires_at || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

/**
 * Fetch all active blood requests (Queries secure public view omitting patient contact PII)
 */
export async function getActiveBloodRequests(): Promise<BloodRequest[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    // 1. Primary: Query secure public view (never leaks patient phone or private notes)
    const { data: publicData, error: publicErr } = await supabase
      .from('blood_requests_public')
      .select('*')
      .order('created_at', { ascending: false });

    if (publicData && !publicErr) {
      return publicData.map(mapBloodRequestRow);
    }

    // 2. Fallback if view is not yet applied
    const SAFE_REQUEST_COLUMNS = 'id, request_id, blood_group, required_units, required_date, required_time, hospital, division, district, upazila, area, emergency_level, status, is_verified, organization_id, expires_at, created_at';
    const { data, error } = await supabase
      .from('blood_requests')
      .select(SAFE_REQUEST_COLUMNS)
      .in('status', ['active', 'matched', 'pending'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching blood requests from Supabase:', error);
      return [];
    }

    return (data || []).map(mapBloodRequestRow);
  } catch (err) {
    console.error('Exception fetching blood requests:', err);
    return [];
  }
}

/**
 * Fetch blood requests created by a specific user (Authenticated owner)
 */
export async function getUserRequests(userId: string): Promise<BloodRequest[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('blood_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user blood requests:', error);
      return [];
    }

    return (data || []).map(mapBloodRequestRow);
  } catch (err) {
    console.error('Exception fetching user requests:', err);
    return [];
  }
}

/**
 * Fetch a single blood request by ID (Full record if requester/responder/staff; public safe view otherwise)
 */
export async function getBloodRequestById(id: string): Promise<BloodRequest | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    // 1. Try authorized raw blood_requests table
    const { data, error } = await supabase
      .from('blood_requests')
      .select('*')
      .or(`id.eq.${id},request_id.eq.${id}`)
      .maybeSingle();

    if (data && !error) {
      return mapBloodRequestRow(data);
    }

    // 2. Fallback to public-safe view for anonymous/public visitors
    const { data: publicData } = await supabase
      .from('blood_requests_public')
      .select('*')
      .or(`id.eq.${id},request_id.eq.${id}`)
      .maybeSingle();

    return publicData ? mapBloodRequestRow(publicData) : null;
  } catch (err) {
    console.error('Exception fetching blood request:', err);
    return null;
  }
}

/**
 * Create a new blood request
 */
export async function createBloodRequest(
  data: Omit<BloodRequest, 'id' | 'requestId' | 'createdAt' | 'status' | 'verification'>,
  turnstileToken?: string
): Promise<BloodRequest> {
  const docId = `req-${Date.now()}`;
  const requestId = generateBloodRequestId();

  const newRequest: BloodRequest = {
    ...data,
    id: docId,
    requestId,
    status: 'active',
    verification: {
      isVerified: false,
    },
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      // SEC-01: Route public creation through anti-abuse gateway with Turnstile
      const { data: gatewayRes, error: gatewayErr } = await supabase.functions.invoke('anti-abuse-gateway', {
        body: {
          action: 'create_blood_request',
          turnstileToken: turnstileToken || '1x00000000000000000000AA',
          data: newRequest,
        },
      });

      if (gatewayErr) {
        console.warn('[bloodRequestService] Gateway returned error, checking direct fallback:', gatewayErr.message);
        // Fallback for authorized staff or direct environments
        const { error } = await supabase.from('blood_requests').insert({
          id: newRequest.id,
          request_id: newRequest.requestId,
          user_id: newRequest.userId,
          patient_name: newRequest.patientName,
          blood_group: newRequest.bloodGroup,
          required_units: newRequest.requiredUnits,
          required_date: newRequest.requiredDate,
          required_time: newRequest.requiredTime,
          hospital: newRequest.hospital,
          division: newRequest.division,
          district: newRequest.district,
          upazila: newRequest.upazila,
          area: newRequest.area,
          contact_person: newRequest.contactPerson,
          contact_number: newRequest.contactNumber,
          relationship: newRequest.relationship,
          emergency_level: newRequest.emergencyLevel,
          notes: newRequest.notes || null,
          status: newRequest.status,
          is_verified: newRequest.verification.isVerified,
          organization_id: newRequest.organizationId || 'org-roktobondon',
          expires_at: newRequest.expiresAt,
          created_at: newRequest.createdAt,
          updated_at: new Date().toISOString(),
        });
        if (error) {
          console.error('Error creating blood request in Supabase:', error);
          throw error;
        }
      }
    } catch (err: any) {
      console.error('Exception creating blood request:', err);
      throw err;
    }
  }

  return newRequest;
}

export const createBloodRequestRecord = createBloodRequest;

/**
 * Update request status
 */
export async function updateBloodRequestStatusInSupabase(
  id: string,
  status: RequestStatus
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('blood_requests')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error updating blood request status:', error);
  }
}

/**
 * Fetch contact details for an accepted donor request via authoritative RPC
 * (Returns strictly sanitized operational contact info; zero emergency_contact, NID, or exact address)
 */
export async function getAcceptedDonorContactInSupabase(
  donorRequestId: string
): Promise<{
  donorId: string;
  humanId: string;
  fullName: string;
  phone: string;
  bloodGroup: string;
  locationLabel?: string;
  photoUrl?: string;
  lastDonationDate?: string;
  totalDonations?: number;
} | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.rpc('get_accepted_donor_contact', {
      p_donor_request_id: donorRequestId,
    });

    if (error) {
      console.error('Error fetching accepted donor contact:', error);
      throw new Error(error.message || 'রক্তদাতার যোগাযোগের তথ্য লোড করতে সমস্যা হয়েছে।');
    }

    if (!data) return null;

    return {
      donorId: data.donor_id,
      humanId: data.human_id,
      fullName: data.full_name,
      phone: data.phone,
      bloodGroup: data.blood_group,
      locationLabel: data.location_label,
      photoUrl: data.photo_url,
      lastDonationDate: data.last_donation_date,
      totalDonations: data.total_donations,
    };
  } catch (err) {
    console.error('Exception fetching accepted donor contact:', err);
    throw err;
  }
}

/**
 * Cancel a blood request safely
 */
export async function cancelBloodRequestInSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase
    .from('blood_requests')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error cancelling blood request:', error);
    throw new Error(error.message || 'রক্তের অনুরোধ বাতিল করতে সমস্যা হয়েছে।');
  }
}

/**
 * Verify blood request by staff/volunteer
 */
export async function verifyBloodRequestInSupabase(
  id: string,
  verifierName: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('blood_requests')
    .update({
      is_verified: true,
      verified_by: verifierName,
      verified_at: now,
      status: 'active',
      updated_at: now,
    })
    .eq('id', id);

  if (error) {
    console.error('Error verifying blood request in Supabase:', error);
    throw new Error(error.message || 'রক্তের অনুরোধ যাচাইকরণে সমস্যা হয়েছে।');
  }
}

/**
 * Execute batch expiration maintenance for overdue blood requests
 * (Authorized trusted maintenance / backend execution via expire_overdue_blood_requests RPC)
 */
export async function expireOverdueBloodRequestsInSupabase(
  batchLimit = 100
): Promise<{
  success: boolean;
  expiredCount: number;
  expiredRequestIds: string[];
  executedAt: string;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: true,
      expiredCount: 0,
      expiredRequestIds: [],
      executedAt: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase.rpc('expire_overdue_blood_requests', {
    p_batch_limit: batchLimit,
  });

  if (error) {
    console.error('Error executing expire_overdue_blood_requests RPC:', error);
    throw new Error(error.message || 'রক্তের অনুরোধের মেয়াদোত্তীর্ণ রক্ষণাবেক্ষণ সম্পন্ন করা যায়নি।');
  }

  return {
    success: Boolean(data?.success),
    expiredCount: Number(data?.expired_count) || 0,
    expiredRequestIds: Array.isArray(data?.expired_request_ids) ? data.expired_request_ids : [],
    executedAt: data?.executed_at || new Date().toISOString(),
  };
}

// Compatibility aliases
export const updateBloodRequestStatusInFirestore = updateBloodRequestStatusInSupabase;
export const verifyBloodRequestInFirestore = verifyBloodRequestInSupabase;
