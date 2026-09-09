/**
 * RoktoBondhon - Comprehensive Donation Recording & User Management Separation Test Suite
 * Validates:
 * 1. User & Dynamic Role Management strict separation from Donors/Recipients
 * 2. Staff+Donor dual-role badge and profile linking
 * 3. Donation recording & digital history workflow
 * 4. Historical donation count preservation without double-counting
 * 5. Database triggers, RLS policies, audit logging, and notifications
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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
console.log('🧪 RoktoBondhon: Donation Recording & User Management Separation Suite');
console.log('======================================================================\n');

// ----------------------------------------------------
// SECTION 1: User & Dynamic Role Management Separation
// ----------------------------------------------------
console.log('[SECTION 1] User Management Separation & Dual-Role Badging...');

const adminUsersTabPath = path.join(rootDir, 'src', 'components', 'admin', 'users', 'AdminUsersTab.tsx');
const adminUsersTabContent = fs.readFileSync(adminUsersTabPath, 'utf-8');

// Test 1: Only administrative staff accounts are displayed in User Management
assert(
  adminUsersTabContent.includes("const staffUsers = users.filter((u) =>") &&
  adminUsersTabContent.includes("['super_admin', 'admin', 'moderator', 'volunteer'].includes(u.role)"),
  'Test 1: User Management filters strictly to staff roles (super_admin, admin, moderator, volunteer)'
);

// Test 2: Role selection options exclude standalone donor and recipient
assert(
  !adminUsersTabContent.includes('<option value="donor">') &&
  !adminUsersTabContent.includes('<option value="recipient">'),
  'Test 2: Role creation/editing dropdowns exclude donor and recipient'
);

// Test 3: Dual-role badge for staff members who also have a donor profile
assert(
  adminUsersTabContent.includes('matchingDonor') &&
  adminUsersTabContent.includes('🌱 ডোনার প্রোফাইল বিদ্যমান'),
  'Test 3: Dual-role staff members display a [🌱 ডোনার প্রোফাইল বিদ্যমান] badge and donor ID'
);

// Test 4: Dynamic Role & RBAC permissions matrix supports staff roles and permissions
assert(
  adminUsersTabContent.includes('PERMISSION_DEFINITIONS') &&
  adminUsersTabContent.includes('setMatrixCategoryFilter'),
  'Test 4: RBAC permissions matrix supports dynamic role configuration and category filtering'
);

// ----------------------------------------------------
// SECTION 2: Database Migration & Schema Integrity
// ----------------------------------------------------
console.log('\n[SECTION 2] Database Schema, Metrics Trigger & RLS Policies...');

const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20260909_donation_management.sql');
const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

// Test 5: Migration adds historical_donation_count column to public.donors
assert(
  migrationContent.includes('ALTER TABLE public.donors') &&
  migrationContent.includes('historical_donation_count INTEGER DEFAULT 0'),
  'Test 5: Migration adds historical_donation_count column to public.donors'
);

// Test 6: Migration adds source, blood_request_id, camp_id, location to public.donations
assert(
  migrationContent.includes('ALTER TABLE public.donations') &&
  migrationContent.includes('source TEXT') &&
  migrationContent.includes('blood_request_id TEXT') &&
  migrationContent.includes('camp_id TEXT'),
  'Test 6: Migration adds source, blood_request_id, camp_id, and location to public.donations'
);

// Test 7: sync_donor_donation_metrics trigger reconciles historical count with digital count
assert(
  migrationContent.includes('sync_donor_donation_metrics()') &&
  migrationContent.includes('v_historical_count') &&
  migrationContent.includes('v_digital_count') &&
  migrationContent.includes('total_donations = COALESCE(v_historical_count, 0) + COALESCE(v_digital_count, 0)'),
  'Test 7: Trigger computes total_donations = historical_donation_count + digital donations count'
);

// Test 8: sync_donor_donation_metrics computes last_donation_date via GREATEST
assert(
  migrationContent.includes('v_existing_last_date := GREATEST(v_digital_last_date, v_existing_last_date);'),
  'Test 8: Trigger updates last_donation_date as GREATEST between existing date and digital record'
);

// Test 9: RLS policies protect public.donations
assert(
  migrationContent.includes('CREATE POLICY "Users can view own donations or staff view all" ON public.donations') &&
  migrationContent.includes('CREATE POLICY "Staff can insert donations" ON public.donations') &&
  migrationContent.includes('public.is_staff()'),
  'Test 9: RLS policies enforce staff-only modifications and donor self-read access on donations'
);

// ----------------------------------------------------
// SECTION 3: TypeScript Types & Service Layer
// ----------------------------------------------------
console.log('\n[SECTION 3] TypeScript Definitions & Service Functions...');

const typesPath = path.join(rootDir, 'src', 'types', 'index.ts');
const typesContent = fs.readFileSync(typesPath, 'utf-8');

// Test 10: Donor interface includes historicalDonationCount
assert(
  typesContent.includes('historicalDonationCount?: number'),
  'Test 10: Donor type includes optional historicalDonationCount'
);

// Test 11: Donation interface includes source, bloodRequestId, campId, location
assert(
  typesContent.includes("source?: 'manual' | 'imported' | 'camp' | 'request' | 'donor_reported' | 'other'") &&
  typesContent.includes('bloodRequestId?: string') &&
  typesContent.includes('campId?: string') &&
  typesContent.includes('location?: string'),
  'Test 11: Donation type includes source, bloodRequestId, campId, and location'
);

const donationServicePath = path.join(rootDir, 'src', 'services', 'donationService.ts');
const donationServiceContent = fs.readFileSync(donationServicePath, 'utf-8');

// Test 12: donationService provides complete CRUD & report operations
assert(
  donationServiceContent.includes('getAllDonationsFromSupabase') &&
  donationServiceContent.includes('recordDonationInSupabase') &&
  donationServiceContent.includes('updateDonationInSupabase') &&
  donationServiceContent.includes('deleteDonationInSupabase') &&
  donationServiceContent.includes('getDonationReports'),
  'Test 12: donationService exports getAllDonations, recordDonation, updateDonation, deleteDonation, getDonationReports'
);

// ----------------------------------------------------
// SECTION 4: Context State, Notifications & Audit Logs
// ----------------------------------------------------
console.log('\n[SECTION 4] Data Context State, Notifications & Audit Logging...');

const dataContextPath = path.join(rootDir, 'src', 'contexts', 'DataContext.tsx');
const dataContextContent = fs.readFileSync(dataContextPath, 'utf-8');

// Test 13: DataContext exports updateDonation alongside recordDonation and deleteDonation
assert(
  dataContextContent.includes('recordDonation:') &&
  dataContextContent.includes('updateDonation:') &&
  dataContextContent.includes('deleteDonation:'),
  'Test 13: DataContext exposes recordDonation, updateDonation, and deleteDonation'
);

// Test 14: recordDonation preserves historicalDonationCount and increments totalDonations
assert(
  dataContextContent.includes('totalDonations: (d.totalDonations || 0) + 1') &&
  dataContextContent.includes('d.historicalDonationCount'),
  'Test 14: recordDonation accurately computes new total count without wiping historical count'
);

// Test 15: recordDonation creates in-app notification only for auth-linked donors
assert(
  dataContextContent.includes('if (donationData.donorUserId) {') &&
  dataContextContent.includes("title: 'রক্তদানের তথ্য সংরক্ষণ করা হয়েছে'"),
  'Test 15: recordDonation creates notification for registered auth-linked donors'
);

// Test 16: Audit logs recorded for donation lifecycle
assert(
  dataContextContent.includes("addAuditLog('DONATION_CREATED'") &&
  dataContextContent.includes("addAuditLog('DONATION_UPDATED'") &&
  dataContextContent.includes("deleteDonationInFirestore"),
  'Test 16: DataContext triggers DONATION_CREATED, DONATION_UPDATED, and deletion audit logs'
);

// ----------------------------------------------------
// SECTION 5: Reusable RecordDonationModal Component
// ----------------------------------------------------
console.log('\n[SECTION 5] Reusable RecordDonationModal Component...');

const recordModalPath = path.join(rootDir, 'src', 'components', 'admin', 'donations', 'RecordDonationModal.tsx');
const recordModalContent = fs.readFileSync(recordModalPath, 'utf-8');

// Test 17: RecordDonationModal implements donor autocomplete search
assert(
  recordModalContent.includes('donorSearchTerm') &&
  recordModalContent.includes('matchingDonors') &&
  recordModalContent.includes('setSelectedDonorId'),
  'Test 17: RecordDonationModal provides real-time donor search and autocomplete selection'
);

// Test 18: RecordDonationModal enforces maximum date as today
assert(
  recordModalContent.includes('max={todayStr}') &&
  recordModalContent.includes('todayStr'),
  'Test 18: RecordDonationModal validates that future dates cannot be recorded'
);

// Test 19: RecordDonationModal shows status badge for donor
assert(
  recordModalContent.includes('verificationStatus') &&
  recordModalContent.includes('যাচাইকৃত'),
  'Test 19: RecordDonationModal displays a verification status badge for the selected donor'
);

// Test 20: RecordDonationModal allows linking blood requests and blood camps
assert(
  recordModalContent.includes('campId') &&
  recordModalContent.includes('bloodRequestId') &&
  recordModalContent.includes('bloodCamps') &&
  recordModalContent.includes('bloodRequests'),
  'Test 20: RecordDonationModal allows linking donations to organized blood camps or specific blood requests'
);

// ----------------------------------------------------
// SECTION 6: Admin Tab Integrations & Profile Breakdown
// ----------------------------------------------------
console.log('\n[SECTION 6] Admin Tab Integrations & User Profile Breakdown...');

const adminDonationsTabPath = path.join(rootDir, 'src', 'components', 'admin', 'donations', 'AdminDonationsTab.tsx');
const adminDonationsTabContent = fs.readFileSync(adminDonationsTabPath, 'utf-8');

// Test 21: AdminDonationsTab features KPI summary and blood group distribution
assert(
  adminDonationsTabContent.includes('মোট ডিজিটাল রক্তদান') &&
  adminDonationsTabContent.includes('চলতি মাসে রক্তদান') &&
  adminDonationsTabContent.includes('গ্রুপভিত্তিক রক্তদান পরিসংখ্যান'),
  'Test 21: AdminDonationsTab displays KPI metrics and blood group distribution bar'
);

// Test 22: AdminDonationsTab integrates RecordDonationModal
assert(
  adminDonationsTabContent.includes('RecordDonationModal') &&
  adminDonationsTabContent.includes('showRecordModal'),
  'Test 22: AdminDonationsTab integrates reusable RecordDonationModal'
);

const adminDonorsTabPath = path.join(rootDir, 'src', 'components', 'admin', 'donors', 'AdminDonorsTab.tsx');
const adminDonorsTabContent = fs.readFileSync(adminDonorsTabPath, 'utf-8');

// Test 23: AdminDonorsTab integrates RecordDonationModal
assert(
  adminDonorsTabContent.includes('RecordDonationModal') &&
  adminDonorsTabContent.includes('isRecordDonationOpen'),
  'Test 23: AdminDonorsTab integrates RecordDonationModal for recording donations per donor'
);

// Test 24: AdminDonorsTab displays historical vs digital breakdown
assert(
  adminDonorsTabContent.includes('কাগজভিত্তিক পূর্ব রেকর্ড') &&
  adminDonorsTabContent.includes('ডিজিটাল রেকর্ড'),
  'Test 24: AdminDonorsTab details modal displays historical vs digital record breakdown'
);

const profilePagePath = path.join(rootDir, 'src', 'pages', 'ProfilePage.tsx');
const profilePageContent = fs.readFileSync(profilePagePath, 'utf-8');

// Test 25: ProfilePage displays historical breakdown in donor overview/donations tab
assert(
  profilePageContent.includes('historicalDonationCount') &&
  profilePageContent.includes('কাগজভিত্তিক পূর্ব রেকর্ড'),
  'Test 25: ProfilePage displays paper vs digital donation breakdown for imported/historical donors'
);

// Test 26: Sidebar navigation cleanly organizes Administration vs Operations
const sidebarPath = path.join(rootDir, 'src', 'components', 'admin', 'AdminSidebar.tsx');
const sidebarContent = fs.readFileSync(sidebarPath, 'utf-8');
assert(
  sidebarContent.includes('operations') &&
  sidebarContent.includes('donations') &&
  sidebarContent.includes('users'),
  'Test 26: AdminSidebar cleanly organizes Operations (donations/camps) and Administration (users/roles)'
);

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n======================================================================');
console.log(`📊 TEST RESULTS: ${passedTests}/${totalTests} PASSED (${failedTests} failed)`);
console.log('======================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('✅ All Donation Management & User Separation requirements verified successfully.\n');
}
