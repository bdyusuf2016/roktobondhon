import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase/config';
import type { User, UserRole } from '../types';

const USERS_COLLECTION = 'users';

/**
 * Fetch user profile from Firestore: users/{uid}
 */
export async function getUserProfile(uid: string): Promise<User | null> {
  if (!isFirebaseConfigured || !db) return null;
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: snap.id,
        fullName: data.fullName || 'নাম পাওয়া যায়নি',
        phone: data.phone || '',
        email: data.email,
        role: (data.role as UserRole) || 'donor',
        organizationId: data.organizationId || 'org-roktobondon',
        branchId: data.branchId,
        photoUrl: data.photoUrl,
        status: data.status || 'active',
        phoneVerified: data.phoneVerified ?? false,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        lastLoginAt: data.lastLoginAt,
      };
    }
    return null;
  } catch (err) {
    console.error('Error fetching user profile from Firestore:', err);
    return null;
  }
}

/**
 * Create or initialize user document upon sign-up or first login
 */
export async function createUserProfile(
  uid: string,
  profile: {
    fullName: string;
    phone: string;
    email?: string;
    role?: UserRole;
    organizationId?: string;
    branchId?: string;
    photoUrl?: string;
    phoneVerified?: boolean;
  }
): Promise<User> {
  const newUser: User = {
    id: uid,
    fullName: profile.fullName,
    phone: profile.phone,
    email: profile.email,
    // Regular sign-up can only assign 'donor' or 'recipient' role; never admin/super_admin
    role: profile.role && ['donor', 'recipient'].includes(profile.role) ? profile.role : 'donor',
    organizationId: profile.organizationId || 'org-roktobondon',
    branchId: profile.branchId,
    photoUrl: profile.photoUrl,
    status: 'active',
    phoneVerified: profile.phoneVerified ?? false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured && db) {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      await setDoc(userRef, {
        ...newUser,
        serverCreatedAt: serverTimestamp(),
        serverUpdatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error creating user profile in Firestore:', err);
    }
  }

  return newUser;
}

/**
 * Update allowed self profile fields (fullName, photoUrl, etc.).
 * Role, organizationId, and branchId are strictly excluded from client self-updates.
 */
export async function updateUserProfile(
  uid: string,
  allowedUpdates: Partial<Pick<User, 'fullName' | 'photoUrl' | 'email' | 'phone'>>
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const userRef = doc(db, USERS_COLLECTION, uid);
  await updateDoc(userRef, {
    ...allowedUpdates,
    updatedAt: new Date().toISOString(),
    serverUpdatedAt: serverTimestamp(),
  });
}

/**
 * Update user role (Privileged Admin Operation)
 */
export async function updateUserRoleInFirestore(
  targetUserId: string,
  newRole: UserRole,
  adminUser: { id: string; role: UserRole }
): Promise<void> {
  if (adminUser.role !== 'super_admin' && adminUser.role !== 'admin') {
    throw new Error('রোল পরিবর্তন করার জন্য পর্যাপ্ত প্রশাসনিক অনুমতি নেই।');
  }

  if (!isFirebaseConfigured || !db) return;

  const userRef = doc(db, USERS_COLLECTION, targetUserId);
  await updateDoc(userRef, {
    role: newRole,
    updatedAt: new Date().toISOString(),
    serverUpdatedAt: serverTimestamp(),
  });
}

/**
 * List users belonging to an organization
 */
export async function listOrganizationUsers(organizationId: string): Promise<User[]> {
  if (!isFirebaseConfigured || !db) return [];
  try {
    const q = query(
      collection(db, USERS_COLLECTION),
      where('organizationId', '==', organizationId)
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        fullName: data.fullName || 'সদস্য',
        phone: data.phone || '',
        email: data.email,
        role: (data.role as UserRole) || 'donor',
        organizationId: data.organizationId || organizationId,
        branchId: data.branchId,
        photoUrl: data.photoUrl,
        status: data.status || 'active',
        phoneVerified: data.phoneVerified ?? false,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error('Failed to list organization users:', err);
    return [];
  }
}
