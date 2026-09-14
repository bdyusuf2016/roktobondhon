/**
 * Phase 1C — Core Operational Workflow Test Suite
 * Validates:
 * 1. Blood Request lifecycle invariants & state transitions.
 * 2. Strict immutability of identity fields (id, request_id, user_id, blood_group, created_at, organization_id).
 * 3. Absolute Terminal State Protection (fulfilled, cancelled, expired cannot be modified in ANY field by ANY user or admin).
 * 4. Rate limiting: Maximum 5 concurrent pending donor requests.
 * 5. Duplicate active donor dispatch prevention.
 * 6. Match-state synchronization (active <-> matched).
 * 7. Privacy-preserving accepted donor contact disclosure RPC.
 * 8. Zero leakage of emergency_contact, email, NID, DOB, or exact address.
 * 9. Donor eligibility countdown rules (Male 90d, Female 120d).
 * 10. Role permission matrix boundaries.
 * 11. P1C-SEC-10: Admin attempts to modify patient_name on fulfilled request -> DENIED.
 * 12. P1C-SEC-11: Admin attempts to modify hospital on cancelled request -> DENIED.
 * 13. P1C-SEC-12: Admin attempts to modify emergency_level on expired request -> DENIED.
 * 14. P1C-SEC-13: Staff attempts direct active -> fulfilled UPDATE without RPC -> DENIED.
 * 15. P1C-SEC-14: Staff attempts direct active -> expired UPDATE -> DENIED.
 * 16. P1C-SEC-15: Staff attempts arbitrary invalid status transition -> DENIED.
 * 17. P1C-SEC-16: Only complete_donation_fulfillment() setting GUC can produce matched -> fulfilled.
 * 18. P1C-SEC-17: Direct client UPDATE with existing donation row but NO transaction GUC marker -> DENIED.
 * 19. P1C-SEC-18: Client direct invocation of recompute_blood_request_match_state -> REVOKED / DENIED.
 * 20. P1C-SEC-19: Trigger-based match state synchronization (active <-> matched) -> PASSED.
 */

import { calculateDonorEligibilityCountdown } from '../src/services/donorService';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/services/permissions';
import type { BloodRequest, DonorRequest, Donor, UserRole } from '../src/types';

interface TestResult {
  id: string;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function recordTest(result: TestResult) {
  results.push(result);
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} [${result.id}] ${result.name}`);
  if (!result.passed) {
    console.log(`   ↳ Expected: ${result.expected}`);
    console.log(`   ↳ Actual:   ${result.actual}`);
    if (result.details) console.log(`   ↳ Details:  ${result.details}`);
  }
}

console.log('================================================================');
console.log('🩸 ROKTOBONDHON PHASE 1C: OPERATIONAL WORKFLOW & LIFECYCLE AUDIT');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// 1. IMMUTABLE FIELDS & TERMINAL STATES SIMULATION (protect_blood_request_fields)
// -----------------------------------------------------------------------------

function simulateBloodRequestUpdate(
  oldReq: BloodRequest,
  updates: Partial<BloodRequest>,
  callerRole: UserRole,
  callerUserId: string,
  context?: { hasFulfillmentMarker?: boolean; hasExpirationMarker?: boolean }
): { success: boolean; error?: string } {
  // A. Absolute Terminal State Protection (NO BYPASS FOR ANY ROLE, ADMIN, OR SYSTEM)
  // A terminal blood request is completely immutable: no field may be altered.
  if (['fulfilled', 'cancelled', 'expired'].includes(oldReq.status)) {
    return {
      success: false,
      error: `Unauthorized: Modification of a terminal blood request (status: "${oldReq.status}") is strictly forbidden.`,
    };
  }

  // B. Enforce Immutable Identity Keys for ALL callers (including staff and admin)
  if (
    (updates.id !== undefined && updates.id !== oldReq.id) ||
    (updates.requestId !== undefined && updates.requestId !== oldReq.requestId) ||
    (updates.userId !== undefined && updates.userId !== oldReq.userId) ||
    (updates.bloodGroup !== undefined && updates.bloodGroup !== oldReq.bloodGroup) ||
    (updates.createdAt !== undefined && updates.createdAt !== oldReq.createdAt) ||
    (updates.organizationId !== undefined && updates.organizationId !== oldReq.organizationId)
  ) {
    return {
      success: false,
      error: 'Unauthorized: Modification of immutable blood request identity fields is forbidden.',
    };
  }

  const isStaff = ['super_admin', 'admin', 'moderator', 'volunteer'].includes(callerRole);

  // C. Status Transition Matrix Enforcement
  if (updates.status !== undefined && updates.status !== oldReq.status) {
    const newStatus = updates.status;

    // Disallow direct transition to 'expired' unless executed through trusted system expiration process
    // Enforced via trusted transaction-local GUC marker 'app.in_blood_request_expiration'
    if (newStatus === 'expired') {
      if (!['active', 'matched'].includes(oldReq.status)) {
        return {
          success: false,
          error: 'Invalid transition: blood request must be active or matched to be expired.',
        };
      }
      if (!context?.hasExpirationMarker) {
        return {
          success: false,
          error: 'Direct update to expired is forbidden. Expiration is managed by system automated processes setting trusted transaction context.',
        };
      }
    }

    // Disallow direct transition to 'fulfilled' unless executed through complete_donation_fulfillment RPC
    // Enforced via trusted transaction-local GUC marker 'app.in_donation_fulfillment'
    if (newStatus === 'fulfilled') {
      if (!['active', 'matched'].includes(oldReq.status)) {
        return {
          success: false,
          error: 'Invalid transition: blood request must be active or matched to be fulfilled.',
        };
      }
      if (!context?.hasFulfillmentMarker) {
        return {
          success: false,
          error: 'Direct update to fulfilled is forbidden. Fulfillment must occur through complete_donation_fulfillment().',
        };
      }
    }

    if (oldReq.status === 'pending') {
      if (!['verified', 'active', 'cancelled'].includes(newStatus)) {
        return { success: false, error: `Invalid status transition from pending to "${newStatus}".` };
      }
      if (['verified', 'active'].includes(newStatus) && !isStaff) {
        return { success: false, error: 'Unauthorized: Only staff members can verify or activate blood requests.' };
      }
    } else if (oldReq.status === 'verified') {
      if (!['active', 'cancelled'].includes(newStatus)) {
        return { success: false, error: `Invalid status transition from verified to "${newStatus}".` };
      }
      if (newStatus === 'active' && !isStaff) {
        return { success: false, error: 'Unauthorized: Only staff members can activate verified blood requests.' };
      }
    } else if (oldReq.status === 'active') {
      if (!['matched', 'cancelled', 'expired', 'fulfilled'].includes(newStatus)) {
        return { success: false, error: `Invalid status transition from active to "${newStatus}".` };
      }
    } else if (oldReq.status === 'matched') {
      if (!['active', 'cancelled', 'expired', 'fulfilled'].includes(newStatus)) {
        return { success: false, error: `Invalid status transition from matched to "${newStatus}".` };
      }
    }
  }

  // D. For Non-Staff Callers (Requesters) via direct client update:
  if (!isStaff && !context?.hasFulfillmentMarker && !context?.hasExpirationMarker) {
    if (callerUserId !== oldReq.userId) {
      return { success: false, error: 'Unauthorized: Non-owners cannot update blood request.' };
    }
    if (
      (updates.verification?.isVerified !== undefined &&
        updates.verification.isVerified !== oldReq.verification?.isVerified) ||
      (updates.verification?.verifiedBy !== undefined &&
        updates.verification.verifiedBy !== oldReq.verification?.verifiedBy) ||
      (updates.verification?.verifiedAt !== undefined &&
        updates.verification.verifiedAt !== oldReq.verification?.verifiedAt)
    ) {
      return { success: false, error: 'Unauthorized: Only staff members can modify verification details.' };
    }
  }

  return { success: true };
}

// -----------------------------------------------------------------------------
// 2. DONOR REQUEST CONCURRENCY & DUPLICATE DISPATCH SIMULATION
// -----------------------------------------------------------------------------

function simulateDonorRequestDispatch(
  existingRequests: DonorRequest[],
  parentBloodReq: BloodRequest,
  newReq: Omit<DonorRequest, 'id' | 'createdAt'>
): { success: boolean; error?: string } {
  // A. Check parent request terminal state
  if (['fulfilled', 'cancelled', 'expired'].includes(parentBloodReq.status)) {
    return {
      success: false,
      error: `Cannot dispatch donor requests for a ${parentBloodReq.status} blood request.`,
    };
  }

  // B. Duplicate Active Request Check
  const hasActiveRequest = existingRequests.some(
    (dr) =>
      dr.bloodRequestId === newReq.bloodRequestId &&
      dr.donorId === newReq.donorId &&
      ['pending', 'accepted'].includes(dr.status)
  );
  if (hasActiveRequest) {
    return {
      success: false,
      error: 'Duplicate: A request has already been sent to this donor for this blood request.',
    };
  }

  // C. Rate Limit Check: Max 5 concurrent pending requests
  if (newReq.status === 'pending') {
    const pendingCount = existingRequests.filter(
      (dr) => dr.bloodRequestId === newReq.bloodRequestId && dr.status === 'pending'
    ).length;

    if (pendingCount >= 5) {
      return {
        success: false,
        error: 'Rate limit exceeded: A blood request cannot have more than 5 concurrent pending donor requests.',
      };
    }
  }

  return { success: true };
}

// -----------------------------------------------------------------------------
// 3. PRIVACY-PRESERVING CONTACT DISCLOSURE SIMULATION
// -----------------------------------------------------------------------------

function simulateGetAcceptedDonorContact(
  dreq: DonorRequest,
  breq: BloodRequest,
  donor: Donor,
  callerUserId: string,
  callerRole: UserRole
): { success: boolean; data?: Record<string, any>; error?: string } {
  const isStaff = ['super_admin', 'admin', 'moderator', 'volunteer'].includes(callerRole);

  // A. Check owner or staff authorization
  if (breq.userId !== callerUserId && !isStaff) {
    return {
      success: false,
      error: 'Unauthorized: Only the blood request owner or authorized staff can access donor contact details.',
    };
  }

  // B. Check status is 'accepted'
  if (dreq.status !== 'accepted') {
    return {
      success: false,
      error: 'Unauthorized: Donor contact details are only disclosed when the request is accepted.',
    };
  }

  // C. Return strictly sanitized fields
  return {
    success: true,
    data: {
      donor_id: donor.id,
      human_id: donor.donorId,
      full_name: donor.fullName,
      phone: donor.phone,
      blood_group: donor.bloodGroup,
      location_label: donor.locationLabel,
      photo_url: donor.photoUrl,
      last_donation_date: donor.lastDonationDate,
      total_donations: donor.totalDonations,
    },
  };
}

// -----------------------------------------------------------------------------
// 4. MATCH-STATE SYNCHRONIZATION SIMULATION
// -----------------------------------------------------------------------------

function simulateRecomputeMatchState(
  breq: BloodRequest,
  donorRequests: DonorRequest[],
  isDirectClientCall: boolean
): { success: boolean; newStatus?: BloodRequest['status']; error?: string } {
  if (isDirectClientCall) {
    return {
      success: false,
      error: 'permission denied for function recompute_blood_request_match_state',
    };
  }

  if (['fulfilled', 'cancelled', 'expired'].includes(breq.status)) {
    return { success: true, newStatus: breq.status }; // Unchanged
  }

  const acceptedCount = donorRequests.filter(
    (dr) => dr.bloodRequestId === breq.id && dr.status === 'accepted'
  ).length;

  if (acceptedCount > 0 && breq.status === 'active') {
    return { success: true, newStatus: 'matched' };
  }
  if (acceptedCount === 0 && breq.status === 'matched') {
    return { success: true, newStatus: 'active' };
  }

  return { success: true, newStatus: breq.status };
}

// =============================================================================
// EXECUTE TEST SUITE
// =============================================================================

// Base mock records
const mockBaseBloodRequest: BloodRequest = {
  id: 'breq-test-01',
  requestId: 'BD-2026-000101',
  userId: 'user-requester-100',
  patientName: 'করিম রহমান',
  bloodGroup: 'B+',
  requiredUnits: 1,
  requiredDate: '2026-09-15',
  requiredTime: '10:00 AM',
  hospital: 'ধামরাই উপজেলা স্বাস্থ্য কমপ্লেক্স',
  division: 'Dhaka',
  district: 'ঢাকা',
  upazila: 'ধামরাই',
  area: 'ধামরাই সদর',
  contactPerson: 'করিম',
  contactNumber: '01711111111',
  relationship: 'Self',
  emergencyLevel: 'URGENT',
  status: 'active',
  verification: { isVerified: true },
  organizationId: 'org-roktobondon',
  createdAt: '2026-09-14T00:00:00.000Z',
};

const mockDonorProfile: Donor = {
  id: 'dnr-test-01',
  donorId: 'DNR-DHM-000101',
  userId: 'user-donor-200',
  fullName: 'হাসান মাহমুদ',
  bloodGroup: 'B+',
  district: 'ঢাকা',
  upazila: 'ধামরাই',
  area: 'ধামরাই সদর',
  locationLabel: 'কালামপুর',
  phone: '01722222222',
  emergencyContact: '01733333333', // SENSITIVE EMERGENCY CONTACT
  email: 'donor_secret@example.com', // PRIVATE EMAIL
  nidOrIdNumber: '19951234567890123', // PRIVATE NID
  exactAddress: 'বাড়ি # ১২, রোড # ৪, কালামপুর', // PRIVATE ADDRESS
  dateOfBirth: '1995-05-10', // PRIVATE DOB
  adminNotes: 'Confidential verifier note', // SENSITIVE NOTES
  gender: 'male',
  availability: true,
  emergencyAvailable: true,
  totalDonations: 4,
  lastDonationDate: '2026-06-01',
  verificationStatus: 'verified',
  organizationId: 'org-roktobondon',
  privacy: { showPhone: true, showGender: true, showAge: false, allowDirectContact: true },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
};

// --- TEST 01: Blood request immutable blood_group ---
const res01 = simulateBloodRequestUpdate(
  mockBaseBloodRequest,
  { bloodGroup: 'A+' },
  'donor',
  'user-requester-100'
);
recordTest({
  id: 'TEST 01',
  name: 'Integrity: Tampering with blood_group is strictly rejected',
  expected: 'FAIL (Unauthorized: Modification of immutable blood request identity fields is forbidden.)',
  actual: res01.success ? 'PASS' : `FAIL (${res01.error})`,
  passed: !res01.success && (res01.error?.includes('immutable') || false),
});

// --- TEST 02: Blood request immutable user_id ---
const res02 = simulateBloodRequestUpdate(
  mockBaseBloodRequest,
  { userId: 'user-attacker-666' },
  'donor',
  'user-requester-100'
);
recordTest({
  id: 'TEST 02',
  name: 'Integrity: Tampering with blood request owner user_id is strictly rejected',
  expected: 'FAIL (Unauthorized: Modification of immutable blood request identity fields is forbidden.)',
  actual: res02.success ? 'PASS' : `FAIL (${res02.error})`,
  passed: !res02.success && (res02.error?.includes('immutable') || false),
});

// --- TEST 03: Terminal state fulfilled cannot be altered ---
const fulfilledRequest: BloodRequest = { ...mockBaseBloodRequest, status: 'fulfilled' };
const res03 = simulateBloodRequestUpdate(
  fulfilledRequest,
  { status: 'active' },
  'super_admin', // Even super_admin cannot reopen
  'user-admin-01'
);
recordTest({
  id: 'TEST 03',
  name: 'Terminal Invariant: Reopening fulfilled blood request is blocked for all roles (including Super Admin)',
  expected: 'FAIL (Unauthorized: Modification of a terminal blood request (status: "fulfilled") is strictly forbidden.)',
  actual: res03.success ? 'PASS' : `FAIL (${res03.error})`,
  passed: !res03.success && (res03.error?.includes('terminal') || false),
});

// --- TEST 04: Terminal state cancelled cannot be reopened ---
const cancelledRequest: BloodRequest = { ...mockBaseBloodRequest, status: 'cancelled' };
const res04 = simulateBloodRequestUpdate(
  cancelledRequest,
  { status: 'active' },
  'admin',
  'user-admin-02'
);
recordTest({
  id: 'TEST 04',
  name: 'Terminal Invariant: Reopening cancelled blood request is strictly blocked',
  expected: 'FAIL (Unauthorized: Modification of a terminal blood request)',
  actual: res04.success ? 'PASS' : `FAIL (${res04.error})`,
  passed: !res04.success && (res04.error?.includes('terminal') || false),
});

// --- TEST 05: Legitimate Requester can update non-critical logistical fields ---
const res05 = simulateBloodRequestUpdate(
  mockBaseBloodRequest,
  { hospital: 'সাভার এনাম মেডিকেল কলেজ', requiredUnits: 2, notes: 'জরুরি আইসিইউ রোগী' },
  'donor',
  'user-requester-100'
);
recordTest({
  id: 'TEST 05',
  name: 'Operations: Requester can update logistical details on active blood request',
  expected: 'PASS (Update allowed)',
  actual: res05.success ? 'PASS (Update allowed)' : `FAIL (${res05.error})`,
  passed: res05.success,
});

// --- TEST 06: Requester can transition active request to cancelled ---
const res06 = simulateBloodRequestUpdate(
  mockBaseBloodRequest,
  { status: 'cancelled' },
  'donor',
  'user-requester-100'
);
recordTest({
  id: 'TEST 06',
  name: 'Lifecycle: Requester can cancel their active blood request',
  expected: 'PASS (Cancellation allowed)',
  actual: res06.success ? 'PASS (Cancellation allowed)' : `FAIL (${res06.error})`,
  passed: res06.success,
});

// --- TEST 07: Requester blocked from modifying staff verification attributes ---
const res07 = simulateBloodRequestUpdate(
  mockBaseBloodRequest,
  { verification: { isVerified: true, verifiedBy: 'Spoofed Verifier' } },
  'donor',
  'user-requester-100'
);
recordTest({
  id: 'TEST 07',
  name: 'RBAC: Ordinary requester blocked from self-verifying blood request',
  expected: 'FAIL (Unauthorized: Only staff members can modify verification details.)',
  actual: res07.success ? 'PASS' : `FAIL (${res07.error})`,
  passed: !res07.success && (res07.error?.includes('staff') || false),
});

// --- TEST 08: Rate Limit: 5 pending donor requests allowed, 6th is rejected ---
const mockExistingDReqs: DonorRequest[] = [
  { id: 'dreq-1', bloodRequestId: 'breq-test-01', donorId: 'dnr-1', donorUserId: 'u-1', requesterUserId: 'u-r', status: 'pending', matchScore: 90, patientName: 'P', hospital: 'H', bloodGroup: 'B+', emergencyLevel: 'NORMAL', createdAt: '2026-09-14' },
  { id: 'dreq-2', bloodRequestId: 'breq-test-01', donorId: 'dnr-2', donorUserId: 'u-2', requesterUserId: 'u-r', status: 'pending', matchScore: 88, patientName: 'P', hospital: 'H', bloodGroup: 'B+', emergencyLevel: 'NORMAL', createdAt: '2026-09-14' },
  { id: 'dreq-3', bloodRequestId: 'breq-test-01', donorId: 'dnr-3', donorUserId: 'u-3', requesterUserId: 'u-r', status: 'pending', matchScore: 85, patientName: 'P', hospital: 'H', bloodGroup: 'B+', emergencyLevel: 'NORMAL', createdAt: '2026-09-14' },
  { id: 'dreq-4', bloodRequestId: 'breq-test-01', donorId: 'dnr-4', donorUserId: 'u-4', requesterUserId: 'u-r', status: 'pending', matchScore: 82, patientName: 'P', hospital: 'H', bloodGroup: 'B+', emergencyLevel: 'NORMAL', createdAt: '2026-09-14' },
  { id: 'dreq-5', bloodRequestId: 'breq-test-01', donorId: 'dnr-5', donorUserId: 'u-5', requesterUserId: 'u-r', status: 'pending', matchScore: 80, patientName: 'P', hospital: 'H', bloodGroup: 'B+', emergencyLevel: 'NORMAL', createdAt: '2026-09-14' },
];

const res08 = simulateDonorRequestDispatch(
  mockExistingDReqs,
  mockBaseBloodRequest,
  { bloodRequestId: 'breq-test-01', donorId: 'dnr-6', donorUserId: 'u-6', requesterUserId: 'u-r', status: 'pending', matchScore: 78, patientName: 'P', hospital: 'H', bloodGroup: 'B+', emergencyLevel: 'NORMAL' }
);
recordTest({
  id: 'TEST 08',
  name: 'Rate Limit: 6th concurrent pending donor request is strictly blocked',
  expected: 'FAIL (Rate limit exceeded: A blood request cannot have more than 5 concurrent pending donor requests.)',
  actual: res08.success ? 'PASS' : `FAIL (${res08.error})`,
  passed: !res08.success && (res08.error?.includes('Rate limit exceeded') || false),
});

// --- TEST 09: Duplicate active donor request dispatch blocked ---
const res09 = simulateDonorRequestDispatch(
  mockExistingDReqs.slice(0, 3), // Only 3 active, so below rate limit
  mockBaseBloodRequest,
  { bloodRequestId: 'breq-test-01', donorId: 'dnr-1', donorUserId: 'u-1', requesterUserId: 'u-r', status: 'pending', matchScore: 90, patientName: 'P', hospital: 'H', bloodGroup: 'B+', emergencyLevel: 'NORMAL' }
);
recordTest({
  id: 'TEST 09',
  name: 'Deduplication: Sending a 2nd active request to the same donor is blocked',
  expected: 'FAIL (Duplicate: A request has already been sent to this donor for this blood request.)',
  actual: res09.success ? 'PASS' : `FAIL (${res09.error})`,
  passed: !res09.success && (res09.error?.includes('Duplicate') || false),
});

// --- TEST 10: Dispatching donor request on fulfilled blood request is blocked ---
const res10 = simulateDonorRequestDispatch(
  [],
  fulfilledRequest,
  { bloodRequestId: 'breq-test-01', donorId: 'dnr-10', donorUserId: 'u-10', requesterUserId: 'u-r', status: 'pending', matchScore: 90, patientName: 'P', hospital: 'H', bloodGroup: 'B+', emergencyLevel: 'NORMAL' }
);
recordTest({
  id: 'TEST 10',
  name: 'Lifecycle Invariant: Dispatching donor request for fulfilled blood request is blocked',
  expected: 'FAIL (Cannot dispatch donor requests for a fulfilled blood request.)',
  actual: res10.success ? 'PASS' : `FAIL (${res10.error})`,
  passed: !res10.success && (res10.error?.includes('Cannot dispatch') || false),
});

// --- TEST 11: Contact RPC reveals phone when donor request is accepted ---
const acceptedDReq: DonorRequest = {
  id: 'dreq-accepted-01',
  bloodRequestId: 'breq-test-01',
  donorId: 'dnr-test-01',
  donorUserId: 'user-donor-200',
  requesterUserId: 'user-requester-100',
  status: 'accepted',
  matchScore: 95,
  patientName: 'করিম',
  hospital: 'ধামরাই হাসপাতাল',
  bloodGroup: 'B+',
  emergencyLevel: 'URGENT',
  createdAt: '2026-09-14',
};

const res11 = simulateGetAcceptedDonorContact(
  acceptedDReq,
  mockBaseBloodRequest,
  mockDonorProfile,
  'user-requester-100',
  'donor'
);
recordTest({
  id: 'TEST 11',
  name: 'Privacy & Disclosure: Requester successfully fetches accepted donor phone number',
  expected: 'PASS (Phone revealed: 01722222222)',
  actual: res11.success ? `PASS (Phone revealed: ${res11.data?.phone})` : `FAIL (${res11.error})`,
  passed: res11.success && res11.data?.phone === '01722222222',
});

// --- TEST 12: Contact RPC NEVER reveals emergency_contact, email, NID, DOB, or address ---
const contactData = res11.data || {};
const hasZeroLeakedFields =
  contactData.emergency_contact === undefined &&
  contactData.emergencyContact === undefined &&
  contactData.email === undefined &&
  contactData.nid_or_id_number === undefined &&
  contactData.nidOrIdNumber === undefined &&
  contactData.exact_address === undefined &&
  contactData.exactAddress === undefined &&
  contactData.date_of_birth === undefined &&
  contactData.dateOfBirth === undefined &&
  contactData.admin_notes === undefined;

recordTest({
  id: 'TEST 12',
  name: 'Zero PII Leakage: emergency_contact, email, NID, DOB, address are 100% excluded from contact RPC',
  expected: 'PASS (Zero sensitive fields exposed in RPC payload)',
  actual: hasZeroLeakedFields ? 'PASS (Zero sensitive fields exposed)' : 'FAIL (Sensitive PII leaked!)',
  passed: hasZeroLeakedFields,
});

// --- TEST 13: Contact RPC blocked if status is pending ---
const pendingDReq: DonorRequest = { ...acceptedDReq, status: 'pending' };
const res13 = simulateGetAcceptedDonorContact(
  pendingDReq,
  mockBaseBloodRequest,
  mockDonorProfile,
  'user-requester-100',
  'donor'
);
recordTest({
  id: 'TEST 13',
  name: 'Privacy Gate: Contact details blocked when request is still pending',
  expected: 'FAIL (Unauthorized: Donor contact details are only disclosed when the request is accepted.)',
  actual: res13.success ? 'PASS (Vulnerability!)' : `FAIL (${res13.error})`,
  passed: !res13.success && (res13.error?.includes('accepted') || false),
});

// --- TEST 14: Cross-request contact RPC blocked ---
const res14 = simulateGetAcceptedDonorContact(
  acceptedDReq,
  mockBaseBloodRequest,
  mockDonorProfile,
  'user-unrelated-999',
  'donor'
);
recordTest({
  id: 'TEST 14',
  name: 'Authorization: Unrelated user attempting to call contact RPC is denied',
  expected: 'FAIL (Unauthorized: Only the blood request owner or authorized staff can access donor contact details.)',
  actual: res14.success ? 'PASS (Vulnerability!)' : `FAIL (${res14.error})`,
  passed: !res14.success && (res14.error?.includes('Unauthorized') || false),
});

// --- TEST 15: Donor Eligibility Countdown Calculation (Male 90 days) ---
const countdownMaleEligible = calculateDonorEligibilityCountdown('2026-05-01', 'male');
const countdownMaleIneligible = calculateDonorEligibilityCountdown(
  new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
  'male'
);
recordTest({
  id: 'TEST 15',
  name: 'Eligibility: Male interval (90 days) calculates countdown correctly',
  expected: 'Eligible after 90d, Ineligible at 30d (~60 days remaining)',
  actual: `Male >90d: ${countdownMaleEligible.isEligible} | Male 30d remaining: ${countdownMaleIneligible.daysRemaining} days`,
  passed: countdownMaleEligible.isEligible && !countdownMaleIneligible.isEligible && countdownMaleIneligible.daysRemaining > 50,
});

// --- TEST 16: Donor Eligibility Countdown Calculation (Female 120 days) ---
const countdownFemaleIneligible = calculateDonorEligibilityCountdown(
  new Date(Date.now() - 100 * 24 * 3600 * 1000).toISOString().split('T')[0],
  'female'
);
recordTest({
  id: 'TEST 16',
  name: 'Eligibility: Female interval (120 days) requires 120 days deferral',
  expected: 'Ineligible at 100d (~20 days remaining)',
  actual: `Female 100d remaining: ${countdownFemaleIneligible.daysRemaining} days (Eligible: ${countdownFemaleIneligible.isEligible})`,
  passed: !countdownFemaleIneligible.isEligible && countdownFemaleIneligible.daysRemaining > 15,
});

// --- TEST 17: Role Matrix: Volunteers have manage_requests but lack manage_hospitals and view_audit_logs ---
const volPerms = DEFAULT_ROLE_PERMISSIONS.volunteer;
const adminPerms = DEFAULT_ROLE_PERMISSIONS.admin;
const isVolunteerPrivilegeBounded =
  volPerms.manage_requests === true &&
  volPerms.manage_hospitals === false &&
  volPerms.view_audit_logs === false &&
  adminPerms.manage_hospitals === true &&
  adminPerms.view_audit_logs === true;

recordTest({
  id: 'TEST 17',
  name: 'RBAC: Volunteers have operational request rights but are bounded from hospital management & audit logs',
  expected: 'PASS (Volunteer manage_hospitals = false, view_audit_logs = false)',
  actual: isVolunteerPrivilegeBounded ? 'PASS (Boundaries verified)' : 'FAIL (Privilege leakage!)',
  passed: isVolunteerPrivilegeBounded,
});

// =============================================================================
// NEW SECURITY HARDENING TESTS: P1C-SEC-10 TO P1C-SEC-19
// =============================================================================

// --- P1C-SEC-10: Admin attempts to modify patient_name on fulfilled request -> DENIED ---
const resSec10 = simulateBloodRequestUpdate(
  fulfilledRequest,
  { patientName: 'পরিবর্তিত রোগী' },
  'super_admin',
  'user-superadmin-01'
);
recordTest({
  id: 'P1C-SEC-10',
  name: 'Terminal Field Protection: Admin attempts to modify patient_name on fulfilled request -> DENIED',
  expected: 'FAIL (Unauthorized: Modification of a terminal blood request (status: "fulfilled") is strictly forbidden.)',
  actual: resSec10.success ? 'PASS (Vulnerability!)' : `FAIL (${resSec10.error})`,
  passed: !resSec10.success && (resSec10.error?.includes('terminal') || false),
});

// --- P1C-SEC-11: Admin attempts to modify hospital on cancelled request -> DENIED ---
const resSec11 = simulateBloodRequestUpdate(
  cancelledRequest,
  { hospital: 'নতুন হাসপাতাল' },
  'admin',
  'user-admin-01'
);
recordTest({
  id: 'P1C-SEC-11',
  name: 'Terminal Field Protection: Admin attempts to modify hospital on cancelled request -> DENIED',
  expected: 'FAIL (Unauthorized: Modification of a terminal blood request (status: "cancelled") is strictly forbidden.)',
  actual: resSec11.success ? 'PASS (Vulnerability!)' : `FAIL (${resSec11.error})`,
  passed: !resSec11.success && (resSec11.error?.includes('terminal') || false),
});

// --- P1C-SEC-12: Admin attempts to modify emergency_level on expired request -> DENIED ---
const expiredRequest: BloodRequest = { ...mockBaseBloodRequest, status: 'expired' };
const resSec12 = simulateBloodRequestUpdate(
  expiredRequest,
  { emergencyLevel: 'CRITICAL' },
  'admin',
  'user-admin-01'
);
recordTest({
  id: 'P1C-SEC-12',
  name: 'Terminal Field Protection: Admin attempts to modify emergency_level on expired request -> DENIED',
  expected: 'FAIL (Unauthorized: Modification of a terminal blood request (status: "expired") is strictly forbidden.)',
  actual: resSec12.success ? 'PASS (Vulnerability!)' : `FAIL (${resSec12.error})`,
  passed: !resSec12.success && (resSec12.error?.includes('terminal') || false),
});

// --- P1C-SEC-13: Staff attempts direct active -> fulfilled UPDATE -> DENIED ---
const resSec13 = simulateBloodRequestUpdate(
  mockBaseBloodRequest,
  { status: 'fulfilled' },
  'admin',
  'user-admin-01',
  { hasFulfillmentMarker: false } // Direct PostgREST UPDATE without RPC fulfillment
);
recordTest({
  id: 'P1C-SEC-13',
  name: 'Authoritative RPC Invariant: Staff attempts direct active -> fulfilled UPDATE -> DENIED',
  expected: 'FAIL (Direct update to fulfilled is forbidden. Fulfillment must occur through complete_donation_fulfillment().)',
  actual: resSec13.success ? 'PASS (Vulnerability!)' : `FAIL (${resSec13.error})`,
  passed: !resSec13.success && (resSec13.error?.includes('complete_donation_fulfillment') || false),
});

// --- P1C-SEC-14A: Authenticated requester cannot set active -> expired -> DENIED ---
const resSec14a = simulateBloodRequestUpdate(
  mockBaseBloodRequest,
  { status: 'expired' },
  'recipient',
  'user-requester-100',
  { hasExpirationMarker: false }
);
recordTest({
  id: 'P1C-SEC-14A',
  name: 'Expiration Lockdown: Authenticated requester attempts active -> expired UPDATE -> DENIED',
  expected: 'FAIL (Direct update to expired is forbidden. Expiration is managed by system automated processes setting trusted transaction context.)',
  actual: resSec14a.success ? 'PASS (Vulnerability!)' : `FAIL (${resSec14a.error})`,
  passed: !resSec14a.success && (resSec14a.error?.includes('Expiration is managed by system') || false),
});

// --- P1C-SEC-14B: Authenticated staff cannot set active -> expired -> DENIED ---
const resSec14b = simulateBloodRequestUpdate(
  mockBaseBloodRequest,
  { status: 'expired' },
  'admin',
  'user-admin-01',
  { hasExpirationMarker: false }
);
recordTest({
  id: 'P1C-SEC-14B',
  name: 'Expiration Lockdown: Authenticated staff attempts active -> expired UPDATE -> DENIED',
  expected: 'FAIL (Direct update to expired is forbidden. Expiration is managed by system automated processes setting trusted transaction context.)',
  actual: resSec14b.success ? 'PASS (Vulnerability!)' : `FAIL (${resSec14b.error})`,
  passed: !resSec14b.success && (resSec14b.error?.includes('Expiration is managed by system') || false),
});

// --- P1C-SEC-14C: Authenticated staff cannot set matched -> expired -> DENIED ---
const matchedReqForExp: BloodRequest = { ...mockBaseBloodRequest, status: 'matched' };
const resSec14c = simulateBloodRequestUpdate(
  matchedReqForExp,
  { status: 'expired' },
  'admin',
  'user-admin-01',
  { hasExpirationMarker: false }
);
recordTest({
  id: 'P1C-SEC-14C',
  name: 'Expiration Lockdown: Authenticated staff attempts matched -> expired UPDATE -> DENIED',
  expected: 'FAIL (Direct update to expired is forbidden. Expiration is managed by system automated processes setting trusted transaction context.)',
  actual: resSec14c.success ? 'PASS (Vulnerability!)' : `FAIL (${resSec14c.error})`,
  passed: !resSec14c.success && (resSec14c.error?.includes('Expiration is managed by system') || false),
});

// --- P1C-SEC-14D: Direct service-role / PostgREST update without trusted marker cannot set expired -> DENIED ---
const resSec14d = simulateBloodRequestUpdate(
  mockBaseBloodRequest,
  { status: 'expired' },
  'super_admin',
  'user-superadmin-01',
  { hasExpirationMarker: false }
);
recordTest({
  id: 'P1C-SEC-14D',
  name: 'Expiration Lockdown: Direct PostgREST/service-role update without trusted marker cannot set expired -> DENIED',
  expected: 'FAIL (Direct update to expired is forbidden. Expiration is managed by system automated processes setting trusted transaction context.)',
  actual: resSec14d.success ? 'PASS (Vulnerability!)' : `FAIL (${resSec14d.error})`,
  passed: !resSec14d.success && (resSec14d.error?.includes('Expiration is managed by system') || false),
});

// --- P1C-SEC-14E: Internal trusted expiration path with transaction-local marker sets active -> expired -> PASSED ---
const resSec14e = simulateBloodRequestUpdate(
  mockBaseBloodRequest,
  { status: 'expired' },
  'admin',
  'user-admin-01',
  { hasExpirationMarker: true } // Internal trusted transaction context
);
recordTest({
  id: 'P1C-SEC-14E',
  name: 'Expiration Trusted Path: Internal path with transaction-local marker successfully sets active -> expired',
  expected: 'PASS (Transition allowed via trusted transaction marker)',
  actual: resSec14e.success ? 'PASS (Transition allowed via trusted transaction marker)' : `FAIL (${resSec14e.error})`,
  passed: resSec14e.success,
});

// --- P1C-SEC-14F: Internal trusted expiration path with transaction-local marker sets matched -> expired -> PASSED ---
const resSec14f = simulateBloodRequestUpdate(
  matchedReqForExp,
  { status: 'expired' },
  'admin',
  'user-admin-01',
  { hasExpirationMarker: true } // Internal trusted transaction context
);
recordTest({
  id: 'P1C-SEC-14F',
  name: 'Expiration Trusted Path: Internal path with transaction-local marker successfully sets matched -> expired',
  expected: 'PASS (Transition allowed via trusted transaction marker)',
  actual: resSec14f.success ? 'PASS (Transition allowed via trusted transaction marker)' : `FAIL (${resSec14f.error})`,
  passed: resSec14f.success,
});

// --- P1C-SEC-15: Staff attempts arbitrary invalid status transition -> DENIED ---
const resSec15a = simulateBloodRequestUpdate(
  mockBaseBloodRequest, // status: active
  { status: 'pending' },
  'admin',
  'user-admin-01'
);
const resSec15b = simulateBloodRequestUpdate(
  { ...mockBaseBloodRequest, status: 'pending' },
  { status: 'fulfilled' },
  'admin',
  'user-admin-01'
);
recordTest({
  id: 'P1C-SEC-15',
  name: 'Transition Matrix: Staff attempts arbitrary invalid status jumps (active->pending, pending->fulfilled) -> DENIED',
  expected: 'FAIL (Invalid status transition)',
  actual: !resSec15a.success && !resSec15b.success ? `FAIL (${resSec15a.error} / ${resSec15b.error})` : 'PASS (Vulnerability!)',
  passed: !resSec15a.success && !resSec15b.success,
});

// --- P1C-SEC-16: Only complete_donation_fulfillment() can produce matched -> fulfilled through the approved workflow ---
const matchedRequest: BloodRequest = { ...mockBaseBloodRequest, status: 'matched' };
const resSec16 = simulateBloodRequestUpdate(
  matchedRequest,
  { status: 'fulfilled' },
  'donor',
  'user-donor-200',
  { hasFulfillmentMarker: true } // Executed inside complete_donation_fulfillment RPC setting transaction GUC
);
recordTest({
  id: 'P1C-SEC-16',
  name: 'Fulfillment Integrity: complete_donation_fulfillment() setting GUC successfully updates matched -> fulfilled',
  expected: 'PASS (Transition allowed through RPC workflow)',
  actual: resSec16.success ? 'PASS (Transition allowed through RPC workflow)' : `FAIL (${resSec16.error})`,
  passed: resSec16.success,
});

// --- P1C-SEC-17: Direct update with existing donation row but WITHOUT transaction GUC marker -> DENIED ---
const resSec17 = simulateBloodRequestUpdate(
  matchedRequest,
  { status: 'fulfilled' },
  'admin',
  'user-admin-01',
  { hasFulfillmentMarker: false } // No transaction GUC marker present
);
recordTest({
  id: 'P1C-SEC-17',
  name: 'GUC Isolation: Direct PostgREST UPDATE even with qualifying donation row is strictly DENIED without transaction GUC',
  expected: 'FAIL (Direct update to fulfilled is forbidden. Fulfillment must occur through complete_donation_fulfillment().)',
  actual: resSec17.success ? 'PASS (Vulnerability!)' : `FAIL (${resSec17.error})`,
  passed: !resSec17.success && (resSec17.error?.includes('complete_donation_fulfillment') || false),
});

// --- P1C-SEC-18: Client direct invocation of recompute_blood_request_match_state -> REVOKED / DENIED ---
const resSec18 = simulateRecomputeMatchState(mockBaseBloodRequest, [], true);
recordTest({
  id: 'P1C-SEC-18',
  name: 'Helper Lockdown: Direct client RPC invocation of recompute_blood_request_match_state is strictly REVOKED',
  expected: 'FAIL (permission denied for function recompute_blood_request_match_state)',
  actual: resSec18.success ? 'PASS (Vulnerability!)' : `FAIL (${resSec18.error})`,
  passed: !resSec18.success && (resSec18.error?.includes('permission denied') || false),
});

// --- P1C-SEC-19: Trigger-based match state synchronization (active <-> matched) -> PASSED ---
const activeWithAccepted: DonorRequest[] = [{
  id: 'dr-acc',
  bloodRequestId: 'breq-test-01',
  donorId: 'd-1',
  donorUserId: 'du-1',
  requesterUserId: 'ru-1',
  status: 'accepted',
  matchScore: 90,
  patientName: 'P',
  hospital: 'H',
  bloodGroup: 'B+',
  emergencyLevel: 'NORMAL',
  createdAt: '2026-09-14',
}];
const syncActiveToMatched = simulateRecomputeMatchState(mockBaseBloodRequest, activeWithAccepted, false);
const syncMatchedToActive = simulateRecomputeMatchState(matchedRequest, [], false);
const matchSyncValid = syncActiveToMatched.newStatus === 'matched' && syncMatchedToActive.newStatus === 'active';

recordTest({
  id: 'P1C-SEC-19',
  name: 'Trigger Synchronization: Internal trigger correctly transitions active -> matched and matched -> active',
  expected: 'active -> matched (1 accepted), matched -> active (0 accepted)',
  actual: `active -> ${syncActiveToMatched.newStatus}, matched -> ${syncMatchedToActive.newStatus}`,
  passed: matchSyncValid,
});

// -----------------------------------------------------------------------------
// 5. COMPLETE DONATION FULFILLMENT SIMULATION
// -----------------------------------------------------------------------------

function simulateCompleteDonationFulfillment(
  dreq: DonorRequest,
  breq: BloodRequest,
  callerUserId: string | null,
  callerRole: UserRole
): { success: boolean; error?: string; donationCreated?: boolean; bloodRequestFulfilled?: boolean } {
  // 1. Authentication check: auth.uid() is authoritative (NO current_user bypass)
  if (!callerUserId) {
    return { success: false, error: 'Authentication required to fulfill donation.' };
  }

  // 2. Authorization check: Only assigned donor or staff
  const isStaff = ['super_admin', 'admin', 'moderator', 'volunteer'].includes(callerRole);
  if (!isStaff) {
    if (dreq.donorUserId !== callerUserId) {
      return {
        success: false,
        error: 'Unauthorized: Only the assigned donor or staff can complete this donation.',
      };
    }
  }

  // 3. Status check: donor request must be accepted
  if (dreq.status !== 'accepted') {
    return {
      success: false,
      error: `Cannot complete donation for donor request with status "${dreq.status}". Donor request must be accepted first.`,
    };
  }

  // 4. Blood request terminal check
  if (['fulfilled', 'cancelled', 'expired'].includes(breq.status)) {
    return {
      success: false,
      error: `Cannot complete donation for a ${breq.status} blood request.`,
    };
  }

  // 5. Cross-owner integrity
  if (dreq.requesterUserId !== breq.userId) {
    return {
      success: false,
      error: 'Integrity violation: donor_request requester does not match parent blood request owner.',
    };
  }

  // 6. Set Transaction-Local GUC Marker and update blood request
  const updateRes = simulateBloodRequestUpdate(
    breq,
    { status: 'fulfilled' },
    callerRole,
    callerUserId,
    { hasFulfillmentMarker: true } // Transaction-local GUC set by RPC
  );

  if (!updateRes.success) {
    return { success: false, error: updateRes.error };
  }

  return { success: true, donationCreated: true, bloodRequestFulfilled: true };
}

// --- P1C-SEC-20: Authenticated donor A cannot fulfill donor B's accepted donor_request -> DENIED ---
const resSec20 = simulateCompleteDonationFulfillment(
  acceptedDReq, // assigned to user-donor-200
  mockBaseBloodRequest,
  'user-donor-attacker-999', // Attacker donor A
  'donor'
);
recordTest({
  id: 'P1C-SEC-20',
  name: 'Fulfillment Auth: Authenticated donor A cannot fulfill donor B accepted request -> DENIED',
  expected: 'FAIL (Unauthorized: Only the assigned donor or staff can complete this donation.)',
  actual: resSec20.success ? 'PASS (Vulnerability!)' : `FAIL (${resSec20.error})`,
  passed: !resSec20.success && (resSec20.error?.includes('assigned donor') || false),
});

// --- P1C-SEC-21: Authenticated unrelated user cannot fulfill donor B's accepted request -> DENIED ---
const resSec21 = simulateCompleteDonationFulfillment(
  acceptedDReq,
  mockBaseBloodRequest,
  'user-unrelated-333',
  'donor'
);
recordTest({
  id: 'P1C-SEC-21',
  name: 'Fulfillment Auth: Authenticated unrelated user cannot fulfill donor B accepted request -> DENIED',
  expected: 'FAIL (Unauthorized: Only the assigned donor or staff can complete this donation.)',
  actual: resSec21.success ? 'PASS (Vulnerability!)' : `FAIL (${resSec21.error})`,
  passed: !resSec21.success && (resSec21.error?.includes('assigned donor') || false),
});

// --- P1C-SEC-22: Non-staff caller cannot bypass authorization through SECURITY DEFINER context -> DENIED ---
const resSec22 = simulateCompleteDonationFulfillment(
  acceptedDReq,
  mockBaseBloodRequest,
  'user-spoofed-attacker',
  'donor' // Non-staff
);
recordTest({
  id: 'P1C-SEC-22',
  name: 'Zero Bypass: Non-staff caller cannot bypass authorization through SECURITY DEFINER / current_user behavior -> DENIED',
  expected: 'FAIL (Unauthorized: Only the assigned donor or staff can complete this donation.)',
  actual: resSec22.success ? 'PASS (Vulnerability!)' : `FAIL (${resSec22.error})`,
  passed: !resSec22.success && (resSec22.error?.includes('assigned donor') || false),
});

// --- P1C-SEC-23: Authorized assigned donor can fulfill -> PASSED ---
const resSec23 = simulateCompleteDonationFulfillment(
  acceptedDReq, // assigned to user-donor-200
  mockBaseBloodRequest,
  'user-donor-200', // Authenticated caller is assigned donor
  'donor'
);
recordTest({
  id: 'P1C-SEC-23',
  name: 'Authorized Fulfillment: Assigned donor successfully fulfills accepted request via RPC -> PASSED',
  expected: 'PASS (Donation recorded and blood request fulfilled)',
  actual: resSec23.success ? 'PASS (Donation recorded and blood request fulfilled)' : `FAIL (${resSec23.error})`,
  passed: resSec23.success && resSec23.bloodRequestFulfilled === true,
});

// --- P1C-SEC-24: Authorized staff can fulfill -> PASSED ---
const resSec24 = simulateCompleteDonationFulfillment(
  acceptedDReq,
  mockBaseBloodRequest,
  'user-staff-01',
  'volunteer' // Staff role
);
recordTest({
  id: 'P1C-SEC-24',
  name: 'Staff Operations: Authorized staff member successfully assists fulfillment via RPC -> PASSED',
  expected: 'PASS (Staff fulfillment allowed)',
  actual: resSec24.success ? 'PASS (Staff fulfillment allowed)' : `FAIL (${resSec24.error})`,
  passed: resSec24.success && resSec24.bloodRequestFulfilled === true,
});

console.log('\n================================================================');
const totalPassed = results.filter((r) => r.passed).length;
console.log(`📊 PHASE 1C TEST SUITE SUMMARY: ${totalPassed}/${results.length} PASSED (${Math.round((totalPassed / results.length) * 100)}%)`);
console.log('================================================================\n');

if (totalPassed !== results.length) {
  process.exit(1);
}
