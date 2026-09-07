import { supabase, isSupabaseConfigured } from '../supabase/config';
import type { User, UserRole } from '../types';

/**
 * Convert database row (snake_case) to User interface (camelCase)
 */
function mapUserRow(row: any): User {
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
 * Fetch user profile from Supabase: users table
 */
export async function getUserProfile(uid: string, email?: string | null): Promise<User | null> {
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

    if (error) {
      console.error('Error fetching user profile from Supabase:', error);
      return null;
    }

    return data ? mapUserRow(data) : null;
  } catch (err) {
    console.error('Exception in getUserProfile:', err);
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
