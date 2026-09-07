import { supabase, isSupabaseConfigured } from '../supabase/config';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit

/**
 * Upload a file to Supabase Storage bucket
 */
export async function uploadFile(
  bucketName: string,
  file: File,
  storagePath: string
): Promise<{ path: string; publicUrl?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase Storage কনফিগার করা নেই।');
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('ফাইলের আকার সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারে।');
  }

  const { error } = await supabase.storage.from(bucketName).upload(storagePath, file, {
    upsert: true,
    cacheControl: '3600',
  });

  if (error) {
    throw new Error(error.message || 'ফাইল আপলোড ব্যর্থ হয়েছে।');
  }

  if (bucketName === 'verification-docs') {
    return { path: storagePath };
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
  return { path: storagePath, publicUrl: data.publicUrl };
}

/**
 * Get a temporary signed URL for private verification documents
 */
export async function getSignedUrlForDoc(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase Storage কনফিগার করা নেই।');
  }

  const { data, error } = await supabase.storage
    .from('verification-docs')
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'ডকুমেন্টের নিরাপদ লিংক তৈরি করা যায়নি।');
  }

  return data.signedUrl;
}

/**
 * Upload donor verification document: verification-docs/{donorId}/{timestamp}_{filename}
 */
export async function uploadVerificationDoc(
  donorId: string,
  file: File
): Promise<{ path: string }> {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${donorId}/${Date.now()}_${cleanName}`;
  const res = await uploadFile('verification-docs', file, path);
  return { path: res.path };
}

/**
 * Upload donor profile photo: avatars/{donorId}/photo_{timestamp}
 */
export async function uploadDonorPhoto(
  donorId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${donorId}/avatar_${Date.now()}.${ext}`;
  const res = await uploadFile('avatars', file, path);
  return res.publicUrl || '';
}

/**
 * Upload organization asset (e.g. logo, banner): assets/{orgId}/{fileName}
 */
export async function uploadOrganizationAsset(
  organizationId: string,
  file: File,
  fileName: string
): Promise<string> {
  const path = `${organizationId}/${Date.now()}_${fileName}`;
  const res = await uploadFile('assets', file, path);
  return res.publicUrl || '';
}

/**
 * Delete a file from a storage bucket
 */
export async function deleteStorageFile(
  bucketName: string,
  storagePath: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.storage.from(bucketName).remove([storagePath]);
  if (error) {
    console.error(`Error deleting file ${storagePath} from ${bucketName}:`, error);
  }
}
