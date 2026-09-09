import { supabase, isSupabaseConfigured } from '../supabase/config';
import type {
  DonationSubmission,
  DonationSubmissionStatus,
  BloodGroup,
  DonationType,
  Donation,
} from '../types';

export function mapDonationSubmissionRow(row: any): DonationSubmission {
  return {
    id: row.id,
    donorId: row.donor_id,
    donorUserId: row.donor_user_id,
    donorName: row.donor_name || 'রক্তদাতা',
    bloodGroup: row.blood_group as BloodGroup,
    donationDate: row.donation_date,
    hospital: row.hospital || undefined,
    location: row.location || undefined,
    campId: row.camp_id || undefined,
    bloodRequestId: row.blood_request_id || undefined,
    units: Number(row.units) || 1,
    donationType: (row.donation_type as DonationType) || 'Whole Blood',
    notes: row.notes || undefined,
    status: (row.status as DonationSubmissionStatus) || 'pending',
    submittedAt: row.submitted_at || row.created_at || new Date().toISOString(),
    reviewedAt: row.reviewed_at || undefined,
    reviewedBy: row.reviewed_by || undefined,
    reviewNotes: row.review_notes || undefined,
    approvedDonationId: row.approved_donation_id || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

/**
 * Fetch all donation submissions (Staff View)
 */
export async function getAllDonationSubmissionsFromSupabase(): Promise<DonationSubmission[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('donation_submissions')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching all donation submissions:', error);
      return [];
    }

    return (data || []).map(mapDonationSubmissionRow);
  } catch (err) {
    console.error('Exception fetching donation submissions:', err);
    return [];
  }
}

/**
 * Fetch donation submissions for a specific donor
 */
export async function getDonationSubmissionsForDonorFromSupabase(
  donorUserId: string
): Promise<DonationSubmission[]> {
  if (!isSupabaseConfigured || !supabase || !donorUserId) return [];
  try {
    const { data, error } = await supabase
      .from('donation_submissions')
      .select('*')
      .eq('donor_user_id', donorUserId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions for donor:', error);
      return [];
    }

    return (data || []).map(mapDonationSubmissionRow);
  } catch (err) {
    console.error('Exception fetching donor submissions:', err);
    return [];
  }
}

/**
 * Check if a donation or submission already exists on the same date for this donor
 */
export function checkDuplicateDonation(
  donorId: string,
  donorUserId: string | undefined,
  donationDate: string,
  existingDonations: Donation[] = [],
  existingSubmissions: DonationSubmission[] = [],
  excludeSubmissionId?: string
): { isDuplicate: boolean; reason?: string } {
  if (!donationDate) return { isDuplicate: false };

  // 1. Check official donations
  const officialMatch = existingDonations.find(
    (d) =>
      (d.donorId === donorId || (donorUserId && d.donorUserId === donorUserId)) &&
      d.donationDate === donationDate
  );
  if (officialMatch) {
    return {
      isDuplicate: true,
      reason: `এই তারিখের (${donationDate}) জন্য আপনার একটি যাচাইকৃত রক্তদান রেকর্ড ইতোমধ্যে সিস্টেমে রয়েছে।`,
    };
  }

  // 2. Check pending or approved submissions
  const submissionMatch = existingSubmissions.find(
    (s) =>
      s.id !== excludeSubmissionId &&
      (s.donorId === donorId || (donorUserId && s.donorUserId === donorUserId)) &&
      s.donationDate === donationDate &&
      s.status !== 'rejected' &&
      s.status !== 'cancelled'
  );
  if (submissionMatch) {
    return {
      isDuplicate: true,
      reason: `এই তারিখের (${donationDate}) জন্য আপনার একটি রক্তদান রিপোর্ট ইতোমধ্যে জমা দেওয়া হয়েছে (${
        submissionMatch.status === 'approved' ? 'অনুমোদিত' : 'যাচাইয়ের অপেক্ষায়'
      })।`,
    };
  }

  return { isDuplicate: false };
}

/**
 * Submit a new self-reported donation
 */
export async function submitDonationReportInSupabase(
  submission: Omit<
    DonationSubmission,
    'id' | 'status' | 'submittedAt' | 'createdAt' | 'updatedAt' | 'reviewedAt' | 'reviewedBy' | 'reviewNotes' | 'approvedDonationId'
  >
): Promise<DonationSubmission> {
  const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sub-${Date.now()}`;
  const now = new Date().toISOString();

  const newSubmission: DonationSubmission = {
    ...submission,
    id: newId,
    status: 'pending',
    submittedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  if (isSupabaseConfigured && supabase) {
    const payload = {
      id: newSubmission.id,
      donor_id: newSubmission.donorId,
      donor_user_id: newSubmission.donorUserId,
      donor_name: newSubmission.donorName,
      blood_group: newSubmission.bloodGroup,
      donation_date: newSubmission.donationDate,
      hospital: newSubmission.hospital || null,
      location: newSubmission.location || null,
      camp_id: newSubmission.campId || null,
      blood_request_id: newSubmission.bloodRequestId || null,
      units: newSubmission.units,
      donation_type: newSubmission.donationType,
      notes: newSubmission.notes || null,
      status: 'pending',
      submitted_at: newSubmission.submittedAt,
      created_at: newSubmission.createdAt,
      updated_at: newSubmission.updatedAt,
    };

    const { data, error } = await supabase
      .from('donation_submissions')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error submitting donation report to Supabase:', error);
      if (error.message?.includes('schema cache') || error.code === 'PGRST204' || error.message?.includes('donation_submissions')) {
        throw new Error('Supabase ডাটাবেজে donation_submissions টেবিলটি পাওয়া যায়নি। অনুগ্রহ করে Supabase SQL Editor-এ 20260909_donation_submission_workflow.sql মাইগ্রেশন স্ক্রিপ্টটি রান করুন।');
      }
      throw error;
    }

    if (data) {
      return mapDonationSubmissionRow(data);
    }
  }

  return newSubmission;
}

/**
 * Update an existing pending/needs_info submission
 */
export async function updateDonationSubmissionInSupabase(
  id: string,
  updates: Partial<Pick<DonationSubmission, 'donationDate' | 'hospital' | 'location' | 'campId' | 'bloodRequestId' | 'units' | 'donationType' | 'notes'>>
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.donationDate !== undefined) dbUpdates.donation_date = updates.donationDate;
  if (updates.hospital !== undefined) dbUpdates.hospital = updates.hospital;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.campId !== undefined) dbUpdates.camp_id = updates.campId;
  if (updates.bloodRequestId !== undefined) dbUpdates.blood_request_id = updates.bloodRequestId;
  if (updates.units !== undefined) dbUpdates.units = updates.units;
  if (updates.donationType !== undefined) dbUpdates.donation_type = updates.donationType;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

  const { error } = await supabase
    .from('donation_submissions')
    .update(dbUpdates)
    .eq('id', id);

  if (error) {
    console.error('Error updating donation submission in Supabase:', error);
    throw error;
  }
}

/**
 * Cancel a pending submission (Donor action)
 */
export async function cancelDonationSubmissionInSupabase(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase
    .from('donation_submissions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('Error cancelling donation submission:', error);
    throw error;
  }
}

/**
 * Approve a donation submission (Staff action via atomic RPC)
 */
export async function approveDonationSubmissionInSupabase(
  id: string,
  reviewNotes?: string
): Promise<{ success: boolean; donationId?: string; alreadyApproved?: boolean; message?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true, donationId: `don-${Date.now()}` };
  }

  try {
    const { data, error } = await supabase.rpc('approve_donation_submission', {
      p_submission_id: id,
      p_review_notes: reviewNotes || null,
    });

    if (error) {
      console.error('Error executing approve_donation_submission RPC:', error);
      throw error;
    }

    return {
      success: Boolean(data?.success),
      donationId: data?.donation_id,
      alreadyApproved: Boolean(data?.already_approved),
      message: data?.message,
    };
  } catch (err: any) {
    console.error('Exception approving submission:', err);
    throw err;
  }
}

/**
 * Reject a donation submission (Staff action via RPC)
 */
export async function rejectDonationSubmissionInSupabase(
  id: string,
  reason: string
): Promise<{ success: boolean; message?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true, message: 'Rejected locally' };
  }

  try {
    const { data, error } = await supabase.rpc('reject_donation_submission', {
      p_submission_id: id,
      p_reason: reason,
    });

    if (error) {
      console.error('Error executing reject_donation_submission RPC:', error);
      throw error;
    }

    return {
      success: Boolean(data?.success),
      message: data?.message,
    };
  } catch (err: any) {
    console.error('Exception rejecting submission:', err);
    throw err;
  }
}

/**
 * Request more info for a donation submission (Staff action via RPC)
 */
export async function requestDonationSubmissionInfoInSupabase(
  id: string,
  message: string
): Promise<{ success: boolean; message?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return { success: true, message: 'Requested info locally' };
  }

  try {
    const { data, error } = await supabase.rpc('request_donation_submission_info', {
      p_submission_id: id,
      p_message: message,
    });

    if (error) {
      console.error('Error executing request_donation_submission_info RPC:', error);
      throw error;
    }

    return {
      success: Boolean(data?.success),
      message: data?.message,
    };
  } catch (err: any) {
    console.error('Exception requesting submission info:', err);
    throw err;
  }
}
