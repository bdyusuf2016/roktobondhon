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
import type {
  FundDonation,
  FundDisbursement,
  PaymentMethodConfig,
  DonationCauseConfig,
} from '../types';

/**
 * Fetch all Fund Donations
 */
export async function getFundDonationsFromFirestore(): Promise<FundDonation[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, 'fundDonations'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FundDonation));
  } catch (err) {
    console.error('Error fetching fund donations:', err);
    return [];
  }
}

/**
 * Add a new fund donation record
 */
export async function addFundDonationToFirestore(
  donation: Omit<FundDonation, 'id' | 'createdAt' | 'status'>
): Promise<FundDonation> {
  const id = `fnd-${Date.now()}`;
  const item: FundDonation = {
    ...donation,
    id,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    const ref = doc(db, 'fundDonations', id);
    await setDoc(ref, {
      ...item,
      serverCreatedAt: serverTimestamp(),
    });
  }

  return item;
}

/**
 * Verify fund donation
 */
export async function verifyFundDonationInFirestore(
  id: string,
  verifierName: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, 'fundDonations', id);
  await updateDoc(ref, {
    status: 'verified',
    verifiedBy: verifierName,
    verifiedAt: new Date().toISOString(),
    serverUpdatedAt: serverTimestamp(),
  });
}

/**
 * Fetch all Fund Disbursements
 */
export async function getFundDisbursementsFromFirestore(): Promise<FundDisbursement[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, 'fundDisbursements'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FundDisbursement));
  } catch (err) {
    console.error('Error fetching disbursements:', err);
    return [];
  }
}

/**
 * Add a new disbursement voucher
 */
export async function addFundDisbursementToFirestore(
  disbursement: Omit<FundDisbursement, 'id'>
): Promise<FundDisbursement> {
  const id = `disb-${Date.now()}`;
  const item: FundDisbursement = { ...disbursement, id };

  if (isFirebaseConfigured && db) {
    const ref = doc(db, 'fundDisbursements', id);
    await setDoc(ref, {
      ...item,
      serverCreatedAt: serverTimestamp(),
    });
  }

  return item;
}

/**
 * Delete a disbursement voucher
 */
export async function deleteFundDisbursementFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, 'fundDisbursements', id);
  await deleteDoc(ref);
}

/**
 * Fetch Payment Methods Config
 */
export async function getPaymentMethodsFromFirestore(): Promise<PaymentMethodConfig[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const snap = await getDocs(collection(db, 'paymentMethods'));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentMethodConfig));
  } catch (err) {
    console.error('Error fetching payment methods:', err);
    return [];
  }
}

/**
 * Save / Update Payment Method
 */
export async function savePaymentMethodToFirestore(
  method: PaymentMethodConfig
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, 'paymentMethods', method.id);
  await setDoc(ref, {
    ...method,
    serverUpdatedAt: serverTimestamp(),
  });
}

/**
 * Delete Payment Method
 */
export async function deletePaymentMethodFromFirestore(id: string): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const ref = doc(db, 'paymentMethods', id);
  await deleteDoc(ref);
}
