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
 * Fetch all active blood requests
 */
export async function getActiveBloodRequests(): Promise<BloodRequest[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('blood_requests')
      .select('*')
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
 * Fetch blood requests created by a specific user
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
 * Fetch a single blood request by ID
 */
export async function getBloodRequestById(id: string): Promise<BloodRequest | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from('blood_requests')
      .select('*')
      .or(`id.eq.${id},request_id.eq.${id}`)
      .maybeSingle();

    if (error) {
      console.error('Error fetching blood request by ID:', error);
      return null;
    }

    return data ? mapBloodRequestRow(data) : null;
  } catch (err) {
    console.error('Exception fetching blood request:', err);
    return null;
  }
}

/**
 * Create a new blood request
 */
export async function createBloodRequestRecord(
  data: Omit<BloodRequest, 'id' | 'requestId' | 'createdAt' | 'status' | 'verification'>
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
      }
    } catch (err) {
      console.error('Exception inserting blood request:', err);
    }
  }

  return newRequest;
}

/**
 * Update request status
 */
export async function updateBloodRequestStatusInFirestore(
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
 * Verify blood request by staff/volunteer
 */
export async function verifyBloodRequestInFirestore(
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
  }
}
