import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, isFirebaseConfigured } from '../firebase/config';

/**
 * Upload a file to Firebase Storage and retrieve the download URL
 */
export async function uploadFile(
  file: File,
  storagePath: string
): Promise<string> {
  if (!isFirebaseConfigured || !storage) {
    throw new Error('Firebase Storage কনফিগার করা নেই।');
  }

  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

/**
 * Upload donor verification document: verification/{donorId}/{timestamp}_{filename}
 */
export async function uploadVerificationDoc(
  donorId: string,
  file: File
): Promise<string> {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `verification/${donorId}/${Date.now()}_${cleanName}`;
  return uploadFile(file, path);
}

/**
 * Upload donor profile photo: donors/{donorId}/photo_{timestamp}
 */
export async function uploadDonorPhoto(
  donorId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `donors/${donorId}/avatar_${Date.now()}.${ext}`;
  return uploadFile(file, path);
}

/**
 * Upload organization asset (e.g. logo, banner): organizations/{orgId}/{fileName}
 */
export async function uploadOrganizationAsset(
  organizationId: string,
  file: File,
  fileName: string
): Promise<string> {
  const path = `organizations/${organizationId}/${Date.now()}_${fileName}`;
  return uploadFile(file, path);
}
