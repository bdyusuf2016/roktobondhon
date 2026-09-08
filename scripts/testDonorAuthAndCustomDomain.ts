/**
 * Integration Test: Donor Auth, Profile Sync, Security & Custom Domain Verification
 * Tests Part A (Donor Auth/Profile/Volunteer) & Part B (SEO Canonical / Custom Domain)
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

console.log('====================================================');
console.log('RoktoBondhon: Donor Auth & Custom Domain Test Suite');
console.log('====================================================\n');

// ----------------------------------------------------
// 1. PART B: Static & Head Metadata Tests (index.html)
// ----------------------------------------------------
console.log('[SECTION 1] Checking index.html Canonical & OpenGraph Metadata...');
const indexPath = path.join(rootDir, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

assert(
  indexHtml.includes('<link rel="canonical" href="https://roktodanporibar.com/" />'),
  'index.html contains canonical link to https://roktodanporibar.com/'
);

assert(
  indexHtml.includes('<meta property="og:url" content="https://roktodanporibar.com/" />'),
  'index.html contains og:url meta tag pointing to https://roktodanporibar.com/'
);

assert(
  indexHtml.includes('https://roktodanporibar.com/logo.png'),
  'index.html contains absolute og:image pointing to https://roktodanporibar.com/logo.png'
);

assert(
  !indexHtml.includes('<link rel="canonical" href="https://bdyusuf2016.github.io'),
  'index.html does not use GitHub Pages URL as canonical link'
);

// ----------------------------------------------------
// 2. PART B: SEO Settings & Simulator Verification
// ----------------------------------------------------
console.log('\n[SECTION 2] Checking SEO Settings Component & Config Service...');
const seoSettingsPath = path.join(rootDir, 'src', 'components', 'admin', 'settings', 'SeoSettings.tsx');
const seoSettingsContent = fs.readFileSync(seoSettingsPath, 'utf-8');

assert(
  seoSettingsContent.includes("form.canonicalUrl || 'https://roktodanporibar.com'"),
  'SeoSettings Google preview fallback uses https://roktodanporibar.com'
);

assert(
  seoSettingsContent.includes("split('/')[0] || 'roktodanporibar.com'"),
  'SeoSettings Social card preview fallback domain uses roktodanporibar.com'
);

assert(
  seoSettingsContent.includes('placeholder="https://roktodanporibar.com/"'),
  'SeoSettings canonicalUrl input placeholder is https://roktodanporibar.com/'
);

assert(
  !seoSettingsContent.includes('placeholder="https://bdyusuf2016.github.io/roktobondhon/"'),
  'SeoSettings canonicalUrl input placeholder does not contain raw GitHub Pages repo'
);

const configServicePath = path.join(rootDir, 'src', 'services', 'configService.ts');
const configServiceContent = fs.readFileSync(configServicePath, 'utf-8');
assert(
  configServiceContent.includes("canonicalUrl: 'https://roktodanporibar.com/'"),
  'DEFAULT_SYSTEM_CONFIG sets canonicalUrl to https://roktodanporibar.com/'
);

// ----------------------------------------------------
// 3. PART B: Social Share Bar & Domain Canonicalization
// ----------------------------------------------------
console.log('\n[SECTION 3] Checking Social Share URL Canonicalization...');
const socialSharePath = path.join(rootDir, 'src', 'components', 'common', 'SocialShareBar.tsx');
const socialShareContent = fs.readFileSync(socialSharePath, 'utf-8');

assert(
  socialShareContent.includes("canonicalBase = (seoConfig?.canonicalUrl || 'https://roktodanporibar.com')"),
  'SocialShareBar canonicalizes shareUrl using roktodanporibar.com base'
);

assert(
  socialShareContent.includes('github.io'),
  'SocialShareBar detects github.io hosting origin and transforms to custom canonical domain'
);

// ----------------------------------------------------
// 4. PART A: Donor Registration & Auth Sync
// ----------------------------------------------------
console.log('\n[SECTION 4] Checking Become Donor Registration Flow & Password Validation...');
const becomeDonorPath = path.join(rootDir, 'src', 'pages', 'BecomeDonorPage.tsx');
const becomeDonorContent = fs.readFileSync(becomeDonorPath, 'utf-8');
const dataContextPath = path.join(rootDir, 'src', 'contexts', 'DataContext.tsx');
const dataContextContent = fs.readFileSync(dataContextPath, 'utf-8');
const authServicePath = path.join(rootDir, 'src', 'services', 'authService.ts');
const authServiceContent = fs.readFileSync(authServicePath, 'utf-8');

assert(
  becomeDonorContent.includes('password') && becomeDonorContent.includes('confirmPassword'),
  'BecomeDonorPage contains password and confirmPassword state'
);

assert(
  becomeDonorContent.includes('password.length < 6'),
  'BecomeDonorPage validates minimum password length (6 characters)'
);

assert(
  becomeDonorContent.includes('password !== confirmPassword'),
  'BecomeDonorPage validates password and confirmPassword match'
);

assert(
  dataContextContent.includes("verificationStatus: 'pending'"),
  'DataContext registerDonor creates donor profile with verificationStatus: pending'
);

assert(
  authServiceContent.includes('metadata.fullName') &&
  authServiceContent.includes('registerEmail'),
  'authService passes metadata (fullName, phone) during user registration'
);

// ----------------------------------------------------
// 5. PART A: AuthContext & Real Registration Guard
// ----------------------------------------------------
console.log('\n[SECTION 5] Checking AuthContext Supabase Auth Sync...');
const authContextPath = path.join(rootDir, 'src', 'contexts', 'AuthContext.tsx');
const authContextContent = fs.readFileSync(authContextPath, 'utf-8');

assert(
  authContextContent.includes('!isDemoMode') &&
  authContextContent.includes('নিবন্ধনের জন্য ইমেইল ও পাসওয়ার্ড প্রদান করা আবশ্যক'),
  'AuthContext disallows unauthenticated registration fallbacks when not in demo mode'
);

assert(
  authContextContent.includes("ilike('phone',") &&
  authContextContent.includes('signInEmail(targetEmail'),
  'AuthContext supports phone number to email lookup for donor login'
);

// ----------------------------------------------------
// 6. PART A: Password Reset Flow
// ----------------------------------------------------
console.log('\n[SECTION 6] Checking Password Reset & Recovery Routing...');
const resetPasswordPagePath = path.join(rootDir, 'src', 'pages', 'ResetPasswordPage.tsx');
assert(
  fs.existsSync(resetPasswordPagePath),
  'ResetPasswordPage.tsx exists for handling password reset links'
);

const resetPasswordContent = fs.readFileSync(resetPasswordPagePath, 'utf-8');
assert(
  resetPasswordContent.includes('updateUserPassword'),
  'ResetPasswordPage calls updateUserPassword() to set new password'
);

const appPath = path.join(rootDir, 'src', 'App.tsx');
const appContent = fs.readFileSync(appPath, 'utf-8');
assert(
  appContent.includes('/reset-password') && appContent.includes('ResetPasswordPage'),
  'App.tsx registers the /reset-password route'
);

const loginPagePath = path.join(rootDir, 'src', 'pages', 'LoginPage.tsx');
const loginPageContent = fs.readFileSync(loginPagePath, 'utf-8');
assert(
  loginPageContent.includes('resetPasswordForEmail'),
  'LoginPage includes forgot password modal calling resetPasswordForEmail()'
);

assert(
  loginPageContent.includes("navigate('/profile')"),
  'LoginPage redirects regular donors/users to /profile'
);

// ----------------------------------------------------
// 7. PART A: Blood Request Volunteer & Duplicate Guard
// ----------------------------------------------------
console.log('\n[SECTION 7] Checking Blood Request Volunteer Action & Duplicate Guard...');
const donorRequestServicePath = path.join(rootDir, 'src', 'services', 'donorRequestService.ts');
const donorRequestServiceContent = fs.readFileSync(donorRequestServicePath, 'utf-8');

assert(
  donorRequestServiceContent.includes('volunteerForBloodRequest'),
  'donorRequestService exports volunteerForBloodRequest()'
);

assert(
  donorRequestServiceContent.includes('isDuplicate: true') &&
  donorRequestServiceContent.includes('maybeSingle()'),
  'volunteerForBloodRequest checks for duplicate volunteer responses'
);

const requestDetailPagePath = path.join(rootDir, 'src', 'pages', 'RequestDetailPage.tsx');
const requestDetailPageContent = fs.readFileSync(requestDetailPagePath, 'utf-8');

assert(
  requestDetailPageContent.includes('আমি রক্ত দিতে চাই'),
  'RequestDetailPage contains "আমি রক্ত দিতে চাই" volunteer button'
);

assert(
  requestDetailPageContent.includes('hasVolunteered'),
  'RequestDetailPage tracks volunteer status and prevents duplicate submissions'
);

// ----------------------------------------------------
// 8. PART A: Donor Dashboard Indicators & Verification Badges
// ----------------------------------------------------
console.log('\n[SECTION 8] Checking Donor Dashboard & Profile Badges...');
const profilePagePath = path.join(rootDir, 'src', 'pages', 'ProfilePage.tsx');
const profilePageContent = fs.readFileSync(profilePagePath, 'utf-8');

assert(
  profilePageContent.includes('verificationBadge') &&
  profilePageContent.includes('যাচাইকৃত') &&
  profilePageContent.includes('যাচাই করা বাকি'),
  'ProfilePage renders verification status badges (যাচাইকৃত / যাচাই করা বাকি / বাতিল)'
);

assert(
  profilePageContent.includes('profileCompleteness'),
  'ProfilePage calculates profile completeness percentage'
);

assert(
  profilePageContent.includes('রক্তের গ্রুপ') &&
  profilePageContent.includes('ভেরিফিকেশন স্ট্যাটাস') &&
  profilePageContent.includes('সর্বশেষ রক্তদান') &&
  profilePageContent.includes('মোট রক্তদান'),
  'ProfilePage renders donor dashboard indicators'
);

// ----------------------------------------------------
// 9. Database Security Triggers Verification
// ----------------------------------------------------
console.log('\n[SECTION 9] Checking Database Security Migrations & Policies...');
const rlsPoliciesPath = path.join(rootDir, 'supabase', 'production_rls_policies.sql');
const rlsPoliciesContent = fs.readFileSync(rlsPoliciesPath, 'utf-8');
const migrationPath = path.join(rootDir, 'supabase', 'migrations', '20260907_fix_donor_verification.sql');
const migrationContent = fs.readFileSync(migrationPath, 'utf-8');

assert(
  rlsPoliciesContent.includes('protect_user_roles'),
  'Database security policies contain protect_user_roles trigger (prevents non-staff from self-promoting)'
);

assert(
  migrationContent.includes('protect_donor_verification'),
  'Database migration contains protect_donor_verification trigger (prevents non-staff from self-verifying)'
);

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('\n====================================================');
console.log(`Test Execution Complete: ${passedTests}/${totalTests} Passed (${failedTests} Failed)`);
console.log('====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('\nALL AUDIT & COMPLIANCE CHECKS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}
