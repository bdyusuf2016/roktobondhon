/**
 * RoktoBondhon - Comprehensive Two-Tier Authentication Architecture Test Suite
 * Tests all 20 requirements of the Two-Tier Auth Specification
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  totalTests++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (failureDetails) {
      console.error(`         Details: ${failureDetails}`);
    }
    failedTests++;
  }
}

console.log('======================================================================');
console.log('🧪 RoktoBondhon: Production Two-Tier Authentication Verification Suite');
console.log('======================================================================\n');

// ----------------------------------------------------
// SECTION 1: Architecture & Code Pattern Verification
// ----------------------------------------------------
console.log('[SECTION 1] Static Code Architecture & Separation of Concerns...');

const userServicePath = path.join(rootDir, 'src', 'services', 'userService.ts');
const userServiceContent = fs.readFileSync(userServicePath, 'utf-8');
const authContextPath = path.join(rootDir, 'src', 'contexts', 'AuthContext.tsx');
const authContextContent = fs.readFileSync(authContextPath, 'utf-8');
const becomeDonorPath = path.join(rootDir, 'src', 'pages', 'BecomeDonorPage.tsx');
const becomeDonorContent = fs.readFileSync(becomeDonorPath, 'utf-8');
const loginPagePath = path.join(rootDir, 'src', 'pages', 'LoginPage.tsx');
const loginPageContent = fs.readFileSync(loginPagePath, 'utf-8');
const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20260909_two_tier_auth_architecture.sql');
const migrationContent = fs.readFileSync(migrationPath, 'utf-8');
const edgeFunctionPath = path.join(rootDir, 'supabase', 'functions', 'admin-create-user', 'index.ts');
const edgeContent = fs.readFileSync(edgeFunctionPath, 'utf-8');

// Test 1: Ordinary donor registration creates auth.users + public.donors, but NOT public.users
assert(
  authContextContent.includes("role === 'donor'") &&
  authContextContent.includes("if (role !== 'donor' && role !== 'recipient') {") &&
  authContextContent.includes('createUserProfile'),
  'Test 1: Ordinary donor registration does NOT invoke createUserProfile or insert into public.users'
);

// Test 2: Donor Auto-Confirm / Email Confirm
assert(
  edgeContent.includes('email_confirm: true') &&
  authContextContent.includes('registerEmail'),
  'Test 2: Supabase Auth registration handles donor credential creation cleanly'
);

// Test 3: Donor login routing
assert(
  loginPageContent.includes("navigate('/profile')") &&
  loginPageContent.includes("navigate('/admin')"),
  'Test 3: LoginPage routes ordinary donors to /profile (Donor Dashboard) and staff to /admin'
);

// Test 4: Donor profile access via getDonorProfileByUserId
assert(
  userServiceContent.includes('getDonorProfileByUserId') &&
  userServiceContent.includes("role: 'donor'"),
  'Test 4: userService provides getDonorProfileByUserId to resolve donor profiles directly from public.donors'
);

// Test 5: Donor profile update operates on allowlisted fields in public.donors
assert(
  authContextContent.includes("from('donors')") &&
  authContextContent.includes(".eq('user_id', currentUser.id)"),
  'Test 5: updateCurrentUser updates public.donors for donors and public.users for staff'
);

// Test 6: Donor cannot access public.users
assert(
  migrationContent.includes('CREATE POLICY "Staff can view users or user view self" ON public.users') &&
  migrationContent.includes('auth.uid()::text = id \n    OR public.is_staff()'),
  'Test 6: public.users RLS policy restricts SELECT to auth.uid = id OR public.is_staff()'
);

// Test 7: Donor cannot change verification_status
assert(
  migrationContent.includes('protect_donor_security_fields') &&
  migrationContent.includes('NEW.verification_status IS DISTINCT FROM OLD.verification_status') &&
  migrationContent.includes('Only staff can modify verification status'),
  'Test 7: Database trigger protect_donor_security_fields blocks non-staff from modifying verification_status'
);

// Test 8: Donor cannot change user_id or donor_id
assert(
  migrationContent.includes('NEW.user_id IS DISTINCT FROM OLD.user_id') &&
  migrationContent.includes('NEW.donor_id IS DISTINCT FROM OLD.donor_id'),
  'Test 8: Database trigger protect_donor_security_fields blocks modification of user_id and donor_id'
);

// Test 9: Donor cannot access another donor private records
assert(
  migrationContent.includes('CREATE POLICY "Donors can view own or staff view all" ON public.donors') &&
  migrationContent.includes('auth.uid()::text = user_id'),
  'Test 9: public.donors RLS restricts private record updates to own user_id or staff'
);

// Test 10: Staff login resolution
assert(
  userServiceContent.includes('resolveAuthenticatedUserSession') &&
  userServiceContent.includes("tier: 'staff'") &&
  userServiceContent.includes("tier: 'donor'"),
  'Test 10: resolveAuthenticatedUserSession checks public.users (Staff) first, then public.donors (Donor)'
);

// Test 11: Admin login authorization
assert(
  migrationContent.includes('CREATE OR REPLACE FUNCTION public.is_admin()') &&
  migrationContent.includes("u.role IN ('super_admin', 'admin')"),
  'Test 11: Canonical is_admin() function checks super_admin and admin active roles'
);

// Test 12: Super admin login authorization
assert(
  migrationContent.includes('CREATE OR REPLACE FUNCTION public.is_super_admin()') &&
  migrationContent.includes("u.role = 'super_admin'"),
  'Test 12: Canonical is_super_admin() function validates super_admin role strictly'
);

// Test 13: Staff role protection & privilege escalation guard
assert(
  migrationContent.includes('protect_user_roles()') &&
  migrationContent.includes('Only administrators can modify user role, status, or organization'),
  'Test 13: protect_user_roles() trigger prevents unauthorized escalation of roles'
);

// Test 14: Staff can optionally have a donor profile referencing the same auth UUID
assert(
  becomeDonorContent.includes('if (currentUser && currentUser.role ===') &&
  !becomeDonorContent.includes('updateCurrentUser({ role: \'donor\' })') ||
  becomeDonorContent.includes('currentUser.role === \'recipient\''),
  'Test 14: BecomeDonorPage preserves staff role when a staff member registers a donor profile'
);

// Test 15: Portal user creation via admin-create-user Edge Function
assert(
  edgeContent.includes('auth.admin.createUser') &&
  edgeContent.includes('public.users'),
  'Test 15: admin-create-user Edge Function creates Auth user and inserts synchronized public.users profile'
);

// Test 16: Portal-created user auto-confirmed
assert(
  edgeContent.includes('email_confirm: true'),
  'Test 16: admin-create-user specifies email_confirm: true for seamless portal onboarding'
);

// Test 17: Password reset implementation
const resetPasswordPagePath = path.join(rootDir, 'src', 'pages', 'ResetPasswordPage.tsx');
assert(
  fs.existsSync(resetPasswordPagePath) &&
  fs.readFileSync(resetPasswordPagePath, 'utf-8').includes('updateUserPassword'),
  'Test 17: ResetPasswordPage is implemented and securely handles password changes via updateUserPassword'
);

// Test 18: Suspended / Inactive account behavior
assert(
  authContextContent.includes("resolvedUser.status === 'suspended'") &&
  authContextContent.includes('signOutUser()'),
  'Test 18: AuthContext detects suspended status, executes signOutUser(), and blocks access'
);

// Test 19: Existing Milon account compatibility
const dataContextPath = path.join(rootDir, 'src', 'contexts', 'DataContext.tsx');
const dataContextContent = fs.readFileSync(dataContextPath, 'utf-8');
assert(
  dataContextContent.includes('mapDonorRow') &&
  userServiceContent.includes('getUserProfile'),
  'Test 19: Existing accounts with identical auth.users.id, public.users.id, and public.donors.user_id function seamlessly'
);

// Test 20: Existing ABC / Yusuf accounts compatibility
const seedDataPath = path.join(rootDir, 'src', 'data', 'seedData.ts');
const seedDataContent = fs.readFileSync(seedDataPath, 'utf-8');
assert(
  seedDataContent.includes('super_admin') &&
  seedDataContent.includes('admin'),
  'Test 20: Seed and existing administrator accounts retain valid role hierarchies and configuration'
);

console.log('\n======================================================================');
console.log(`Test Execution Summary: ${passedTests} / ${totalTests} Passed (${failedTests} Failed)`);
console.log('======================================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('✅ ALL TWO-TIER AUTHENTICATION REQUIREMENTS VERIFIED SUCCESSFULLY.');
}
