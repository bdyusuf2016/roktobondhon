import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import type { DonorRequest, DonorRequestStatus, Donor, BloodRequest } from '../types';

const DONOR_REQUESTS_COLLECTION = 'donorRequests';

/**
 * Send a contact request to a donor for a blood request
 * Checks for duplicate request first
 */
export async function sendDonorContactRequest(
  bloodRequest: BloodRequest,
  donor: Donor,
  requesterUserId: string,
  matchScore: number
): Promise<DonorRequest> {
  // Check duplicate in Firestore if online
  if (isFirebaseConfigured && db) {
    const q = query(
      collection(db, DONOR_REQUESTS_COLLECTION),
      where('bloodRequestId', '==', bloodRequest.id),
      where('donorId', '==', donor.id)
    );
    const existingSnap = await getDocs(q);
    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      return {
        id: existingDoc.id,
        ...existingDoc.data(),
      } as DonorRequest;
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

  if (isFirebaseConfigured && db) {
    const ref = doc(db, DONOR_REQUESTS_COLLECTION, id);
    await setDoc(ref, {
      ...newRequest,
      serverCreatedAt: serverTimestamp(),
      serverUpdatedAt: serverTimestamp(),
    });
  }

  return newRequest;
}

/**
 * Fetch requests received by a specific donor
 */
export async function getRequestsForDonor(donorUserId: string): Promise<DonorRequest[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = query(
      collection(db, DONOR_REQUESTS_COLLECTION),
      where('donorUserId', '==', donorUserId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DonorRequest));
  } catch (err) {
    console.error('Error fetching requests for donor:', err);
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
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, DONOR_REQUESTS_COLLECTION, requestId);
  await updateDoc(ref, {
    status,
    declineReason: declineReason || '',
    respondedAt: new Date().toISOString(),
    serverUpdatedAt: serverTimestamp(),
  });
}
