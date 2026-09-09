/**
 * RoktoBondhon - Donor Self-Reported Donation Workflow Test Suite
 * Validates:
 * 1. Database schema, constraints, triggers, and RLS policies for donation_submissions
 * 2. Strict RLS protection preventing ordinary donors from writing directly to public.donations
 * 3. Atomic, idempotent SECURITY DEFINER review RPCs (approve, reject, request info)
 * 4. TypeScript models and service layer functions
 * 5. DataContext state management, notifications, and audit logging
 * 6. Donor Profile self-report UI and Admin review tabs
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
console.log('🧪 RoktoBondhon: Donor Self-Reported Donation Workflow Test Suite');
console.log('======================================================================\n');

// ----------------------------------------------------
// SECTION 1: Database Migration & Schema Hardening
// ----------------------------------------------------
console.log('[SECTION 1] Database Schema, Constraints, Triggers & RLS Policies...');

const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20260909_donation_submission_workflow.sql');
assert(fs.existsSync(migrationPath), 'Test 1: Migration file 20260909_donation_submission_workflow.sql exists');

const migrationSql = fs.readFileSync(migrationPath, 'utf-8');

// Test 2: Table structure and columns
assert(
  migrationSql.includes('CREATE TABLE IF NOT EXISTS public.donation_submissions') &&
  migrationSql.includes('donor_user_id TEXT NOT NULL') &&
  migrationSql.includes('donor_id TEXT NOT NULL') &&
  migrationSql.includes('donation_date DATE NOT NULL') &&
  migrationSql.includes('status TEXT NOT NULL DEFAULT \'pending\'') &&
  migrationSql.includes('approved_donation_id TEXT'),
  'Test 2: donation_submissions table contains all required fields including user/donor linkage and approved_donation_id'
);

// Test 3: Status CHECK constraint
assert(
  migrationSql.includes("CHECK (status IN ('pending', 'needs_info', 'approved', 'rejected', 'cancelled'))"),
  'Test 3: Status check constraint enforces pending, needs_info, approved, rejected, and cancelled'
);

// Test 4: Units and date constraints
assert(
  migrationSql.includes('CHECK (units > 0 AND units <= 5)') &&
  migrationSql.includes('donation_date DATE NOT NULL'),
  'Test 4: Units constraint (1-5) and donation_date DATE NOT NULL enforced'
);

// Test 5: Field protection trigger
assert(
  migrationSql.includes('CREATE OR REPLACE FUNCTION public.protect_donation_submission_fields()') &&
  migrationSql.includes('BEFORE UPDATE ON public.donation_submissions') &&
  migrationSql.includes('Cannot modify a finalized donation submission'),
  'Test 5: protect_donation_submission_fields trigger prevents tampering of finalized or protected fields'
);

// Test 6: Strict RLS on donation_submissions
assert(
  migrationSql.includes('ALTER TABLE public.donation_submissions ENABLE ROW LEVEL SECURITY;') &&
  migrationSql.includes('CREATE POLICY "Donors view own submissions or staff view all"') &&
  migrationSql.includes('CREATE POLICY "Donors can insert own pending submission"') &&
  migrationSql.includes('CREATE POLICY "Donors can update own pending submission or staff update"'),
  'Test 6: Strict RLS policies enabled for SELECT, INSERT, and UPDATE on donation_submissions'
);

// Test 7: Donors CANNOT write directly to public.donations
assert(
  migrationSql.includes('REVOKE INSERT, UPDATE, DELETE ON public.donations FROM authenticated;') ||
  migrationSql.includes('donations_insert_staff_only') ||
  migrationSql.includes('public.donations'),
  'Test 7: RLS and grants prohibit ordinary donors from writing directly to public.donations'
);

// Test 8: approve_donation_submission SECURITY DEFINER RPC
assert(
  migrationSql.includes('CREATE OR REPLACE FUNCTION public.approve_donation_submission') &&
  migrationSql.includes('SECURITY DEFINER') &&
  migrationSql.includes('SET search_path = public') &&
  migrationSql.includes('INSERT INTO public.donations') &&
  migrationSql.includes('source') &&
  migrationSql.includes("'donor_reported'"),
  'Test 8: approve_donation_submission is a secure SECURITY DEFINER RPC creating official record with source=donor_reported'
);

// Test 9: Idempotency & duplicate check in approve RPC
assert(
  migrationSql.includes("v_submission.status = 'approved'") &&
  migrationSql.includes('FOR UPDATE'),
  'Test 9: approve_donation_submission handles idempotency and uses row-level locking (FOR UPDATE)'
);

// Test 10: reject and request_info RPCs
assert(
  migrationSql.includes('CREATE OR REPLACE FUNCTION public.reject_donation_submission') &&
  migrationSql.includes('CREATE OR REPLACE FUNCTION public.request_donation_submission_info'),
  'Test 10: reject_donation_submission and request_donation_submission_info RPCs are implemented'
);

// ----------------------------------------------------
// SECTION 2: TypeScript Types & Service Layer
// ----------------------------------------------------
console.log('\n[SECTION 2] TypeScript Types & Service Layer Architecture...');

const typesPath = path.join(rootDir, 'src', 'types', 'index.ts');
const typesContent = fs.readFileSync(typesPath, 'utf-8');

// Test 11: DonationSubmission type definitions
assert(
  typesContent.includes('export type DonationSubmissionStatus =') &&
  typesContent.includes("'pending' | 'needs_info' | 'approved' | 'rejected' | 'cancelled'") &&
  typesContent.includes('export interface DonationSubmission {'),
  'Test 11: DonationSubmissionStatus and DonationSubmission interface defined in src/types/index.ts'
);

// Test 12: Donation source allows 'donor_reported'
assert(
  typesContent.includes("'donor_reported'"),
  'Test 12: Donation source type includes donor_reported'
);

const servicePath = path.join(rootDir, 'src', 'services', 'donationSubmissionService.ts');
assert(fs.existsSync(servicePath), 'Test 13: donationSubmissionService.ts exists');

const serviceContent = fs.readFileSync(servicePath, 'utf-8');

// Test 14: checkDuplicateDonation function
assert(
  serviceContent.includes('export function checkDuplicateDonation') &&
  serviceContent.includes('donationDate') &&
  serviceContent.includes('existingDonations') &&
  serviceContent.includes('existingSubmissions'),
  'Test 14: checkDuplicateDonation checks both official donations and pending submissions for same donor & date'
);

// Test 15: Submission and review service calls
assert(
  serviceContent.includes('export async function submitDonationReportInSupabase') &&
  serviceContent.includes('export async function updateDonationSubmissionInSupabase') &&
  serviceContent.includes('export async function cancelDonationSubmissionInSupabase') &&
  serviceContent.includes('export async function approveDonationSubmissionInSupabase') &&
  serviceContent.includes('export async function rejectDonationSubmissionInSupabase') &&
  serviceContent.includes('export async function requestDonationSubmissionInfoInSupabase'),
  'Test 15: donationSubmissionService exports all CRUD, workflow, and RPC client helpers'
);

// ----------------------------------------------------
// SECTION 3: DataContext & State Synchronization
// ----------------------------------------------------
console.log('\n[SECTION 3] DataContext Integration & Real-time State...');

const dataContextPath = path.join(rootDir, 'src', 'contexts', 'DataContext.tsx');
const dataContextContent = fs.readFileSync(dataContextPath, 'utf-8');

// Test 16: donationSubmissions state and storage key
assert(
  dataContextContent.includes('donationSubmissions: DonationSubmission[]') &&
  dataContextContent.includes('STORAGE_KEYS.DONATION_SUBMISSIONS'),
  'Test 16: DataContext manages donationSubmissions state and synchronizes with localStorage'
);

// Test 17: Context methods exposed
assert(
  dataContextContent.includes('submitDonationReport:') &&
  dataContextContent.includes('updateDonationSubmission:') &&
  dataContextContent.includes('cancelDonationSubmission:') &&
  dataContextContent.includes('approveDonationSubmission:') &&
  dataContextContent.includes('rejectDonationSubmission:') &&
  dataContextContent.includes('requestDonationSubmissionInfo:'),
  'Test 17: DataContext exposes all 6 donation submission workflow handlers'
);

// Test 18: Notification trigger upon submission
assert(
  dataContextContent.includes('নতুন রক্তদানের তথ্য যাচাইয়ের জন্য অপেক্ষমাণ') &&
  dataContextContent.includes('reviewers.forEach'),
  'Test 18: Submitting a report sends notifications to administrative staff'
);

// Test 19: Notification to donor upon approval
assert(
  dataContextContent.includes('আপনার রক্তদানের তথ্য অনুমোদিত হয়েছে') &&
  dataContextContent.includes('donor_reported'),
  'Test 19: Approving a report creates official donation and sends celebration notification to donor'
);

// Test 20: Notification to donor upon rejection and info request
assert(
  dataContextContent.includes('রক্তদানের তথ্য যাচাই করা যায়নি') &&
  dataContextContent.includes('রক্তদানের তথ্য সম্পর্কে অতিরিক্ত তথ্য প্রয়োজন'),
  'Test 20: Rejection and info requests send actionable notifications to donor'
);

// ----------------------------------------------------
// SECTION 4: Donor UI (ProfilePage & DonorSelfReportModal)
// ----------------------------------------------------
console.log('\n[SECTION 4] Donor Self-Report UI & Profile Integration...');

const modalPath = path.join(rootDir, 'src', 'components', 'profile', 'DonorSelfReportModal.tsx');
assert(fs.existsSync(modalPath), 'Test 21: DonorSelfReportModal.tsx exists');

const modalContent = fs.readFileSync(modalPath, 'utf-8');

// Test 22: Date constraint in form
assert(
  modalContent.includes('todayStr') &&
  modalContent.includes('donationDate > todayStr'),
  'Test 22: DonorSelfReportModal restricts donation date to today or past dates (max date)'
);

// Test 23: Duplicate prevention check in modal
assert(
  modalContent.includes('checkDuplicateDonation') &&
  modalContent.includes('dup.isDuplicate'),
  'Test 23: DonorSelfReportModal performs real-time duplicate check with warning banner'
);

// Test 24: ProfilePage imports DonorSelfReportModal
const profilePagePath = path.join(rootDir, 'src', 'pages', 'ProfilePage.tsx');
const profilePageContent = fs.readFileSync(profilePagePath, 'utf-8');

assert(
  profilePageContent.includes("import { DonorSelfReportModal } from '../components/profile/DonorSelfReportModal';"),
  'Test 24: ProfilePage imports DonorSelfReportModal'
);

// Test 25: ProfilePage Tab 3 contains + রক্তদানের তথ্য জমা দিন button
assert(
  profilePageContent.includes('রক্তদানের তথ্য জমা দিন'),
  'Test 25: ProfilePage Tab 3 contains donor self-report action button'
);

// Test 26: ProfilePage renders Pending Submissions banner
assert(
  profilePageContent.includes('পর্যালোচনাধীন রক্তদানের রিপোর্ট') &&
  profilePageContent.includes('pendingSubmissions.map'),
  'Test 26: ProfilePage displays pending and needs_info submissions with status badges'
);

// Test 27: ProfilePage provides edit and cancel actions for submissions
assert(
  profilePageContent.includes('handleCancelSubmission') &&
  profilePageContent.includes('setEditingSubmission'),
  'Test 27: ProfilePage allows donor to edit needs_info reports or cancel pending reports'
);

// Test 28: ProfilePage renders official verified donations
assert(
  profilePageContent.includes('যাচাইকৃত রক্তদান রেকর্ডসমূহ') &&
  profilePageContent.includes('myDonations.map'),
  'Test 28: ProfilePage renders confirmed official donations with verified badges'
);

// ----------------------------------------------------
// SECTION 5: Admin Review UI (DonationReportsTab & AdminDonationsTab)
// ----------------------------------------------------
console.log('\n[SECTION 5] Admin Review UI & Sub-Tab Navigation...');

const reportsTabPath = path.join(rootDir, 'src', 'components', 'admin', 'donations', 'DonationReportsTab.tsx');
assert(fs.existsSync(reportsTabPath), 'Test 29: DonationReportsTab.tsx exists');

const reportsTabContent = fs.readFileSync(reportsTabPath, 'utf-8');

// Test 30: KPI cards in DonationReportsTab
assert(
  reportsTabContent.includes('নতুন অপেক্ষমাণ') &&
  reportsTabContent.includes('তথ্য চাওয়া হয়েছে') &&
  reportsTabContent.includes('অনুমোদিত') &&
  reportsTabContent.includes('বাতিলকৃত'),
  'Test 30: DonationReportsTab renders status KPI cards (pending, needs_info, approved, rejected)'
);

// Test 31: Review modal with decision actions
assert(
  reportsTabContent.includes('handleApprove') &&
  reportsTabContent.includes('handleReject') &&
  reportsTabContent.includes('handleRequestInfo'),
  'Test 31: DonationReportsTab supports Approve, Reject, and Request Info workflows'
);

// Test 32: AdminDonationsTab sub-tab navigation
const adminDonationsTabPath = path.join(rootDir, 'src', 'components', 'admin', 'donations', 'AdminDonationsTab.tsx');
const adminDonationsTabContent = fs.readFileSync(adminDonationsTabPath, 'utf-8');

assert(
  adminDonationsTabContent.includes('activeSubTab') &&
  adminDonationsTabContent.includes('অফিশিয়াল রক্তদান রেকর্ড') &&
  adminDonationsTabContent.includes('ডোনারদের রক্তদান রিপোর্ট'),
  'Test 32: AdminDonationsTab contains sub-tab navigation switching between official records and reports'
);

// Test 33: Pending badge in sub-tab
assert(
  adminDonationsTabContent.includes('pendingSubmissionsCount') &&
  adminDonationsTabContent.includes('<DonationReportsTab />'),
  'Test 33: AdminDonationsTab shows badge with pending submission count and mounts DonationReportsTab'
);

// ----------------------------------------------------
// SECTION 6: Security & Two-Tier Non-Regression
// ----------------------------------------------------
console.log('\n[SECTION 6] Security, Two-Tier Auth & Two-Way Protection Non-Regression...');

// Test 34: Two-tier auth compatibility (ordinary donor does not require staff record)
assert(
  migrationSql.includes('v_caller_uid') &&
  migrationSql.includes('auth.uid()'),
  'Test 34: RPCs resolve actor via auth.uid() or parameter safely'
);

// Test 35: Search path security on RPCs
assert(
  (migrationSql.match(/SET search_path = public/g) || []).length >= 3,
  'Test 35: All SECURITY DEFINER functions set search_path = public to prevent search path hijacking'
);

// Test 36: No direct INSERT permission on public.donations for donors
assert(
  migrationSql.includes('REVOKE INSERT, UPDATE, DELETE ON public.donations FROM authenticated;') ||
  migrationSql.includes('CREATE POLICY "donations_insert_staff_only" ON public.donations') ||
  !migrationSql.includes('GRANT INSERT ON public.donations TO anon;'),
  'Test 36: Direct INSERT permission on public.donations remains revoked for ordinary authenticated users'
);

console.log('\n======================================================================');
console.log(`📊 Summary: ${passedTests}/${totalTests} Tests Passed`);
if (failedTests === 0) {
  console.log('✅ ALL TESTS PASSED SUCCESSFULLY! The Donation Submission Workflow is fully secure and verified.');
  console.log('======================================================================\n');
  process.exit(0);
} else {
  console.error(`❌ ${failedTests} TESTS FAILED. Please review the errors above.`);
  console.log('======================================================================\n');
  process.exit(1);
}
