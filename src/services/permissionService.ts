/**
 * Permission Service
 * Centralized authorization engine, role hierarchy, and privilege escalation prevention.
 */
import type { UserRole, PermissionKey, RolePermissionMatrix } from '../types';
import { DEFAULT_PERMISSION_MATRIX } from '../data/seedData';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  admin: 80,
  moderator: 60,
  volunteer: 40,
  donor: 20,
  recipient: 10,
};

export const ROLE_LABELS: Record<UserRole, { bn: string; en: string }> = {
  super_admin: { bn: 'সুপার এডমিন (Super Admin)', en: 'Super Admin' },
  admin: { bn: 'এডমিন (Admin)', en: 'Admin' },
  moderator: { bn: 'মডারেটর (Moderator)', en: 'Moderator' },
  volunteer: { bn: 'স্বেচ্ছাসেবক (Volunteer)', en: 'Volunteer' },
  donor: { bn: 'রক্তদাতা (Donor)', en: 'Donor' },
  recipient: { bn: 'সেবাগ্রহীতা (Recipient)', en: 'Recipient' },
};

/**
 * Checks if a given role has a specific permission
 */
export function hasPermission(
  role: UserRole | undefined | null,
  permission: PermissionKey,
  matrix: RolePermissionMatrix = DEFAULT_PERMISSION_MATRIX
): boolean {
  if (!role) return false;
  // Super admin always has all permissions
  if (role === 'super_admin') return true;

  const rolePerms = matrix[role];
  if (!rolePerms) return false;

  return Boolean(rolePerms[permission]);
}

/**
 * Privilege Escalation Guard
 * Determines if an actor with `actorRole` is allowed to manage, create, or update a user with `targetRole`
 */
export function canManageRole(actorRole: UserRole | undefined | null, targetRole: UserRole): boolean {
  if (!actorRole) return false;
  if (actorRole === 'super_admin') return true;

  // Admin can manage roles strictly lower than admin (moderator, volunteer, donor, recipient)
  if (actorRole === 'admin') {
    return targetRole !== 'super_admin' && targetRole !== 'admin';
  }

  // Non-admins cannot manage roles
  return false;
}

/**
 * Validates a proposed role assignment against privilege escalation policies
 */
export function validateRoleAssignment(
  actorRole: UserRole | undefined | null,
  currentTargetRole: UserRole,
  newTargetRole: UserRole
): { allowed: boolean; reason?: string } {
  if (!actorRole) {
    return { allowed: false, reason: 'অননুমোদিত ব্যবহারকারী।' };
  }

  // Super admin can assign any role
  if (actorRole === 'super_admin') {
    return { allowed: true };
  }

  // Check if actor has permission to manage users
  if (!canManageRole(actorRole, currentTargetRole)) {
    return {
      allowed: false,
      reason: `আপনার "${ROLE_LABELS[actorRole]?.bn || actorRole}" রোল দিয়ে "${ROLE_LABELS[currentTargetRole]?.bn || currentTargetRole}" রোলের ইউজার পরিবর্তন করা নিষিদ্ধ।`,
    };
  }

  // Check if actor is attempting to elevate the user to a role >= actor's role
  if (newTargetRole === 'super_admin' || newTargetRole === 'admin') {
    return {
      allowed: false,
      reason: `শুধুমাত্র সুপার এডমিন নতুন এডমিন বা সুপার এডমিন রোল নির্ধারণ করতে পারেন।`,
    };
  }

  return { allowed: true };
}
