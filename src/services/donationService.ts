import {
  doc,
  getDocs,
  setDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import type { Donation } from '../types';

const DONATIONS_COLLECTION = 'donations';

/**
 * Fetch donation records for a specific donor
 */
export async function getDonationsForDonor(donorId: string): Promise<Donation[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = query(
      collection(db, DONATIONS_COLLECTION),
      where('donorId', '==', donorId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation));
  } catch (err) {
    console.error('Error fetching donations for donor:', err);
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

  if (isFirebaseConfigured && db) {
    const ref = doc(db, DONATIONS_COLLECTION, id);
    await setDoc(ref, {
      ...newDonation,
      serverCreatedAt: serverTimestamp(),
    });
  }

  return newDonation;
}
