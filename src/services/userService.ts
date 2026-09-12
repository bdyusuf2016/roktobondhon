import { supabase, isSupabaseConfigured } from '../supabase/config';
import type { User, UserRole } from '../types';

/**
 * Convert database row (snake_case) to User interface (camelCase)
 */
export function mapUserRow(row: any): User {
  return {
    id: row.id,
    fullName: row.full_name || 'সদস্য',
    phone: row.phone || '',
    email: row.email || undefined,
    role: (row.role as UserRole) || 'donor',
    organizationId: row.organization_id || 'org-roktobondon',
    branchId: row.branch_id || undefined,
    photoUrl: row.photo_url || undefined,
    status: row.status || 'active',
    phoneVerified: Boolean(row.phone_verified),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    lastLoginAt: row.last_login_at || undefined,
  };
}

/**
 * Fetch staff user profile from Supabase: users table
 */
export async function getUserProfile(uid: string, email?: string | null, phone?: string | null): Promise<User | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    // 1. Primary lookup by id
    let { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    // 2. Fallback lookup by email if id didn't match (e.g., auth UUID vs seeded string ID)
    if (!data && email) {
      const emailQuery = await supabase
        .from('users')
        .select('*')
        .ilike('email', email.trim().toLowerCase())
        .maybeSingle();

      if (emailQuery.data) {
        data = emailQuery.data;
      }
    }

    // 3. Fallback lookup by phone if id and email didn't match (e.g., Phone OTP login)
    if (!data && phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const phoneQuery = await supabase
        .from('users')
        .select('*')
        .ilike('phone', `%${cleanPhone.slice(-10)}%`)
        .maybeSingle();

      if (phoneQuery.data) {
        data = phoneQuery.data;
      }
    }

    if (error) {
      console.error('Error fetching staff user profile from Supabase:', error);
      return null;
    }

    return data ? mapUserRow(data) : null;
  } catch (err) {
    console.error('Exception in getUserProfile:', err);
    return null;
  }
}

/**
 * Fetch ordinary donor profile by auth user_id from public.donors
 */
export async function getDonorProfileByUserId(uid: string, email?: string | null, phone?: string | null): Promise<User | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    // 1. Primary lookup by user_id = uid
    let { data, error } = await supabase
      .from('donors')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle();

    // 2. Fallback by email
    if (!data && email) {
      const emailQuery = await supabase
        .from('donors')
        .select('*')
        .ilike('email', email.trim().toLowerCase())
        .maybeSingle();
      if (emailQuery.data) {
        data = emailQuery.data;
      }
    }

    // 3. Fallback by phone
    if (!data && phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      const phoneQuery = await supabase
        .from('donors')
        .select('*')
        .ilike('phone', `%${cleanPhone.slice(-10)}%`)
        .maybeSingle();
      if (phoneQuery.data) {
        data = phoneQuery.data;
      }
    }

    if (error) {
      console.error('Error fetching donor profile by user_id from Supabase:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: uid,
      fullName: data.full_name || 'রক্তদাতা সদস্য',
      phone: data.phone || '',
      email: data.email || undefined,
      role: 'donor',
      organizationId: data.organization_id || 'org-roktobondon',
      branchId: data.branch_id || undefined,
      photoUrl: data.photo_url || undefined,
      status: data.verification_status === 'suspended' ? 'suspended' : 'active',
      phoneVerified: Boolean(data.phone),
      createdAt: data.created_at || new Date().toISOString(),
      updatedAt: data.updated_at || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };
  } catch (err) {
    console.error('Exception in getDonorProfileByUserId:', err);
    return null;
  }
}

/**
 * Two-Tier Session Resolution:
 * Tier 1: Check public.users (Staff/Portal users)
 * Tier 2: Check public.donors (Ordinary Donors)
 * Does NOT create public.users for ordinary donors.
 */
export async function resolveAuthenticatedUserSession(
  uid: string,
  email?: string | null,
  phone?: string | null
): Promise<{ user: User | null; tier: 'staff' | 'donor' | 'none' }> {
  // Tier 1: Check Staff Users table
  const staffProfile = await getUserProfile(uid, email, phone);
  if (staffProfile) {
    return { user: staffProfile, tier: 'staff' };
  }

  // Tier 2: Check Donors table
  const donorProfile = await getDonorProfileByUserId(uid, email, phone);
  if (donorProfile) {
    return { user: donorProfile, tier: 'donor' };
  }

  return { user: null, tier: 'none' };
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

  if (isSupabaseConfigured && supabase) {
    try {
      // First, check if a profile already exists by email (prevent overwriting super_admin/staff roles)
      if (profile.email) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .ilike('email', profile.email.trim().toLowerCase())
          .maybeSingle();

        if (existingUser) {
          return mapUserRow(existingUser);
        }
      }

      const { error } = await supabase.from('users').upsert({
        id: uid,
        full_name: newUser.fullName,
        phone: newUser.phone,
        email: newUser.email || null,
        role: newUser.role,
        organization_id: newUser.organizationId,
        branch_id: newUser.branchId || null,
        photo_url: newUser.photoUrl || null,
        status: newUser.status,
        phone_verified: newUser.phoneVerified,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error creating user profile in Supabase:', error);
      }
    } catch (err) {
      console.error('Exception creating user profile:', err);
    }
  }

  return newUser;
}

/**
 * Update allowed self profile fields (fullName, photoUrl, etc.)
 */
export async function updateUserProfile(
  uid: string,
  allowedUpdates: Partial<Pick<User, 'fullName' | 'photoUrl' | 'email' | 'phone'>>
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const dbUpdates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };
  if (allowedUpdates.fullName !== undefined) dbUpdates.full_name = allowedUpdates.fullName;
  if (allowedUpdates.photoUrl !== undefined) dbUpdates.photo_url = allowedUpdates.photoUrl;
  if (allowedUpdates.email !== undefined) dbUpdates.email = allowedUpdates.email;
  if (allowedUpdates.phone !== undefined) dbUpdates.phone = allowedUpdates.phone;

  const { error } = await supabase.from('users').update(dbUpdates).eq('id', uid);
  if (error) {
    console.error('Error updating user profile in Supabase:', error);
  }
}

/**
 * Update user role (Privileged Admin Operation)
 */
export async function updateUserRoleInSupabase(
  targetUserId: string,
  newRole: UserRole,
  adminUser: { id: string; role: UserRole }
): Promise<void> {
  if (adminUser.role !== 'super_admin' && adminUser.role !== 'admin') {
    throw new Error('রোল পরিবর্তন করার জন্য পর্যাপ্ত প্রশাসনিক অনুমতি নেই।');
  }

  if (!isSupabaseConfigured || !supabase) return;

  const { error } = await supabase
    .from('users')
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', targetUserId);

  if (error) {
    throw new Error(error.message || 'রোল আপডেট করতে সমস্যা হয়েছে।');
  }
}

/**
 * List users belonging to an organization
 */
export async function listOrganizationUsers(organizationId: string): Promise<User[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId);

    if (error) {
      console.error('Failed to list organization users:', error);
      return [];
    }

    return (data || []).map(mapUserRow);
  } catch (err) {
    console.error('Exception listing organization users:', err);
    return [];
  }
}
