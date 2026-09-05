import type { UserRole, PermissionKey } from '../types';

/**
 * Standard Role Permission Matrix
 * Maps each UserRole to its granted permissions
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Record<PermissionKey, boolean>> = {
  super_admin: {
    manage_donors: true,
    manage_requests: true,
    record_donation: true,
    manage_hospitals: true,
    manage_funds: true,
    manage_disbursements: true,
    manage_payment_methods: true,
    manage_branches: true,
    manage_users: true,
    manage_roles_matrix: true,
    manage_settings: true,
    manage_backup: true,
    view_audit_logs: true,
  },
  admin: {
    manage_donors: true,
    manage_requests: true,
    record_donation: true,
    manage_hospitals: true,
    manage_funds: true,
    manage_disbursements: true,
    manage_payment_methods: true,
    manage_branches: true,
    manage_users: true,
    manage_roles_matrix: false,
    manage_settings: true,
    manage_backup: true,
    view_audit_logs: true,
  },
  moderator: {
    manage_donors: true,
    manage_requests: true,
    record_donation: true,
    manage_hospitals: true,
    manage_funds: false,
    manage_disbursements: false,
    manage_payment_methods: false,
    manage_branches: false,
    manage_users: false,
    manage_roles_matrix: false,
    manage_settings: false,
    manage_backup: false,
    view_audit_logs: true,
  },
  volunteer: {
    manage_donors: false,
    manage_requests: true,
    record_donation: true,
    manage_hospitals: false,
    manage_funds: false,
    manage_disbursements: false,
    manage_payment_methods: false,
    manage_branches: false,
    manage_users: false,
    manage_roles_matrix: false,
    manage_settings: false,
    manage_backup: false,
    view_audit_logs: false,
  },
  donor: {
    manage_donors: false,
    manage_requests: false,
    record_donation: false,
    manage_hospitals: false,
    manage_funds: false,
    manage_disbursements: false,
    manage_payment_methods: false,
    manage_branches: false,
    manage_users: false,
    manage_roles_matrix: false,
    manage_settings: false,
    manage_backup: false,
    view_audit_logs: false,
  },
  recipient: {
    manage_donors: false,
    manage_requests: false,
    record_donation: false,
    manage_hospitals: false,
    manage_funds: false,
    manage_disbursements: false,
    manage_payment_methods: false,
    manage_branches: false,
    manage_users: false,
    manage_roles_matrix: false,
    manage_settings: false,
    manage_backup: false,
    view_audit_logs: false,
  },
};

/**
 * Checks whether a given role has the requested permission.
 * Custom matrix overrides can optionally be passed.
 */
export function checkPermission(
  role: UserRole | undefined,
  permission: PermissionKey,
  matrix?: Record<UserRole, Record<PermissionKey, boolean>>
): boolean {
  if (!role) return false;
  if (role === 'super_admin') return true; // Super admin always has full access
  const activeMatrix = matrix || DEFAULT_ROLE_PERMISSIONS;
  return Boolean(activeMatrix[role]?.[permission]);
}

/**
 * Helper to check if role has staff/administrative clearance
 */
export function isStaffRole(role: UserRole | undefined): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'moderator' || role === 'volunteer';
}

/**
 * Helper to check if role has management clearance
 */
export function isManagementRole(role: UserRole | undefined): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'moderator';
}
