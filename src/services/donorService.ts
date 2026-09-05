import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  writeBatch,
  serverTimestamp,
  type QueryConstraint,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import type {
  Donor,
  DonorPublic,
  DonorPrivate,
  VerificationStatus,
  BloodGroup,
} from '../types';

const PUBLIC_COLLECTION = 'donorPublic';
const PRIVATE_COLLECTION = 'donorPrivate';

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
 * Query public donor directory (searches donorPublic only)
 * Never queries or returns donorPrivate fields
 */
export async function searchDonorsPublic(filters: DonorSearchFilters): Promise<DonorPublic[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const constraints: QueryConstraint[] = [];

    if (filters.bloodGroup) {
      constraints.push(where('bloodGroup', '==', filters.bloodGroup));
    }
    if (filters.district) {
      constraints.push(where('district', '==', filters.district));
    }
    if (filters.upazila) {
      constraints.push(where('upazila', '==', filters.upazila));
    }
    if (filters.availability !== undefined) {
      constraints.push(where('availability', '==', filters.availability));
    }
    if (filters.verificationStatus) {
      constraints.push(where('verificationStatus', '==', filters.verificationStatus));
    }
    if (filters.emergencyAvailable) {
      constraints.push(where('emergencyAvailable', '==', true));
    }
    if (filters.organizationId) {
      constraints.push(where('organizationId', '==', filters.organizationId));
    }

    const q = query(collection(db, PUBLIC_COLLECTION), ...constraints);
    const snap = await getDocs(q);

    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        donorId: data.donorId || d.id,
        fullName: data.fullName || 'স্বেচ্ছাসেবী রক্তদাতা',
        photoUrl: data.photoUrl,
        bloodGroup: data.bloodGroup as BloodGroup,
        division: data.division,
        districtId: data.districtId,
        district: data.district,
        upazilaId: data.upazilaId,
        upazila: data.upazila,
        areaId: data.areaId,
        area: data.area,
        locationLabel: data.locationLabel,
        availability: Boolean(data.availability),
        emergencyAvailable: Boolean(data.emergencyAvailable),
        lastDonationDate: data.lastDonationDate,
        firstDonationDate: data.firstDonationDate,
        totalDonations: data.totalDonations || 0,
        verificationStatus: (data.verificationStatus as VerificationStatus) || 'pending',
        organizationId: data.organizationId || 'org-roktobondon',
        branchId: data.branchId,
        createdAt: data.createdAt || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error('Error searching donorPublic in Firestore:', err);
    return [];
  }
}

/**
 * Fetch a single public donor profile by donorId
 */
export async function getDonorPublicById(donorId: string): Promise<DonorPublic | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const ref = doc(db, PUBLIC_COLLECTION, donorId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      donorId: data.donorId || snap.id,
      fullName: data.fullName || 'স্বেচ্ছাসেবী রক্তদাতা',
      photoUrl: data.photoUrl,
      bloodGroup: data.bloodGroup as BloodGroup,
      division: data.division,
      districtId: data.districtId,
      district: data.district,
      upazilaId: data.upazilaId,
      upazila: data.upazila,
      areaId: data.areaId,
      area: data.area,
      locationLabel: data.locationLabel,
      availability: Boolean(data.availability),
      emergencyAvailable: Boolean(data.emergencyAvailable),
      lastDonationDate: data.lastDonationDate,
      firstDonationDate: data.firstDonationDate,
      totalDonations: data.totalDonations || 0,
      verificationStatus: (data.verificationStatus as VerificationStatus) || 'pending',
      organizationId: data.organizationId || 'org-roktobondon',
      branchId: data.branchId,
      createdAt: data.createdAt || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error fetching public donor profile:', err);
    return null;
  }
}

/**
 * Fetch private donor profile (guarded by owner or staff)
 */
export async function getDonorPrivateById(donorId: string): Promise<DonorPrivate | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const ref = doc(db, PRIVATE_COLLECTION, donorId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      donorId: data.donorId || snap.id,
      userId: data.userId,
      phone: data.phone || '',
      email: data.email,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      exactAddress: data.exactAddress,
      emergencyContact: data.emergencyContact,
      adminNotes: data.adminNotes,
      verificationDocuments: data.verificationDocuments,
      nidOrIdNumber: data.nidOrIdNumber,
      privacy: data.privacy || {
        showPhone: false,
        showGender: false,
        showAge: false,
        allowDirectContact: true,
      },
      verifiedBy: data.verifiedBy,
      verifiedAt: data.verifiedAt,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
    };
  } catch (err) {
    console.error('Error fetching private donor profile:', err);
    return null;
  }
}

/**
 * Register a donor by atomically writing to donorPublic and donorPrivate
 */
export async function createDonorRecord(
  publicData: DonorPublic,
  privateData: DonorPrivate
): Promise<Donor> {
  const donorId = publicData.id;

  if (isFirebaseConfigured && db) {
    const batch = writeBatch(db);

    const publicRef = doc(db, PUBLIC_COLLECTION, donorId);
    batch.set(publicRef, {
      ...publicData,
      serverCreatedAt: serverTimestamp(),
    });

    const privateRef = doc(db, PRIVATE_COLLECTION, donorId);
    batch.set(privateRef, {
      ...privateData,
      serverCreatedAt: serverTimestamp(),
      serverUpdatedAt: serverTimestamp(),
    });

    await batch.commit();
  }

  // Return composite Donor for client UI
  return {
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
    updatedAt: privateData.updatedAt,
  };
}

/**
 * Update donor profile across public and private records
 */
export async function updateDonorRecord(
  donorId: string,
  publicUpdates?: Partial<DonorPublic>,
  privateUpdates?: Partial<DonorPrivate>
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const batch = writeBatch(db);

  if (publicUpdates && Object.keys(publicUpdates).length > 0) {
    const pubRef = doc(db, PUBLIC_COLLECTION, donorId);
    batch.update(pubRef, {
      ...publicUpdates,
      serverUpdatedAt: serverTimestamp(),
    });
  }

  if (privateUpdates && Object.keys(privateUpdates).length > 0) {
    const privRef = doc(db, PRIVATE_COLLECTION, donorId);
    batch.update(privRef, {
      ...privateUpdates,
      updatedAt: new Date().toISOString(),
      serverUpdatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
}

/**
 * Verify a donor (authorized staff only)
 * Creates verification log entry and updates verification status
 */
export async function verifyDonorStatus(
  donorId: string,
  status: VerificationStatus,
  verifierName: string,
  notes?: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  // Update public status
  const pubRef = doc(db, PUBLIC_COLLECTION, donorId);
  batch.update(pubRef, {
    verificationStatus: status,
    serverUpdatedAt: serverTimestamp(),
  });

  // Update private admin notes & verifier
  const privRef = doc(db, PRIVATE_COLLECTION, donorId);
  batch.update(privRef, {
    verificationStatus: status,
    verifiedBy: verifierName,
    verifiedAt: now,
    adminNotes: notes || '',
    updatedAt: now,
    serverUpdatedAt: serverTimestamp(),
  });

  // Create audit verification log
  const logRef = doc(collection(db, 'verificationLogs'));
  batch.set(logRef, {
    donorId,
    status,
    verifiedBy: verifierName,
    notes: notes || '',
    timestamp: now,
    serverTimestamp: serverTimestamp(),
  });

  await batch.commit();
}
