/**
 * Automated Verification Script for Phase 8 — User, Role & Permission Center
 */
import {
  hasPermission,
  canManageRole,
  validateRoleAssignment,
  ROLE_HIERARCHY,
} from '../src/services/permissionService';
import { DEFAULT_PERMISSION_MATRIX } from '../src/data/seedData';
import type { UserRole, PermissionKey } from '../src/types';

async function runUserRolePermissionTests() {
  console.log('🧪 Starting Phase 8 User, Role & Permission Center Automated Tests...\n');

  // Test 1: Role Hierarchy Verification
  console.log('✓ Role Hierarchy Ranking:');
  const roles: UserRole[] = ['super_admin', 'admin', 'moderator', 'volunteer', 'donor', 'recipient'];
  for (let i = 0; i < roles.length - 1; i++) {
    const higher = roles[i];
    const lower = roles[i + 1];
    if (ROLE_HIERARCHY[higher] <= ROLE_HIERARCHY[lower]) {
      throw new Error(`Hierarchy invariant broken: ${higher} (${ROLE_HIERARCHY[higher]}) must be > ${lower} (${ROLE_HIERARCHY[lower]})`);
    }
    console.log(`  ${higher} (${ROLE_HIERARCHY[higher]}) > ${lower} (${ROLE_HIERARCHY[lower]})`);
  }

  // Test 2: Super Admin Absolute Authority
  const allPermKeys: PermissionKey[] = [
    'manage_donors',
    'manage_requests',
    'record_donation',
    'manage_hospitals',
    'manage_branches',
    'manage_funds',
    'manage_disbursements',
    'manage_payment_methods',
    'manage_users',
    'manage_roles_matrix',
    'manage_settings',
    'manage_backup',
    'view_audit_logs',
  ];

  for (const perm of allPermKeys) {
    if (!hasPermission('super_admin', perm)) {
      throw new Error(`Super admin must have permission "${perm}".`);
    }
  }
  console.log('\n✓ Super Admin Authority: All 13 system permissions verified active.');

  // Test 3: Permission Matrix Checks for Restricted Roles
  const donorHasUserManagement = hasPermission('donor', 'manage_users');
  console.log(`✓ Donor permission check for manage_users: ${donorHasUserManagement} (Must be false)`);
  if (donorHasUserManagement) {
    throw new Error('Donor role was incorrectly granted manage_users permission.');
  }

  const volunteerHasVerifyDonor = hasPermission('volunteer', 'manage_donors');
  console.log(`✓ Volunteer permission check for manage_donors: ${volunteerHasVerifyDonor}`);

  // Test 4: Privilege Escalation Guards (canManageRole)
  console.log('\n✓ Privilege Escalation Guards:');

  // Super admin can manage all
  if (!canManageRole('super_admin', 'super_admin') || !canManageRole('super_admin', 'admin') || !canManageRole('super_admin', 'volunteer')) {
    throw new Error('Super admin must be able to manage all roles.');
  }
  console.log('  Super admin can manage all roles: PASS');

  // Admin cannot manage Super Admin or Admin
  if (canManageRole('admin', 'super_admin')) {
    throw new Error('Privilege Escalation Vulnerability: Admin was permitted to manage Super Admin.');
  }
  if (canManageRole('admin', 'admin')) {
    throw new Error('Privilege Escalation Vulnerability: Admin was permitted to manage peer Admin.');
  }
  if (!canManageRole('admin', 'moderator') || !canManageRole('admin', 'volunteer')) {
    throw new Error('Admin should be permitted to manage moderator and volunteer.');
  }
  console.log('  Admin restricted from managing super_admin or peer admin: PASS');

  // Non-admins cannot manage any role
  if (canManageRole('moderator', 'volunteer') || canManageRole('donor', 'donor')) {
    throw new Error('Non-admin was incorrectly permitted to manage roles.');
  }
  console.log('  Non-admins blocked from managing user accounts: PASS');

  // Test 5: Role Assignment Validation
  console.log('\n✓ Role Assignment Validation:');

  // Super admin promoting user to super_admin
  const superPromo = validateRoleAssignment('super_admin', 'volunteer', 'super_admin');
  if (!superPromo.allowed) {
    throw new Error('Super admin should be allowed to assign super_admin role.');
  }
  console.log('  Super admin promoting volunteer to super_admin: ALLOWED');

  // Admin attempting to elevate volunteer to super_admin (Must be BLOCKED)
  const adminIllegalPromo = validateRoleAssignment('admin', 'volunteer', 'super_admin');
  if (adminIllegalPromo.allowed) {
    throw new Error('Privilege Escalation Vulnerability: Admin was allowed to promote volunteer to super_admin.');
  }
  console.log(`  Admin promoting volunteer to super_admin: BLOCKED (${adminIllegalPromo.reason})`);

  // Admin promoting volunteer to moderator (Allowed)
  const adminLegalPromo = validateRoleAssignment('admin', 'volunteer', 'moderator');
  if (!adminLegalPromo.allowed) {
    throw new Error('Admin should be allowed to promote volunteer to moderator.');
  }
  console.log('  Admin promoting volunteer to moderator: ALLOWED');

  console.log('\n🎉 ALL Phase 8 User, Role & Permission Center Tests Passed Successfully!');
}

runUserRolePermissionTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
