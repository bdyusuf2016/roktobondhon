import {
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import type { Hospital } from '../types';

const HOSPITALS_COLLECTION = 'hospitals';

/**
 * Fetch all hospitals from Firestore
 */
export async function getHospitalsFromFirestore(): Promise<Hospital[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, HOSPITALS_COLLECTION));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Hospital));
  } catch (err) {
    console.error('Error fetching hospitals from Firestore:', err);
    return [];
  }
}

/**
 * Add a new hospital directory entry
 */
export async function addHospitalToFirestore(hospital: Omit<Hospital, 'id'>): Promise<Hospital> {
  const id = `hosp-${Date.now()}`;
  const item: Hospital = { ...hospital, id };

  if (isFirebaseConfigured && db) {
    const ref = doc(db, HOSPITALS_COLLECTION, id);
    await setDoc(ref, {
      ...item,
      serverCreatedAt: serverTimestamp(),
    });
  }

  return item;
}

/**
 * Update an existing hospital
 */
export async function updateHospitalInFirestore(id: string, data: Partial<Hospital>): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, HOSPITALS_COLLECTION, id);
  await updateDoc(ref, {
    ...data,
    serverUpdatedAt: serverTimestamp(),
  });
}

/**
 * Delete a hospital
 */
export async function deleteHospitalFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, HOSPITALS_COLLECTION, id);
  await deleteDoc(ref);
}
