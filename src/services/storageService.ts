import { supabase, isSupabaseConfigured } from '../supabase/config';

/**
 * Upload a file to Supabase Storage bucket and retrieve the public or signed URL
 */
export async function uploadFile(
  bucketName: string,
  file: File,
  storagePath: string
): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase Storage কনফিগার করা নেই।');
  }

  const { error } = await supabase.storage.from(bucketName).upload(storagePath, file, {
    upsert: true,
    cacheControl: '3600',
  });

  if (error) {
    throw new Error(error.message || 'ফাইল আপলোড ব্যর্থ হয়েছে।');
  }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Upload donor verification document: verification-docs/{donorId}/{timestamp}_{filename}
 */
export async function uploadVerificationDoc(
  donorId: string,
  file: File
): Promise<string> {
  const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `${donorId}/${Date.now()}_${cleanName}`;
  return uploadFile('verification-docs', file, path);
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
  return uploadFile('avatars', file, path);
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
  return uploadFile('assets', file, path);
}
