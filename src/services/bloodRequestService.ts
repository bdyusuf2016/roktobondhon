import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import type { BloodRequest, BloodRequestPublic, RequestStatus } from '../types';
import { generateBloodRequestId } from './idGenerator';

const REQUESTS_COLLECTION = 'bloodRequests';
const PUBLIC_REQUESTS_COLLECTION = 'bloodRequestPublic';

/**
 * Fetch all active public blood requests (Queries public-safe collection only)
 * Never exposes patientName, contactPerson, contactNumber, or private notes
 */
export async function getActiveBloodRequests(): Promise<BloodRequest[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = query(
      collection(db, PUBLIC_REQUESTS_COLLECTION),
      where('status', 'in', ['active', 'matched', 'pending'])
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        requestId: data.requestId || d.id,
        userId: data.userId || '',
        patientName: '', // Protected: hidden from public feeds
        bloodGroup: data.bloodGroup,
        requiredUnits: data.requiredUnits || 1,
        requiredDate: data.requiredDate,
        requiredTime: data.requiredTime,
        hospital: data.hospital,
        division: data.division || 'Dhaka',
        district: data.district,
        upazila: data.upazila,
        area: data.area,
        contactPerson: '', // Protected
        contactNumber: '', // Protected
        relationship: '', // Protected
        emergencyLevel: data.emergencyLevel || 'NORMAL',
        notes: '', // Protected
        status: data.status as RequestStatus,
        verification: data.verification || { isVerified: false },
        organizationId: data.organizationId || 'org-roktobondon',
        createdAt: data.createdAt || new Date().toISOString(),
        expiresAt: data.expiresAt,
      };
    });
  } catch (err) {
    console.error('Error fetching public blood requests from Firestore:', err);
    return [];
  }
}

/**
 * Fetch blood requests created by a specific user
 */
export async function getUserRequests(userId: string): Promise<BloodRequest[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('userId', '==', userId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      id: d.id,
      requestId: d.data().requestId || d.id,
      ...d.data(),
    } as BloodRequest));
  } catch (err) {
    console.error('Error fetching user blood requests:', err);
    return [];
  }
}

/**
 * Fetch a single blood request by document ID or human-readable requestId
 * Checks private document first (authorized owner/staff), falls back to public safe document
 */
export async function getBloodRequestById(id: string): Promise<BloodRequest | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    // 1. Attempt to fetch private document (accessible if owner or authorized staff)
    try {
      const ref = doc(db, REQUESTS_COLLECTION, id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return {
          id: snap.id,
          requestId: snap.data().requestId || snap.id,
          ...snap.data(),
        } as BloodRequest;
      }
    } catch {
      // Access denied or collection read restriction; fall through to public representation
    }

    // 2. Fetch public-safe document representation
    const pubRef = doc(db, PUBLIC_REQUESTS_COLLECTION, id);
    const pubSnap = await getDoc(pubRef);
    if (pubSnap.exists()) {
      const data = pubSnap.data();
      return {
        id: pubSnap.id,
        requestId: data.requestId || pubSnap.id,
        userId: data.userId || '',
        patientName: '',
        bloodGroup: data.bloodGroup,
        requiredUnits: data.requiredUnits || 1,
        requiredDate: data.requiredDate,
        requiredTime: data.requiredTime,
        hospital: data.hospital,
        division: data.division || 'Dhaka',
        district: data.district,
        upazila: data.upazila,
        area: data.area,
        contactPerson: '',
        contactNumber: '',
        relationship: '',
        emergencyLevel: data.emergencyLevel || 'NORMAL',
        notes: '',
        status: data.status,
        verification: data.verification || { isVerified: false },
        organizationId: data.organizationId || 'org-roktobondon',
        createdAt: data.createdAt,
        expiresAt: data.expiresAt,
      } as BloodRequest;
    }

    return null;
  } catch (err) {
    console.error('Error fetching blood request by ID:', err);
    return null;
  }
}

/**
 * Create a new blood request with human-readable ID
 * Atomically writes full private data and public-safe representation
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

  const publicData: BloodRequestPublic = {
    id: docId,
    requestId,
    userId: newRequest.userId,
    bloodGroup: newRequest.bloodGroup,
    requiredUnits: newRequest.requiredUnits,
    division: newRequest.division,
    district: newRequest.district,
    upazila: newRequest.upazila,
    area: newRequest.area,
    emergencyLevel: newRequest.emergencyLevel,
    requiredDate: newRequest.requiredDate,
    requiredTime: newRequest.requiredTime,
    hospital: newRequest.hospital,
    status: newRequest.status,
    verification: newRequest.verification,
    organizationId: newRequest.organizationId || 'org-roktobondon',
    createdAt: newRequest.createdAt,
    expiresAt: newRequest.expiresAt,
  };

  if (isFirebaseConfigured && db) {
    // Authenticated recipient creates private bloodRequests document
    const privateRef = doc(db, REQUESTS_COLLECTION, docId);
    await setDoc(privateRef, {
      ...newRequest,
      serverCreatedAt: serverTimestamp(),
      serverUpdatedAt: serverTimestamp(),
    });
  }

  return newRequest;
}

/**
 * Update request status across private and public documents
 */
export async function updateBloodRequestStatusInFirestore(
  id: string,
  status: RequestStatus
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;

  const privRef = doc(db, REQUESTS_COLLECTION, id);
  await updateDoc(privRef, {
    status,
    serverUpdatedAt: serverTimestamp(),
  });

  // Attempt to update public representation if already verified/published
  try {
    const pubRef = doc(db, PUBLIC_REQUESTS_COLLECTION, id);
    const pubSnap = await getDoc(pubRef);
    if (pubSnap.exists()) {
      await updateDoc(pubRef, {
        status,
        serverUpdatedAt: serverTimestamp(),
      });
    }
  } catch {
    // Ignore if caller lacks permission to mutate public representation directly
  }
}

/**
 * Verify blood request by staff/volunteer and publish privacy-safe public representation
 */
export async function verifyBloodRequestInFirestore(
  id: string,
  verifierName: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const now = new Date().toISOString();

  const privRef = doc(db, REQUESTS_COLLECTION, id);
  const snap = await getDoc(privRef);
  const data = snap.exists() ? snap.data() : null;

  const batch = writeBatch(db);
  batch.update(privRef, {
    'verification.isVerified': true,
    'verification.verifiedBy': verifierName,
    'verification.verifiedAt': now,
    status: 'active',
    serverUpdatedAt: serverTimestamp(),
  });

  // Authorized staff/volunteer publishes public-safe representation to bloodRequestPublic
  if (data) {
    const pubRef = doc(db, PUBLIC_REQUESTS_COLLECTION, id);
    batch.set(pubRef, {
      id,
      requestId: data.requestId || id,
      userId: data.userId || '',
      bloodGroup: data.bloodGroup,
      requiredUnits: data.requiredUnits || 1,
      division: data.division || 'Dhaka',
      district: data.district,
      upazila: data.upazila,
      area: data.area,
      emergencyLevel: data.emergencyLevel || 'NORMAL',
      requiredDate: data.requiredDate,
      requiredTime: data.requiredTime,
      hospital: data.hospital,
      status: 'active',
      verification: {
        isVerified: true,
        verifiedBy: verifierName,
        verifiedAt: now,
      },
      organizationId: data.organizationId || 'org-roktobondon',
      createdAt: data.createdAt || now,
      expiresAt: data.expiresAt || new Date(Date.now() + 48 * 3600000).toISOString(),
      serverCreatedAt: serverTimestamp(),
      serverUpdatedAt: serverTimestamp(),
    }, { merge: true });
  }

  await batch.commit();
}

